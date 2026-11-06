<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ResponderLocationHistory;
use App\Services\SocketService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResponderLocationController extends Controller
{
    /**
     * POST /api/responder/locations
     *
     * Accepts a batch of 1–200 GPS points from a responder.
     * Filters bad data, stores history, updates latest position, broadcasts.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Role check
        if ($user->role !== 'responder') {
            return response()->json(['message' => 'Only responders can submit locations.'], 403);
        }

        // Off duty → tell the app to go idle
        if (! $user->is_on_duty) {
            return response()->json(['on_duty' => false], 200);
        }

        $request->validate([
            'points'              => 'required|array|min:1|max:200',
            'points.*.lat'        => 'required|numeric|between:-90,90',
            'points.*.lng'        => 'required|numeric|between:-180,180',
            'points.*.heading'    => 'nullable|numeric|between:0,360',
            'points.*.speed'      => 'nullable|numeric|min:0',
            'points.*.accuracy'   => 'nullable|numeric|min:0',
            'points.*.recorded_at' => 'required|date',
        ]);

        $points = collect($request->input('points'))
            ->map(fn ($p) => [
                'lat'         => (float) $p['lat'],
                'lng'         => (float) $p['lng'],
                'heading'     => isset($p['heading']) ? (float) $p['heading'] : null,
                'speed'       => isset($p['speed']) ? (float) $p['speed'] : null,
                'accuracy'    => isset($p['accuracy']) ? (float) $p['accuracy'] : null,
                'recorded_at' => Carbon::parse($p['recorded_at'])->utc(),
            ])
            ->sortBy('recorded_at')
            ->values();

        $now = now();
        $lastUpdatedAt = $user->location_updated_at ? Carbon::parse($user->location_updated_at) : null;
        $prevLat = $user->current_latitude ? (float) $user->current_latitude : null;
        $prevLng = $user->current_longitude ? (float) $user->current_longitude : null;
        $prevTime = $lastUpdatedAt;

        $accepted = collect();

        foreach ($points as $point) {
            // Reject future timestamps (> 5 min ahead)
            if ($point['recorded_at']->isAfter($now->copy()->addMinutes(5))) continue;

            // Reject old timestamps (> 24h old)
            if ($point['recorded_at']->isBefore($now->copy()->subDay())) continue;

            // Reject replayed points (older than last update)
            if ($lastUpdatedAt && $point['recorded_at']->lte($lastUpdatedAt)) continue;

            // Reject bad accuracy (> 100m)
            if ($point['accuracy'] !== null && $point['accuracy'] > 100) continue;

            // Reject impossible speed (> 150 km/h = 41.67 m/s)
            if ($prevLat !== null && $prevTime !== null) {
                $dist = $this->haversineMeters($prevLat, $prevLng, $point['lat'], $point['lng']);
                $elapsed = $point['recorded_at']->diffInSeconds($prevTime);
                if ($elapsed > 0 && ($dist / $elapsed) > 41.67) continue;
            }

            $accepted->push($point);
            $prevLat = $point['lat'];
            $prevLng = $point['lng'];
            $prevTime = $point['recorded_at'];
        }

        if ($accepted->isEmpty()) {
            return response()->json(null, 204);
        }

        // Store history
        $historyRows = $accepted->map(fn ($p) => [
            'user_id'     => $user->id,
            'latitude'    => $p['lat'],
            'longitude'   => $p['lng'],
            'speed'       => $p['speed'],
            'accuracy'    => $p['accuracy'],
            'recorded_at' => $p['recorded_at'],
        ])->toArray();

        ResponderLocationHistory::insert($historyRows);

        // Check if en_route — dispatch reroute check
        $enRouteRow = \DB::table('report_responders')
            ->where('user_id', $user->id)
            ->where('status', 'en_route')
            ->exists();

        // Update user's latest position (last accepted point)
        $latest = $accepted->last();
        $user->update([
            'current_latitude'    => $latest['lat'],
            'current_longitude'   => $latest['lng'],
            'current_heading'     => $latest['heading'],
            'current_speed'       => $latest['speed'],
            'location_updated_at' => $latest['recorded_at'],
        ]);

        // Broadcast to admin room
        $payload = [
            'user_id'     => $user->id,
            'name'        => $user->name,
            'team_id'     => $user->team_id,
            'lat'         => $latest['lat'],
            'lng'         => $latest['lng'],
            'heading'     => $latest['heading'],
            'speed'       => $latest['speed'],
            'recorded_at' => $latest['recorded_at']->toIso8601String(),
        ];

        // Broadcast to admin:responders room
        SocketService::emit('admin:responders', 'location.updated', $payload);

        // Also broadcast to responder-locations (legacy admin map compatibility)
        SocketService::toResponderMap('responder-location', [
            'user_id'   => $user->id,
            'name'      => $user->name,
            'latitude'  => $latest['lat'],
            'longitude' => $latest['lng'],
            'timestamp' => $latest['recorded_at']->toIso8601String(),
        ]);

        // Broadcast to assigned report rooms
        $assignedReportIds = Report::where('assigned_to', $user->id)
            ->where('status', 'assigned')
            ->pluck('id');

        // Also check report_responders for team-based assignments
        $pivotReportIds = \DB::table('report_responders')
            ->where('user_id', $user->id)
            ->whereIn('status', ['en_route', 'on_scene'])
            ->pluck('report_id');

        $allReportIds = $assignedReportIds->merge($pivotReportIds)->unique();

        foreach ($allReportIds as $reportId) {
            SocketService::toReport($reportId, 'responder.location', $payload);
        }

        // Dispatch reroute check if en_route
        if ($enRouteRow) {
            \App\Jobs\MaybeReroute::dispatch($user->id, $latest['lat'], $latest['lng']);

            // Arrival hint: if within 50m of report for 2 consecutive fixes, push notification
            $this->checkArrivalHint($user, $latest['lat'], $latest['lng']);
        }

        return response()->json(null, 204);
    }

    /**
     * Arrival hint: if en_route responder is within 50m of report for 2 consecutive fixes,
     * send a push: "You appear to have arrived — mark on scene?"
     */
    private function checkArrivalHint($user, float $lat, float $lng): void
    {
        $pivot = \DB::table('report_responders')
            ->where('user_id', $user->id)
            ->where('status', 'en_route')
            ->first();

        if (! $pivot) return;

        $report = Report::find($pivot->report_id);
        if (! $report) return;

        $dist = $this->haversineMeters($lat, $lng, (float) $report->latitude, (float) $report->longitude);
        $cacheKey = "arrival_near:{$user->id}:{$report->id}";

        if ($dist <= 50) {
            $consecutiveCount = (int) \Cache::get($cacheKey, 0) + 1;
            \Cache::put($cacheKey, $consecutiveCount, 300);

            if ($consecutiveCount === 2) {
                // Send push only once (on the 2nd consecutive near fix)
                $pushKey = "arrival_pushed:{$user->id}:{$report->id}";
                if (! \Cache::has($pushKey)) {
                    \Cache::put($pushKey, true, 3600);
                    \App\Services\ExpoPushService::sendToUsers(
                        $user->id,
                        'Arrived at scene?',
                        "You appear to have arrived at {$report->reference_number}. Tap to mark On Scene.",
                        [
                            'type'     => 'arrival_hint',
                            'reportId' => $report->id,
                        ]
                    );
                }
            }
        } else {
            // Reset consecutive counter if moved away
            \Cache::forget($cacheKey);
        }
    }

    /**
     * Haversine distance in meters.
     */
    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
