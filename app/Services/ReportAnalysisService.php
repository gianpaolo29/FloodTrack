<?php

namespace App\Services;

use App\Models\Report;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use OpenAI;

class ReportAnalysisService
{
    private static function client(): \OpenAI\Client
    {
        return OpenAI::client(config('services.openai.key'));
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

            // --- 2. Image analysis ---
            $imageFiles = array_filter($mediaFiles, fn ($f) => str_starts_with($f->getMimeType(), 'image'));

            if (!empty($imageFiles)) {
                $imageResult = static::analyzeImages(array_values($imageFiles), $report->severity, $report->description);

                $result['ai_image_verified'] = $imageResult['verified'];
                $result['ai_image_notes']    = $imageResult['notes'];

                if (!$imageResult['verified']) {
                    $result['ai_flagged']     = true;
                    $result['ai_flag_reason'] = trim(($result['ai_flag_reason'] ?? '') . ' ' . 'Image verification failed: ' . $imageResult['notes']);
                }

                // --- 3. EXIF metadata verification ---
                $exifResult = static::verifyExif(array_values($imageFiles), $report->latitude, $report->longitude);
                $result['ai_exif_status'] = $exifResult['status']; // pass, fail, no_data
                $result['ai_exif_notes']  = $exifResult['notes'];

                if ($exifResult['status'] === 'fail') {
                    $result['ai_flagged']     = true;
                    $result['ai_flag_reason'] = trim(($result['ai_flag_reason'] ?? '') . ' ' . 'EXIF check failed: ' . $exifResult['notes']);
                }
            }
        } catch (\Throwable $e) {
            Log::error('[ReportAnalysis] AI analysis failed', ['error' => $e->getMessage(), 'report_id' => $report->id]);
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

    private static function analyzeImages(array $files, string $severity, ?string $description): array
    {
        $content = [
            [
                'type' => 'text',
                'text' => <<<PROMPT
You are verifying images submitted with a flood incident report in the Philippines.

Report severity: {$severity}
Report description: {$description}

NOTE: The description may be written in Tagalog, Filipino, or English — this is normal and should NOT affect your image verification decision. Focus solely on what is visible in the photo.

For each image check:
1. Does it show visible flooding, water damage, flood-related hazard, or people needing help due to flooding?
2. Does the severity match what is visible?
3. Does it appear to be a real photo (not AI-generated, stock photo, or unrelated image)?

If the photo does NOT show any visible flood, water damage, or flood-related need for help, mark it as NOT verified — regardless of what the description says.

Respond ONLY with valid JSON:
{
  "verified": true or false,
  "notes": "brief explanation"
}
PROMPT,
            ],
        ];

        foreach ($files as $file) {
            $base64   = base64_encode(file_get_contents($file->getRealPath()));
            $mimeType = $file->getMimeType();

            $content[] = [
                'type'      => 'image_url',
                'image_url' => [
                    'url'    => "data:{$mimeType};base64,{$base64}",
                    'detail' => 'low',
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
            $path = $file->getRealPath();

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
