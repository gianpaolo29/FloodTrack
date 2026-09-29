<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\Alert;
use App\Models\EvacuationCenter;
use App\Models\OccupancyLog;
use App\Models\Report;
use App\Models\ReportSlaTracking;
use App\Models\Setting;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use OpenAI;

class StatisticsController extends Controller
{
    use HasPeriodStats;

    private function resolveBarangay(?string $address, ?float $lat = null, ?float $lng = null): string
    {
        $barangays = config('barangays', []);

        if ($lat && $lng) {
            $nearest = null;
            $minDist = PHP_FLOAT_MAX;
            foreach ($barangays as $brgy) {
                $dist = sqrt(pow($lat - $brgy['latitude'], 2) + pow($lng - $brgy['longitude'], 2));
                if ($dist < $minDist) { $minDist = $dist; $nearest = $brgy['name']; }
            }
            if ($nearest) return $nearest;
        }

        if ($address) {
            $sorted = collect($barangays)->sortByDesc(fn ($b) => mb_strlen($b['name']))->values();
            foreach ($sorted as $brgy) {
                $name = $brgy['name'];
                if (preg_match('/^Barangay\s+(\d+)/i', $name, $m)) {
                    if (preg_match('/\b(?:Brgy\.?|Barangay)\s*' . $m[1] . '\b/i', $address)) return $name;
                    continue;
                }
                if (preg_match('/\b(?:Brgy\.?\s*|Barangay\s*)?' . preg_quote($name, '/') . '\b/i', $address)) return $name;
            }
            if (preg_match('/\bPoblacion\b/i', $address)) return 'Barangay 1 (Pob.)';
        }

        return 'Other / Unclassified';
    }

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        $reportQuery = $this->scopeByPeriod(Report::query(), $from, $to);

        // Reports per day (last 30 days) — scoped by period
        $daily_reports = (clone $reportQuery)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date');

        // Average response time (created → resolved) in minutes
        $avgExpr = DB::getDriverName() === 'sqlite'
            ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
            : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

        $avg_response_time = Report::where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->selectRaw("$avgExpr as avg_minutes")
            ->value('avg_minutes');

        // Reports by severity — scoped by period
        $severity_breakdown = (clone $reportQuery)
            ->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        // Reports by status — scoped by period
        $status_breakdown = (clone $reportQuery)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // All-time totals — scoped by period
        $total_reports = (clone $reportQuery)->count();
        $resolved_count = $status_breakdown['resolved'] ?? 0;
        $resolution_rate = $total_reports > 0
            ? round(($resolved_count / $total_reports) * 100, 1)
            : 0;
        $critical_count = $severity_breakdown['critical'] ?? 0;

        // Monthly trend (last 6 months) — always all-time
        $monthExpr = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $monthly_trend = Report::selectRaw("$monthExpr as month, count(*) as total, SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical, SUM(CASE WHEN severity='high' THEN 1 ELSE 0 END) as high")
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('month')
            ->get()
            ->map(fn($r) => [
                'month'    => \Carbon\Carbon::parse($r->month . '-01')->format('M'),
                'total'    => (int) $r->total,
                'critical' => (int) $r->critical,
                'high'     => (int) $r->high,
            ]);

        // Peak hours (all-time)
        $hourExpr = DB::getDriverName() === 'sqlite'
            ? "CAST(strftime('%H', created_at) AS INTEGER)"
            : "HOUR(created_at)";
        $raw_peak = Report::selectRaw("$hourExpr as hour, count(*) as count")
            ->groupBy(DB::raw($hourExpr))
            ->orderBy('hour')
            ->pluck('count', 'hour');
        $peak_hours = collect(range(0, 23))->mapWithKeys(fn($h) => [$h => $raw_peak[$h] ?? 0])->toArray();

        // Top 5 responders — with efficiency and avg response time
        $top_responders = User::where('role', 'responder')
            ->withCount(['assignedReports as resolved_count' => fn($q) => $q->where('status', 'resolved')])
            ->withCount('assignedReports as total_assigned')
            ->orderByDesc('resolved_count')
            ->limit(5)
            ->get(['id', 'name'])
            ->map(function($r) use ($avgExpr) {
                $avg = Report::where('assigned_to', $r->id)
                    ->where('status', 'resolved')
                    ->whereNotNull('resolved_at')
                    ->selectRaw("$avgExpr as avg_minutes")
                    ->value('avg_minutes');
                return [
                    'id'             => $r->id,
                    'name'           => $r->name,
                    'resolved_count' => $r->resolved_count,
                    'total_assigned' => $r->total_assigned,
                    'efficiency'     => $r->total_assigned > 0 ? round(($r->resolved_count / $r->total_assigned) * 100) : 0,
                    'avg_response'   => round((float)($avg ?? 0), 1),
                ];
            });

