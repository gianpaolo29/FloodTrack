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
