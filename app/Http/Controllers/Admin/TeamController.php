<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\Report;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    use HasPeriodStats;

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        $avgExpr = DB::getDriverName() === 'sqlite'
            ? "(julianday(resolved_at) - julianday(created_at)) * 1440"
            : "TIMESTAMPDIFF(MINUTE, created_at, resolved_at)";

        $teams = Team::with(['leader:id,name,avatar', 'members:id,name,avatar,team_id'])
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->withCount([
                'reports as active_assignments' => fn ($q) => $q->where('status', 'assigned'),
                'reports as total_assigned',
                'reports as resolved_count' => fn ($q) => $q->whereNotNull('resolved_at'),
            ])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        // Add is_leader, avatar_url, and performance metrics to each team
        $teams->getCollection()->transform(function ($team) use ($avgExpr) {
            $team->members->each(function ($m) use ($team) {
                $m->append('avatar_url');
                $m->is_leader = $m->id === $team->leader_id;
            });
            $team->leader?->append('avatar_url');
            $team->avg_response_minutes = round((float) (
                Report::where('assigned_team_id', $team->id)
                    ->whereNotNull('resolved_at')
                    ->selectRaw("AVG($avgExpr) as avg_minutes")
                    ->value('avg_minutes') ?? 0
            ), 1);
            return $team;
        });

        $responders = User::where('role', 'responder')
            ->get(['id', 'name', 'email', 'avatar', 'team_id'])
            ->each(fn ($r) => $r->append('avatar_url'));

        [$prevFrom, $prevTo, $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        $curTotalTeams  = $this->scopeByPeriod(Team::query(), $from, $to)->count();
        $prevTotalTeams = Team::whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $curResponders  = User::where('role', 'responder')->count();
        $curInTeams     = User::where('role', 'responder')->whereNotNull('team_id')->count();
        $curUnassigned  = User::where('role', 'responder')->whereNull('team_id')->count();

        $stats = [
            'total_teams'      => $curTotalTeams,
            'total_responders' => $curResponders,
            'in_teams'         => $curInTeams,
            'unassigned'       => $curUnassigned,
        ];

        $trends = [
            'total_teams'  => $this->calcTrend($curTotalTeams, $prevTotalTeams),
            'label'        => $trendLabel,
            'period_label' => $periodLabel,
        ];

        return Inertia::render('admin/teams/index', [
            'teams'       => $teams,
            'responders'  => $responders,
            'filters'     => $request->only(['search']),
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

    public function toggleActive(Team $team): RedirectResponse
    {
        $team->update(['is_active' => ! $team->is_active]);

        $status = $team->is_active ? 'activated' : 'deactivated';
        Inertia::flash('toast', ['type' => 'success', 'message' => "Team \"{$team->name}\" {$status}."]);

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