        // Team performance
        $teamAvgExpr = DB::getDriverName() === 'sqlite'
            ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
            : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

        $team_performance = Team::withCount([
                'reports as total_assigned',
                'reports as resolved_count' => fn ($q) => $q->whereNotNull('resolved_at'),
            ])
            ->orderByDesc('resolved_count')
            ->get(['id', 'name', 'is_active'])
            ->map(function ($team) use ($teamAvgExpr) {
                $avg = Report::where('assigned_team_id', $team->id)
                    ->whereNotNull('resolved_at')
                    ->selectRaw("$teamAvgExpr as avg_minutes")
                    ->value('avg_minutes');
                return [
                    'id'             => $team->id,
                    'name'           => $team->name,
                    'is_active'      => $team->is_active,
                    'total_assigned' => $team->total_assigned,
                    'resolved_count' => $team->resolved_count,
                    'efficiency'     => $team->total_assigned > 0
                        ? round(($team->resolved_count / $team->total_assigned) * 100)
                        : 0,
                    'avg_response'   => round((float) ($avg ?? 0), 1),
                ];
            });

        // ── Trend calculations ──
        [$trendPreviousFrom, $trendPreviousTo, $trendLabel, $trendPeriodLabel] = $this->comparisonPeriod($period, $from, $to);

        // Reports trend
        $currentReports = $this->scopeByPeriod(Report::query(), $from, $to)->count();
        $previousReports = Report::whereBetween('created_at', [$trendPreviousFrom, $trendPreviousTo])->count();

        // Resolution rate trend
        $currentResolved = $this->scopeByPeriod(Report::where('status', 'resolved'), $from, $to, 'resolved_at')->count();
        $previousResolved = Report::where('status', 'resolved')->whereBetween('resolved_at', [$trendPreviousFrom, $trendPreviousTo])->count();

