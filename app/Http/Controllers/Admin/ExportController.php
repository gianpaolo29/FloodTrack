<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ReportsExport;
use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\Report;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    use HasPeriodStats;

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);
        [$prevFrom, $prevTo, $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        $curTotal = $this->scopeByPeriod(Report::query(), $from, $to)->count();
        $prevTotal = Report::whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $curResolved = $this->scopeByPeriod(Report::where('status', 'resolved'), $from, $to)->count();
        $prevResolved = Report::where('status', 'resolved')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $stats = [
            'total'    => $curTotal,
            'pending'  => $this->scopeByPeriod(Report::where('status', 'pending'), $from, $to)->count(),
            'verified' => $this->scopeByPeriod(Report::where('status', 'verified'), $from, $to)->count(),
            'assigned' => $this->scopeByPeriod(Report::where('status', 'assigned'), $from, $to)->count(),
            'resolved' => $curResolved,
            'rejected' => $this->scopeByPeriod(Report::where('status', 'rejected'), $from, $to)->count(),
        ];

        $trends = [
            'total'        => $this->calcTrend($curTotal, $prevTotal),
            'resolved'     => $this->calcTrend($curResolved, $prevResolved),
            'label'        => $trendLabel,
            'period_label' => $periodLabel,
        ];

        return Inertia::render('admin/export/index', [
            'stats'       => $stats,
            'trends'      => $trends,
            'period'      => $period,
            'custom_from' => $request->get('from'),
            'custom_to'   => $request->get('to'),
        ]);
    }

    public function pdf(Request $request): HttpResponse
    {
        $request->validate([
            'period' => 'nullable|in:today,week,month,all',
        ]);

        $period = $request->get('period', 'all');

        $from = match ($period) {
            'today' => today(),
            'week'  => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };

        $reportQuery = Report::query();
        if ($from) {
            $reportQuery->where('created_at', '>=', $from);
        }

        $stats = [
            'total_reports' => (clone $reportQuery)->count(),
            'pending'       => (clone $reportQuery)->where('status', 'pending')->count(),
            'verified'      => (clone $reportQuery)->where('status', 'verified')->count(),
            'assigned'      => (clone $reportQuery)->where('status', 'assigned')->count(),
            'resolved'      => (clone $reportQuery)->where('status', 'resolved')->count(),
            'rejected'      => (clone $reportQuery)->where('status', 'rejected')->count(),
            'active'        => (clone $reportQuery)->whereIn('status', ['verified', 'assigned'])->count(),
            'resolved_today'=> Report::where('status', 'resolved')->whereDate('resolved_at', today())->count(),
        ];

        $severity_breakdown = (clone $reportQuery)
            ->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $status_breakdown = (clone $reportQuery)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recent_reports = Report::with('user:id,name', 'assignedTeam:id,name')
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->latest()
            ->limit(20)
            ->get(['id', 'reference_number', 'severity', 'status', 'address', 'user_id', 'assigned_team_id', 'created_at']);

        $top_responders = User::where('role', 'responder')
            ->withCount(['assignedReports as resolved_count' => fn ($q) => $q->where('status', 'resolved')])
            ->withCount('assignedReports as total_assigned')
            ->orderByDesc('resolved_count')
            ->limit(5)
            ->get(['id', 'name', 'email']);

        $periodLabel = match ($period) {
            'today' => 'Today (' . now()->format('F j, Y') . ')',
            'week'  => 'This Week (' . now()->startOfWeek()->format('M j') . ' – ' . now()->format('M j, Y') . ')',
            'month' => 'This Month (' . now()->format('F Y') . ')',
            default => 'All Time',
        };

        $pdf = Pdf::loadView('exports.dashboard', compact(
            'stats', 'severity_breakdown', 'status_breakdown',
            'recent_reports', 'top_responders', 'periodLabel'
        ))->setPaper('a4', 'portrait');

        $filename = 'floodtrack-dashboard-' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function download(Request $request): StreamedResponse
    {
        $request->validate([
            'status'      => 'nullable|in:pending,verified,assigned,resolved,rejected',
            'severity'    => 'nullable|in:low,moderate,high,critical',
            'date_from'   => 'nullable|date|before_or_equal:today|before_or_equal:date_to',
            'date_to'     => 'nullable|date|before_or_equal:today|after_or_equal:date_from',
        ]);

        $reportQuery = Report::query()
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to));

        $reports = (clone $reportQuery)
            ->with(['user:id,name', 'assignedResponder:id,name', 'assignedTeam:id,name'])
            ->latest()
            ->limit(10000)
            ->get();

        // Stats for the summary sheet
        $stats = [
            'total_reports' => (clone $reportQuery)->count(),
            'pending'       => (clone $reportQuery)->where('status', 'pending')->count(),
            'verified'      => (clone $reportQuery)->where('status', 'verified')->count(),
            'assigned'      => (clone $reportQuery)->where('status', 'assigned')->count(),
            'resolved'      => (clone $reportQuery)->where('status', 'resolved')->count(),
            'rejected'      => (clone $reportQuery)->where('status', 'rejected')->count(),
        ];

        $severityBreakdown = (clone $reportQuery)
            ->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $statusBreakdown = (clone $reportQuery)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $topResponders = User::where('role', 'responder')
            ->withCount(['assignedReports as resolved_count' => fn ($q) => $q->where('status', 'resolved')])
            ->withCount('assignedReports as total_assigned')
            ->orderByDesc('resolved_count')
            ->limit(5)
            ->get(['id', 'name', 'email']);

        $periodLabel = 'All Reports';
        if ($request->date_from && $request->date_to) {
            $periodLabel = "{$request->date_from} to {$request->date_to}";
        } elseif ($request->date_from) {
            $periodLabel = "From {$request->date_from}";
        } elseif ($request->date_to) {
            $periodLabel = "Up to {$request->date_to}";
        }

        $parts = ['floodtrack-reports'];
        if ($request->status)   $parts[] = $request->status;
        if ($request->severity) $parts[] = $request->severity;
        $parts[] = now()->format('Y-m-d');
        $filename = implode('-', $parts) . '.xlsx';

        $export = new ReportsExport(
            $reports,
            $stats,
            $severityBreakdown,
            $statusBreakdown,
            $topResponders,
            $periodLabel,
        );

        return response()->streamDownload(function () use ($export, $filename) {
            $export->download($filename);
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
