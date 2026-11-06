<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DutyLog;
use App\Models\Report;
use App\Models\User;
use App\Services\SocketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();
        $data = $user->toArray();

        // Add shift info for responders
        if ($user->role === 'responder' && $user->team_id) {
            $team = $user->team;
            $shifts = ['A' => [7, 15], 'B' => [15, 23], 'C' => [23, 7]];
            $teamShift = $team?->shift ?? 'A';
            $range = $shifts[$teamShift] ?? [7, 15];

            $data['shift'] = [
                'label'      => "Shift {$teamShift}",
                'key'        => $teamShift,
                'start_hour' => $range[0],
                'end_hour'   => $range[1],
                'tz'         => 'Asia/Manila',
            ];
            $data['duty_override'] = $user->duty_override;
        }

        return response()->json($data);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'contact_number' => 'sometimes|nullable|string|max:20',
            'home_address'   => 'sometimes|nullable|string|max:500',
            'home_latitude'  => 'sometimes|nullable|numeric|between:-90,90',
            'home_longitude' => 'sometimes|nullable|numeric|between:-180,180',
        ]);

        $request->user()->update($data);

        return response()->json($request->user()->fresh());
    }

    public function updateDutyStatus(Request $request)
    {
        $data = $request->validate([
            'is_on_duty' => 'required|boolean',
        ]);

        $user = $request->user();
        $user->update($data);

        // Clear location when going off duty
        if (! $data['is_on_duty']) {
            $user->update([
                'current_latitude'  => null,
                'current_longitude' => null,
                'location_updated_at' => null,
            ]);
        }

        return response()->json($user->fresh());
    }

    public function updateLocation(Request $request)
    {
        $data = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();

        $user->update([
            'current_latitude'    => $data['latitude'],
            'current_longitude'   => $data['longitude'],
            'location_updated_at' => now(),
        ]);

        // Broadcast to admin map in real-time (responder-locations room, not alerts)
        $locationPayload = [
            'user_id'   => $user->id,
            'name'      => $user->name,
            'latitude'  => $data['latitude'],
            'longitude' => $data['longitude'],
            'timestamp' => now()->toIso8601String(),
        ];

        SocketService::toResponderMap('responder-location', $locationPayload);

        // Also broadcast to report rooms so residents can track the assigned responder
        if ($user->isResponder()) {
            $assignedReportIds = Report::where('assigned_to', $user->id)
                ->where('status', 'assigned')
                ->pluck('id');

            foreach ($assignedReportIds as $reportId) {
                SocketService::toReport($reportId, 'responder-location', $locationPayload);
            }
        }

        return response()->json(['message' => 'Location updated.']);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function updateNotificationPrefs(Request $request)
    {
        $data = $request->validate([
            'critical'   => 'required|boolean',
            'advisory'   => 'required|boolean',
            'my_reports' => 'required|boolean',
        ]);

        $request->user()->update(['notification_prefs' => $data]);

        return response()->json(['message' => 'Preferences saved.']);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $user = $request->user();

        // Delete old avatar if exists
        if ($user->avatar) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json($user->fresh());
    }

    /**
     * POST /api/admin/users/{user}/duty-override
     * Admin sets a duty override: 'on', 'off', or 'clear' (null).
     */
    public function dutyOverride(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'override' => 'required|in:on,off,clear',
        ]);

        $override = $data['override'] === 'clear' ? null : $data['override'];
        $user->update(['duty_override' => $override]);

        // Log it
        if ($override) {
            DutyLog::create([
                'user_id'    => $user->id,
                'started_at' => now(),
                'source'     => 'override',
            ]);
        }

        // Run sync immediately to apply the change
        Artisan::call('duty:sync');

        return response()->json([
            'message'       => 'Duty override applied.',
            'duty_override' => $override,
            'is_on_duty'    => $user->fresh()->is_on_duty,
        ]);
    }
}
