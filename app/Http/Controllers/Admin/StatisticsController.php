<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use App\Models\Report;
use App\Models\User;
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
        $from = match($period) {
            'today' => today(),
            'week'  => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };
        $reportQuery = Report::query();
        if ($from) $reportQuery->where('created_at', '>=', $from);

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

        // Evacuation center stats
        $evacuation_stats = [
            'total_centers'   => EvacuationCenter::count(),
            'total_capacity'  => (int) EvacuationCenter::sum('capacity'),
            'total_occupancy' => (int) EvacuationCenter::sum('current_occupancy'),
        ];

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
            'period'             => $period,
        ]);
    }

    public function aiInsights(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $avgExpr = DB::getDriverName() === 'sqlite'
                ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
                : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

            $total_reports   = Report::count();
            $pending         = Report::where('status', 'pending')->count();
            $active          = Report::whereIn('status', ['verified', 'assigned'])->count();
            $resolved        = Report::where('status', 'resolved')->count();

            $severity_breakdown = Report::selectRaw('severity, count(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity');

            $avg_response_time_raw = Report::where('status', 'resolved')
                ->whereNotNull('resolved_at')
                ->selectRaw("$avgExpr as avg_minutes")
                ->value('avg_minutes');

            $top_responder = User::where('role', 'responder')
                ->withCount(['assignedReports as resolved_count' => fn ($q) => $q->where('status', 'resolved')])
                ->orderByDesc('resolved_count')
                ->first(['id', 'name']);

            $total_capacity  = (int) EvacuationCenter::sum('capacity');
            $total_occupancy = (int) EvacuationCenter::sum('current_occupancy');
            $occupancy_pct   = $total_capacity > 0
                ? round(($total_occupancy / $total_capacity) * 100, 1)
                : 0;

            $sev_critical = $severity_breakdown['critical'] ?? 0;
            $sev_high     = $severity_breakdown['high']     ?? 0;
            $sev_moderate = $severity_breakdown['moderate'] ?? 0;
            $sev_low      = $severity_breakdown['low']      ?? 0;
            $top_name     = $top_responder?->name ?? 'N/A';
            $top_count    = $top_responder?->resolved_count ?? 0;
            $avg_minutes  = round((float) ($avg_response_time_raw ?? 0), 1);

            $prompt = <<<PROMPT
Current flood situation data:
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
- Evacuation centers: {$total_occupancy} people sheltered out of {$total_capacity} capacity ({$occupancy_pct}% full)

Please analyze this flood situation and respond ONLY with a JSON object in this exact format:
{
  "risk_level": "critical" | "high" | "moderate" | "low",
  "summary": "A concise 2-3 sentence summary of the current flood situation.",
  "key_findings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "priority_action": "The single most important immediate action to take."
}
PROMPT;

            $client   = OpenAI::client(env('OPENAI_API_KEY'));
            $response = $client->chat()->create([
                'model'       => 'gpt-4o-mini',
                'temperature' => 0.4,
                'messages'    => [
                    [
                        'role'    => 'system',
                        'content' => 'You are an AI assistant specializing in flood disaster management and emergency response. Analyze the provided data and return only valid JSON with no additional text or markdown.',
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