        // Avg response time trend
        $currentAvgResp = $this->scopeByPeriod(Report::where('status', 'resolved')->whereNotNull('resolved_at'), $from, $to, 'resolved_at')
            ->selectRaw("$avgExpr as avg_minutes")->value('avg_minutes');
        $previousAvgResp = Report::where('status', 'resolved')->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$trendPreviousFrom, $trendPreviousTo])
            ->selectRaw("$avgExpr as avg_minutes")->value('avg_minutes');

        // Critical trend
        $currentCritical = $this->scopeByPeriod(Report::where('severity', 'critical'), $from, $to)->count();
        $previousCritical = Report::where('severity', 'critical')->whereBetween('created_at', [$trendPreviousFrom, $trendPreviousTo])->count();

        $trends = [
            'reports'      => $this->calcTrend($currentReports, $previousReports),
            'resolved'     => $this->calcTrend($currentResolved, $previousResolved),
            'avg_response' => $this->calcTrend((int) round((float) ($currentAvgResp ?? 0)), (int) round((float) ($previousAvgResp ?? 0))),
            'critical'     => $this->calcTrend($currentCritical, $previousCritical),
            'label'        => $trendLabel,
            'period_label' => $trendPeriodLabel,
        ];

        // Evacuation center stats
        $evacuation_stats = [
            'total_centers'   => EvacuationCenter::count(),
            'total_capacity'  => (int) EvacuationCenter::sum('capacity'),
            'total_occupancy' => (int) EvacuationCenter::sum('current_occupancy'),
        ];

        // Evacuation centers list
        $evacuation_centers = EvacuationCenter::orderByDesc('is_active')
            ->orderByDesc('current_occupancy')
            ->get(['id', 'name', 'address', 'type', 'capacity', 'current_occupancy', 'is_active']);

        // ── Additional Chart Data ──────────────────────────────────────

        $timeDiffExpr = DB::getDriverName() === 'sqlite'
            ? "(julianday(resolved_at) - julianday(created_at)) * 1440"
            : "TIMESTAMPDIFF(MINUTE, created_at, resolved_at)";

        // Response Time Trend — avg response time per day (last 30 days)
        $responseTimeTrend = Report::where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->where('resolved_at', '>=', now()->subDays(30))
            ->select(
                DB::raw("DATE(resolved_at) as date"),
                DB::raw("ROUND(AVG($timeDiffExpr), 1) as avg_minutes")
            )
            ->groupBy(DB::raw("DATE(resolved_at)"))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => Carbon::parse($r->date)->format('M d'),
                'avg_minutes' => round((float) $r->avg_minutes, 1),
            ]);

        // Evacuation Occupancy Over Time — last 30 days
        $evacOccupancyTimeline = [];
        if (class_exists(OccupancyLog::class)) {
            try {
                $evacOccupancyTimeline = OccupancyLog::with('evacuationCenter:id,name')
                    ->where('created_at', '>=', now()->subDays(30))
                    ->select(
                        DB::raw("DATE(created_at) as date"),
                        'evacuation_center_id',
                        DB::raw("MAX(new_occupancy) as occupancy")
                    )
                    ->groupBy(DB::raw("DATE(created_at)"), 'evacuation_center_id')
                    ->orderBy('date')
                    ->get()
                    ->groupBy('evacuation_center_id')
                    ->map(function ($logs, $centerId) {
                        $center = $logs->first()->evacuationCenter;
                        return [
                            'name' => $center?->name ?? "Center #$centerId",
                            'data' => $logs->map(fn ($l) => [
                                'date' => Carbon::parse($l->date)->format('M d'),
                                'occupancy' => (int) $l->occupancy,
                            ])->values(),
                        ];
                    })
                    ->values();
            } catch (\Exception $e) {
                $evacOccupancyTimeline = [];
            }
        }

        // Alert Frequency Timeline — alerts per day by type (last 30 days)
        $alertFrequency = Alert::where('created_at', '>=', now()->subDays(30))
            ->select(
                DB::raw("DATE(created_at) as date"),
                'type',
                DB::raw("COUNT(*) as count")
            )
            ->groupBy(DB::raw("DATE(created_at)"), 'type')
            ->orderBy('date')
            ->get()
            ->groupBy('date')
            ->map(fn ($group, $date) => [
                'date' => Carbon::parse($date)->format('M d'),
                'critical' => (int) $group->where('type', 'critical')->sum('count'),
                'advisory' => (int) ($group->where('type', 'warning')->sum('count') + $group->where('type', 'advisory')->sum('count')),
                'info' => (int) $group->where('type', 'info')->sum('count'),
            ])
            ->values();

        // Severity vs Response Time — scatter data
        $severityVsResponse = Report::where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->select(
                'severity',
                DB::raw("$timeDiffExpr as response_minutes")
            )
            ->limit(200)
            ->get()
            ->map(fn ($r) => [
                'severity' => $r->severity,
                'minutes' => round((float) $r->response_minutes, 1),
            ]);

        // Barangay Report Heatmap — report counts per area (top 20, normalized)
        $rawBarangayData = Report::select('address', 'latitude', 'longitude')->get();
        $barangayCounts = [];
        foreach ($rawBarangayData as $row) {
            $brgy = $this->resolveBarangay($row->address, $row->latitude ? (float) $row->latitude : null, $row->longitude ? (float) $row->longitude : null);
            $barangayCounts[$brgy] = ($barangayCounts[$brgy] ?? 0) + 1;
        }
        arsort($barangayCounts);
        $barangayReports = collect(array_slice($barangayCounts, 0, 20, true))
            ->map(fn ($count, $area) => ['area' => $area, 'count' => $count])
            ->values();

        // This Month vs Last Month — comparative bar by severity
        $curMonthStart = now()->startOfMonth();
        $prevMonthStart = now()->subMonth()->startOfMonth();
        $prevMonthEnd = now()->subMonth()->endOfMonth();

        $thisMonthBySeverity = Report::where('created_at', '>=', $curMonthStart)
            ->selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $lastMonthBySeverity = Report::whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])
            ->selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $monthComparison = [
            'this_month' => [
                'label' => now()->format('M Y'),
                'critical' => (int) ($thisMonthBySeverity['critical'] ?? 0),
                'high' => (int) ($thisMonthBySeverity['high'] ?? 0),
                'moderate' => (int) ($thisMonthBySeverity['moderate'] ?? 0),
                'low' => (int) ($thisMonthBySeverity['low'] ?? 0),
            ],
            'last_month' => [
                'label' => now()->subMonth()->format('M Y'),
                'critical' => (int) ($lastMonthBySeverity['critical'] ?? 0),
                'high' => (int) ($lastMonthBySeverity['high'] ?? 0),
                'moderate' => (int) ($lastMonthBySeverity['moderate'] ?? 0),
                'low' => (int) ($lastMonthBySeverity['low'] ?? 0),
            ],
        ];

        // ── Response Time Breakdown (per stage) ──────────────────────
        $stageDiffExprs = DB::getDriverName() === 'sqlite'
            ? [
                'report_to_verified'  => "(julianday(verified_at) - julianday(created_at)) * 1440",
                'verified_to_assigned'=> "(julianday(assigned_at) - julianday(verified_at)) * 1440",
                'assigned_to_resolved'=> "(julianday(resolved_at) - julianday(assigned_at)) * 1440",
            ]
            : [
                'report_to_verified'  => "TIMESTAMPDIFF(MINUTE, created_at, verified_at)",
                'verified_to_assigned'=> "TIMESTAMPDIFF(MINUTE, verified_at, assigned_at)",
                'assigned_to_resolved'=> "TIMESTAMPDIFF(MINUTE, assigned_at, resolved_at)",
            ];

        // Overall averages per stage
        $responseBreakdown = DB::table('reports')
            ->where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->selectRaw("
                ROUND(AVG(CASE WHEN verified_at IS NOT NULL THEN {$stageDiffExprs['report_to_verified']} END), 1) as avg_report_to_verified,
                ROUND(AVG(CASE WHEN verified_at IS NOT NULL AND assigned_at IS NOT NULL THEN {$stageDiffExprs['verified_to_assigned']} END), 1) as avg_verified_to_assigned,
                ROUND(AVG(CASE WHEN assigned_at IS NOT NULL THEN {$stageDiffExprs['assigned_to_resolved']} END), 1) as avg_assigned_to_resolved,
                COUNT(*) as total_resolved
            ")
            ->first();

        // Per-severity breakdown
        $responseBreakdownBySeverity = DB::table('reports')
            ->where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->groupBy('severity')
            ->selectRaw("
                severity,
                ROUND(AVG(CASE WHEN verified_at IS NOT NULL THEN {$stageDiffExprs['report_to_verified']} END), 1) as avg_report_to_verified,
                ROUND(AVG(CASE WHEN verified_at IS NOT NULL AND assigned_at IS NOT NULL THEN {$stageDiffExprs['verified_to_assigned']} END), 1) as avg_verified_to_assigned,
                ROUND(AVG(CASE WHEN assigned_at IS NOT NULL THEN {$stageDiffExprs['assigned_to_resolved']} END), 1) as avg_assigned_to_resolved,
                COUNT(*) as count
            ")
            ->get()
            ->map(fn ($r) => [
                'severity' => $r->severity,
                'avg_report_to_verified'   => (float) ($r->avg_report_to_verified ?? 0),
                'avg_verified_to_assigned'  => (float) ($r->avg_verified_to_assigned ?? 0),
                'avg_assigned_to_resolved'  => (float) ($r->avg_assigned_to_resolved ?? 0),
                'count' => (int) $r->count,
            ]);

        $responseBreakdownData = [
            'overall' => [
                'avg_report_to_verified'   => (float) ($responseBreakdown->avg_report_to_verified ?? 0),
                'avg_verified_to_assigned'  => (float) ($responseBreakdown->avg_verified_to_assigned ?? 0),
                'avg_assigned_to_resolved'  => (float) ($responseBreakdown->avg_assigned_to_resolved ?? 0),
                'total_resolved' => (int) ($responseBreakdown->total_resolved ?? 0),
            ],
            'by_severity' => $responseBreakdownBySeverity->values(),
        ];

        // Report Source Breakdown — donut
        $sourceBreakdown = Report::selectRaw("COALESCE(source, 'mobile') as source, COUNT(*) as count")
            ->groupBy(DB::raw("COALESCE(source, 'mobile')"))
            ->pluck('count', 'source');

        // Evacuation Centers by Type — pie
        $evacByType = EvacuationCenter::selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type');

        // User Role Distribution — donut
        $userRoles = User::selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role');

        return Inertia::render('admin/statistics/index', [
            'daily_reports'      => $daily_reports,
            'avg_response_time'  => round((float) ($avg_response_time ?? 0), 1),
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'top_responders'     => $top_responders,
            'monthly_trend'      => $monthly_trend->values(),
            'peak_hours'         => $peak_hours,
            'total_reports'      => $total_reports,
            'resolution_rate'    => $resolution_rate,
            'critical_count'     => $critical_count,
            'evacuation_stats'   => $evacuation_stats,
            'evacuation_centers' => $evacuation_centers,
            'team_performance'   => $team_performance,
            'trends'             => $trends,
            'period'             => $period,
            'custom_from'        => $request->get('from'),
            'custom_to'          => $request->get('to'),
            'response_time_trend'     => $responseTimeTrend,
            'evac_occupancy_timeline' => $evacOccupancyTimeline,
            'alert_frequency'         => $alertFrequency,
            'severity_vs_response'    => $severityVsResponse,
            'barangay_reports'        => $barangayReports,
            'month_comparison'        => $monthComparison,
            'source_breakdown'        => $sourceBreakdown,
            'evac_by_type'            => $evacByType,
            'user_roles'              => $userRoles,
            'response_breakdown'      => $responseBreakdownData,
        ]);
    }

    public function aiInsights(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            [$from, $to, $period] = $this->parsePeriod($request);

            $periodLabel = match($period) {
                'today'  => 'today (' . now()->format('M d, Y') . ')',
                'week'   => 'this week (' . now()->startOfWeek()->format('M d') . ' – ' . now()->format('M d') . ')',
                'month'  => 'this month (' . now()->format('F Y') . ')',
                'custom' => ($from ? $from->format('M d') : '') . ' – ' . ($to ? $to->format('M d, Y') : now()->format('M d, Y')),
                default  => 'all time',
            };

            $reportQuery = $this->scopeByPeriod(Report::query(), $from, $to);

            $avgExpr = DB::getDriverName() === 'sqlite'
                ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
                : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

            $total_reports = (clone $reportQuery)->count();
            $pending       = (clone $reportQuery)->where('status', 'pending')->count();
            $active        = (clone $reportQuery)->whereIn('status', ['verified', 'assigned'])->count();
            $resolved      = (clone $reportQuery)->where('status', 'resolved')->count();

            $severity_breakdown = (clone $reportQuery)
                ->selectRaw('severity, count(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity');

            $resolvedQuery = (clone $reportQuery)->where('status', 'resolved')->whereNotNull('resolved_at');
            $avg_response_time_raw = $resolvedQuery->selectRaw("$avgExpr as avg_minutes")->value('avg_minutes');

            $top_responder = User::where('role', 'responder')
                ->withCount(['assignedReports as resolved_count' => fn ($q) => $q->where('status', 'resolved')])
                ->orderByDesc('resolved_count')
                ->first(['id', 'name']);

            // ── NEW: Response time breakdown per stage ──
            $stageDiffExprs = DB::getDriverName() === 'sqlite'
                ? [
                    'r2v' => "(julianday(verified_at) - julianday(created_at)) * 1440",
                    'v2a' => "(julianday(assigned_at) - julianday(verified_at)) * 1440",
                    'a2r' => "(julianday(resolved_at) - julianday(assigned_at)) * 1440",
                ]
                : [
                    'r2v' => "TIMESTAMPDIFF(MINUTE, created_at, verified_at)",
                    'v2a' => "TIMESTAMPDIFF(MINUTE, verified_at, assigned_at)",
                    'a2r' => "TIMESTAMPDIFF(MINUTE, assigned_at, resolved_at)",
                ];

            $stageAvgs = DB::table('reports')
                ->where('status', 'resolved')
                ->whereNotNull('resolved_at')
                ->selectRaw("
                    ROUND(AVG(CASE WHEN verified_at IS NOT NULL THEN {$stageDiffExprs['r2v']} END), 1) as avg_report_to_verified,
                    ROUND(AVG(CASE WHEN verified_at IS NOT NULL AND assigned_at IS NOT NULL THEN {$stageDiffExprs['v2a']} END), 1) as avg_verified_to_assigned,
                    ROUND(AVG(CASE WHEN assigned_at IS NOT NULL THEN {$stageDiffExprs['a2r']} END), 1) as avg_assigned_to_resolved
                ")
                ->first();

            $avgR2V = round((float) ($stageAvgs->avg_report_to_verified ?? 0), 1);
            $avgV2A = round((float) ($stageAvgs->avg_verified_to_assigned ?? 0), 1);
            $avgA2R = round((float) ($stageAvgs->avg_assigned_to_resolved ?? 0), 1);

            // ── NEW: Top affected barangays ──
            $topBarangays = (clone $reportQuery)
                ->select('address', DB::raw('COUNT(*) as count'),
                    DB::raw("SUM(CASE WHEN severity IN ('critical','high') THEN 1 ELSE 0 END) as critical_high"))
                ->whereNotNull('address')
                ->where('address', '!=', '')
                ->groupBy('address')
                ->orderByDesc('count')
                ->limit(10)
                ->get();

            $barangayLines = $topBarangays->map(function ($b) {
                return "  - {$b->address}: {$b->count} reports ({$b->critical_high} critical/high)";
            })->implode("\n");

            // ── NEW: Team performance ──
            $teamAvgExpr = DB::getDriverName() === 'sqlite'
                ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
                : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

            $teams = Team::withCount([
                    'reports as total_assigned',
                    'reports as resolved_count' => fn ($q) => $q->whereNotNull('resolved_at'),
                ])
                ->where('is_active', true)
                ->get(['id', 'name']);

            $teamLines = $teams->map(function ($team) use ($teamAvgExpr) {
                $eff = $team->total_assigned > 0 ? round(($team->resolved_count / $team->total_assigned) * 100) : 0;
                $avg = Report::where('assigned_team_id', $team->id)
                    ->whereNotNull('resolved_at')
                    ->selectRaw("$teamAvgExpr as avg_minutes")
                    ->value('avg_minutes');
                $avgMin = round((float) ($avg ?? 0), 1);
                $activeNow = Report::where('assigned_team_id', $team->id)
                    ->whereIn('status', ['verified', 'assigned'])
                    ->count();
                return "  - {$team->name}: {$team->resolved_count}/{$team->total_assigned} resolved ({$eff}% efficiency), avg {$avgMin} min, {$activeNow} active now";
            })->implode("\n");

            // ── NEW: SLA breach data ──
            $slaEnabled = Setting::getValue('sla_enabled', false);
            $slaSection = '';
            if ($slaEnabled) {
                $totalBreached = ReportSlaTracking::where('sla_status', 'breached')->count();
                $totalAtRisk   = ReportSlaTracking::whereNull('completed_at')
                    ->get()
                    ->filter(fn ($t) => $t->computeCurrentStatus() === 'at_risk')
                    ->count();
                $totalTracked  = ReportSlaTracking::count();
                $breachRate    = $totalTracked > 0 ? round(($totalBreached / $totalTracked) * 100, 1) : 0;
                $slaSection = "\nSLA Performance (enabled):\n- Total SLA-tracked stages: {$totalTracked}\n- Breached: {$totalBreached} ({$breachRate}%)\n- Currently at risk: {$totalAtRisk}";
            }

            // ── NEW: Report source distribution ──
            $sources = (clone $reportQuery)
                ->selectRaw("COALESCE(source, 'mobile') as source, COUNT(*) as count")
                ->groupBy(DB::raw("COALESCE(source, 'mobile')"))
                ->pluck('count', 'source');

            $sourceLines = $sources->map(function ($count, $source) {
                return "  - {$source}: {$count}";
            })->implode("\n");

            // Per-center evacuation details
            $centers = EvacuationCenter::orderByDesc('current_occupancy')
                ->get(['name', 'type', 'capacity', 'current_occupancy', 'is_active']);

            $total_capacity  = $centers->sum('capacity');
            $total_occupancy = $centers->sum('current_occupancy');
            $occupancy_pct   = $total_capacity > 0
                ? round(($total_occupancy / $total_capacity) * 100, 1)
                : 0;

            $centerLines = $centers->map(function ($c) {
                $pct    = $c->capacity > 0 ? round(($c->current_occupancy / $c->capacity) * 100) : 0;
                $status = $c->is_active ? 'ACTIVE' : 'INACTIVE';
                $flag   = '';
                if ($pct >= 90 && $c->is_active) $flag = ' [NEAR CAPACITY]';
                if (!$c->is_active && $c->current_occupancy > 0) $flag = ' [WARNING: INACTIVE WITH EVACUEES]';
                return "  - {$c->name} ({$c->type}): {$c->current_occupancy}/{$c->capacity} ({$pct}%) — {$status}{$flag}";
            })->implode("\n");

            // Daily trend — last 7 days
            $dailyTrend = Report::selectRaw("DATE(created_at) as date, count(*) as new_reports, SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved")
                ->where('created_at', '>=', now()->subDays(7))
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->get();

            $trendLines = $dailyTrend->map(function ($d) {
                $date     = \Carbon\Carbon::parse($d->date)->format('M d (D)');
                $newR     = (int) $d->new_reports;
                $resR     = (int) $d->resolved;
                $backlog  = $newR - $resR;
                $indicator = $backlog > 0 ? " [+{$backlog} backlog]" : ($backlog < 0 ? " [{$backlog} backlog reduced]" : '');
                return "  - {$date}: {$newR} new, {$resR} resolved{$indicator}";
            })->implode("\n");

            $trendDays    = $dailyTrend->values();
            $totalNew7d   = $trendDays->sum('new_reports');
            $totalRes7d   = $trendDays->sum('resolved');
            $backlog7d    = $totalNew7d - $totalRes7d;
            $resRate7d    = $totalNew7d > 0 ? round(($totalRes7d / $totalNew7d) * 100, 1) : 0;

            $halfPoint    = (int) ceil($trendDays->count() / 2);
            $firstHalf    = $trendDays->slice(0, $halfPoint);
            $secondHalf   = $trendDays->slice($halfPoint);
            $avgFirst     = $firstHalf->count() > 0 ? round($firstHalf->avg('new_reports'), 1) : 0;
            $avgSecond    = $secondHalf->count() > 0 ? round($secondHalf->avg('new_reports'), 1) : 0;
            $surgeNote    = '';
            if ($avgFirst > 0 && $avgSecond > $avgFirst * 1.5) {
                $surgeNote = 'SURGE DETECTED: reports in recent days are significantly higher than earlier in the week.';
            } elseif ($avgFirst > 0 && $avgSecond < $avgFirst * 0.5) {
                $surgeNote = 'Reports are declining compared to earlier in the week.';
            }

            $sev_critical = $severity_breakdown['critical'] ?? 0;
            $sev_high     = $severity_breakdown['high']     ?? 0;
            $sev_moderate = $severity_breakdown['moderate'] ?? 0;
            $sev_low      = $severity_breakdown['low']      ?? 0;
            $top_name     = $top_responder?->name ?? 'N/A';
            $top_count    = $top_responder?->resolved_count ?? 0;
            $avg_minutes  = round((float) ($avg_response_time_raw ?? 0), 1);
            $centerCount  = $centers->count();
            $activeCount  = $centers->where('is_active', true)->count();
            $barangayCount = $topBarangays->count();
            $teamCount     = $teams->count();

            $prompt = <<<PROMPT
Analysis period: {$periodLabel}

=== FLOOD REPORT DATA ({$periodLabel}) ===
- Total reports: {$total_reports}
- Pending reports: {$pending}
- Active reports (verified/assigned): {$active}
- Resolved reports: {$resolved}
- Critical severity: {$sev_critical}
- High severity: {$sev_high}
- Moderate severity: {$sev_moderate}
- Low severity: {$sev_low}
- Average total response time: {$avg_minutes} minutes
- Top responder: {$top_name} with {$top_count} resolved reports

=== RESPONSE TIME BREAKDOWN (avg per stage) ===
- Report → Verified: {$avgR2V} minutes (how long until admin verifies)
- Verified → Assigned: {$avgV2A} minutes (how long until team is dispatched)
- Assigned → Resolved: {$avgA2R} minutes (how long until on-ground resolution)
Note: Identify which stage is the slowest bottleneck and why it matters.

=== TOP AFFECTED AREAS ({$barangayCount} areas) ===
{$barangayLines}

=== TEAM PERFORMANCE ({$teamCount} active teams) ===
{$teamLines}
{$slaSection}

=== REPORT SOURCES ===
{$sourceLines}

=== DAILY TREND (last 7 days) ===
{$trendLines}
  Summary: {$totalNew7d} new reports, {$totalRes7d} resolved, net backlog: {$backlog7d}, resolution rate: {$resRate7d}%
  {$surgeNote}

=== EVACUATION CENTERS ({$activeCount} active / {$centerCount} total, {$total_occupancy}/{$total_capacity} occupancy — {$occupancy_pct}%) ===
{$centerLines}

Analyze this flood situation comprehensively. Respond ONLY with a JSON object in this exact format:
{
  "risk_level": "critical" | "high" | "moderate" | "low",
  "confidence": "high" | "medium" | "low",
  "summary": "2-3 sentence executive summary of the situation.",
  "key_findings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4"],
  "bottleneck": {
    "stage": "report_to_verified" | "verified_to_assigned" | "assigned_to_resolved",
    "avg_minutes": <number>,
    "explanation": "Why this stage is the bottleneck and its impact.",
    "fix": "Specific action to reduce this stage's time."
  },
  "affected_areas": [
    {"name": "Barangay Name", "risk": "critical|high|moderate|low", "reason": "Why this area is at risk"}
  ],
  "team_actions": [
    {"team": "Team Name", "action": "Specific action for this team", "priority": "high|medium|low"}
  ],
  "evacuation_actions": [
    {"center": "Center Name", "action": "open|close|expand|monitor|relocate", "reason": "Why this action is needed"}
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "priority_action": "The single most important immediate action to take."
}

Rules:
- "affected_areas": include up to 5 most critical areas from the data. If no areas have reports, return empty array.
- "team_actions": include specific actions for teams that need attention (overloaded, low efficiency, or idle). If all teams are fine, return empty array.
- "evacuation_actions": include actions for centers that need intervention (near capacity, inactive with evacuees, underutilized). If all centers are fine, return empty array.
- "confidence": "high" if 50+ reports with good data coverage, "medium" if 10-49, "low" if under 10 reports.
- "bottleneck": always identify the slowest stage even if times are reasonable — this helps continuous improvement.
PROMPT;

            $systemPrompt = match($period) {
                'today' => 'You are an AI disaster analyst for a Philippine municipal flood response system (MDRRMC). You are providing a REAL-TIME situational briefing for today. Be urgent and direct. Focus on: immediate threats from the report data, response bottlenecks that are slowing teams RIGHT NOW, evacuation centers needing immediate action, and which barangays are most at risk today. Use the response time breakdown to identify where the pipeline is stuck. If SLA breaches exist, escalate urgency. Cross-reference team performance with affected areas — are the right teams deployed to the right places? Return only valid JSON.',
                'week'  => 'You are an AI disaster analyst for a Philippine municipal flood response system (MDRRMC). You are analyzing this week\'s flood activity. Identify trends: are reports surging or declining? Is the response pipeline keeping up? Use the stage-by-stage response times to pinpoint bottlenecks. Compare team workloads — flag imbalances. Assess whether evacuation center capacity matches the geographic distribution of reports. Recommend resource reallocation if needed. Return only valid JSON.',
                'month' => 'You are an AI disaster analyst for a Philippine municipal flood response system (MDRRMC). You are providing a monthly operational review. Analyze patterns: recurring hotspot barangays, systemic bottlenecks in the response pipeline, team performance trends, and evacuation center utilization efficiency. Recommend structural improvements — staffing, training, infrastructure. Use the source breakdown to suggest communication strategy improvements. Return only valid JSON.',
                default => 'You are an AI disaster analyst for a Philippine municipal flood response system (MDRRMC). You are providing a comprehensive strategic overview. Identify long-term patterns, systemic bottlenecks across all response stages, team capacity gaps, geographic risk concentrations, and evacuation infrastructure adequacy. Make data-driven recommendations for budget, staffing, infrastructure, and process improvements. Assess whether the overall system is improving or degrading. Return only valid JSON.',
            };

            $client   = OpenAI::factory()
                ->withApiKey(config('services.openai.key'))
                ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                ->make();
            $response = $client->chat()->create([
                'model'       => 'gpt-4o-mini',
                'temperature' => 0.4,
                'messages'    => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $prompt],
                ],
            ]);

            $content = $response->choices[0]->message->content;

            // Strip markdown code fences if present
            $content = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
            $content = preg_replace('/\s*```$/', '', $content);

            $data = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \RuntimeException('Invalid JSON returned from OpenAI: ' . $content);
            }

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'Failed to generate AI insights.',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
