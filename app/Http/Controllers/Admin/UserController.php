<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::where('role', '!=', 'admin')
            ->when($request->role, fn ($q) => $q->where('role', $request->role))
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->withCount([
                'reports',
                'assignedReports as active_assignments' => fn ($q) => $q->whereIn('status', ['assigned']),
            ])
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/users/index', [
            'users'   => $users,
            'filters' => $request->only(['role', 'search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|unique:users,email',
            'password'       => ['required', Password::defaults()],
            'role'           => 'required|in:resident,responder',
            'contact_number' => 'nullable|string|max:20',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now();

        User::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User created.']);

        return back();
    }

    public function update(User $user, Request $request): RedirectResponse
    {
        if ($user->role === 'admin') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Cannot edit admin users.']);
            return back();
        }

        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => "required|email|unique:users,email,{$user->id}",
            'role'           => 'required|in:resident,responder',
            'contact_number' => 'nullable|string|max:20',
            'password'       => ['nullable', Password::defaults()],
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User updated.']);

        return back();
    }

    public function updateRole(User $user, Request $request): RedirectResponse
    {
        $request->validate([
            'role' => 'required|in:resident,responder',
        ]);

        $user->update(['role' => $request->role]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User role updated.']);

        return back();
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->role === 'admin') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Cannot delete admin users.']);
            return back();
        }

        $name = $user->name;
        $user->delete();



        return back();
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:users,id',
            'action' => 'required|in:delete,make_resident,make_responder',
        ]);

        $users = User::whereIn('id', $request->ids)->where('role', '!=', 'admin')->get();
        $count = 0;

        foreach ($users as $user) {
            switch ($request->action) {
                case 'delete':
                    $user->delete();
                    $count++;
                    break;
                case 'make_resident':
                    $user->update(['role' => 'resident']);
                    $count++;
                    break;
                case 'make_responder':
                    $user->update(['role' => 'responder']);
                    $count++;
                    break;
            }
        }

        $label = match ($request->action) {
            'delete'         => 'deleted',
            'make_resident'  => 'set to resident',
            'make_responder' => 'set to responder',
        };

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} user(s) {$label}."]);

        return back();
    }
}
