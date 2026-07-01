<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ResponderStatsController extends Controller
{
    /**
     * Return stats for the authenticated responder.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $resolvedQuery = $user->assignedReports()->where('status', 'resolved');

        $resolvedTotal = (clone $resolvedQuery)->count();

        $startOfWeek = Carbon::now()->startOfWeek();
        $resolvedThisWeek = (clone $resolvedQuery)
            ->where('resolved_at', '>=', $startOfWeek)
            ->count();

        $startOfMonth = Carbon::now()->startOfMonth();
        $resolvedThisMonth = (clone $resolvedQuery)
            ->where('resolved_at', '>=', $startOfMonth)
            ->count();

        $activeCount = $user->assignedReports()
            ->where('status', '!=', 'resolved')
            ->count();

        $avgResponseMinutes = (clone $resolvedQuery)
            ->whereNotNull('resolved_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as avg_minutes')
            ->value('avg_minutes');

        return response()->json([
            'resolved_total'       => $resolvedTotal,
            'resolved_this_week'   => $resolvedThisWeek,
            'resolved_this_month'  => $resolvedThisMonth,
            'active_count'         => $activeCount,
            'avg_response_minutes' => round((float) $avgResponseMinutes, 1),
        ]);
    }
}
