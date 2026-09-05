<?php

namespace App\Services;

use App\Models\EvacuationCenter;
use App\Models\Protocol;
use App\Models\Report;
use Illuminate\Support\Facades\Log;
use OpenAI;

class AdvisoryService
{
    private static function client(): \OpenAI\Client
    {
        return OpenAI::factory()
            ->withApiKey(config('services.openai.key'))
            ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
            ->make();
    }

    /**
     * Generate an AI-powered advisory for a low/moderate severity report.
     *
     * Returns structured data with nearby evacuation centers,
     * safety tips, and AI-generated suggested actions.
     */
    public static function generate(Report $report): array
    {
        $nearbyCenters  = static::findNearbyCenters($report);
        $safetyTips     = static::fetchSafetyTips();
        $suggestedActions = static::generateSuggestedActions($report, $nearbyCenters);

        return [
            'nearby_centers'    => $nearbyCenters,
            'safety_tips'       => $safetyTips,
            'suggested_actions' => $suggestedActions,
            'generated_at'      => now()->toIso8601String(),
        ];
    }

    /**
     * Find active evacuation centers within 10km, sorted by distance (top 5).
     */
    private static function findNearbyCenters(Report $report): array
    {
        $centers = EvacuationCenter::where('is_active', true)->get();

        $nearby = $centers->map(function (EvacuationCenter $center) use ($report) {
            $distance = static::haversineKm(
                $report->latitude,
                $report->longitude,
                $center->latitude,
                $center->longitude,
            );

            return [
                'id'                => $center->id,
                'name'              => $center->name,
                'address'           => $center->address,
                'type'              => $center->type,
                'distance_km'       => $distance,
                'capacity'          => $center->capacity,
                'current_occupancy' => $center->current_occupancy,
                'occupancy_pct'     => $center->occupancy_pct,
                'latitude'          => $center->latitude,
                'longitude'         => $center->longitude,
            ];
        })
            ->filter(fn (array $c) => $c['distance_km'] <= 10)
            ->sortBy('distance_km')
            ->take(5)
            ->values()
            ->all();

        return $nearby;
    }

    /**
     * Fetch flood-related safety tips from the protocols table.
     */
    private static function fetchSafetyTips(): array
    {
        $protocol = Protocol::where('hazard_type', 'flood')->first();

        if (! $protocol) {
            return [];
        }

        return [
            [
                'tip'   => $protocol->safety_tip,
                'steps' => $protocol->steps ?? [],
            ],
        ];
    }

    /**
     * Use OpenAI to generate severity-contextual suggested actions.
     */
    private static function generateSuggestedActions(Report $report, array $nearbyCenters): array
    {
        try {
            $centersText = empty($nearbyCenters)
                ? 'No nearby evacuation centers found within 10km.'
                : collect($nearbyCenters)->map(fn ($c) => "- {$c['name']} ({$c['distance_km']}km away, {$c['occupancy_pct']}% full)")->implode("\n");

            $prompt = <<<PROMPT
You are a disaster safety advisor for a flood monitoring system in the Philippines.

A resident has reported flooding in their area. Based on the details below, provide 3-5 specific, actionable safety recommendations.

REPORT DETAILS:
- Severity: {$report->severity}
- Description: {$report->description}
- Location: {$report->address}

NEARBY EVACUATION CENTERS:
{$centersText}

GUIDELINES:
- Tailor urgency to the severity level (low = precautionary, moderate = preparatory).
- If evacuation centers are nearby and available, suggest them by name.
- Include practical actions (securing belongings, monitoring water levels, contacting family, etc.).
- Keep each recommendation concise (1-2 sentences).
- Write in English but keep language simple and accessible.

Respond ONLY with valid JSON:
{
  "suggested_actions": ["action1", "action2", "action3"]
}
PROMPT;

            $response = static::client()->chat()->create([
                'model'    => 'gpt-4o',
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => 400,
            ]);

            $data = json_decode($response->choices[0]->message->content, true);

            return $data['suggested_actions'] ?? [];
        } catch (\Throwable $e) {
            Log::error('[AdvisoryService] AI suggested actions failed', [
                'error'     => $e->getMessage(),
                'report_id' => $report->id,
            ]);

            return [
                'Monitor water levels in your area and stay alert for any changes.',
                'Prepare an emergency go-bag with important documents, water, and food.',
                'Stay updated through official channels and local government advisories.',
            ];
        }
    }

    /**
     * Haversine distance in kilometres between two coordinates.
     */
    private static function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return round(2 * $r * asin(sqrt($a)), 1);
    }
}
