<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use App\Models\OccupancyLog;
use App\Models\User;
use App\Notifications\OccupancyThresholdAlert;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EvacuationCenterController extends Controller
{
    public function index(Request $request): Response
    {
        $query = EvacuationCenter::query()->latest();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($request->has('active') && $request->input('active') !== '') {
            $query->where('is_active', $request->boolean('active'));
        }

        $centers = $query->paginate(20)->withQueryString();

        $stats = [
            'total'           => EvacuationCenter::count(),
            'active'          => EvacuationCenter::where('is_active', true)->count(),
            'total_capacity'  => (int) EvacuationCenter::sum('capacity'),
            'total_occupancy' => (int) EvacuationCenter::sum('current_occupancy'),
        ];

        return Inertia::render('admin/evacuation-centers/index', [
            'centers' => $centers,
            'filters' => $request->only(['search', 'type', 'active']),
            'stats'   => $stats,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'address'           => 'required|string|max:500',
            'type'              => 'required|in:gymnasium,school,barangay_hall,church,community_center',
            'capacity'          => 'required|integer|min:1',
            'current_occupancy' => 'sometimes|integer|min:0',
            'latitude'          => 'required|numeric|between:-90,90',
            'longitude'         => 'required|numeric|between:-180,180',
        ]);

        EvacuationCenter::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Evacuation center created.']);

        return back();
    }

    public function update(EvacuationCenter $evacuationCenter, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'address'   => 'sometimes|string|max:500',
            'type'      => 'sometimes|in:gymnasium,school,barangay_hall,church,community_center',
            'capacity'          => 'sometimes|integer|min:1',
            'current_occupancy' => 'sometimes|integer|min:0',
            'latitude'          => 'sometimes|numeric|between:-90,90',
            'longitude'         => 'sometimes|numeric|between:-180,180',
            'is_active'         => 'sometimes|boolean',
        ]);

        $evacuationCenter->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Evacuation center updated.']);

        return back();
    }

    public function destroy(EvacuationCenter $evacuationCenter): RedirectResponse
    {
        $evacuationCenter->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Evacuation center deleted.']);

        return back();
    }

    public function toggleActive(EvacuationCenter $evacuationCenter): RedirectResponse
    {
        $evacuationCenter->update(['is_active' => !$evacuationCenter->is_active]);

        $status = $evacuationCenter->is_active ? 'activated' : 'deactivated';
        Inertia::flash('toast', ['type' => 'success', 'message' => "Evacuation center {$status}."]);

        return back();
    }

    public function updateOccupancy(EvacuationCenter $evacuationCenter, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_occupancy' => 'required|integer|min:0',
            'notes'             => 'nullable|string|max:500',
        ]);

        if ($validated['current_occupancy'] > $evacuationCenter->capacity) {
            throw ValidationException::withMessages([
                'current_occupancy' => "Occupancy cannot exceed capacity ({$evacuationCenter->capacity}).",
            ]);
        }

        $previousOccupancy = $evacuationCenter->current_occupancy;

        OccupancyLog::create([
            'evacuation_center_id' => $evacuationCenter->id,
            'previous_occupancy'   => $previousOccupancy,
            'new_occupancy'        => $validated['current_occupancy'],
            'changed_by'           => $request->user()->id,
            'change_type'          => 'manual_update',
            'notes'                => $validated['notes'] ?? null,
        ]);

        $evacuationCenter->update(['current_occupancy' => $validated['current_occupancy']]);

        // Check if occupancy >= 90% of capacity
        $occupancyPct = $evacuationCenter->capacity > 0
            ? (int) round($evacuationCenter->current_occupancy / $evacuationCenter->capacity * 100)
            : 0;

        if ($occupancyPct >= 90) {
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

        SocketService::toAll('evacuation-updated', [
            'id'                => $evacuationCenter->id,
            'name'              => $evacuationCenter->name,
            'current_occupancy' => $evacuationCenter->current_occupancy,
            'capacity'          => $evacuationCenter->capacity,
            'occupancy_pct'     => $occupancyPct,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Occupancy updated.']);

        return back();
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:evacuation_centers,id',
            'action' => 'required|in:delete,activate,deactivate',
        ]);

        $ids = $request->ids;

        match ($request->action) {
            'delete'     => EvacuationCenter::whereIn('id', $ids)->delete(),
            'activate'   => EvacuationCenter::whereIn('id', $ids)->update(['is_active' => true]),
            'deactivate' => EvacuationCenter::whereIn('id', $ids)->update(['is_active' => false]),
        };

        $count = count($ids);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} evacuation center(s) {$request->action}d."]);

        return back();
    }
}
