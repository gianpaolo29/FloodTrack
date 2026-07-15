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

Determine:
1. Is this report suspicious or fake? (vague description, severity mismatch, nonsensical content)
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
You are verifying images submitted with a flood incident report.

Report severity: {$severity}
Report description: {$description}

For each image check:
1. Does it show flooding, water damage, or flood-related hazard?
2. Does the severity match what is visible?
3. Does it appear to be a real photo (not AI-generated, stock photo, or unrelated image)?

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
}
