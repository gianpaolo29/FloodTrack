<?php

namespace App\Notifications;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewReportSubmitted extends Notification
{
    use Queueable;

    public function __construct(public Report $report) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'new_report',
            'title'   => 'New Report Submitted',
            'message' => "A new {$this->report->severity} {$this->report->hazard_type} report was submitted"
                . ($this->report->address ? " at {$this->report->address}" : '') . '.',
            'report_id'        => $this->report->id,
            'reference_number' => $this->report->reference_number,
            'severity'         => $this->report->severity,
            'url'              => "/admin/reports/{$this->report->id}",
        ];
    }
}
