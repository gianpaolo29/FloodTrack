<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function index(): Response
    {
        $alerts = Alert::with('creator:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('admin/alerts/index', [
            'alerts' => $alerts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'       => 'required|string|max:255',
            'body'        => 'required|string',
            'type'        => 'required|in:advisory,update,critical',
            'is_critical' => 'boolean',
            'expires_at'  => 'nullable|date|after:now',
        ]);

        Alert::create([
            'created_by'  => $request->user()->id,
            'title'       => $request->title,
            'body'        => $request->body,
            'type'        => $request->type,
            'is_critical' => $request->boolean('is_critical'),
            'expires_at'  => $request->expires_at,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alert published.']);

        return back();
    }

    public function destroy(Alert $alert): RedirectResponse
    {
        $alert->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alert removed.']);

        return back();
    }
}
