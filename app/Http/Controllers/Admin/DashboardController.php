<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Report;
use App\Models\User;
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
            'severity_breakdown' => $severity_breakdown,
            'status_breakdown'   => $status_breakdown,
            'recent_reports'     => $recent_reports,
            'active_alerts'      => $active_alerts,
        ]);
    }
}
