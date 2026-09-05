<?php

namespace App\Jobs;

use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\NewReportSubmitted;
use App\Services\AdvisoryService;
use App\Services\ExpoPushService;
use App\Services\ReportAnalysisService;
use App\Services\SlaService;
use App\Services\SocketService;
use App\Services\WeatherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class AnalyzeReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;

    public function __construct(
        public int $reportId,
    ) {}

    public function handle(): void
    {
        $report = Report::with('media')->find($this->reportId);

        if (!$report || $report->status !== 'pending') {
            return;
        }

        // Build file paths from stored media for AI analysis
        $mediaFiles = [];
        foreach ($report->media as $media) {
            $fullPath = Storage::disk('public')->path($media->file_path);
            if (file_exists($fullPath)) {
                $mediaFiles[] = new \SplFileInfo($fullPath);
            }
        }

        // AI analysis: duplicate detection, fake report check, image/video verification
        $aiFlags = ReportAnalysisService::analyze($report, $mediaFiles);
        $report->update($aiFlags);

        // Check if there's a thunderstorm at the report location
        $hasThunderstorm = false;
        try {
            $weather = app(WeatherService::class)->current($report->latitude, $report->longitude);
            $hasThunderstorm = str_contains(strtolower($weather['main'] ?? ''), 'thunderstorm');
        } catch (\Throwable $e) {
            // Weather check failed — proceed without it
        }

        $exifFailed = $aiFlags['ai_exif_status'] === 'fail';

        $autoVerified = $aiFlags['ai_image_verified'] === true
            && !$exifFailed
            && ($hasThunderstorm || ($aiFlags['ai_flagged'] === false && $aiFlags['potential_duplicate_of'] === null));

        $autoRejected = $aiFlags['ai_image_verified'] === false
            || $exifFailed;

        // If AI couldn't verify media (e.g. FFmpeg unavailable), send to admin for manual review
        if ($aiFlags['ai_image_verified'] === null && !$autoVerified && !$autoRejected) {
            $admins = User::where('role', 'admin')->get();
            Notification::send($admins, new NewReportSubmitted($report));
            return;
        }

        // Initialize SLA tracking
        app(SlaService::class)->initializeTracking($report);

        if ($autoVerified) {
            $report->update([
                'status'      => 'verified',
                'verified_at' => now(),
            ]);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => null,
                'status'    => 'verified',
                'notes'     => 'Auto-verified: AI confirmed flood in submitted media.',
            ]);

            app(SlaService::class)->advanceStage($report, 'verified');

            // Low/moderate: generate AI advisory and transition to acknowledged
            if (!$report->requiresAssignment()) {
                $advisory = AdvisoryService::generate($report);
                $report->update([
                    'status'   => 'acknowledged',
                    'advisory' => $advisory,
                ]);

                ReportStatusUpdate::create([
                    'report_id' => $report->id,
                    'user_id'   => null,
                    'status'    => 'acknowledged',
                    'notes'     => 'AI advisory generated with nearby evacuation centers and safety guidance.',
                ]);

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

                app(SlaService::class)->advanceStage($report, 'acknowledged');
            } else {
                // High/critical: just notify about verification
                $report->user->notify(new \App\Notifications\ReportStatusChanged($report, 'pending', 'verified'));

                ExpoPushService::sendToUsers(
                    $report->user_id,
                    "Report {$report->reference_number} Verified",
                    'Your flood report has been verified automatically.',
                    [
                        'type'     => 'status_update',
                        'reportId' => $report->id,
                        'status'   => 'verified',
                    ],
                    'my_reports'
                );

                SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => 'verified']);
                SocketService::toUser($report->user_id, 'new-notification', ['type' => 'status_update', 'reportId' => $report->id, 'status' => 'verified']);
            }

        } elseif ($autoRejected) {
            $rejectReason = $exifFailed
                ? 'Auto-rejected: Media metadata indicates it may not be original or from this location.'
                : 'Auto-rejected: No flood detected in submitted media.';

            $report->update(['status' => 'rejected']);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => null,
                'status'    => 'rejected',
                'notes'     => $rejectReason,
            ]);

            $userMessage = $exifFailed
                ? 'Your report could not be verified. The media does not appear to be taken at the reported location.'
                : 'Your report could not be verified. The submitted media does not show flooding.';

            $report->user->notify(new \App\Notifications\ReportStatusChanged($report, 'pending', 'rejected'));

            ExpoPushService::sendToUsers(
                $report->user_id,
                "Report {$report->reference_number} Not Verified",
                $userMessage,
                [
                    'type'     => 'status_update',
                    'reportId' => $report->id,
                    'status'   => 'rejected',
                ],
                'my_reports'
            );

            SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => 'rejected']);
            SocketService::toUser($report->user_id, 'new-notification', ['type' => 'status_update', 'reportId' => $report->id, 'status' => 'rejected']);

            app(SlaService::class)->advanceStage($report, 'rejected');

        } else {
            // Needs manual admin review — notify admins
            $admins = User::where('role', 'admin')->get();
            Notification::send($admins, new NewReportSubmitted($report));
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[AnalyzeReportJob] Failed', [
            'report_id' => $this->reportId,
            'error'     => $exception->getMessage(),
        ]);

        // Ensure admins still get notified so the report doesn't get stuck
        $report = Report::find($this->reportId);
        if ($report && $report->status === 'pending') {
            $admins = User::where('role', 'admin')->get();
            Notification::send($admins, new NewReportSubmitted($report));
        }
    }
}
