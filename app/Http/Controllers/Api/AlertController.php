<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AlertRead;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $userAddress = $request->user()->home_address;

        $alerts = Alert::where('created_at', '>=', $request->user()->created_at)
        ->where(function ($q) use ($userAddress) {
            $q->whereNull('target_barangays');
            if ($userAddress) {
                $q->orWhereJsonContains('target_barangays', $userAddress);
            }
        })
        ->orderByDesc('is_critical')
        ->latest()
        ->get();

        $readAlertIds = AlertRead::where('user_id', $userId)
            ->pluck('alert_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        $alerts->each(function ($alert) use ($readAlertIds) {
            $alert->read = in_array($alert->id, $readAlertIds);
        });

        return response()->json($alerts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'      => 'required|string|max:255',
            'body'       => 'required|string',
            'type'       => 'required|in:advisory,update,critical',
            'is_critical' => 'boolean',
        ]);

        $alert = Alert::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        SocketService::toAll('new-alert', $alert->toArray());

        // Push notification to all users (respecting notification preferences)
        $prefKey = ($alert->type === 'critical' || $alert->is_critical) ? 'critical' : 'advisory';
        ExpoPushService::sendToAll(
            $alert->title,
            $alert->body,
            [
                'type'    => 'alert',
                'alertId' => $alert->id,
            ],
            $prefKey
        );

        return response()->json($alert, 201);
    }

    public function markRead(Request $request, Alert $alert)
    {
        AlertRead::firstOrCreate([
            'user_id'  => $request->user()->id,
            'alert_id' => $alert->id,
        ]);

        return response()->json(['message' => 'Alert marked as read.']);
    }

    public function markAllRead(Request $request)
    {
        $userId = $request->user()->id;

        $alertIds = Alert::where('created_at', '>=', $request->user()->created_at)
        ->pluck('id');

        $existing = AlertRead::where('user_id', $userId)
            ->pluck('alert_id')
            ->toArray();

        $newReads = $alertIds->diff($existing)->map(fn ($id) => [
            'user_id'  => $userId,
            'alert_id' => $id,
            'read_at'  => now(),
        ])->values()->toArray();

        if (! empty($newReads)) {
            AlertRead::insert($newReads);
        }

        return response()->json(['message' => 'All alerts marked as read.']);
    }
}
