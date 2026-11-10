<?php

namespace App\Console\Commands;

use App\Models\DutyLog;
use App\Models\Setting;
use App\Models\Team;
use App\Models\User;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SyncDutyStatus extends Command
{
    protected $signature = 'duty:sync';
    protected $description = 'Sync responder duty status from team shifts (runs every minute)';

    /**
     * Determine the active shift based on current Manila time.
     * A: 07:00–14:59, B: 15:00–22:59, C: 23:00–06:59
     */
    private function activeShift(): string
    {
        $hour = (int) Carbon::now('Asia/Manila')->format('G');
        if ($hour >= 7 && $hour < 15) return 'A';
        if ($hour >= 15 && $hour < 23) return 'B';
        return 'C';
    }

    public function handle(): int
    {
        $activeShift = $this->activeShift();
        $isRedAlert = Setting::getValue('schedule_level', 'white') === 'red';
        $now = now();

        // Get all responders with their team info
        $responders = User::where('role', 'responder')
            ->whereNotNull('team_id')
            ->with('team:id,shift,is_active')
            ->select(['id', 'name', 'team_id', 'is_on_duty', 'duty_override'])
            ->get();

        $changed = 0;

        foreach ($responders as $responder) {
            $team = $responder->team;

            // Determine what duty should be
            $shouldBeOnDuty = false;
            $source = 'shift';

            if ($responder->duty_override === 'on') {
                $shouldBeOnDuty = true;
                $source = 'override';
            } elseif ($responder->duty_override === 'off') {
                $shouldBeOnDuty = false;
                $source = 'override';
            } elseif ($team && $team->is_active) {
                // Red alert: all active teams are on duty
                $shouldBeOnDuty = $isRedAlert || $team->shift === $activeShift;
            }

            $currentlyOnDuty = (bool) $responder->is_on_duty;

            // Only update if state changed
            if ($shouldBeOnDuty === $currentlyOnDuty) continue;

            $changed++;

            // Update user
            $updateData = ['is_on_duty' => $shouldBeOnDuty];
            if (! $shouldBeOnDuty) {
                // Clear location when going off duty
                $updateData['current_latitude'] = null;
                $updateData['current_longitude'] = null;
                $updateData['current_heading'] = null;
                $updateData['current_speed'] = null;
                $updateData['location_updated_at'] = null;
            }
            $responder->update($updateData);

            // Write duty log
            if ($shouldBeOnDuty) {
                DutyLog::create([
                    'user_id'    => $responder->id,
                    'started_at' => $now,
                    'source'     => $source,
                ]);
            } else {
                // Close the open duty log
                DutyLog::where('user_id', $responder->id)
                    ->whereNull('ended_at')
                    ->update(['ended_at' => $now]);
            }

            // Emit duty.changed via socket
            SocketService::toAll('duty.changed', [
                'user_id' => $responder->id,
                'on_duty' => $shouldBeOnDuty,
            ]);

            // Send push notification for shift change
            $cacheKey = "duty_push:{$responder->id}:{$shouldBeOnDuty}";
            if (! Cache::has($cacheKey)) {
                Cache::put($cacheKey, true, 300); // 5 min debounce
                ExpoPushService::sendToUsers(
                    $responder->id,
                    $shouldBeOnDuty ? 'You are now on duty' : 'Your shift has ended',
                    $shouldBeOnDuty
                        ? "Shift {$activeShift} is active. Location tracking is on."
                        : 'Location tracking has stopped. Rest well.',
                    [
                        'type'     => 'duty_change',
                        'on_duty'  => $shouldBeOnDuty,
                        'shift'    => $activeShift,
                    ]
                );
            }
        }

        // Also handle responders with no team — always off duty
        User::where('role', 'responder')
            ->whereNull('team_id')
            ->where('is_on_duty', true)
            ->where(function ($q) {
                $q->whereNull('duty_override')->orWhere('duty_override', '!=', 'on');
            })
            ->update([
                'is_on_duty'          => false,
                'current_latitude'    => null,
                'current_longitude'   => null,
                'current_heading'     => null,
                'current_speed'       => null,
                'location_updated_at' => null,
            ]);

        $this->info("Shift {$activeShift} | {$changed} responder(s) updated.");
        return 0;
    }
}
