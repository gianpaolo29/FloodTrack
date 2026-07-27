<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ResponderStatsController extends Controller
{
    /**
     * Return stats for the authenticated responder.
     *
     * Counts reports where the user is:
     *  - directly assigned (assigned_to)
     *  - listed in report_responders pivot
     *  - member of the assigned team (assigned_team_id)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $baseQuery = Report::where(function ($q) use ($user) {
            $q->where('assigned_to', $user->id)
              ->orWhereHas('responders', fn ($r) => $r->where('user_id', $user->id));
            if ($user->team_id) {
                $q->orWhere('assigned_team_id', $user->team_id);
            }
        });

        $resolvedQuery = (clone $baseQuery)->where('status', 'resolved');

        $resolvedTotal = (clone $resolvedQuery)->count();

        $startOfWeek = Carbon::now()->startOfWeek();
        $resolvedThisWeek = (clone $resolvedQuery)
            ->where('resolved_at', '>=', $startOfWeek)
            ->count();

        $startOfMonth = Carbon::now()->startOfMonth();
        $resolvedThisMonth = (clone $resolvedQuery)
            ->where('resolved_at', '>=', $startOfMonth)
            ->count();

        $activeCount = (clone $baseQuery)
            ->where('status', '!=', 'resolved')
            ->count();

        $avgExpr = DB::getDriverName() === 'sqlite'
            ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
            : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

        $avgResponseMinutes = (clone $resolvedQuery)
            ->whereNotNull('resolved_at')
            ->selectRaw("$avgExpr as avg_minutes")
            ->value('avg_minutes');

        return response()->json([
            'resolved_total'       => $resolvedTotal,
            'resolved_this_week'   => $resolvedThisWeek,
            'resolved_this_month'  => $resolvedThisMonth,
            'active_count'         => $activeCount,
            'avg_response_minutes' => round((float) $avgResponseMinutes, 1),
        ]);
    }

    /**
     * Return aggregated stats for the authenticated user's entire team.
     * GET /responder/team/stats
     */
    public function teamStats(Request $request)
    {
        $user = $request->user();

        if (! $user->team_id) {
            return response()->json(['message' => 'Not part of a team.'], 404);
        }

        $baseQuery = Report::where(function ($q) use ($user) {
            $q->where('assigned_team_id', $user->team_id)
              ->orWhereIn('assigned_to', function ($sub) use ($user) {
                  $sub->select('id')
                      ->from('users')
                      ->where('team_id', $user->team_id);
              });
        });

        $resolvedQuery = (clone $baseQuery)->where('status', 'resolved');

        $resolvedTotal = (clone $resolvedQuery)->count();

        $startOfWeek = Carbon::now()->startOfWeek();
        $resolvedThisWeek = (clone $resolvedQuery)
            ->where('resolved_at', '>=', $startOfWeek)
            ->count();

        $startOfMonth = Carbon::now()->startOfMonth();
        $resolvedThisMonth = (clone $resolvedQuery)
            ->where('resolved_at', '>=', $startOfMonth)
            ->count();

        $activeCount = (clone $baseQuery)
            ->where('status', '!=', 'resolved')
            ->count();

        $avgExpr = DB::getDriverName() === 'sqlite'
            ? 'AVG((julianday(resolved_at) - julianday(created_at)) * 1440)'
            : 'AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))';

        $avgResponseMinutes = (clone $resolvedQuery)
            ->whereNotNull('resolved_at')
            ->selectRaw("$avgExpr as avg_minutes")
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
