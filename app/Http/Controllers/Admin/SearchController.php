<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use App\Models\Report;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));

        if (strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $like = "%{$q}%";

        // Reports
        $reports = Report::where(function ($query) use ($like) {
                $query->where('reference_number', 'like', $like)
                      ->orWhere('address', 'like', $like);
            })
            ->select('id', 'reference_number', 'address', 'severity', 'status')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'id'    => $r->id,
                'label' => $r->reference_number,
                'sub'   => $r->address ?? 'No address',
                'meta'  => $r->severity,
                'badge' => $r->status,
                'url'   => "/admin/reports/{$r->id}",
            ]);

        // Residents
        $residents = User::where('role', 'resident')
            ->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                      ->orWhere('email', 'like', $like);
            })
            ->select('id', 'name', 'email')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'label' => $u->name,
                'sub'   => $u->email,
                'url'   => "/admin/users?search={$u->name}",
            ]);

        // Responders
        $responders = User::where('role', 'responder')
            ->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                      ->orWhere('email', 'like', $like);
            })
            ->select('id', 'name', 'email')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'label' => $u->name,
                'sub'   => $u->email,
                'url'   => "/admin/responders?search={$u->name}",
            ]);

        // Teams
        $teams = Team::where('name', 'like', $like)
            ->select('id', 'name')
            ->withCount('members')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($t) => [
                'id'    => $t->id,
                'label' => $t->name,
                'sub'   => "{$t->members_count} member(s)",
                'url'   => "/admin/teams?search={$t->name}",
            ]);

        // Evacuation Centers
        $evacCenters = EvacuationCenter::where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                      ->orWhere('address', 'like', $like);
            })
            ->select('id', 'name', 'address', 'type')
            ->limit(5)
            ->get()
            ->map(fn ($e) => [
                'id'    => $e->id,
                'label' => $e->name,
                'sub'   => $e->address ?? $e->type,
                'url'   => "/admin/evacuation-centers",
            ]);

        $results = collect([
            ['category' => 'Reports',            'icon' => 'file-text',  'items' => $reports],
            ['category' => 'Residents',           'icon' => 'users',      'items' => $residents],
            ['category' => 'Responders',          'icon' => 'shield',     'items' => $responders],
            ['category' => 'Teams',               'icon' => 'users-round','items' => $teams],
            ['category' => 'Evacuation Centers',  'icon' => 'building2',  'items' => $evacCenters],
        ])->filter(fn ($g) => count($g['items']) > 0)->values();

        return response()->json(['results' => $results]);
    }
}
