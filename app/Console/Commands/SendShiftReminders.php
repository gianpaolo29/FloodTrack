<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Models\Team;
use App\Services\ExpoPushService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendShiftReminders extends Command
{
    protected $signature = 'schedule:shift-reminders';
    protected $description = 'Send push notifications to teams 10 minutes before their shift starts';

    /**
     * Shift start times in 24h format (Asia/Manila).
     */
    private const SHIFT_STARTS = [
        'A' => '07:00',
        'B' => '15:00',
        'C' => '23:00',
    ];

    private const SHIFT_LABELS = [
        'A' => 'Shift A (7:00 AM – 3:00 PM)',
        'B' => 'Shift B (3:00 PM – 11:00 PM)',
        'C' => 'Shift C (11:00 PM – 7:00 AM)',
    ];

    public function handle(): int
    {
        $level = Setting::getValue('schedule_level', 'white');

        // Only send reminders in White (normal) mode
        if ($level !== 'white') {
            $this->info('Schedule is RED — skipping shift reminders (all units on duty).');
            return self::SUCCESS;
        }

        $now = Carbon::now('Asia/Manila');
        $currentTime = $now->format('H:i');

        foreach (self::SHIFT_STARTS as $shift => $startTime) {
            // Calculate 10 minutes before shift start
            $reminderTime = Carbon::createFromFormat('H:i', $startTime, 'Asia/Manila')
                ->subMinutes(10)
                ->format('H:i');

            if ($currentTime !== $reminderTime) {
                continue;
            }

            $this->info("Sending reminder for Shift {$shift} (starts at {$startTime})...");

            // Get all active teams on this shift
            $teams = Team::where('is_active', true)
                ->where('shift', $shift)
                ->with('members:id,name,team_id')
                ->get();

            if ($teams->isEmpty()) {
                $this->info("No active teams on Shift {$shift}.");
                continue;
            }

            $memberIds = $teams->flatMap(fn ($t) => $t->members->pluck('id'))->unique()->toArray();

            if (empty($memberIds)) {
                $this->info("No members in Shift {$shift} teams.");
                continue;
            }

            $label = self::SHIFT_LABELS[$shift];

            ExpoPushService::sendToUsers(
                $memberIds,
                "Your shift starts in 10 minutes",
                "{$label} begins soon. Prepare for duty.",
                [
                    'type'      => 'shift_reminder',
                    'shift'     => $shift,
                    'channelId' => 'floodtrack-updates',
                ],
            );

            $this->info("Notified " . count($memberIds) . " responders for Shift {$shift}.");
        }

        return self::SUCCESS;
    }
}
