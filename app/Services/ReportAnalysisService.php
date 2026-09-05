<?php

namespace App\Services;

use App\Models\Report;
use FFMpeg\Coordinate\TimeCode;
use FFMpeg\FFMpeg;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use OpenAI;

class ReportAnalysisService
{
    private static function client(): \OpenAI\Client
    {
        return OpenAI::factory()
            ->withApiKey(config('services.openai.key'))
            ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
            ->make();
    }

    /**
     * Analyze a newly submitted report for duplicates, fake content, and image validity.
     * Returns an array of flags to be saved on the report.
     */
    public static function analyze(Report $report, array $mediaFiles = []): array
    {
        $result = [
            'ai_flagged'             => false,
            'ai_flag_reason'         => null,
            'ai_image_verified'      => null,
            'ai_image_notes'         => null,
            'ai_exif_status'         => null,
            'ai_exif_notes'          => null,
            'potential_duplicate_of' => null,
        ];

        $tempFrames = [];

        try {
            // --- 1. Text analysis: fake/suspicious + duplicate check ---
            // ~1km bounding box (0.009 degrees ≈ 1km)
            $delta         = 0.009;
            $recentReports = Report::where('id', '!=', $report->id)
                ->where('created_at', '>=', now()->subHours(48))
                ->whereBetween('latitude', [$report->latitude - $delta, $report->latitude + $delta])
                ->whereBetween('longitude', [$report->longitude - $delta, $report->longitude + $delta])
                ->get(['id', 'reference_number', 'severity', 'description', 'address', 'latitude', 'longitude'])
                ->toArray();

            $textResult = static::analyzeText($report, $recentReports);

            if ($textResult['is_suspicious']) {
                $result['ai_flagged']     = true;
                $result['ai_flag_reason'] = $textResult['reason'];
            }

            if ($textResult['duplicate_of']) {
                $result['ai_flagged']             = true;
                $result['potential_duplicate_of'] = $textResult['duplicate_of'];
                $result['ai_flag_reason']         = trim(($result['ai_flag_reason'] ?? '') . ' ' . 'Possible duplicate report detected.');
            }

            // --- 2. Image & video analysis ---
            $imageFiles = array_filter($mediaFiles, fn ($f) => static::isImage($f));
            $videoFiles = array_filter($mediaFiles, fn ($f) => static::isVideo($f));

            // Extract frames from videos so AI can verify them alongside images
            $videoFrameFiles = [];
            foreach ($videoFiles as $video) {
                $frames = static::extractVideoFrames($video);
                $tempFrames = array_merge($tempFrames, $frames);
                $videoFrameFiles = array_merge($videoFrameFiles, $frames);
            }

            $allVisualFiles = array_merge(array_values($imageFiles), $videoFrameFiles);
            $hasVideos = !empty($videoFiles);

            if (!empty($allVisualFiles)) {
                $imageResult = static::analyzeImages(
                    $allVisualFiles,
                    $report->severity,
                    $report->description,
                    $hasVideos,
                );

                $result['ai_image_verified'] = $imageResult['verified'];
                $result['ai_image_notes']    = $imageResult['notes'];

                if (!$imageResult['verified']) {
                    $result['ai_flagged']     = true;
                    $result['ai_flag_reason'] = trim(($result['ai_flag_reason'] ?? '') . ' ' . 'Media verification failed: ' . $imageResult['notes']);
                }

                // --- 3. EXIF metadata verification (images only) ---
                if (!empty($imageFiles)) {
                    $exifResult = static::verifyExif(array_values($imageFiles), $report->latitude, $report->longitude);
                    $result['ai_exif_status'] = $exifResult['status'];
                    $result['ai_exif_notes']  = $exifResult['notes'];

                    if ($exifResult['status'] === 'fail') {
                        $result['ai_flagged']     = true;
                        $result['ai_flag_reason'] = trim(($result['ai_flag_reason'] ?? '') . ' ' . 'EXIF check failed: ' . $exifResult['notes']);
                    }
                } else {
                    $result['ai_exif_status'] = 'no_data';
                    $result['ai_exif_notes']  = 'Only video files submitted. EXIF verification applies to photos only.';
                }
            } elseif ($hasVideos) {
                // Video frame extraction failed — accept video and send to admin
                $result['ai_image_verified'] = true;
                $result['ai_image_notes']    = 'Video evidence submitted. Frame extraction unavailable.';
                $result['ai_exif_status']    = 'no_data';
                $result['ai_exif_notes']     = 'Only video files submitted. EXIF verification applies to photos only.';
            }
        } catch (\Throwable $e) {
            Log::error('[ReportAnalysis] AI analysis failed', ['error' => $e->getMessage(), 'report_id' => $report->id]);
        } finally {
            // Clean up temporary frame files
            foreach ($tempFrames as $framePath) {
                if (is_string($framePath)) {
                    @unlink($framePath);
                }
            }
        }

        return $result;
    }

