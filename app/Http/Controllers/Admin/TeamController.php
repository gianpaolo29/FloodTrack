<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        $teams = Team::with(['leader:id,name,avatar', 'members:id,name,avatar,team_id'])
            ->withCount([
                'reports as active_assignments' => fn ($q) => $q->where('status', 'assigned'),
            ])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        // Add is_leader and avatar_url to each member
        $teams->getCollection()->transform(function ($team) {
            $team->members->each(function ($m) use ($team) {
                $m->append('avatar_url');
                $m->is_leader = $m->id === $team->leader_id;
            });
            $team->leader?->append('avatar_url');
            return $team;
        });

        $responders = User::where('role', 'responder')
            ->get(['id', 'name', 'email', 'avatar', 'team_id'])
            ->each(fn ($r) => $r->append('avatar_url'));

        $stats = [
            'total_teams'      => Team::count(),
            'total_responders' => User::where('role', 'responder')->count(),
            'in_teams'         => User::where('role', 'responder')->whereNotNull('team_id')->count(),
            'unassigned'       => User::where('role', 'responder')->whereNull('team_id')->count(),
        ];

        return Inertia::render('admin/teams/index', [
            'teams'      => $teams,
            'responders' => $responders,
            'filters'    => $request->only(['search']),
            'stats'      => $stats,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255|unique:teams,name',
            'leader_id'  => 'required|exists:users,id',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:users,id',
        ]);

        $memberIds = collect($validated['member_ids'] ?? [])
            ->push($validated['leader_id'])
            ->unique()
            ->values()
            ->all();

        $team = Team::create([
            'name'      => $validated['name'],
            'leader_id' => $validated['leader_id'],
        ]);

        User::whereIn('id', $memberIds)->update(['team_id' => $team->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Team \"{$team->name}\" created."]);

        return back();
    }

    public function update(Team $team, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'         => "required|string|max:255|unique:teams,name,{$team->id}",
            'leader_id'    => 'required|exists:users,id',
            'member_ids'   => 'nullable|array',
            'member_ids.*' => 'exists:users,id',
        ]);

        $newMemberIds = collect($validated['member_ids'] ?? [])
            ->push($validated['leader_id'])
            ->unique()
            ->values()
            ->all();

        // Remove users who are no longer in the team
        $oldMemberIds = $team->members()->pluck('id')->all();
        $removedIds   = array_diff($oldMemberIds, $newMemberIds);

        if (count($removedIds) > 0) {
            User::whereIn('id', $removedIds)->update(['team_id' => null]);
        }

        $team->update([
            'name'      => $validated['name'],
            'leader_id' => $validated['leader_id'],
        ]);

        User::whereIn('id', $newMemberIds)->update(['team_id' => $team->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Team \"{$team->name}\" updated."]);

        return back();
    }

    public function destroy(Team $team): RedirectResponse
    {
        $name = $team->name;

        // Unassign all members
        $team->members()->update(['team_id' => null]);

        // Nullify any active report assignments
        $team->reports()->update(['assigned_team_id' => null]);

        $team->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Team \"{$name}\" deleted."]);

        return back();
    }
}
