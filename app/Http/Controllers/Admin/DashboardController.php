<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
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

        // Date range based on period
        $from = match ($period) {
            'today' => today(),
            'week'  => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };

        // Base query scoped by period
        $reportQuery = Report::query();
        if ($from) {
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

        // Percentage changes (compare this week vs last week)
        $thisWeekReports = Report::where('created_at', '>=', now()->startOfWeek())->count();
        $lastWeekReports = Report::whereBetween('created_at', [now()->subWeek()->startOfWeek(), now()->startOfWeek()])->count();
        $reportsTrend = $lastWeekReports > 0
            ? round((($thisWeekReports - $lastWeekReports) / $lastWeekReports) * 100, 1)
            : 0;

        $thisWeekResolved = Report::where('status', 'resolved')->where('resolved_at', '>=', now()->startOfWeek())->count();
        $lastWeekResolved = Report::where('status', 'resolved')->whereBetween('resolved_at', [now()->subWeek()->startOfWeek(), now()->startOfWeek()])->count();
        $resolvedTrend = $lastWeekResolved > 0
            ? round((($thisWeekResolved - $lastWeekResolved) / $lastWeekResolved) * 100, 1)
            : 0;

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

        // Hazard type breakdown (scoped by period)
        $hazard_breakdown = (clone $reportQuery)->selectRaw('hazard_type, count(*) as count')
            ->groupBy('hazard_type')
            ->pluck('count', 'hazard_type');

        // Recent reports
        $recent_reports = Report::with('user:id,name')
            ->latest()
            ->limit(10)
            ->get(['id', 'reference_number', 'hazard_type', 'severity', 'status', 'address', 'latitude', 'longitude', 'user_id', 'created_at']);

        // Active alerts
        $active_alerts = Alert::where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })->count();

        // Critical alerts list (for banner)
        $critical_alerts = Alert::where('type', 'critical')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
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

        // Average response time (hours from created_at to resolved_at)
        $avgResponseHours = Report::where('status', 'resolved')
            ->whereNotNull('resolved_at');
        if ($from) {
            $avgResponseHours = $avgResponseHours->where('created_at', '>=', $from);
        }
        $avgResponseTime = $avgResponseHours->count() > 0
            ? round($avgResponseHours->avg(DB::raw($this->isUsingSqlite()
                ? "(julianday(resolved_at) - julianday(created_at)) * 24"
                : "TIMESTAMPDIFF(HOUR, created_at, resolved_at)"
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

        return Inertia::render('admin/dashboard', [
            'stats'              => $stats,
            'trends'             => [
                'reports'  => $reportsTrend,
                'resolved' => $resolvedTrend,
            ],
            'daily_reports'      => $dailyReports,
            'monthly_reports'    => $monthlyReports,
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'hazard_breakdown'   => $hazard_breakdown,
            'recent_reports'     => $recent_reports,
            'active_alerts'      => $active_alerts,
            'critical_alerts'    => $critical_alerts,
            'top_responders'     => $top_responders,
            'avg_response_time'  => $avgResponseTime,
            'recent_activity'    => $recent_activity,
            'affected_areas'     => $affected_areas,
            'map_reports'        => $map_reports,
            'period'             => $period,
        ]);
    }
}