    private static function analyzeText(Report $report, array $recentReports): array
    {
        $nearbyJson = empty($recentReports)
            ? 'None'
            : json_encode($recentReports, JSON_PRETTY_PRINT);

        $prompt = <<<PROMPT
You are a flood report verification assistant for a disaster response system in the Philippines.

Analyze this new flood report and respond ONLY with valid JSON.

NEW REPORT:
- Reference: {$report->reference_number}
- Severity: {$report->severity}
- Description: {$report->description}
- Address: {$report->address}
- Coordinates: {$report->latitude}, {$report->longitude}

RECENT REPORTS WITHIN 1KM (last 48 hours):
{$nearbyJson}

IMPORTANT: Reports may be written in Tagalog, Filipino, Taglish, or English. All languages are valid and should NOT be treated as suspicious. Focus on the actual content, not the language used.

Determine:
1. Is this report suspicious or fake? (vague description, severity mismatch, nonsensical content — NOT based on language)
2. Is it a duplicate of any recent nearby report?

Respond with this JSON format:
{
  "is_suspicious": true or false,
  "reason": "explanation if suspicious, otherwise null",
  "duplicate_of": report ID (integer) if duplicate, otherwise null
}
PROMPT;

        $response = static::client()->chat()->create([
            'model'    => 'gpt-4o',
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 300,
        ]);

        $data = json_decode($response->choices[0]->message->content, true);

        return [
            'is_suspicious' => (bool) ($data['is_suspicious'] ?? false),
            'reason'        => $data['reason'] ?? null,
            'duplicate_of'  => isset($data['duplicate_of']) && is_numeric($data['duplicate_of'])
                ? (int) $data['duplicate_of']
                : null,
        ];
    }

