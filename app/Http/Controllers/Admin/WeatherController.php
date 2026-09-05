<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class WeatherController extends Controller
{
    /** Barangay data from shared config. */
    private static function barangays(): array
    {
        return config('barangays');
    }

    public function index(WeatherService $weather)
    {
        // Barangay weather data (cached 10 min)
        $barangayData = Cache::remember('admin:barangay-weather', 600, function () use ($weather) {
            $barangays = [];

            foreach (self::barangays() as $brgy) {
                $current  = $weather->current($brgy['latitude'], $brgy['longitude']);
                $forecast = $weather->dailyForecast($brgy['latitude'], $brgy['longitude']);

                $riskScore = $this->computeFloodRisk($current, $forecast, $brgy);

                $barangays[] = [
                    'name'         => $brgy['name'],
                    'latitude'     => $brgy['latitude'],
                    'longitude'    => $brgy['longitude'],
                    'elevation_m'  => $brgy['elevation_m'],
                    'flood_prone'  => $brgy['flood_prone'],
                    'near_river'   => $brgy['near_river'],
                    'coastal'      => $brgy['coastal'],
                    'weather'      => [
                        'temperature'  => $current['temperature'],
                        'humidity'     => $current['humidity'],
                        'wind_speed'   => $current['wind_speed'],
                        'description'  => $current['description'],
                        'icon'         => $current['icon'],
                        'rain_1h'      => $current['rain_1h'],
                        'clouds'       => $current['clouds'],
                        'pressure'     => $current['pressure'],
                    ],
                    'forecast'     => array_slice($forecast, 0, 3),
                    'flood_risk'   => [
                        'score'    => $riskScore,
                        'level'    => $this->riskLevel($riskScore),
                    ],
                ];
            }

            usort($barangays, fn ($a, $b) => $b['flood_risk']['score'] <=> $a['flood_risk']['score']);

            return [
                'barangays'    => $barangays,
                'generated_at' => now()->toIso8601String(),
            ];
        });

        return Inertia::render('admin/weather/index', [
            'barangay_data' => $barangayData,
        ]);
    }

    /* ── Flood risk scoring ── */

    private function computeFloodRisk(array $current, array $forecast, array $brgy): int
    {
        $score = 0;

        // Current rain (max 30)
        $rain = $current['rain_1h'];
        if ($rain >= 7.5)      $score += 30;
        elseif ($rain >= 2.5)  $score += 20;
        elseif ($rain >= 0.5)  $score += 10;
        elseif ($rain > 0)     $score += 5;

        // Forecast rain next 24h (max 25)
        $forecastRain = collect($forecast)->take(2)->sum('rain_total');
        if ($forecastRain >= 50)      $score += 25;
        elseif ($forecastRain >= 25)  $score += 18;
        elseif ($forecastRain >= 10)  $score += 10;
        elseif ($forecastRain > 0)    $score += 5;

        // Humidity (max 10)
        if ($current['humidity'] >= 90)      $score += 10;
        elseif ($current['humidity'] >= 75)  $score += 5;

        // Wind for coastal (max 5)
        if ($brgy['coastal'] && $current['wind_speed'] >= 40) $score += 5;

        // Terrain (max 30)
        if ($brgy['elevation_m'] <= 5)       $score += 15;
        elseif ($brgy['elevation_m'] <= 10)  $score += 10;
        elseif ($brgy['elevation_m'] <= 20)  $score += 5;

        if ($brgy['flood_prone']) $score += 8;
        if ($brgy['near_river'])  $score += 5;
        if ($brgy['coastal'])     $score += 2;

        return min(100, $score);
    }

    private function riskLevel(int $score): string
    {
        if ($score >= 70) return 'critical';
        if ($score >= 45) return 'high';
        if ($score >= 25) return 'moderate';
        return 'low';
    }

    /**
     * GET /admin/weather/ai-insights
     *
     * Send barangay weather data to GPT-4o-mini for intelligent analysis.
     */
    public function aiInsights(WeatherService $weather): \Illuminate\Http\JsonResponse
    {
        try {
            // Build barangay weather snapshot
            $barangays = [];
            foreach (self::barangays() as $brgy) {
                $current  = $weather->current($brgy['latitude'], $brgy['longitude']);
                $forecast = $weather->dailyForecast($brgy['latitude'], $brgy['longitude']);
                $riskScore = $this->computeFloodRisk($current, $forecast, $brgy);

                $barangays[] = [
                    'name'        => $brgy['name'],
                    'elevation_m' => $brgy['elevation_m'],
                    'flood_prone' => $brgy['flood_prone'],
                    'near_river'  => $brgy['near_river'],
                    'coastal'     => $brgy['coastal'],
                    'temp'        => $current['temperature'],
                    'humidity'    => $current['humidity'],
                    'wind_kmh'    => $current['wind_speed'],
                    'rain_mmh'    => $current['rain_1h'],
                    'clouds'      => $current['clouds'],
                    'pressure'    => $current['pressure'],
                    'description' => $current['description'],
                    'risk_score'  => $riskScore,
                    'risk_level'  => $this->riskLevel($riskScore),
                    'forecast_rain_tomorrow' => $forecast[0]['rain_total'] ?? 0,
                    'forecast_rain_day2'     => $forecast[1]['rain_total'] ?? 0,
                ];
            }

            // Aggregate stats
            $avgTemp     = round(collect($barangays)->avg('temp'), 1);
            $avgHumidity = round(collect($barangays)->avg('humidity'));
            $maxRain     = collect($barangays)->max('rain_mmh');
            $avgRisk     = round(collect($barangays)->avg('risk_score'));
            $critCount   = collect($barangays)->where('risk_level', 'critical')->count();
            $highCount   = collect($barangays)->where('risk_level', 'high')->count();
            $rainingCount = collect($barangays)->filter(fn ($b) => $b['rain_mmh'] > 0)->count();
            $totalBrgys  = count($barangays);

            // Build per-barangay lines
            $brgyLines = collect($barangays)
                ->sortByDesc('risk_score')
                ->map(function ($b) {
                    $tags = [];
                    if ($b['flood_prone']) $tags[] = 'flood-prone';
                    if ($b['coastal'])     $tags[] = 'coastal';
                    if ($b['near_river'])  $tags[] = 'near-river';
                    $tagStr = $tags ? ' [' . implode(', ', $tags) . ']' : '';
                    return "  - {$b['name']}{$tagStr}: {$b['temp']}°C, {$b['humidity']}% humidity, rain {$b['rain_mmh']} mm/h, wind {$b['wind_kmh']} km/h, "
                         . "elev {$b['elevation_m']}m, risk {$b['risk_score']}/100 ({$b['risk_level']}), "
                         . "forecast rain tomorrow {$b['forecast_rain_tomorrow']}mm, day-after {$b['forecast_rain_day2']}mm";
                })
                ->implode("\n");

            $prompt = <<<PROMPT
Municipality: Nasugbu, Batangas, Philippines
Date/Time: {$this->nowFormatted()}

Weather summary:
- Average temperature: {$avgTemp}°C
- Average humidity: {$avgHumidity}%
- Maximum rainfall: {$maxRain} mm/h
- Barangays with active rain: {$rainingCount}/{$totalBrgys}
- Average flood risk score: {$avgRisk}/100
- Critical risk barangays: {$critCount}
- High risk barangays: {$highCount}

Per-barangay data (sorted by risk, highest first):
{$brgyLines}

Based on this real-time weather data across all barangays of Nasugbu, Batangas:

1. Analyze the overall weather behavior and patterns you observe
2. Identify which specific barangays are most at risk and why
3. Assess whether the situation is likely to worsen or improve based on the forecast
4. Consider terrain factors (elevation, river proximity, coastal exposure) in your analysis
5. Provide actionable recommendations for the MDRRMO (Municipal Disaster Risk Reduction and Management Office)

Respond ONLY with a JSON object in this exact format:
{
  "risk_level": "critical" | "high" | "moderate" | "low",
  "summary": "A concise 2-3 sentence overall weather behavior analysis for Nasugbu municipality.",
  "weather_pattern": "1-2 sentences describing the observed weather pattern (e.g., approaching system, localized convective activity, monsoon enhancement, etc.)",
  "key_findings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4"],
  "at_risk_barangays": [
    { "name": "Barangay Name", "reason": "Why this barangay is at risk" }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "priority_action": "The single most important immediate action the MDRRMO should take right now.",
  "forecast_outlook": "1-2 sentences about what to expect in the next 24-48 hours based on forecast data."
}
PROMPT;

            $client   = \OpenAI::factory()
                ->withApiKey(config('services.openai.key'))
                ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                ->make();
            $response = $client->chat()->create([
                'model'       => 'gpt-4o',
                'temperature' => 0.3,
                'max_tokens'  => 4096,
                'messages'    => [
                    [
                        'role'    => 'system',
                        'content' => 'You are a senior meteorological analyst and disaster risk expert embedded in the MDRRMO (Municipal Disaster Risk Reduction and Management Office) of Nasugbu, Batangas, Philippines. '
                                   . 'You have deep knowledge of Philippine weather systems — typhoons, habagat/amihan monsoons, ITCZ, localized thunderstorms, and La Niña/El Niño impacts on Batangas province. '
                                   . 'You understand Nasugbu\'s geography: western Batangas coast facing the South China Sea, Nasugbu River watershed, mountainous eastern interior (Mt. Batulao area), and low-lying coastal poblacion. '
                                   . 'When analyzing, cross-reference terrain (elevation, river proximity, coastal exposure) with weather data to identify cascading flood risks. '
                                   . 'Be specific — name exact barangays, cite data points, and give concrete actionable steps (not generic advice). '
                                   . 'Consider: ground saturation from prior rainfall, tidal factors for coastal barangays, upstream rainfall affecting downstream areas, and drainage capacity in urban poblacion. '
                                   . 'Return only valid JSON with no additional text or markdown.',
                    ],
                    [
                        'role'    => 'user',
                        'content' => $prompt,
                    ],
                ],
            ]);

            $content = $response->choices[0]->message->content;

            // Strip markdown code fences if present
            $content = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
            $content = preg_replace('/\s*```$/', '', $content);

            $data = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \RuntimeException('Invalid JSON from OpenAI: ' . $content);
            }

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'Failed to generate AI weather insights.',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /admin/weather/my-location?lat=X&lon=Y
     *
     * Fetch current weather + hourly forecast for exact GPS coordinates.
     */
    public function myLocation(Request $request, WeatherService $weather): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lon' => 'required|numeric|between:-180,180',
        ]);

        $lat = (float) $data['lat'];
        $lon = (float) $data['lon'];

        $current  = $weather->current($lat, $lon);
        $hourly   = $weather->forecast($lat, $lon);   // 3-hour intervals
        $daily    = $weather->dailyForecast($lat, $lon);

        // Take next 8 entries = 24 hours of 3-hour forecasts
        $next24h = array_slice($hourly, 0, 8);

        return response()->json([
            'current'  => $current,
            'hourly'   => $next24h,
            'forecast' => $daily,
        ]);
    }

    private function nowFormatted(): string
    {
        return now()->timezone('Asia/Manila')->format('l, F j, Y g:i A');
    }

}
