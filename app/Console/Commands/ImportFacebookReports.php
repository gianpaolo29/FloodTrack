<?php

namespace App\Console\Commands;

use App\Models\FacebookImportLog;
use App\Models\Report;
use App\Models\ReportMedia;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\NewReportSubmitted;
use App\Services\FacebookService;
use App\Services\ReportAnalysisService;
use App\Services\SlaService;
use App\Services\SocketService;
use App\Services\WeatherService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class ImportFacebookReports extends Command
{
    protected $signature = 'facebook:import-reports';
    protected $description = 'Import flood-related posts from the APLA Facebook Page as reports';

    public function handle(FacebookService $facebook): int
    {
        if (!config('services.facebook.page_access_token')) {
            $this->error('Facebook Page Access Token is not configured.');
            return self::FAILURE;
        }

        if (!$facebook->isTokenValid()) {
            Log::critical('[FacebookImport] Page Access Token is invalid or expired.');
            $this->error('Facebook token is invalid. Check FACEBOOK_PAGE_ACCESS_TOKEN.');
            return self::FAILURE;
        }

        $posts = $facebook->getRecentPosts();

        if (empty($posts)) {
            $this->info('No posts found on the Facebook Page.');
            return self::SUCCESS;
        }

        $adminUser = User::where('role', 'admin')->first();
        $adminId   = $adminUser?->id ?? 1;
        $imported  = 0;

        foreach ($posts as $post) {
            $postId = $post['id'] ?? null;

            if (!$postId) {
                continue;
            }

            // Skip if already processed
            if (FacebookImportLog::where('facebook_post_id', $postId)->exists()) {
                $this->line("Already processed: {$postId}");
                continue;
            }

            $message = $post['message'] ?? '';

            // Check if flood-related
            if (!$facebook->isFloodRelated($message)) {
                FacebookImportLog::create([
                    'facebook_post_id' => $postId,
                    'imported'         => false,
                    'skipped_reason'   => 'Not flood-related',
                ]);
                $this->line("Skipped (not flood-related): {$postId}");
                continue;
            }

            // Extract location from post or use default
            $lat     = (float) config('services.openweather.lat', 14.0656);
            $lon     = (float) config('services.openweather.lon', 120.6278);
            $address = 'Nasugbu, Batangas';

            if (isset($post['place']['location'])) {
                $place = $post['place']['location'];
                $lat   = (float) ($place['latitude'] ?? $lat);
                $lon   = (float) ($place['longitude'] ?? $lon);
            }

            if (isset($post['place']['name'])) {
                $address = $post['place']['name'];
            }

            // Create the report
            $report = Report::create([
                'user_id'     => $adminId,
                'severity'    => 'moderate',
                'status'      => 'pending',
                'description' => mb_substr($message, 0, 1000),
                'latitude'    => $lat,
                'longitude'   => $lon,
                'address'     => $address,
                'source'      => 'facebook',
                'facebook_post_id' => $postId,
            ]);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => null,
                'status'    => 'pending',
                'notes'     => 'Imported from Facebook Page.',
            ]);

            // Download and attach images
            $mediaFiles = [];
            $imageUrl   = $post['full_picture'] ?? null;

            if ($imageUrl) {
                $path = $facebook->downloadImage($imageUrl, $report->id);
                if ($path) {
                    $media = $report->media()->create([
                        'file_path' => $path,
                        'file_type' => 'image',
                        'file_size' => Storage::disk('public')->size($path),
                    ]);

                    // Create UploadedFile for AI analysis
                    $fullPath = Storage::disk('public')->path($path);
                    $mediaFiles[] = new UploadedFile($fullPath, basename($path), 'image/jpeg', null, true);
                }
            }

            // Also check attachments for additional images
            if (isset($post['attachments']['data'])) {
                foreach ($post['attachments']['data'] as $attachment) {
                    $subAttachments = $attachment['subattachments']['data'] ?? [];
                    foreach ($subAttachments as $sub) {
                        $subUrl = $sub['media']['image']['src'] ?? null;
                        if ($subUrl && count($mediaFiles) < 5) {
                            $path = $facebook->downloadImage($subUrl, $report->id);
                            if ($path) {
                                $report->media()->create([
                                    'file_path' => $path,
                                    'file_type' => 'image',
                                    'file_size' => Storage::disk('public')->size($path),
                                ]);

                                $fullPath = Storage::disk('public')->path($path);
                                $mediaFiles[] = new UploadedFile($fullPath, basename($path), 'image/jpeg', null, true);
                            }
                        }
                    }
                }
            }

            // Run AI analysis
            try {
                $aiFlags = ReportAnalysisService::analyze($report, $mediaFiles);
                $report->update($aiFlags);

                // Auto-process based on AI verdict
                $hasThunderstorm = false;
                try {
                    $weather = app(WeatherService::class)->current($report->latitude, $report->longitude);
                    $hasThunderstorm = str_contains(strtolower($weather['main'] ?? ''), 'thunderstorm');
                } catch (\Throwable $e) {
                    // Weather check failed
                }

                $exifFailed   = ($aiFlags['ai_exif_status'] ?? null) === 'fail';
                $autoVerified = $aiFlags['ai_image_verified'] === true
                    && !$exifFailed
                    && ($hasThunderstorm || ($aiFlags['ai_flagged'] === false && $aiFlags['potential_duplicate_of'] === null));
                $autoRejected = $aiFlags['ai_image_verified'] === false || $exifFailed;

                if ($autoVerified) {
                    $report->update(['status' => 'verified', 'verified_at' => now()]);
                    ReportStatusUpdate::create([
                        'report_id' => $report->id,
                        'user_id'   => null,
                        'status'    => 'verified',
                        'notes'     => 'Auto-verified: AI confirmed flood in Facebook post image.',
                    ]);
                } elseif ($autoRejected) {
                    $report->update(['status' => 'rejected']);
                    ReportStatusUpdate::create([
                        'report_id' => $report->id,
                        'user_id'   => null,
                        'status'    => 'rejected',
                        'notes'     => 'Auto-rejected: Facebook post image did not pass verification.',
                    ]);
                } else {
                    // Needs manual review
                    $admins = User::where('role', 'admin')->get();
                    Notification::send($admins, new NewReportSubmitted($report));
                }
            } catch (\Throwable $e) {
                Log::error('[FacebookImport] AI analysis failed', [
                    'report_id' => $report->id,
                    'error'     => $e->getMessage(),
                ]);
                // Notify admins for manual review
                $admins = User::where('role', 'admin')->get();
                Notification::send($admins, new NewReportSubmitted($report));
            }

            // Initialize SLA tracking
            app(SlaService::class)->initializeTracking($report);

            // Log the import
            FacebookImportLog::create([
                'facebook_post_id' => $postId,
                'imported'         => true,
                'report_id'        => $report->id,
            ]);

            $imported++;
            $this->info("Imported: {$postId} → Report {$report->reference_number}");
        }

        if ($imported > 0) {
            SocketService::toAll('new-notification', [
                'type'    => 'facebook_import',
                'message' => "{$imported} new report(s) imported from Facebook.",
            ]);
        }

        $this->info("Done. Imported {$imported} report(s) from Facebook.");

        return self::SUCCESS;
    }
}
