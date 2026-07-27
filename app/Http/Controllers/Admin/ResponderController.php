<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\Team;
use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ResponderController extends Controller
{
    public function index(Request $request): Response
    {
        $responders = User::where('role', 'responder')
            ->with('team:id,name,leader_id,is_active')
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->withCount([
                'assignedReports as total_assigned',
                'assignedReports as active_assignments' => fn ($q) => $q->where('status', 'assigned'),
                'assignedReports as resolved_count'     => fn ($q) => $q->where('status', 'resolved'),
            ])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // Flatten team fields onto each responder for the frontend
        $responders->getCollection()->transform(function ($r) {
            $r->team_id        = $r->team?->id;
            $r->team_name      = $r->team?->name;
            $r->team_is_active = $r->team?->is_active;
            $r->is_leader      = $r->team && $r->team->leader_id === $r->id;
            $r->home_latitude  = $r->home_latitude  ? (float) $r->home_latitude  : null;
            $r->home_longitude = $r->home_longitude ? (float) $r->home_longitude : null;
            return $r;
        });

        return Inertia::render('admin/responders/index', [
            'responders'   => $responders,
            'filters'      => $request->only(['search']),
            'teams_count'  => Team::count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255|unique:users,name',
            'email'          => 'required|email|unique:users,email',
            'password'       => ['required', Password::defaults()],
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/', 'unique:users,contact_number'],
            'home_address'   => ['nullable', 'string', 'max:500'],
            'home_latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'home_longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ], [
            'name.unique'           => 'A user with this name already exists.',
            'contact_number.regex'  => 'Contact number must start with 09 followed by 9 digits.',
            'contact_number.unique' => 'This contact number is already in use.',
        ]);

        $validated['role'] = 'responder';
        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now();

        $user = User::create($validated);
        $user->notify(new WelcomeNotification);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Responder created.']);

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->role === 'responder', 404);

        $validated = $request->validate([
            'name'           => 'required|string|max:255|unique:users,name,' . $user->id,
            'email'          => 'required|email|unique:users,email,' . $user->id,
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/', 'unique:users,contact_number,' . $user->id],
            'password'       => ['nullable', Password::defaults()],
            'home_address'   => ['nullable', 'string', 'max:500'],
            'home_latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'home_longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ], [
            'name.unique'           => 'A user with this name already exists.',
            'contact_number.regex'  => 'Contact number must start with 09 followed by 9 digits.',
            'contact_number.unique' => 'This contact number is already in use.',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Responder updated.']);

        return back();
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_unless($user->role === 'responder', 404);

        // If this responder is a team leader, clear that reference first
        DB::table('teams')->where('leader_id', $user->id)->update(['leader_id' => null]);

        $teamId = $user->team_id;

        // Reset reports assigned to this responder back to verified (so they don't appear as assigned with no one)
        Report::where('assigned_to', $user->id)
            ->where('status', 'assigned')
            ->update(['status' => 'verified', 'assigned_to' => null]);

        // Preserve activity log history — null the user reference instead of letting cascade delete the rows
        DB::table('report_status_updates')->where('user_id', $user->id)->update(['user_id' => null]);

        // Delete personal notifications and Sanctum tokens (orphaned morph rows serve no purpose after user is gone)
        $user->notifications()->delete();
        $user->tokens()->delete();

        // Delete avatar file from storage
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->delete(); // users.team_id NULLed by DB FK nullOnDelete

        // Delete the team if this was its last member
        if ($teamId) {
            $remaining = User::where('team_id', $teamId)->count();
            if ($remaining === 0) {
                // Also reset reports assigned to this team
                Report::where('assigned_team_id', $teamId)
                    ->where('status', 'assigned')
                    ->update(['status' => 'verified', 'assigned_team_id' => null, 'assigned_to' => null]);

                Team::destroy($teamId);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Responder deleted.']);

        return back();
    }
}
