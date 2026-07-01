<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    /**
     * Register or update a device push token for the authenticated user.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'token'    => 'required|string|max:255',
            'platform' => 'required|in:android,ios',
        ]);

        // Upsert — if token exists for another user, reassign it
        DeviceToken::updateOrCreate(
            ['token' => $data['token']],
            [
                'user_id'  => $request->user()->id,
                'platform' => $data['platform'],
            ]
        );

        return response()->json(['message' => 'Device token registered.']);
    }

    /**
     * Remove a device push token (e.g. on logout).
     */
    public function destroy(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
        ]);

        DeviceToken::where('token', $data['token'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Device token removed.']);
    }
}
