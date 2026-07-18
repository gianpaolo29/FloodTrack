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

class ResponderController extends Controller
{
    public function index(Request $request): Response
    {
        $responders = User::where('role', 'responder')
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

        return Inertia::render('admin/responders/index', [
            'responders' => $responders,
            'filters'    => $request->only(['search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|unique:users,email',
            'password'       => ['required', Password::defaults()],
            'contact_number' => 'nullable|string|max:20',
        ]);

        $validated['role'] = 'responder';
        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now();

        User::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Responder created.']);

        return back();
    }
}
