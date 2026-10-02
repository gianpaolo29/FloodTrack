<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\ScheduleController;
use App\Models\ReportSlaConfig;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\ScheduleLevelChanged;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/settings/index', [
            'settings'    => Setting::allGrouped(),
            'sla_configs' => ReportSlaConfig::allGroupedBySeverity(),
            'sla_enabled' => (bool) Setting::getValue('sla_enabled'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:500',
        ]);

        // Capture old schedule level before saving
        $oldScheduleLevel = Setting::getValue('schedule_level', 'white');

        foreach ($request->settings as $key => $value) {
            $setting = Setting::where('key', $key)->first();

            if (! $setting) {
                continue;
            }

            // Convert frontend values to proper storage format
            $storeValue = match ($setting->type) {
                'boolean' => in_array($value, ['1', 'true', true], true) ? '1' : '0',
                default   => (string) $value,
            };

            $setting->update(['value' => $storeValue]);
        }

        // If schedule level changed, notify all responders
        $newScheduleLevel = $request->settings['schedule_level'] ?? null;

        if ($newScheduleLevel && $newScheduleLevel !== $oldScheduleLevel) {
            $this->handleScheduleChange($newScheduleLevel);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Settings saved.']);

        return back();
    }

    private function handleScheduleChange(string $newLevel): void
    {
        $currentShift = ScheduleController::currentShift();

        // 1. Broadcast real-time socket event to all connected clients
        SocketService::toAll('schedule-updated', [
            'level'         => $newLevel,
            'current_shift' => $currentShift,
        ]);

        // 2. Create database notification for each responder (appears in alerts tab)
        $responders = User::where('role', 'responder')->get();
        $responderIds = $responders->pluck('id')->toArray();

        Notification::send($responders, new ScheduleLevelChanged($newLevel, $currentShift));

        // 3. Emit per-user socket event so alerts tab updates instantly
        foreach ($responderIds as $uid) {
            SocketService::toUser($uid, 'new-notification', [
                'id'   => 'schedule_' . now()->timestamp,
                'type' => 'schedule_change',
            ]);
        }

        // 4. Send push notifications
        if ($newLevel === 'red') {
            ExpoPushService::sendToUsers(
                $responderIds,
                '🔴 RED ALERT — All Units Report for Duty',
                'Emergency declared. All responder teams must report for 24-hour duty immediately. Shifts are suspended until further notice.',
                [
                    'type'      => 'schedule_change',
                    'level'     => 'red',
                    'channelId' => 'floodtrack-critical',
                ],
            );
        } else {
            ExpoPushService::sendToUsers(
                $responderIds,
                'Alert Level Lowered — Normal Operations',
                "Emergency over. Resume regular shift rotation. Current active shift: Shift {$currentShift}.",
                [
                    'type'      => 'schedule_change',
                    'level'     => 'white',
                    'channelId' => 'floodtrack-updates',
                ],
            );
        }
    }
}
