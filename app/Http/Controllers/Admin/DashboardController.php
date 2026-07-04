<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Report;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $stats = [
            'total_reports'   => Report::count(),
            'pending'         => Report::where('status', 'pending')->count(),
            'active'          => Report::whereIn('status', ['verified', 'assigned'])->count(),
            'resolved_today'  => Report::where('status', 'resolved')
                                       ->whereDate('resolved_at', today())
                                       ->count(),
            'total_users'     => User::where('role', '!=', 'admin')->count(),
            'total_responders'=> User::where('role', 'responder')->count(),
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
        $monthlyReports = Report::select(
                DB::raw("strftime('%Y-%m', created_at) as month"),
                DB::raw("COUNT(*) as total"),
                DB::raw("SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical"),
                DB::raw("SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high")
            )
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy(DB::raw("strftime('%Y-%m', created_at)"))
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => Carbon::parse($row->month . '-01')->format('M'),
                'total' => (int) $row->total,
                'critical' => (int) $row->critical,
                'high' => (int) $row->high,
            ]);

        $severity_breakdown = Report::selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $status_breakdown = Report::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recent_reports = Report::with('user:id,name')
            ->latest()
            ->limit(10)
            ->get(['id', 'reference_number', 'hazard_type', 'severity', 'status', 'address', 'user_id', 'created_at']);

        $active_alerts = Alert::where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })->count();

        return Inertia::render('admin/dashboard', [
            'stats'              => $stats,
            'trends'             => [
                'reports' => $reportsTrend,
                'resolved' => $resolvedTrend,
            ],
            'daily_reports'      => $dailyReports,
            'monthly_reports'    => $monthlyReports,
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'recent_reports'     => $recent_reports,
            'active_alerts'      => $active_alerts,
        ]);
    }
}
