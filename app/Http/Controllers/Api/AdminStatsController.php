<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function index()
    {
        $stats = [
            'total_reports'    => Report::count(),
            'pending'          => Report::where('status', 'pending')->count(),
            'active'           => Report::whereIn('status', ['verified', 'assigned'])->count(),
            'resolved_today'   => Report::where('status', 'resolved')
                                        ->whereDate('resolved_at', today())
                                        ->count(),
            'total_users'      => User::where('role', '!=', 'admin')->count(),
            'total_responders' => User::where('role', 'responder')->count(),
            'active_alerts'    => Alert::where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })->count(),
        ];

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

        $severityBreakdown = Report::selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $statusBreakdown = Report::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recentReports = Report::with('user:id,name')
            ->latest()
            ->limit(10)
            ->get(['id', 'reference_number', 'severity', 'status', 'address', 'user_id', 'created_at']);

        return response()->json([
            'stats'              => $stats,
            'trends'             => [
                'reports'  => $reportsTrend,
                'resolved' => $resolvedTrend,
            ],
            'severity_breakdown' => $severityBreakdown,
            'status_breakdown'   => $statusBreakdown,
            'recent_reports'     => $recentReports,
        ]);
    }
}
