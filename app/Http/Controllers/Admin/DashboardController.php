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

    /**
     * Normalize a report to its barangay name using config/barangays.php.
     *
     * Strategy:
     * 1. If lat/lng is available → find nearest barangay by distance (most reliable)
     * 2. Else if address text → match known barangay names from config
     * 3. Fallback → "Other / Unclassified"
     */
    private function normalizeBarangay(?string $address, ?float $lat = null, ?float $lng = null): string
    {
        $barangays = config('barangays', []);

        // Strategy 1: Nearest barangay by coordinates (most accurate)
        if ($lat && $lng) {
            $nearest = null;
            $minDist = PHP_FLOAT_MAX;

            foreach ($barangays as $brgy) {
                $dist = sqrt(pow($lat - $brgy['latitude'], 2) + pow($lng - $brgy['longitude'], 2));
                if ($dist < $minDist) {
                    $minDist = $dist;
                    $nearest = $brgy['name'];
                }
            }

            if ($nearest) {
                return $nearest;
            }
        }

        // Strategy 2: Match barangay name from address text
        if ($address) {
            $address = trim($address);

            // Sort by name length descending so "Malapad na Bato" matches before "Bato"
            $sorted = collect($barangays)->sortByDesc(fn ($b) => mb_strlen($b['name']))->values();

            foreach ($sorted as $brgy) {
                $name = $brgy['name'];

                // For numbered Poblacion barangays: match "Barangay 3", "Brgy. 3", etc.
                if (preg_match('/^Barangay\s+(\d+)/i', $name, $m)) {
                    $num = $m[1];
                    if (preg_match('/\b(?:Brgy\.?|Barangay)\s*' . $num . '\b/i', $address)) {
                        return $name;
                    }
                    // Also match Roman numerals for Poblacion
                    $roman = ['1' => 'I', '2' => 'II', '3' => 'III', '4' => 'IV', '5' => 'V',
                              '6' => 'VI', '7' => 'VII', '8' => 'VIII', '9' => 'IX', '10' => 'X',
                              '11' => 'XI', '12' => 'XII'];
                    if (isset($roman[$num]) && preg_match('/\b(?:Brgy\.?|Barangay)\s*' . preg_quote($roman[$num], '/') . '\b/i', $address)) {
                        return $name;
                    }
                    continue;
                }

                // For regular barangays: match "Brgy. Wawa", "Barangay Wawa", or just "Wawa"
                $escaped = preg_quote($name, '/');
                if (preg_match('/\b(?:Brgy\.?\s*|Barangay\s*)?' . $escaped . '\b/i', $address)) {
                    return $name;
                }
            }

            // Generic Poblacion mention without a number
            if (preg_match('/\bPoblacion\b/i', $address)) {
                return 'Barangay 1 (Pob.)';
            }
        }

        return 'Other / Unclassified';
    }

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        // Filters
        $filterSeverity  = $request->get('severity');
        $filterStatus    = $request->get('status');
        $filterBarangay  = $request->get('barangay');

        // Base query scoped by period + filters
        $reportQuery = $this->scopeByPeriod(Report::query(), $from, $to)
            ->when($filterSeverity, fn ($q) => $q->whereIn('severity', explode(',', $filterSeverity)))
            ->when($filterStatus, fn ($q) => $q->whereIn('status', explode(',', $filterStatus)))
            ->when($filterBarangay, function ($q) use ($filterBarangay) {
                $barangays = explode(',', $filterBarangay);
                $q->where(function ($sub) use ($barangays) {
                    foreach ($barangays as $b) {
                        $sub->orWhere('address', 'like', "%{$b}%");
                    }
                });
            });

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

        // Shared filter closure for trend queries
        $applyFilters = fn ($q) => $q
            ->when($filterSeverity, fn ($q2) => $q2->whereIn('severity', explode(',', $filterSeverity)))
            ->when($filterStatus, fn ($q2) => $q2->whereIn('status', explode(',', $filterStatus)))
            ->when($filterBarangay, function ($q2) use ($filterBarangay) {
                $barangays = explode(',', $filterBarangay);
                $q2->where(function ($sub) use ($barangays) {
                    foreach ($barangays as $b) {
                        $sub->orWhere('address', 'like', "%{$b}%");
                    }
                });
            });

        // Trends
        $curReports  = $this->scopeByPeriod($applyFilters(Report::query()), $from, $to)->count();
        $prevReports = $applyFilters(Report::query())->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $reportsTrend = $this->calcTrend($curReports, $prevReports);

        $curResolved  = $this->scopeByPeriod($applyFilters(Report::where('status', 'resolved')), $from, $to, 'resolved_at')->count();
        $prevResolved = $applyFilters(Report::where('status', 'resolved'))->whereBetween('resolved_at', [$prevFrom, $prevTo])->count();
        $resolvedTrend = $this->calcTrend($curResolved, $prevResolved);

        $curActive  = $this->scopeByPeriod($applyFilters(Report::whereIn('status', ['verified', 'assigned'])), $from, $to)->count();
        $prevActive = $applyFilters(Report::whereIn('status', ['verified', 'assigned']))->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $activeTrend = $this->calcTrend($curActive, $prevActive);

        $curPending  = $this->scopeByPeriod($applyFilters(Report::where('status', 'pending')), $from, $to)->count();
        $prevPending = $applyFilters(Report::where('status', 'pending'))->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $pendingTrend = $this->calcTrend($curPending, $prevPending);

        $curAlerts  = $this->scopeByPeriod(Alert::query(), $from, $to)->count();
        $prevAlerts = Alert::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $alertsTrend = $this->calcTrend($curAlerts, $prevAlerts);

        // Daily reports for the last 90 days (frontend slices to 7/14/30/90)
        $dailyReports = $applyFilters(Report::select(
                DB::raw("DATE(created_at) as date"),
                DB::raw("COUNT(*) as total"),
                DB::raw("SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved")
            ))
            ->where('created_at', '>=', now()->subDays(90))
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

        // ── Verification Rate ──
        $totalReports = (clone $reportQuery)->count();
        $verifiedReports = (clone $reportQuery)->whereIn('status', ['verified', 'assigned', 'resolved', 'rejected'])->count();
        $verification_rate = $totalReports > 0 ? round(($verifiedReports / $totalReports) * 100) : 0;

        // ── Barangay Breakdown (top 8 by report count, normalized via coordinates) ──
        $rawBarangayData = (clone $reportQuery)
            ->select('address', 'latitude', 'longitude')
            ->get();

        $normalizedCounts = [];
        foreach ($rawBarangayData as $row) {
            $brgy = $this->normalizeBarangay($row->address, $row->latitude ? (float) $row->latitude : null, $row->longitude ? (float) $row->longitude : null);
            $normalizedCounts[$brgy] = ($normalizedCounts[$brgy] ?? 0) + 1;
        }
        arsort($normalizedCounts);

        $barangay_breakdown = collect(array_slice($normalizedCounts, 0, 8, true))
            ->map(fn ($count, $brgy) => ['barangay' => $brgy, 'count' => $count])
            ->values();

        // ── Flood Risk Score (all-time analysis per barangay, normalized) ──
        $severityWeight = ['critical' => 4, 'high' => 3, 'moderate' => 2, 'low' => 1];
        $currentMonth = now()->month;

        $allReportsForRisk = Report::select('address', 'severity', 'created_at', 'latitude', 'longitude')
            ->get();

        // Group by normalized barangay (using coordinates when available)
        $barangayGroups = [];
        foreach ($allReportsForRisk as $report) {
            $brgy = $this->normalizeBarangay($report->address, $report->latitude ? (float) $report->latitude : null, $report->longitude ? (float) $report->longitude : null);
            if (!isset($barangayGroups[$brgy])) {
                $barangayGroups[$brgy] = ['severities' => [], 'months' => []];
            }
            $barangayGroups[$brgy]['severities'][] = $report->severity;
            $month = (int) date('n', strtotime($report->created_at));
            $barangayGroups[$brgy]['months'][] = $month;
        }

        $riskScores = [];
        $maxCount = max(array_map(fn ($g) => count($g['severities']), $barangayGroups) ?: [1]);

        foreach ($barangayGroups as $brgy => $group) {
            $totalCount = count($group['severities']);
            $weightedSeverity = array_sum(array_map(fn ($s) => $severityWeight[$s] ?? 1, $group['severities']));
            $avgSeverity = $totalCount > 0 ? $weightedSeverity / $totalCount : 0;

            $currentMonthCount = count(array_filter($group['months'], fn ($m) => $m === $currentMonth));
            $seasonalMatch = $totalCount > 0 ? ($currentMonthCount / $totalCount) : 0;

            $freqNorm = $maxCount > 0 ? $totalCount / $maxCount : 0;
            $sevNorm = $avgSeverity / 4;

            $score = round(($freqNorm * 40) + ($sevNorm * 30) + ($seasonalMatch * 30));
            $level = $score >= 60 ? 'High' : ($score >= 30 ? 'Moderate' : 'Low');

            $riskScores[] = [
                'barangay'  => $brgy,
                'score'     => $score,
                'level'     => $level,
                'incidents' => $totalCount,
            ];
        }

        usort($riskScores, fn ($a, $b) => $b['score'] <=> $a['score']);
        $flood_risk_scores = array_slice($riskScores, 0, 5);

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
            'verification_rate'  => $verification_rate,
            'barangay_breakdown' => $barangay_breakdown,
            'flood_risk_scores'  => $flood_risk_scores,
            'period'             => $period,
            'custom_from'        => $request->get('from'),
            'custom_to'          => $request->get('to'),
            'filters'            => [
                'severity'  => $filterSeverity,
                'status'    => $filterStatus,
                'barangay'  => $filterBarangay,
            ],
            'barangay_list'      => collect(config('barangays', []))->pluck('name')->sort()->values(),
        ]);
    }
}
