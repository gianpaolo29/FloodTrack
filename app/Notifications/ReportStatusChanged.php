<?php

namespace App\Notifications;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReportStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        public Report $report,
        public string $oldStatus,
        public string $newStatus,
        public ?string $changedBy = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $message = "Report {$this->report->reference_number} status changed from {$this->oldStatus} to {$this->newStatus}";
        if ($this->changedBy) {
            $message .= " by {$this->changedBy}";
        }

        return [
            'type'             => 'status_changed',
            'title'            => 'Report Status Updated',
            'message'          => $message . '.',
            'report_id'        => $this->report->id,
            'reference_number' => $this->report->reference_number,
            'old_status'       => $this->oldStatus,
            'new_status'       => $this->newStatus,
            'severity'         => $this->report->severity,
            'url'              => "/admin/reports/{$this->report->id}",
        ];
    }
}
