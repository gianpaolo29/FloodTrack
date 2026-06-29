<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\Request;
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
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/responders/index', [
            'responders' => $responders,
            'filters'    => $request->only(['search']),
        ]);
    }
}
