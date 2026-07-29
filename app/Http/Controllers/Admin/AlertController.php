<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\User;
use App\Notifications\NewAlertPublished;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    /** Get distinct home_address values from users table. */
    private static function distinctBarangays(): array
    {
        return User::whereNotNull('home_address')
            ->where('home_address', '!=', '')
            ->distinct()
            ->orderBy('home_address')
            ->pluck('home_address')
            ->toArray();
    }

    public function index(Request $request): Response
    {
        $sortField = in_array($request->sort, ['title', 'type', 'created_at']) ? $request->sort : 'created_at';
        $sortDir   = $request->dir === 'asc' ? 'asc' : 'desc';

        $alerts = Alert::with('creator:id,name')
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('title', 'like', "%{$request->search}%")
                   ->orWhere('body', 'like', "%{$request->search}%");
            }))
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->orderBy($sortField, $sortDir)
            ->paginate(20)
            ->withQueryString();

        $stats = [
            'total'    => Alert::count(),
            'critical' => Alert::where('type', 'critical')->count(),
            'advisory' => Alert::where('type', 'advisory')->count(),
            'update'   => Alert::where('type', 'update')->count(),
        ];

        return Inertia::render('admin/alerts/index', [
            'alerts'     => $alerts,
            'filters'    => $request->only(['search', 'type', 'sort', 'dir']),
            'stats'      => $stats,
            'barangays'  => self::distinctBarangays(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'              => 'required|string|max:255',
            'body'               => 'required|string',
            'type'               => 'required|in:advisory,update,critical',
            'target_barangays'   => 'nullable|array',
            'target_barangays.*' => ['string', Rule::in(self::distinctBarangays())],
        ]);

        $targetBarangays = $request->target_barangays && count($request->target_barangays) > 0
            ? $request->target_barangays
            : null;

        $alert = Alert::create([
            'created_by'        => $request->user()->id,
            'title'             => $request->title,
            'body'              => $request->body,
            'type'              => $request->type,
            'target_barangays'  => $targetBarangays,
        ]);

        // Real-time alert to all connected users (residents, responders)
        SocketService::toAll('new-alert', $alert->toArray());

        // Push notification (filtered by barangay if targeted)
        $prefKey = $alert->type === 'critical' ? 'critical' : 'advisory';
        $pushData = ['type' => 'alert', 'alertId' => $alert->id];

        if ($targetBarangays) {
            ExpoPushService::sendToBarangays($targetBarangays, $alert->title, $alert->body, $pushData, $prefKey);
        } else {
            ExpoPushService::sendToAll($alert->title, $alert->body, $pushData, $prefKey);
        }

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
            'title'              => 'required|string|max:255',
            'body'               => 'required|string',
            'type'               => 'required|in:advisory,update,critical',
            'target_barangays'   => 'nullable|array',
            'target_barangays.*' => ['string', Rule::in(self::distinctBarangays())],
        ]);

        $targetBarangays = isset($validated['target_barangays']) && count($validated['target_barangays']) > 0
            ? $validated['target_barangays']
            : null;

        $alert->update([
            'title'             => $validated['title'],
            'body'              => $validated['body'],
            'type'              => $validated['type'],
            'target_barangays'  => $targetBarangays,
        ]);

        // Real-time alert update to all connected users
        SocketService::toAll('alert-updated', $alert->fresh()->toArray());

        // Push notification for updated alert (filtered by barangay if targeted)
        $updatedPrefKey = $alert->type === 'critical' ? 'critical' : 'advisory';
        $pushData = ['type' => 'alert', 'alertId' => $alert->id];

        if ($targetBarangays) {
            ExpoPushService::sendToBarangays($targetBarangays, $alert->title, $alert->body, $pushData, $updatedPrefKey);
        } else {
            ExpoPushService::sendToAll($alert->title, $alert->body, $pushData, $updatedPrefKey);
        }

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
