<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function index(): Response
    {
        // Reports per day (last 30 days)
        $daily_reports = Report::selectRaw('DATE(created_at) as date, count(*) as count')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date');

        // Average response time (created → resolved) in hours
        $avg_response_time = Report::where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
            ->value('avg_hours');

        // If using SQLite (dev), use julianday instead
        if ($avg_response_time === null) {
            $avg_response_time = Report::where('status', 'resolved')
                ->whereNotNull('resolved_at')
                ->selectRaw('AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg_hours')
                ->value('avg_hours');
        }

        // Reports by severity
        $severity_breakdown = Report::selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        // Reports by status
        $status_breakdown = Report::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // Top 5 responders by resolved count
        $top_responders = User::where('role', 'responder')
            ->withCount(['assignedReports as resolved_count' => fn ($q) => $q->where('status', 'resolved')])
            ->orderByDesc('resolved_count')
            ->limit(5)
            ->get(['id', 'name']);

        // Monthly trend (last 6 months)
        $monthExpr = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $monthly_trend = Report::selectRaw("$monthExpr as month, count(*) as count")
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month');

        return Inertia::render('admin/statistics/index', [
            'daily_reports'      => $daily_reports,
            'avg_response_time'  => round((float) ($avg_response_time ?? 0), 1),
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'top_responders'     => $top_responders,
            'monthly_trend'      => $monthly_trend,
        ]);
    }
}
