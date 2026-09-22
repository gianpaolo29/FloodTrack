<?php

namespace App\Jobs;

use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\Setting;
use App\Services\AdvisoryService;
use App\Services\ExpoPushService;
use App\Services\SlaService;
use App\Services\SocketService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateAdvisoryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 60;

    public function __construct(
        public int $reportId,
        public int $verifiedByUserId,
    ) {}

    public function handle(): void
    {
        $report = Report::find($this->reportId);

        if (!$report || !in_array($report->status, ['verified', 'acknowledged'])) {
            return;
        }

        $aiEnabled = Setting::getValue('ai_report_analysis', true);

        $advisory = $aiEnabled
            ? AdvisoryService::generate($report)
            : AdvisoryService::generateWithoutAI($report);

        // Status may already be 'acknowledged' (set by controller), just attach the advisory
        $update = ['advisory' => $advisory];
        if ($report->status === 'verified') {
            $update['status'] = 'acknowledged';
        }
        $report->update($update);

        // Only create status update + notifications if we changed the status
        if ($report->status === 'verified') {
            $advisoryNote = $aiEnabled
                ? 'AI advisory generated with nearby evacuation centers and safety guidance.'
                : 'Advisory generated with nearby evacuation centers and safety protocols (AI disabled).';

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $this->verifiedByUserId,
                'status'    => 'acknowledged',
                'notes'     => $advisoryNote,
            ]);

            app(SlaService::class)->advanceStage($report, 'acknowledged');

            // Notify resident
            $report->loadMissing('user');
            if ($report->user) {
                $report->user->notify(new \App\Notifications\ReportStatusChanged($report, 'verified', 'acknowledged'));

                ExpoPushService::sendToUsers(
                    $report->user_id,
                    "Report {$report->reference_number} — Safety Advisory",
                    'We\'ve reviewed your report and prepared safety guidance for you. Open the app for details.',
                    [
                        'type'     => 'advisory',
                        'reportId' => $report->id,
                        'status'   => 'acknowledged',
                    ],
                    'my_reports'
                );

                SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => 'acknowledged']);
                SocketService::toUser($report->user_id, 'new-notification', ['type' => 'advisory', 'reportId' => $report->id, 'status' => 'acknowledged']);
            }
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[GenerateAdvisoryJob] Failed', [
            'report_id' => $this->reportId,
            'error'     => $exception->getMessage(),
        ]);

        // Fallback: save non-AI advisory so the report doesn't get stuck
        $report = Report::find($this->reportId);
        if ($report && $report->status === 'verified') {
            $advisory = AdvisoryService::generateWithoutAI($report);
            $report->update([
                'status'   => 'acknowledged',
                'advisory' => $advisory,
            ]);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $this->verifiedByUserId,
                'status'    => 'acknowledged',
                'notes'     => 'Advisory generated with fallback (AI unavailable).',
            ]);
        }
    }
}
