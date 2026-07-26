<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
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
            ->with('team:id,name,leader_id')
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
            $r->team_id   = $r->team?->id;
            $r->team_name = $r->team?->name;
            $r->is_leader = $r->team && $r->team->leader_id === $r->id;
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
        ], [
            'name.unique'           => 'A user with this name already exists.',
            'contact_number.regex'  => 'Contact number must start with 09 followed by 9 digits.',
            'contact_number.unique' => 'This contact number is already in use.',
        ]);

        $validated['role'] = 'responder';
        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now();

        User::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Responder created.']);

        return back();
    }
}
