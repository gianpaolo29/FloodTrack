<?php

namespace App\Notifications;

use App\Models\Report;
use App\Services\SlaService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SlaBreachNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Report $report,
        public string $stage,
        public int $escalationLevel,
        public float $elapsedMinutes,
        public int $thresholdMinutes,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $ref        = $this->report->reference_number;
        $stageLabel = SlaService::stageLabel($this->stage);

        $levelLabels = [
            1 => 'Warning',
            2 => 'Breach',
            3 => 'Critical Escalation',
        ];

        $levelLabel = $levelLabels[$this->escalationLevel] ?? 'Alert';

        $message = "SLA {$levelLabel}: {$stageLabel} for report {$ref} — "
            . round($this->elapsedMinutes) . " min elapsed "
            . "(threshold: {$this->thresholdMinutes} min).";

        return [
            'type'             => 'sla_breach',
            'title'            => "SLA {$levelLabel} — {$ref}",
            'message'          => $message,
            'report_id'        => $this->report->id,
            'reference_number' => $ref,
            'stage'            => $this->stage,
            'escalation_level' => $this->escalationLevel,
            'severity'         => $this->report->severity,
        ];
    }
}