    private static function analyzeImages(array $files, string $severity, ?string $description, bool $hasVideos = false): array
    {
        $mediaNote = $hasVideos
            ? "\n\nSome images below are frames extracted from submitted video clips. Verify these the same way as photos — they should show real flood conditions, not recordings of screens, pre-recorded footage, or unrelated content."
            : '';

        $content = [
            [
                'type' => 'text',
                'text' => <<<PROMPT
You are verifying media submitted with a flood incident report in the Philippines.

Report severity: {$severity}
Report description: {$description}

NOTE: The description may be written in Tagalog, Filipino, or English — this is normal and should NOT affect your verification decision. Focus solely on what is visible in the media.{$mediaNote}

For each image check:
1. Does it show visible flooding, water damage, flood-related hazard, or people needing help due to flooding?
2. Does the severity match what is visible?
3. Does it appear to be a real photo/video frame (not AI-generated, stock photo, or unrelated image)?
4. Is it a photo of a screen? Even zoomed-in screen photos have telltale signs:
   - Visible pixel grid, RGB subpixel pattern, or dot matrix
   - Moiré patterns (wavy interference lines)
   - Unnatural uniform backlighting with no natural shadows
   - Screen glare, light bleed, or color banding
   - Flat/unnatural color reproduction lacking depth and natural lighting variation
   - Unnaturally sharp or overly smooth areas (no lens blur, bokeh, or depth of field)
   - Watermarks, UI elements, browser chrome, or social media overlays
   Photos/recordings of screens are NOT valid evidence, even if no device edges are visible.

Mark as NOT verified if:
- The media does NOT show any visible flood, water damage, or flood-related need for help
- The image appears to be AI-generated, a stock photo, or downloaded from the internet
- The image shows signs of being a photo/recording of a screen (even without visible device edges)

Respond ONLY with valid JSON:
{
  "verified": true or false,
  "notes": "brief explanation"
}
PROMPT,
            ],
        ];

        foreach ($files as $file) {
            if (is_string($file)) {
                $path = $file;
                $mimeType = 'image/jpeg';
            } elseif ($file instanceof UploadedFile) {
                $path = $file->getRealPath();
                $mimeType = $file->getMimeType();
            } else {
                $path = $file->getPathname();
                $mimeType = mime_content_type($path) ?: 'image/jpeg';
            }
            $base64 = base64_encode(file_get_contents($path));

            $content[] = [
                'type'      => 'image_url',
                'image_url' => [
                    'url'    => "data:{$mimeType};base64,{$base64}",
                    'detail' => 'high',
                ],
            ];
        }

        $response = static::client()->chat()->create([
            'model'    => 'gpt-4o',
            'messages' => [
                ['role' => 'user', 'content' => $content],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 200,
        ]);

        $data = json_decode($response->choices[0]->message->content, true);

        return [
            'verified' => (bool) ($data['verified'] ?? true),
            'notes'    => $data['notes'] ?? null,
        ];
    }

    /**
     * Verify EXIF metadata of uploaded images.
     * Checks: has EXIF data, GPS proximity to report location, timestamp recency.
     *
     * Returns: ['status' => 'pass'|'fail'|'no_data', 'notes' => string]
     */
    private static function verifyExif(array $files, float $reportLat, float $reportLon): array
    {
        $reasons = [];
        $hasExif = false;

        foreach ($files as $file) {
            $path = $file instanceof UploadedFile ? $file->getRealPath() : $file->getPathname();

            if (!function_exists('exif_read_data')) {
                return ['status' => 'no_data', 'notes' => 'EXIF extension not available on server.'];
            }

            $exif = @exif_read_data($path, 'ANY_TAG', true);

            if (!$exif || empty($exif)) {
                continue;
            }

            $hasExif = true;

            // --- Check GPS ---
            if (isset($exif['GPS']['GPSLatitude'], $exif['GPS']['GPSLongitude'])) {
                $lat = static::exifGpsToDecimal(
                    $exif['GPS']['GPSLatitude'],
                    $exif['GPS']['GPSLatitudeRef'] ?? 'N'
                );
                $lon = static::exifGpsToDecimal(
                    $exif['GPS']['GPSLongitude'],
                    $exif['GPS']['GPSLongitudeRef'] ?? 'E'
                );

                // ~5km tolerance
                $distance = static::haversineKm($lat, $lon, $reportLat, $reportLon);

                if ($distance > 5) {
                    $reasons[] = "Photo GPS is {$distance}km from report location.";
                }
            }

            // --- Check timestamp ---
            $dateStr = $exif['EXIF']['DateTimeOriginal']
                ?? $exif['IFD0']['DateTime']
                ?? null;

            if ($dateStr) {
                try {
                    $photoTime = \Carbon\Carbon::createFromFormat('Y:m:d H:i:s', $dateStr);
                    $hoursAgo  = $photoTime->diffInHours(now());

                    if ($hoursAgo > 24) {
                        $reasons[] = "Photo was taken {$hoursAgo} hours ago ({$photoTime->toDateTimeString()}).";
                    }
                } catch (\Throwable $e) {
                    // Unparseable date — skip
                }
            }
        }

        if (!$hasExif) {
            return [
                'status' => 'no_data',
                'notes'  => 'No EXIF metadata found. Photo may be downloaded or screenshot.',
            ];
        }

        if (!empty($reasons)) {
            return [
                'status' => 'fail',
                'notes'  => implode(' ', $reasons),
            ];
        }

        return [
            'status' => 'pass',
            'notes'  => 'EXIF data present. Location and timestamp look consistent.',
        ];
    }

    /**
     * Convert EXIF GPS coordinates (degrees/minutes/seconds) to decimal.
     */
    private static function exifGpsToDecimal(array $dms, string $ref): float
    {
        $degrees = static::exifRationalToFloat($dms[0]);
        $minutes = static::exifRationalToFloat($dms[1]);
        $seconds = static::exifRationalToFloat($dms[2]);

        $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);

        if (in_array($ref, ['S', 'W'])) {
            $decimal *= -1;
        }

        return round($decimal, 7);
    }

