<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AlertRead;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $alerts = Alert::where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
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
            'expires_at' => 'nullable|date|after:now',
        ]);

        $alert = Alert::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

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

        $alertIds = Alert::where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })->pluck('id');

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
