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
        $ref = $this->report->reference_number;

        $messages = [
            'verified' => "Your report {$ref} has been verified. Responders will be dispatched shortly.",
            'rejected' => "Your report {$ref} could not be verified. No flooding was detected in the submitted photo.",
            'assigned' => "A responder has been assigned to your report {$ref}.",
            'en_route' => "A responder is on the way to your location (Report {$ref}).",
            'on_scene' => "A responder has arrived at your location (Report {$ref}).",
            'resolved' => "Your report {$ref} has been resolved. Thank you for helping keep your community safe.",
        ];

        $titles = [
            'verified' => 'Report Verified',
            'rejected' => 'Report Not Verified',
            'assigned' => 'Responder Assigned',
            'en_route' => 'Responder En Route',
            'on_scene' => 'Responder On Scene',
            'resolved' => 'Report Resolved',
        ];

        $message = $messages[$this->newStatus]
            ?? "Report {$ref} status updated to {$this->newStatus}.";

        if ($this->changedBy && ! isset($messages[$this->newStatus])) {
            $message .= " — by {$this->changedBy}";
        }

        return [
            'type'             => 'status_changed',
            'title'            => $titles[$this->newStatus] ?? 'Report Status Updated',
            'message'          => $message,
            'report_id'        => $this->report->id,
            'reference_number' => $ref,
            'old_status'       => $this->oldStatus,
            'new_status'       => $this->newStatus,
            'severity'         => $this->report->severity,
        ];
    }
}
