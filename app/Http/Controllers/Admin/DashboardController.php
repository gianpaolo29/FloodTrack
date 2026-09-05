<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
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
    use HasPeriodStats;

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        // Base query scoped by period
        $reportQuery = $this->scopeByPeriod(Report::query(), $from, $to);

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

        // Comparison period via trait
        [$prevFrom, $prevTo, $trendLabel, $trendPeriodLabel] = $this->comparisonPeriod($period, $from, $to);

        // Trends
        $curReports  = $this->scopeByPeriod(Report::query(), $from, $to)->count();
        $prevReports = Report::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $reportsTrend = $this->calcTrend($curReports, $prevReports);

        $curResolved  = $this->scopeByPeriod(Report::where('status', 'resolved'), $from, $to, 'resolved_at')->count();
        $prevResolved = Report::where('status', 'resolved')->whereBetween('resolved_at', [$prevFrom, $prevTo])->count();
        $resolvedTrend = $this->calcTrend($curResolved, $prevResolved);

        $curActive  = $this->scopeByPeriod(Report::whereIn('status', ['verified', 'assigned']), $from, $to)->count();
        $prevActive = Report::whereIn('status', ['verified', 'assigned'])->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $activeTrend = $this->calcTrend($curActive, $prevActive);

        $curPending  = $this->scopeByPeriod(Report::where('status', 'pending'), $from, $to)->count();
        $prevPending = Report::where('status', 'pending')->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $pendingTrend = $this->calcTrend($curPending, $prevPending);

        $curAlerts  = $this->scopeByPeriod(Alert::query(), $from, $to)->count();
        $prevAlerts = Alert::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $alertsTrend = $this->calcTrend($curAlerts, $prevAlerts);

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

        // Breakdowns (scoped by period)
        $severity_breakdown = (clone $reportQuery)->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $status_breakdown = (clone $reportQuery)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // Recent reports
        $recent_reports = Report::with('user:id,name')
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->latest()
            ->limit(10)
            ->get(['id', 'reference_number', 'severity', 'status', 'address', 'latitude', 'longitude', 'user_id', 'created_at']);

        // Active alerts
        $active_alerts = $this->scopeByPeriod(Alert::query(), $from, $to)->count();

        // Critical alerts list (for banner)
        $critical_alerts = Alert::where('type', 'critical')
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->latest()
            ->limit(3)
            ->get(['id', 'title', 'body', 'type', 'created_at']);

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
                    ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
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
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->latest()
            ->limit(50)
            ->get(['id', 'reference_number', 'severity', 'status', 'latitude', 'longitude', 'address']);

        $team_stats = [
            'active'   => $this->scopeByPeriod(Team::where('is_active', true), $from, $to)->count(),
            'deployed' => $this->scopeByPeriod(Team::where('is_active', true), $from, $to)
                ->whereHas('reports', fn ($q) => $q->where('status', 'assigned'))
                ->count(),
            'inactive' => $this->scopeByPeriod(Team::where('is_active', false), $from, $to)->count(),
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
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'recent_reports'     => $recent_reports,
            'active_alerts'      => $active_alerts,
            'critical_alerts'    => $critical_alerts,
            'avg_response_time'  => $avgResponseMinutes,
            'recent_activity'    => $recent_activity,
            'affected_areas'     => $affected_areas,
            'map_reports'        => $map_reports,
            'period'             => $period,
            'custom_from'        => $request->get('from'),
            'custom_to'          => $request->get('to'),
        ]);
    }
}
