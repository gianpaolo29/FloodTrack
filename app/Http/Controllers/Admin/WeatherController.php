<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class WeatherController extends Controller
{
    /** Barangay data from shared config. */
    private static function barangays(): array
    {
        return config('barangays');
    }

    public function index(Request $request, WeatherService $weather)
    {
        if ($request->has('lat') && $request->has('lon')) {
            $lat = (float) $request->get('lat');
            $lon = (float) $request->get('lon');
        } else {
            [$lat, $lon] = $this->geolocateIp($request->ip());
        }

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
                'analysis'     => $this->generateAiAnalysis($barangays),
                'generated_at' => now()->toIso8601String(),
            ];
        });

        return Inertia::render('admin/weather/index', [
            'current'         => $weather->current($lat, $lon),
            'daily_forecast'  => $weather->dailyForecast($lat, $lon),
            'hourly_forecast' => array_slice($weather->forecast($lat, $lon), 0, 12),
            'alerts'          => $weather->alerts($lat, $lon),
            'coordinates'     => ['lat' => $lat, 'lon' => $lon],
            'barangay_data'   => $barangayData,
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

    /* ── AI weather analysis ── */

    private function generateAiAnalysis(array $barangays): array
    {
        $insights = [];
        $total = count($barangays);

        // 1. Overall pattern
        $avgTemp     = round(collect($barangays)->avg('weather.temperature'), 1);
        $avgHumidity = round(collect($barangays)->avg('weather.humidity'));
        $avgWind     = round(collect($barangays)->avg('weather.wind_speed'), 1);
        $maxRain     = collect($barangays)->max('weather.rain_1h');
        $rainingCount = collect($barangays)->filter(fn ($b) => $b['weather']['rain_1h'] > 0)->count();

        $insights[] = [
            'type'  => 'overview',
            'title' => 'Current Weather Pattern',
            'body'  => "Average temperature across Nasugbu is {$avgTemp}°C with {$avgHumidity}% humidity. "
                     . "Wind speeds average {$avgWind} km/h. "
                     . ($rainingCount > 0
                        ? "{$rainingCount} of {$total} barangays are currently experiencing rainfall."
                        : "No rainfall is currently detected across the municipality."),
            'icon'  => 'cloud-sun',
        ];

        // 2. Rainfall analysis
        if ($maxRain >= 7.5) {
            $names = collect($barangays)->filter(fn ($b) => $b['weather']['rain_1h'] >= 7.5)->pluck('name')->all();
            $insights[] = [
                'type'  => 'critical',
                'title' => 'Heavy Rainfall Detected',
                'body'  => 'Heavy rainfall (≥7.5 mm/h) is occurring in: ' . implode(', ', $names)
                         . '. Flash flooding is possible in low-lying and riverside areas. '
                         . 'Residents should prepare for potential evacuation.',
                'icon'  => 'cloud-rain',
            ];
        } elseif ($maxRain >= 2.5) {
            $names = collect($barangays)->filter(fn ($b) => $b['weather']['rain_1h'] >= 2.5)->pluck('name')->all();
            $insights[] = [
                'type'  => 'warning',
                'title' => 'Moderate Rainfall Observed',
                'body'  => 'Moderate rainfall is falling in: ' . implode(', ', $names)
                         . '. Water levels in rivers and drainage should be monitored.',
                'icon'  => 'cloud-rain',
            ];
        }

        // 3. Flood risk areas
        $criticalBrgys = collect($barangays)->filter(fn ($b) => $b['flood_risk']['level'] === 'critical');
        $highBrgys     = collect($barangays)->filter(fn ($b) => $b['flood_risk']['level'] === 'high');

        if ($criticalBrgys->isNotEmpty()) {
            $insights[] = [
                'type'  => 'critical',
                'title' => 'Critical Flood Risk Areas',
                'body'  => $criticalBrgys->count() . ' barangay(s) at critical flood risk: '
                         . $criticalBrgys->pluck('name')->implode(', ')
                         . '. These areas combine heavy rainfall with low elevation and historical flood vulnerability. '
                         . 'Pre-emptive evacuation should be considered.',
                'icon'  => 'alert-triangle',
            ];
        }

        if ($highBrgys->isNotEmpty()) {
            $insights[] = [
                'type'  => 'warning',
                'title' => 'Elevated Flood Risk',
                'body'  => $highBrgys->count() . ' barangay(s) show elevated flood risk: '
                         . $highBrgys->pluck('name')->implode(', ')
                         . '. Responders should be on standby for these areas.',
                'icon'  => 'alert-triangle',
            ];
        }

        // 4. Forecast trend
        $forecastRainTomorrow = collect($barangays)
            ->map(fn ($b) => ['name' => $b['name'], 'rain' => $b['forecast'][0]['rain_total'] ?? 0])
            ->filter(fn ($b) => $b['rain'] > 0)
            ->sortByDesc('rain')
            ->values();

        if ($forecastRainTomorrow->isNotEmpty()) {
            $heaviest = $forecastRainTomorrow->first();
            $totalRain = round($forecastRainTomorrow->sum('rain'), 1);
            $count = $forecastRainTomorrow->count();

            $trend = $totalRain >= 50
                ? 'Significant rainfall event approaching. Flood preparedness should be elevated municipality-wide.'
                : ($totalRain >= 20
                    ? 'Moderate rainfall is expected. Low-lying barangays should be monitored closely.'
                    : 'Light scattered rainfall is forecast. No immediate flood concern, but conditions should be watched.');

            $insights[] = [
                'type'  => $totalRain >= 50 ? 'critical' : ($totalRain >= 20 ? 'warning' : 'info'),
                'title' => 'Forecast Trend Analysis',
                'body'  => "Rain is expected tomorrow in {$count} barangay(s), "
                         . "with {$heaviest['name']} expecting the heaviest at {$heaviest['rain']} mm. "
                         . "Total projected rainfall: {$totalRain} mm. {$trend}",
                'icon'  => 'trending-up',
            ];
        } else {
            $insights[] = [
                'type'  => 'info',
                'title' => 'Forecast Trend Analysis',
                'body'  => 'No significant rainfall is forecast for the next 24 hours. Flood risk is expected to remain stable or decrease.',
                'icon'  => 'trending-up',
            ];
        }

        // 5. Coastal vs inland
        $coastalBrgys = collect($barangays)->filter(fn ($b) => $b['coastal']);
        $inlandBrgys  = collect($barangays)->filter(fn ($b) => !$b['coastal']);

        if ($coastalBrgys->isNotEmpty() && $inlandBrgys->isNotEmpty()) {
            $coastalRisk = round($coastalBrgys->avg('flood_risk.score'));
            $inlandRisk  = round($inlandBrgys->avg('flood_risk.score'));
            $higher      = $coastalRisk > $inlandRisk ? 'coastal' : 'inland';
            $diff        = abs($coastalRisk - $inlandRisk);

            if ($diff >= 10) {
                $insights[] = [
                    'type'  => 'info',
                    'title' => 'Coastal vs Inland Risk Pattern',
                    'body'  => "The AI observes that {$higher} barangays currently carry higher flood risk "
                             . "(avg score: " . ($higher === 'coastal' ? $coastalRisk : $inlandRisk) . ") "
                             . "compared to " . ($higher === 'coastal' ? 'inland' : 'coastal') . " areas "
                             . "(avg score: " . ($higher === 'coastal' ? $inlandRisk : $coastalRisk) . "). "
                             . ($higher === 'coastal'
                                ? 'Storm surge and tidal factors may amplify flooding along the coast.'
                                : 'River overflow and poor drainage are the primary concerns inland.'),
                    'icon'  => 'git-compare',
                ];
            }
        }

        // 6. Humidity / saturation
        $saturated = collect($barangays)->filter(fn ($b) => $b['weather']['humidity'] >= 90);
        if ($saturated->count() >= $total * 0.6) {
            $insights[] = [
                'type'  => 'warning',
                'title' => 'Ground Saturation Warning',
                'body'  => 'Over 60% of barangays show humidity above 90%. The ground is likely saturated, '
                         . 'meaning even light rainfall could cause rapid surface runoff and localized flooding. '
                         . 'Drainage systems may be operating at capacity.',
                'icon'  => 'droplets',
            ];
        }

        // 7. Summary recommendation
        $avgRisk = round(collect($barangays)->avg('flood_risk.score'));
        $level   = $this->riskLevel($avgRisk);

        $rec = match ($level) {
            'critical' => 'IMMEDIATE ACTION RECOMMENDED: Activate emergency protocols. Pre-position rescue teams in critical barangays. Issue evacuation advisories for high-risk zones.',
            'high'     => 'HEIGHTENED ALERT: Place responder teams on standby. Monitor river and coastal water levels. Prepare evacuation centers in flood-prone barangays.',
            'moderate' => 'MONITORING ADVISED: Continue observing weather developments. Ensure drainage systems are clear. Communicate preparedness reminders to residents in vulnerable areas.',
            default    => 'NORMAL CONDITIONS: No immediate flood threat detected. Maintain routine monitoring and ensure emergency equipment readiness.',
        };

        $insights[] = [
            'type'               => $level === 'critical' ? 'critical' : ($level === 'high' ? 'warning' : 'info'),
            'title'              => 'AI Recommendation',
            'body'               => $rec,
            'icon'               => 'sparkles',
            'overall_risk_score' => $avgRisk,
            'overall_risk_level' => $level,
        ];

        return $insights;
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

            $client   = \OpenAI::client(config('services.openai.key'));
            $response = $client->chat()->create([
                'model'       => 'gpt-4o-mini',
                'temperature' => 0.4,
                'max_tokens'  => 4096,
                'messages'    => [
                    [
                        'role'    => 'system',
                        'content' => 'You are a meteorological AI assistant specializing in flood disaster management for Philippine municipalities. '
                                   . 'You analyze real-time weather data across barangays and provide actionable situational briefings for the MDRRMO (Municipal Disaster Risk Reduction and Management Office). '
                                   . 'You understand Philippine geography, typhoon patterns, monsoon seasons (habagat/amihan), and local flood dynamics. '
                                   . 'Be specific about barangay names. Consider that low-elevation coastal and riverside barangays are most vulnerable. '
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

    private function nowFormatted(): string
    {
        return now()->timezone('Asia/Manila')->format('l, F j, Y g:i A');
    }

    /**
     * Get coordinates from IP address using ipapi.co
     */
    private function geolocateIp(string $ip): array
    {
        $defaultLat = (float) config('services.openweather.lat', 14.5995);
        $defaultLon = (float) config('services.openweather.lon', 120.9842);

        if (in_array($ip, ['127.0.0.1', '::1']) || str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.')) {
            return [$defaultLat, $defaultLon];
        }

        return Cache::remember("geo:ip:{$ip}", 3600, function () use ($ip, $defaultLat, $defaultLon) {
            try {
                $response = Http::withoutVerifying()->timeout(3)->get("https://ipapi.co/{$ip}/json/");

                if ($response->ok()) {
                    $data = $response->json();
                    if (isset($data['latitude'], $data['longitude'])) {
                        return [(float) $data['latitude'], (float) $data['longitude']];
                    }
                }
            } catch (\Exception $e) {
                // Fall through to defaults
            }

            return [$defaultLat, $defaultLon];
        });
    }
}
