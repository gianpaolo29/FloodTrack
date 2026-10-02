<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ScheduleLevelChanged extends Notification
{
    use Queueable;

    public function __construct(
        public string $level,
        public string $currentShift,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        if ($this->level === 'red') {
            return [
                'type'    => 'schedule_change',
                'title'   => 'RED ALERT — All Units Report for Duty',
                'message' => 'Emergency declared. All responder teams must report for 24-hour duty immediately. Shifts are suspended until further notice.',
            ];
        }

        return [
            'type'    => 'schedule_change',
            'title'   => 'Alert Level Lowered — Normal Operations',
            'message' => "Emergency over. Resume regular shift rotation. Current active shift: Shift {$this->currentShift}.",
        ];
    }
}
