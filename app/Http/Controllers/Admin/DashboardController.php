<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private function isUsingSqlite(): bool
    {
        return DB::getDriverName() === 'sqlite';
    }

    public function index(Request $request): Response
    {
        $period = $request->get('period', 'all');

        // Custom date range
        $customFrom = $request->get('from');
        $customTo   = $request->get('to');

        if ($period === 'custom' && $customFrom) {
            $from = Carbon::parse($customFrom)->startOfDay();
            $to   = $customTo ? Carbon::parse($customTo)->endOfDay() : now()->endOfDay();
        } else {
            $from = match ($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };
            $to = null;
        }

        // Base query scoped by period
        $reportQuery = Report::query();
        if ($from && $to) {
            $reportQuery->whereBetween('created_at', [$from, $to]);
        } elseif ($from) {
            $reportQuery->where('created_at', '>=', $from);
        }

        $stats = [
            'total_reports'    => (clone $reportQuery)->count(),
            'pending'          => (clone $reportQuery)->where('status', 'pending')->count(),
            'active'           => (clone $reportQuery)->whereIn('status', ['verified', 'assigned'])->count(),
            'resolved_today'   => Report::where('status', 'resolved')
                                        ->whereDate('resolved_at', today())
                                        ->count(),
            'total_users'      => User::where('role', '!=', 'admin')->count(),
            'total_responders' => User::where('role', 'responder')->count(),
        ];

        // Determine comparison period based on selected period
        if ($period === 'custom' && $from) {
            $currentFrom = $from;
            $currentTo   = $to ?? now()->endOfDay();
            $rangeDays   = $currentFrom->diffInDays($currentTo);
            $previousTo  = $currentFrom->copy()->subDay()->endOfDay();
            $previousFrom = $previousTo->copy()->subDays($rangeDays)->startOfDay();
            $trendLabel       = 'vs prior period';
            $trendPeriodLabel = $currentFrom->format('M d') . ' – ' . $currentTo->format('M d, Y');
        } else {
            $currentFrom = match ($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => now()->startOfMonth(),
            };
            $currentTo = null;
            $previousFrom = match ($period) {
                'today' => today()->subDay(),
                'week'  => now()->subWeek()->startOfWeek(),
                'month' => now()->subMonth()->startOfMonth(),
                default => now()->subMonth()->startOfMonth(),
            };
            $previousTo = match ($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => now()->startOfMonth(),
            };
            $trendLabel = match ($period) {
                'today' => 'vs yesterday',
                'week'  => 'vs last week',
                'month' => 'vs last month',
                default => 'vs last month',
            };
            $trendPeriodLabel = match ($period) {
                'today' => today()->format('M d, Y'),
                'week'  => now()->startOfWeek()->format('M d') . ' – ' . now()->endOfWeek()->format('M d, Y'),
                'month' => now()->startOfMonth()->format('M d') . ' – ' . now()->endOfMonth()->format('M d, Y'),
                default => now()->startOfMonth()->format('M d') . ' – ' . now()->endOfMonth()->format('M d, Y'),
            };
        }

        // Helper to calculate trend percentage
        $calcTrend = function (int $current, int $previous): float {
            return $previous > 0
                ? round((($current - $previous) / $previous) * 100, 1)
                : ($current > 0 ? 100 : 0);
        };

        // Reports trend
        $curReportsQ = Report::where('created_at', '>=', $currentFrom);
        if ($currentTo) $curReportsQ->where('created_at', '<=', $currentTo);
        $thisWeekReports = $curReportsQ->count();
        $lastWeekReports = Report::whereBetween('created_at', [$previousFrom, $previousTo])->count();
        $reportsTrend = $calcTrend($thisWeekReports, $lastWeekReports);

        // Resolved trend
        $curResolvedQ = Report::where('status', 'resolved')->where('resolved_at', '>=', $currentFrom);
        if ($currentTo) $curResolvedQ->where('resolved_at', '<=', $currentTo);
        $thisWeekResolved = $curResolvedQ->count();
        $lastWeekResolved = Report::where('status', 'resolved')->whereBetween('resolved_at', [$previousFrom, $previousTo])->count();
        $resolvedTrend = $calcTrend($thisWeekResolved, $lastWeekResolved);

        // Active floods trend
        $curActiveQ = Report::whereIn('status', ['verified', 'assigned'])->where('created_at', '>=', $currentFrom);
        if ($currentTo) $curActiveQ->where('created_at', '<=', $currentTo);
        $currentActive = $curActiveQ->count();
        $previousActive = Report::whereIn('status', ['verified', 'assigned'])->whereBetween('created_at', [$previousFrom, $previousTo])->count();
        $activeTrend = $calcTrend($currentActive, $previousActive);

        // Pending trend
        $curPendingQ = Report::where('status', 'pending')->where('created_at', '>=', $currentFrom);
        if ($currentTo) $curPendingQ->where('created_at', '<=', $currentTo);
        $currentPending = $curPendingQ->count();
        $previousPending = Report::where('status', 'pending')->whereBetween('created_at', [$previousFrom, $previousTo])->count();
        $pendingTrend = $calcTrend($currentPending, $previousPending);

        // Alerts trend
        $curAlertsQ = Alert::where('created_at', '>=', $currentFrom);
        if ($currentTo) $curAlertsQ->where('created_at', '<=', $currentTo);
        $currentAlerts = $curAlertsQ->count();
        $previousAlerts = Alert::whereBetween('created_at', [$previousFrom, $previousTo])->count();
        $alertsTrend = $calcTrend($currentAlerts, $previousAlerts);

        // Daily reports for the last 30 days
        $dailyReports = Report::select(
                DB::raw("DATE(created_at) as date"),
                DB::raw("COUNT(*) as total"),
                DB::raw("SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved")
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw("DATE(created_at)"))
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->format('M d'),
                'total' => (int) $row->total,
                'resolved' => (int) $row->resolved,
            ]);

        // Monthly reports for the last 6 months
        $monthExpr = $this->isUsingSqlite()
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $monthlyReports = Report::select(
                DB::raw("$monthExpr as month"),
                DB::raw("COUNT(*) as total"),
                DB::raw("SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical"),
                DB::raw("SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high")
            )
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => Carbon::parse($row->month . '-01')->format('M'),
                'total' => (int) $row->total,
                'critical' => (int) $row->critical,
                'high' => (int) $row->high,
            ]);

        // Breakdowns (scoped by period)
        $severity_breakdown = (clone $reportQuery)->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $status_breakdown = (clone $reportQuery)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // Recent reports
        $recent_reports = Report::with('user:id,name')
            ->latest()
            ->limit(10)
            ->get(['id', 'reference_number', 'severity', 'status', 'address', 'latitude', 'longitude', 'user_id', 'created_at']);

        // Active alerts
        $active_alerts = Alert::count();

        // Critical alerts list (for banner)
        $critical_alerts = Alert::where('type', 'critical')
            ->latest()
            ->limit(3)
            ->get(['id', 'title', 'body', 'type', 'created_at']);

        // Top responders
        $top_responders = User::where('role', 'responder')
            ->withCount(['assignedReports as resolved_count' => function ($q) {
                $q->where('status', 'resolved');
            }])
            ->withCount('assignedReports as total_assigned')
            ->orderByDesc('resolved_count')
            ->limit(5)
            ->get(['id', 'name', 'email']);

        // Average response time (minutes from created_at to resolved_at)
        $avgResponseQuery = Report::where('status', 'resolved')
            ->whereNotNull('resolved_at');
        if ($from) {
            $avgResponseQuery = $avgResponseQuery->where('created_at', '>=', $from);
        }
        $avgResponseMinutes = $avgResponseQuery->count() > 0
            ? round($avgResponseQuery->avg(DB::raw($this->isUsingSqlite()
                ? "(julianday(resolved_at) - julianday(created_at)) * 1440"
                : "TIMESTAMPDIFF(MINUTE, created_at, resolved_at)"
            )), 1)
            : 0;

        // Recent activity (latest status updates)
        $recent_activity = [];
        if (class_exists(ReportStatusUpdate::class)) {
            try {
                $recent_activity = ReportStatusUpdate::with(['user:id,name,role', 'report:id,reference_number,severity'])
                    ->latest()
                    ->limit(8)
                    ->get();
            } catch (\Exception $e) {
                $recent_activity = [];
            }
        }

        // Affected areas count (distinct addresses with active reports)
        $affected_areas = Report::whereIn('status', ['pending', 'verified', 'assigned'])
            ->distinct('address')
            ->count('address');

        // Active flood reports (for map pins)
        $map_reports = Report::whereIn('status', ['pending', 'verified', 'assigned'])
            ->latest()
            ->limit(50)
            ->get(['id', 'reference_number', 'severity', 'status', 'latitude', 'longitude', 'address']);

        $team_stats = [
            'active'   => Team::where('is_active', true)->count(),
            'deployed' => Team::where('is_active', true)
                ->whereHas('reports', fn ($q) => $q->where('status', 'assigned'))
                ->count(),
            'inactive' => Team::where('is_active', false)->count(),
        ];

        return Inertia::render('admin/dashboard', [
            'stats'              => $stats,
            'team_stats'         => $team_stats,
            'trends'             => [
                'reports'  => $reportsTrend,
                'resolved' => $resolvedTrend,
                'active'   => $activeTrend,
                'pending'  => $pendingTrend,
                'alerts'   => $alertsTrend,
                'label'    => $trendLabel,
                'period_label' => $trendPeriodLabel,
            ],
            'daily_reports'      => $dailyReports,
            'monthly_reports'    => $monthlyReports,
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'recent_reports'     => $recent_reports,
            'active_alerts'      => $active_alerts,
            'critical_alerts'    => $critical_alerts,
            'top_responders'     => $top_responders,
            'avg_response_time'  => $avgResponseMinutes,
            'recent_activity'    => $recent_activity,
            'affected_areas'     => $affected_areas,
            'map_reports'        => $map_reports,
            'period'             => $period,
            'custom_from'        => $customFrom,
            'custom_to'          => $customTo,
        ]);
    }
}
