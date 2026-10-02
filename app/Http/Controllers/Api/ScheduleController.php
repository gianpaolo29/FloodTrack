<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Team;
use App\Models\User;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ScheduleController extends Controller
{
    /**
     * GET /api/schedule
     * Returns current schedule level, active shift, and the requesting user's duty status.
     */
    public function index(Request $request): JsonResponse
    {
        $level = Setting::getValue('schedule_level', 'white');
        $currentShift = static::currentShift();
        $user = $request->user();

        $team = $user->team_id
            ? Team::where('id', $user->team_id)->where('is_active', true)->first()
            : null;

        $onDuty = false;
        $teamShift = null;

        if ($team) {
            $teamShift = $team->shift ?? 'A';
            $onDuty = $level === 'red' || $teamShift === $currentShift;
        }

        return response()->json([
            'level'         => $level,
            'current_shift' => $currentShift,
            'team_shift'    => $teamShift,
            'on_duty'       => $onDuty,
            'team_name'     => $team?->name,
            'shifts'        => [
                'A' => ['label' => 'Shift A', 'start' => '07:00', 'end' => '15:00'],
                'B' => ['label' => 'Shift B', 'start' => '15:00', 'end' => '23:00'],
                'C' => ['label' => 'Shift C', 'start' => '23:00', 'end' => '07:00'],
            ],
        ]);
    }

    /**
     * Determine current shift based on Philippine time.
     */
    public static function currentShift(): string
    {
        $hour = (int) Carbon::now('Asia/Manila')->format('G');

        if ($hour >= 7 && $hour < 15) {
            return 'A';
        }
        if ($hour >= 15 && $hour < 23) {
            return 'B';
        }
        return 'C';
    }

    /**
     * Get team IDs that are currently on duty.
     */
    public static function onDutyTeamIds(): array
    {
        $level = Setting::getValue('schedule_level', 'white');

        if ($level === 'red') {
            return Team::where('is_active', true)->pluck('id')->toArray();
        }

        $currentShift = static::currentShift();

        return Team::where('is_active', true)
            ->where('shift', $currentShift)
            ->pluck('id')
            ->toArray();
    }

    /**
     * POST /api/admin/schedule
     * Admin changes the schedule level (white/red) and notifies all responders.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'level' => 'required|in:white,red',
        ]);

        $newLevel = $request->level;
        $oldLevel = Setting::getValue('schedule_level', 'white');

        if ($newLevel === $oldLevel) {
            return response()->json(['message' => 'No change.', 'level' => $newLevel]);
        }

        Setting::setValue('schedule_level', $newLevel);

        // Broadcast real-time to all connected clients
        SocketService::toAll('schedule-updated', [
            'level'         => $newLevel,
            'current_shift' => static::currentShift(),
        ]);

        // Notify all responders via push
        $responderIds = User::where('role', 'responder')->pluck('id')->toArray();

        if ($newLevel === 'red') {
            ExpoPushService::sendToUsers(
                $responderIds,
                '🔴 RED ALERT — All Units Report for Duty',
                'Emergency declared. All responder teams must report for 24-hour duty immediately. Shifts are suspended until further notice.',
                [
                    'type'     => 'schedule_change',
                    'level'    => 'red',
                    'channelId' => 'floodtrack-critical',
                ],
            );
        } else {
            $currentShift = static::currentShift();
            ExpoPushService::sendToUsers(
                $responderIds,
                'Alert Level Lowered — Normal Operations',
                "Emergency over. Resume regular shift rotation. Current active shift: Shift {$currentShift}.",
                [
                    'type'     => 'schedule_change',
                    'level'    => 'white',
                    'channelId' => 'floodtrack-updates',
                ],
            );
        }

        return response()->json(['message' => "Schedule level changed to {$newLevel}.", 'level' => $newLevel]);
    }
}
