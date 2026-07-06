<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\User;
use App\Notifications\NewAlertPublished;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
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

        $alert = Alert::create([
            'created_by'  => $request->user()->id,
            'title'       => $request->title,
            'body'        => $request->body,
            'type'        => $request->type,
            'is_critical' => $request->boolean('is_critical'),
            'expires_at'  => $request->expires_at,
        ]);

        // Notify all admins about the new alert
        $admins = User::where('role', 'admin')
            ->where('id', '!=', $request->user()->id)
            ->get();
        Notification::send($admins, new NewAlertPublished($alert));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alert published.']);

        return back();
    }

    public function update(Alert $alert, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'body'        => 'required|string',
            'type'        => 'required|in:advisory,update,critical',
            'is_critical' => 'boolean',
            'expires_at'  => 'nullable|date',
        ]);

        $alert->update([
            'title'       => $validated['title'],
            'body'        => $validated['body'],
            'type'        => $validated['type'],
            'is_critical' => $request->boolean('is_critical'),
            'expires_at'  => $validated['expires_at'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alert updated.']);

        return back();
    }

    public function destroy(Alert $alert): RedirectResponse
    {
        $alert->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Alert removed.']);

        return back();
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:alerts,id',
            'action' => 'required|in:delete',
        ]);

        $count = Alert::whereIn('id', $request->ids)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} alert(s) deleted."]);

        return back();
    }
}
