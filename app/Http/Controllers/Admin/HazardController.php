<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\Hazard;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

class HazardController extends Controller
{
    use HasPeriodStats;

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);
        [$prevFrom, $prevTo, $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        $curTotal = $this->scopeByPeriod(Hazard::query(), $from, $to)->count();
        $prevTotal = Hazard::whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $curFlood = $this->scopeByPeriod(Hazard::where('category', 'flood'), $from, $to)->count();
        $prevFlood = Hazard::where('category', 'flood')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $curRoad = $this->scopeByPeriod(Hazard::where('category', 'road'), $from, $to)->count();
        $prevRoad = Hazard::where('category', 'road')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $stats = [
            'total'    => $curTotal,
            'active'   => Hazard::where('active', true)->count(),
            'inactive' => Hazard::where('active', false)->count(),
            'flood'    => $curFlood,
            'road'     => $curRoad,
        ];

        $trends = [
            'total'        => $this->calcTrend($curTotal, $prevTotal),
            'flood'        => $this->calcTrend($curFlood, $prevFlood),
            'road'         => $this->calcTrend($curRoad, $prevRoad),
            'label'        => $trendLabel,
            'period_label' => $periodLabel,
        ];

        $hazards = Hazard::with('creator:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('admin/hazards/index', [
            'hazards'     => $hazards,
            'stats'       => $stats,
            'trends'      => $trends,
            'period'      => $period,
            'custom_from' => $request->get('from'),
            'custom_to'   => $request->get('to'),
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

        SocketService::toAll('hazard-updated', ['action' => 'refresh']);

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

        SocketService::toAll('hazard-updated', ['action' => 'refresh']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hazard updated.']);

        return back();
    }

    public function destroy(Hazard $hazard): RedirectResponse
    {
        $hazard->delete();

        SocketService::toAll('hazard-updated', ['action' => 'refresh']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hazard deleted.']);

        return back();
    }

    public function toggleActive(Hazard $hazard): RedirectResponse
    {
        $hazard->update(['active' => !$hazard->active]);

        SocketService::toAll('hazard-updated', ['action' => 'refresh']);

        $status = $hazard->active ? 'activated' : 'deactivated';
        Inertia::flash('toast', ['type' => 'success', 'message' => "Hazard {$status}."]);

        return back();
    }

    public function syncWeather(): RedirectResponse
    {
        Artisan::call('hazards:sync-weather');
        $output = trim(Artisan::output());

        Inertia::flash('toast', ['type' => 'success', 'message' => $output ?: 'Weather hazard sync complete.']);

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

        SocketService::toAll('hazard-updated', ['action' => 'refresh']);

        $count = count($ids);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} hazard(s) {$request->action}d."]);

        return back();
    }
}