    /**
     * Convert EXIF rational value (e.g. "123/1") to float.
     */
    private static function exifRationalToFloat(string $rational): float
    {
        $parts = explode('/', $rational);

        if (count($parts) === 2 && (float) $parts[1] !== 0.0) {
            return (float) $parts[0] / (float) $parts[1];
        }

        return (float) $parts[0];
    }

    /**
     * Extract frames from a video file using php-ffmpeg.
     * Returns an array of temporary file paths (JPEG frames).
     * Extracts 3 frames: at 1s, mid-point, and near the end.
     *
     * @return string[] Paths to temporary frame files
     */
    private static function extractVideoFrames($videoFile): array
    {
        $videoPath = $videoFile instanceof UploadedFile ? $videoFile->getRealPath() : $videoFile->getPathname();
        $frames    = [];

        try {
            $ffmpeg = FFMpeg::create([
                'ffmpeg.binaries'  => config('services.ffmpeg.binaries', '/usr/bin/ffmpeg'),
                'ffprobe.binaries' => config('services.ffmpeg.ffprobe', '/usr/bin/ffprobe'),
            ]);
            $video  = $ffmpeg->open($videoPath);

            // Get video duration in seconds
            $duration = $video->getStreams()->videos()->first()?->get('duration') ?? 15;
            $duration = (float) $duration;

            // Extract 3 frames: 1s, midpoint, and 1s before end
            $timestamps = [
                min(1, $duration * 0.1),
                $duration * 0.5,
                max(0, $duration - 1),
            ];

            foreach ($timestamps as $i => $ts) {
                $tmpPath = sys_get_temp_dir() . '/floodtrack_frame_' . uniqid() . "_{$i}.jpg";

                $video->frame(TimeCode::fromSeconds($ts))
                    ->save($tmpPath);

                if (file_exists($tmpPath) && filesize($tmpPath) > 0) {
                    $frames[] = $tmpPath;
                } else {
                    @unlink($tmpPath);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('[ReportAnalysis] Failed to extract frames from video.', [
                'path'  => $videoPath,
                'error' => $e->getMessage(),
            ]);
        }

        return $frames;
    }

    /**
     * Determine if a file is an image (supports UploadedFile and SplFileInfo).
     */
    private static function isImage($file): bool
    {
        if ($file instanceof UploadedFile) {
            return str_starts_with($file->getMimeType(), 'image');
        }
        $ext = strtolower(pathinfo($file->getPathname(), PATHINFO_EXTENSION));
        return in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
    }

    /**
     * Determine if a file is a video (supports UploadedFile and SplFileInfo).
     */
    private static function isVideo($file): bool
    {
        if ($file instanceof UploadedFile) {
            return str_starts_with($file->getMimeType(), 'video');
        }
        $ext = strtolower(pathinfo($file->getPathname(), PATHINFO_EXTENSION));
        return in_array($ext, ['mp4', 'mov', 'avi', 'mkv', 'webm']);
    }

    /**
     * Haversine distance in kilometres between two coordinates.
     */
    private static function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return round(2 * $r * asin(sqrt($a)), 1);
    }
}
