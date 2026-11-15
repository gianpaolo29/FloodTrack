<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use App\Models\OccupancyLog;
use App\Models\User;
use App\Notifications\OccupancyThresholdAlert;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvacuationCenterController extends Controller
{
    public function index()
    {
        $centers = EvacuationCenter::where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($centers);
    }

    /**
     * GET /evacuation-centers/nearest?lat=...&lng=...
     * Returns the nearest active evacuation center with available capacity.
     */
    public function nearest(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        $lat = (float) $request->lat;
        $lng = (float) $request->lng;

        $centers = EvacuationCenter::where('is_active', true)
            ->whereColumn('current_occupancy', '<', 'capacity')
            ->get();

        if ($centers->isEmpty()) {
            return response()->json(['data' => null, 'message' => 'No evacuation centers with available capacity.']);
        }

        // Find nearest using Haversine
        $nearest = null;
        $minDist = PHP_FLOAT_MAX;

        foreach ($centers as $center) {
            $dist = $this->haversineKm($lat, $lng, $center->latitude, $center->longitude);
            if ($dist < $minDist) {
                $minDist = $dist;
                $nearest = $center;
            }
        }

        return response()->json([
            'data' => [
                'id'                => $nearest->id,
                'name'              => $nearest->name,
                'address'           => $nearest->address,
                'latitude'          => $nearest->latitude,
                'longitude'         => $nearest->longitude,
                'capacity'          => $nearest->capacity,
                'current_occupancy' => $nearest->current_occupancy,
                'occupancy_pct'     => $nearest->occupancy_pct,
                'available'         => $nearest->capacity - $nearest->current_occupancy,
                'distance_km'       => round($minDist, 1),
            ],
        ]);
    }

    private function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return 2 * $r * asin(sqrt($a));
    }

    public function updateOccupancy(Request $request, EvacuationCenter $evacuationCenter): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:check_in,check_out',
            'count'  => 'sometimes|integer|min:1|max:100',
        ]);

        $count = $validated['count'] ?? 1;
        $previousOccupancy = $evacuationCenter->current_occupancy;

        if ($validated['action'] === 'check_in') {
            $newOccupancy = min($previousOccupancy + $count, $evacuationCenter->capacity);
            $changeType = 'check_in';
        } else {
            $newOccupancy = max($previousOccupancy - $count, 0);
            $changeType = 'check_out';
        }

        OccupancyLog::create([
            'evacuation_center_id' => $evacuationCenter->id,
            'previous_occupancy'   => $previousOccupancy,
            'new_occupancy'        => $newOccupancy,
            'changed_by'           => $request->user()->id,
            'change_type'          => $changeType,
        ]);

        $evacuationCenter->update(['current_occupancy' => $newOccupancy]);

        $occupancyPct = $evacuationCenter->capacity > 0
            ? (int) round($evacuationCenter->current_occupancy / $evacuationCenter->capacity * 100)
            : 0;

        SocketService::toAll('evacuation-updated', [
            'id'                => $evacuationCenter->id,
            'name'              => $evacuationCenter->name,
            'current_occupancy' => $evacuationCenter->current_occupancy,
            'capacity'          => $evacuationCenter->capacity,
            'occupancy_pct'     => $occupancyPct,
        ]);

        if ($validated['action'] === 'check_in' && $occupancyPct >= 90) {
            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();

            ExpoPushService::sendToUsers(
                $adminIds,
                'High Occupancy Alert',
                "{$evacuationCenter->name} is at {$occupancyPct}% capacity ({$evacuationCenter->current_occupancy}/{$evacuationCenter->capacity}).",
                ['type' => 'occupancy_alert', 'center_id' => $evacuationCenter->id],
            );

            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $admin->notify(new OccupancyThresholdAlert($evacuationCenter, $occupancyPct));
            }
        }

        return response()->json([
            'message' => 'Occupancy updated.',
            'center'  => $evacuationCenter->fresh(),
        ]);
    }
}
