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
            // Show alerts with no barangay filter (sent to all)
            $q->whereNull('target_barangays');
            // Or alerts targeting a barangay found in the user's home address
            if ($userAddress) {
                $q->orWhere(function ($sub) use ($userAddress) {
                    $sub->whereNotNull('target_barangays')
                        ->whereRaw("EXISTS (
                            SELECT 1 FROM JSON_TABLE(target_barangays, '$[*]' COLUMNS(brgy VARCHAR(100) PATH '$')) AS jt
                            WHERE ? LIKE CONCAT('%', jt.brgy, '%')
                        )", [$userAddress]);
                });
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
