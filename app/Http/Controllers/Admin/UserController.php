<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function updateRole(User $user, Request $request): RedirectResponse
    {
        $request->validate([
            'role' => 'required|in:resident,responder',
        ]);

        $user->update(['role' => $request->role]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User role updated.']);

        return back();
    }
}
