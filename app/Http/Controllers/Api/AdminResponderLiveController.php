<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResponderLocationHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminResponderLiveController extends Controller
{
    /**
     * GET /api/admin/responders/live
     *
     * Returns on-duty responders with position, team, stale flag, active report, route.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', 'responder')
            ->where('is_on_duty', true)
            ->select([
                'id', 'name', 'avatar', 'team_id', 'is_on_duty',
                'current_latitude', 'current_longitude',
                'current_heading', 'current_speed',
                'location_updated_at',
            ])
            ->with(['team:id,name,shift']);

        if ($request->filled('team_id')) {
            $query->where('team_id', $request->integer('team_id'));
        }

        $responders = $query->get()->map(function ($r) {
            $lastSeen = $r->location_updated_at ? Carbon::parse($r->location_updated_at) : null;
            $minutesAgo = $lastSeen ? now()->diffInMinutes($lastSeen) : null;

            // Determine status from report_responders
            $activeRow = \DB::table('report_responders')
                ->where('user_id', $r->id)
                ->whereIn('status', ['en_route', 'on_scene'])
                ->select(['report_id', 'status', 'route'])
                ->first();

            $status = 'idle';
            if ($activeRow) {
                $status = $activeRow->status;
            }

            // Filter by status if requested
            return [
                'id'                => $r->id,
                'name'              => $r->name,
                'avatar_url'        => $r->avatar_url,
                'team_id'           => $r->team_id,
                'team'              => $r->team,
                'lat'               => $r->current_latitude ? (float) $r->current_latitude : null,
                'lng'               => $r->current_longitude ? (float) $r->current_longitude : null,
                'heading'           => $r->current_heading ? (float) $r->current_heading : null,
                'speed'             => $r->current_speed ? (float) $r->current_speed : null,
                'location_updated_at' => $r->location_updated_at?->toIso8601String(),
                'status'            => $status,
                'stale'             => $minutesAgo !== null && $minutesAgo >= 2,
                'offline'           => $minutesAgo === null || $minutesAgo >= 5,
                'active_report_id'  => $activeRow?->report_id,
                'route'             => $activeRow?->route ? json_decode($activeRow->route, true) : null,
            ];
        });

        // Filter by status if requested
        if ($request->filled('status')) {
            $filterStatus = explode(',', $request->input('status'));
            $responders = $responders->filter(fn ($r) => in_array($r['status'], $filterStatus));
        }

        return response()->json($responders->values());
    }

    /**
     * GET /api/admin/responders/{user}/history
     *
     * Returns ordered location points for playback. Max 24h span.
     */
    public function history(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after:from',
        ]);

        $from = Carbon::parse($request->input('from'));
        $to   = Carbon::parse($request->input('to'));

        // Max 24h span
        if ($from->diffInHours($to) > 24) {
            return response()->json(['message' => 'Time span must be 24 hours or less.'], 422);
        }

        $points = ResponderLocationHistory::where('user_id', $user->id)
            ->whereBetween('recorded_at', [$from, $to])
            ->orderBy('recorded_at')
            ->select(['latitude', 'longitude', 'speed', 'accuracy', 'recorded_at'])
            ->get();

        return response()->json($points);
    }
}
