<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hazard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HazardController extends Controller
{
    public function index(): Response
    {
        $hazards = Hazard::with('creator:id,name')
            ->latest()
            ->paginate(30);

        return Inertia::render('admin/hazards/index', [
            'hazards' => $hazards,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category'    => 'required|in:flood,road',
            'type'        => 'required|string|max:50',
            'severity'    => 'required|in:low,moderate,high,critical',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'address'     => 'nullable|string|max:500',
        ]);

        Hazard::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hazard created.']);

        return back();
    }

    public function update(Hazard $hazard, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category'    => 'sometimes|in:flood,road',
            'type'        => 'sometimes|string|max:50',
            'severity'    => 'sometimes|in:low,moderate,high,critical',
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'latitude'    => 'sometimes|numeric|between:-90,90',
            'longitude'   => 'sometimes|numeric|between:-180,180',
            'address'     => 'nullable|string|max:500',
            'active'      => 'sometimes|boolean',
        ]);

        $hazard->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hazard updated.']);

        return back();
    }

    public function destroy(Hazard $hazard): RedirectResponse
    {
        $hazard->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hazard deleted.']);

        return back();
    }

    public function toggleActive(Hazard $hazard): RedirectResponse
    {
        $hazard->update(['active' => !$hazard->active]);

        $status = $hazard->active ? 'activated' : 'deactivated';
        Inertia::flash('toast', ['type' => 'success', 'message' => "Hazard {$status}."]);

        return back();
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:hazards,id',
            'action' => 'required|in:delete,activate,deactivate',
        ]);

        $ids = $request->ids;

        match ($request->action) {
            'delete'     => Hazard::whereIn('id', $ids)->delete(),
            'activate'   => Hazard::whereIn('id', $ids)->update(['active' => true]),
            'deactivate' => Hazard::whereIn('id', $ids)->update(['active' => false]),
        };

        $count = count($ids);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} hazard(s) {$request->action}d."]);

        return back();
    }
}
