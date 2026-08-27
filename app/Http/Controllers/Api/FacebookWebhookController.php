<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FacebookImportLog;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\NewReportSubmitted;
use App\Services\FacebookService;
use App\Services\ReportAnalysisService;
use App\Services\SlaService;
use App\Services\SocketService;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class FacebookWebhookController extends Controller
{
    /**
     * Facebook webhook verification (GET request).
     * Facebook sends a challenge to verify your endpoint.
     */
    public function verify(Request $request)
    {
        $verifyToken = config('services.facebook.app_secret');

        if ($request->query('hub_mode') === 'subscribe'
            && $request->query('hub_verify_token') === $verifyToken) {
            return response($request->query('hub_challenge'), 200);
        }

        return response('Forbidden', 403);
    }

    /**
     * Handle incoming webhook events from Facebook (POST request).
     * Called in real-time when someone posts on the Page.
     */
    public function handle(Request $request)
    {
        $payload = $request->all();

        Log::info('[FacebookWebhook] Received', ['object' => $payload['object'] ?? null]);

        if (($payload['object'] ?? null) !== 'page') {
            return response()->json(['status' => 'ignored']);
        }

        // Process asynchronously to respond quickly to Facebook (they expect 200 within 20s)
        dispatch(function () use ($payload) {
            $this->processEntries($payload['entry'] ?? []);
        })->afterResponse();

        return response()->json(['status' => 'ok']);
    }

    private function processEntries(array $entries): void
    {
        $facebook = app(FacebookService::class);
        $adminUser = User::where('role', 'admin')->first();
        $adminId = $adminUser?->id ?? 1;

        foreach ($entries as $entry) {
            $pageId = $entry['id'] ?? null;

            // Process feed changes
            foreach ($entry['changes'] ?? [] as $change) {
                if (($change['field'] ?? '') !== 'feed') {
                    continue;
                }

                $value = $change['value'] ?? [];
                $item = $value['item'] ?? null;
                $verb = $value['verb'] ?? null;

                // Only process new posts (not comments, reactions, etc.)
                if ($item !== 'post' && $item !== 'status') {
                    continue;
                }
                if ($verb !== 'add') {
                    continue;
                }

                $postId = $value['post_id'] ?? null;
                $message = $value['message'] ?? '';

                if (!$postId) {
                    continue;
                }

                // Skip if already processed
                if (FacebookImportLog::where('facebook_post_id', $postId)->exists()) {
                    continue;
                }

                // Check if flood-related
                if (!$facebook->shouldImport($message)) {
                    FacebookImportLog::create([
                        'facebook_post_id' => $postId,
                        'imported' => false,
                        'skipped_reason' => 'Not flood-related',
                    ]);
                    continue;
                }

                // Default location
                $lat = (float) config('services.openweather.lat', 14.0656);
                $lon = (float) config('services.openweather.lon', 120.6278);
                $address = 'Nasugbu, Batangas';

                // Create the report
                $report = Report::create([
                    'user_id' => $adminId,
                    'severity' => 'moderate',
                    'status' => 'pending',
                    'description' => mb_substr($message, 0, 1000),
                    'latitude' => $lat,
                    'longitude' => $lon,
                    'address' => $address,
                    'source' => 'facebook',
                    'facebook_post_id' => $postId,
                ]);

                ReportStatusUpdate::create([
                    'report_id' => $report->id,
                    'user_id' => null,
                    'status' => 'pending',
                    'notes' => 'Imported from Facebook Page (real-time webhook).',
                ]);

                // Try to fetch the full post for images
                $mediaFiles = [];
                try {
                    $posts = $facebook->getRecentPosts(5);
                    $matchedPost = collect($posts)->firstWhere('id', $postId);

                    if ($matchedPost && !empty($matchedPost['full_picture'])) {
                        $path = $facebook->downloadImage($matchedPost['full_picture'], $report->id);
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
                } catch (\Throwable $e) {
                    Log::warning('[FacebookWebhook] Failed to fetch post images', [
                        'post_id' => $postId,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Run AI analysis
                try {
                    $aiFlags = ReportAnalysisService::analyze($report, $mediaFiles);
                    $report->update($aiFlags);

                    $hasThunderstorm = false;
                    try {
                        $weather = app(WeatherService::class)->current($report->latitude, $report->longitude);
                        $hasThunderstorm = str_contains(strtolower($weather['main'] ?? ''), 'thunderstorm');
                    } catch (\Throwable $e) {}

                    $exifFailed = ($aiFlags['ai_exif_status'] ?? null) === 'fail';
                    $autoVerified = $aiFlags['ai_image_verified'] === true
                        && !$exifFailed
                        && ($hasThunderstorm || ($aiFlags['ai_flagged'] === false && $aiFlags['potential_duplicate_of'] === null));
                    $autoRejected = $aiFlags['ai_image_verified'] === false || $exifFailed;

                    if ($autoVerified) {
                        $report->update(['status' => 'verified', 'verified_at' => now()]);
                        ReportStatusUpdate::create([
                            'report_id' => $report->id,
                            'user_id' => null,
                            'status' => 'verified',
                            'notes' => 'Auto-verified: AI confirmed flood in Facebook post image.',
                        ]);
                    } elseif ($autoRejected) {
                        $report->update(['status' => 'rejected']);
                        ReportStatusUpdate::create([
                            'report_id' => $report->id,
                            'user_id' => null,
                            'status' => 'rejected',
                            'notes' => 'Auto-rejected: Facebook post image did not pass verification.',
                        ]);
                    } else {
                        $admins = User::where('role', 'admin')->get();
                        Notification::send($admins, new NewReportSubmitted($report));
                    }
                } catch (\Throwable $e) {
                    Log::error('[FacebookWebhook] AI analysis failed', [
                        'report_id' => $report->id,
                        'error' => $e->getMessage(),
                    ]);
                    $admins = User::where('role', 'admin')->get();
                    Notification::send($admins, new NewReportSubmitted($report));
                }

                app(SlaService::class)->initializeTracking($report);

                FacebookImportLog::create([
                    'facebook_post_id' => $postId,
                    'imported' => true,
                    'report_id' => $report->id,
                ]);

                // Auto-comment on the Facebook post
                $report->refresh();
                $statusLabel = match ($report->status) {
                    'verified' => 'verified and is now being processed',
                    'rejected' => 'reviewed but could not be verified',
                    default    => 'received and is pending review',
                };

                $comment = "Salamat sa iyong report! Ang iyong flood report ay na-record na sa FloodTrack system.\n\n"
                    . "Reference No: {$report->reference_number}\n"
                    . "Status: Your report has been {$statusLabel}.\n\n"
                    . "Maa-update ka sa status ng iyong report. Mag-ingat po!\n"
                    . "- FloodTrack Nasugbu";

                $facebook->commentOnPost($postId, $comment);

                // Notify via socket
                SocketService::toAll('new-notification', [
                    'type' => 'facebook_import',
                    'message' => "New flood report imported from Facebook: {$report->reference_number}",
                    'reportId' => $report->id,
                ]);

                Log::info('[FacebookWebhook] Imported post', [
                    'post_id' => $postId,
                    'report_id' => $report->id,
                    'reference' => $report->reference_number,
                ]);
            }
        }
    }
}
