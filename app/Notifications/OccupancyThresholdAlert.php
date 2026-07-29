<?php

namespace App\Notifications;

use App\Models\EvacuationCenter;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OccupancyThresholdAlert extends Notification
{
    use Queueable;

    public function __construct(
        public EvacuationCenter $center,
        public int $occupancyPct,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'occupancy_alert',
            'title'         => 'High Occupancy Alert',
            'message'       => "{$this->center->name} is at {$this->occupancyPct}% capacity ({$this->center->current_occupancy}/{$this->center->capacity}).",
            'center_id'     => $this->center->id,
            'occupancy_pct' => $this->occupancyPct,
        ];
    }
}
