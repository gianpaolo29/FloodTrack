<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use App\Models\Report;
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
    public function index(Request $request): Response
    {
        // Period filter
        $period = $request->get('period', 'all');

        // Custom date range
        $customFrom = $request->get('from');
        $customTo   = $request->get('to');

        if ($period === 'custom' && $customFrom) {
            $from = Carbon::parse($customFrom)->startOfDay();
            $to   = $customTo ? Carbon::parse($customTo)->endOfDay() : now()->endOfDay();
        } else {
            $from = match($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };
            $to = null;
        }

        $reportQuery = Report::query();
        if ($from && $to) {
            $reportQuery->whereBetween('created_at', [$from, $to]);
        } elseif ($from) {
            $reportQuery->where('created_at', '>=', $from);
        }

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

        // Top affected areas — scoped by period
        $top_areas = (clone $reportQuery)
            ->whereNotNull('address')
            ->where('address', '!=', '')
            ->selectRaw('address, count(*) as count')
            ->groupBy('address')
            ->orderByDesc('count')
            ->limit(8)
            ->get(['address', 'count']);

        // Backlog trend — always last 30 days
        $backlog_trend = Report::selectRaw("DATE(created_at) as date, count(*) as new_reports, SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved")
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn($r) => [
                'date'        => \Carbon\Carbon::parse($r->date)->format('M d'),
                'new_reports' => (int) $r->new_reports,
                'resolved'    => (int) $r->resolved,
            ]);

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
        if ($period === 'custom' && $from) {
            $trendCurrentFrom = $from;
            $trendCurrentTo   = $to ?? now()->endOfDay();
            $rangeDays        = $trendCurrentFrom->diffInDays($trendCurrentTo);
            $trendPreviousTo  = $trendCurrentFrom->copy()->subDay()->endOfDay();
            $trendPreviousFrom = $trendPreviousTo->copy()->subDays($rangeDays)->startOfDay();
            $trendLabel       = 'vs prior period';
            $trendPeriodLabel = $trendCurrentFrom->format('M d') . ' – ' . $trendCurrentTo->format('M d, Y');
        } else {
            $trendCurrentFrom = match ($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => now()->startOfMonth(),
            };
            $trendCurrentTo = null;
            $trendPreviousFrom = match ($period) {
                'today' => today()->subDay(),
                'week'  => now()->subWeek()->startOfWeek(),
                'month' => now()->subMonth()->startOfMonth(),
                default => now()->subMonth()->startOfMonth(),
            };
            $trendPreviousTo = match ($period) {
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

        $calcTrend = function (int $current, int $previous): float {
            return $previous > 0
                ? round((($current - $previous) / $previous) * 100, 1)
                : ($current > 0 ? 100 : 0);
        };

        // Reports trend
        $curReportsQ = Report::where('created_at', '>=', $trendCurrentFrom);
        if ($trendCurrentTo) $curReportsQ->where('created_at', '<=', $trendCurrentTo);
        $currentReports = $curReportsQ->count();
        $previousReports = Report::whereBetween('created_at', [$trendPreviousFrom, $trendPreviousTo])->count();

        // Resolution rate trend
        $curResolvedQ = Report::where('status', 'resolved')->where('resolved_at', '>=', $trendCurrentFrom);
        if ($trendCurrentTo) $curResolvedQ->where('resolved_at', '<=', $trendCurrentTo);
        $currentResolved = $curResolvedQ->count();
        $previousResolved = Report::where('status', 'resolved')->whereBetween('resolved_at', [$trendPreviousFrom, $trendPreviousTo])->count();

        // Avg response time trend
        $curAvgQ = Report::where('status', 'resolved')->whereNotNull('resolved_at')->where('resolved_at', '>=', $trendCurrentFrom);
        if ($trendCurrentTo) $curAvgQ->where('resolved_at', '<=', $trendCurrentTo);
        $currentAvgResp = $curAvgQ->selectRaw("$avgExpr as avg_minutes")->value('avg_minutes');
        $previousAvgResp = Report::where('status', 'resolved')->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$trendPreviousFrom, $trendPreviousTo])
            ->selectRaw("$avgExpr as avg_minutes")->value('avg_minutes');

        // Critical trend
        $curCritQ = Report::where('severity', 'critical')->where('created_at', '>=', $trendCurrentFrom);
        if ($trendCurrentTo) $curCritQ->where('created_at', '<=', $trendCurrentTo);
        $currentCritical = $curCritQ->count();
        $previousCritical = Report::where('severity', 'critical')->whereBetween('created_at', [$trendPreviousFrom, $trendPreviousTo])->count();

        $trends = [
            'reports'      => $calcTrend($currentReports, $previousReports),
            'resolved'     => $calcTrend($currentResolved, $previousResolved),
            'avg_response' => $calcTrend((int) round((float) ($currentAvgResp ?? 0)), (int) round((float) ($previousAvgResp ?? 0))),
            'critical'     => $calcTrend($currentCritical, $previousCritical),
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

        return Inertia::render('admin/statistics/index', [
            'daily_reports'      => $daily_reports,
            'avg_response_time'  => round((float) ($avg_response_time ?? 0), 1),
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'top_responders'     => $top_responders,
            'monthly_trend'      => $monthly_trend->values(),
            'peak_hours'         => $peak_hours,
            'top_areas'          => $top_areas,
            'backlog_trend'      => $backlog_trend,
            'total_reports'      => $total_reports,
            'resolution_rate'    => $resolution_rate,
            'critical_count'     => $critical_count,
            'evacuation_stats'   => $evacuation_stats,
            'evacuation_centers' => $evacuation_centers,
            'team_performance'   => $team_performance,
            'trends'             => $trends,
            'period'             => $period,
            'custom_from'        => $customFrom,
            'custom_to'          => $customTo,
        ]);
    }

    public function aiInsights(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            // Period filter — same logic as index()
            $period = $request->get('period', 'all');
            $from = match($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };

            $periodLabel = match($period) {
                'today' => 'today (' . now()->format('M d, Y') . ')',
                'week'  => 'this week (' . now()->startOfWeek()->format('M d') . ' – ' . now()->format('M d') . ')',
                'month' => 'this month (' . now()->format('F Y') . ')',
                default => 'all time',
            };

            $reportQuery = Report::query();
            if ($from) $reportQuery->where('created_at', '>=', $from);

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

            // Daily trend — last 7 days (new reports vs resolved per day)
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

            // Compute trend direction
            $trendDays    = $dailyTrend->values();
            $totalNew7d   = $trendDays->sum('new_reports');
            $totalRes7d   = $trendDays->sum('resolved');
            $backlog7d    = $totalNew7d - $totalRes7d;
            $resRate7d    = $totalNew7d > 0 ? round(($totalRes7d / $totalNew7d) * 100, 1) : 0;

            // Compare first half vs second half of the 7-day window for surge detection
            $halfPoint    = (int) ceil($trendDays->count() / 2);
            $firstHalf    = $trendDays->slice(0, $halfPoint);
            $secondHalf   = $trendDays->slice($halfPoint);
            $avgFirst     = $firstHalf->count() > 0 ? round($firstHalf->avg('new_reports'), 1) : 0;
            $avgSecond    = $secondHalf->count() > 0 ? round($secondHalf->avg('new_reports'), 1) : 0;
            $surgeNote    = '';
            if ($avgFirst > 0 && $avgSecond > $avgFirst * 1.5) {
                $surgeNote = '⚠ SURGE DETECTED: reports in recent days are significantly higher than earlier in the week.';
            } elseif ($avgFirst > 0 && $avgSecond < $avgFirst * 0.5) {
                $surgeNote = '✓ Reports are declining compared to earlier in the week.';
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

            $prompt = <<<PROMPT
Analysis period: {$periodLabel}

Flood report data ({$periodLabel}):
- Total reports: {$total_reports}
- Pending reports: {$pending}
- Active reports (verified/assigned): {$active}
- Resolved reports: {$resolved}
- Critical severity: {$sev_critical}
- High severity: {$sev_high}
- Moderate severity: {$sev_moderate}
- Low severity: {$sev_low}
- Average response time: {$avg_minutes} minutes
- Top responder: {$top_name} with {$top_count} resolved reports

Daily trend (last 7 days):
{$trendLines}
  Summary: {$totalNew7d} new reports, {$totalRes7d} resolved, net backlog change: {$backlog7d}, resolution rate: {$resRate7d}%
  {$surgeNote}

Evacuation centers ({$activeCount} active out of {$centerCount} total, {$total_occupancy}/{$total_capacity} overall occupancy — {$occupancy_pct}%):
{$centerLines}

Please analyze this flood situation and respond ONLY with a JSON object in this exact format:
{
  "risk_level": "critical" | "high" | "moderate" | "low",
  "summary": "A concise 2-3 sentence summary of the current flood situation.",
  "key_findings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "priority_action": "The single most important immediate action to take."
}
PROMPT;

            // Adapt system prompt tone based on period
            $systemPrompt = match($period) {
                'today' => 'You are an AI assistant specializing in flood disaster management and emergency response. You are providing a real-time situational briefing for today. Focus on immediate threats, urgent actions needed right now, and any evacuation centers that need attention. Flag any centers near capacity or inactive centers that still have evacuees. Use the daily trend data to detect surges — if today\'s reports are significantly higher than prior days, call it out urgently. If backlog is growing (more new than resolved), flag it. Be direct and actionable. Return only valid JSON with no additional text or markdown.',
                'week'  => 'You are an AI assistant specializing in flood disaster management and emergency response. You are analyzing this week\'s flood activity. Use the daily trend data to identify whether reports are surging, stable, or declining day-over-day. Compare the resolution rate against incoming reports — if backlog is growing, highlight the gap. Identify developing trends, areas of concern, and whether the situation is improving or worsening. Highlight evacuation center capacity issues and distribution imbalances. Return only valid JSON with no additional text or markdown.',
                'month' => 'You are an AI assistant specializing in flood disaster management and emergency response. You are providing a monthly operational review. Use the daily trend data to identify patterns — peak days, recurring surges, and resolution bottlenecks. Assess whether the team is keeping up with incoming reports or falling behind. Evaluate evacuation center utilization efficiency and suggest resource planning improvements. Return only valid JSON with no additional text or markdown.',
                default => 'You are an AI assistant specializing in flood disaster management and emergency response. You are providing a comprehensive all-time strategic overview. Use the daily trend data to assess current momentum — is the situation getting better or worse recently? Identify long-term patterns, systemic issues, whether resolution capacity matches report volume, evacuation center capacity planning needs, and strategic recommendations for improving flood response. Return only valid JSON with no additional text or markdown.',
            };

            $client   = OpenAI::client(config('services.openai.key'));
            $response = $client->chat()->create([
                'model'       => 'gpt-4o-mini',
                'temperature' => 0.4,
                'messages'    => [
                    [
                        'role'    => 'system',
                        'content' => $systemPrompt,
                    ],
                    [
                        'role'    => 'user',
                        'content' => $prompt,
                    ],
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
