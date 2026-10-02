<?php

namespace App\Notifications;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TeamResolvedReport extends Notification
{
    use Queueable;

    public function __construct(
        public Report $report,
        public string $teamName,
        public string $address,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $ref = $this->report->reference_number;

        return [
            'type'             => 'team_resolved',
            'title'            => 'Report Resolved by Team',
            'message'          => "Team \"{$this->teamName}\" has resolved report {$ref} at {$this->address} and will return to base.",
            'report_id'        => $this->report->id,
            'reference_number' => $ref,
            'team_name'        => $this->teamName,
            'address'          => $this->address,
            'severity'         => $this->report->severity,
        ];
    }
}
