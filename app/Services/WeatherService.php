<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class WeatherService
{
    private string $apiKey;
    private string $baseUrl = 'https://api.openweathermap.org/data/2.5';
    private string $geoUrl  = 'https://api.openweathermap.org/data/3.0';

    public function __construct()
    {
        $this->apiKey = config('services.openweather.key', '');
    }

    /**
     * Get current weather for a location.
     */
    public function current(float $lat, float $lon): array
    {
        return Cache::remember("weather:current:{$lat}:{$lon}", 600, function () use ($lat, $lon) {
            try {
                $response = Http::withoutVerifying()->timeout(5)->get("{$this->baseUrl}/weather", [
                    'lat'   => $lat,
                    'lon'   => $lon,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                ]);
            } catch (\Exception $e) {
                return $this->fallbackCurrent();
            }

            if ($response->failed()) {
                return $this->fallbackCurrent();
            }

            $data = $response->json();

            return [
                'temperature'  => round($data['main']['temp'] ?? 0, 1),
                'feels_like'   => round($data['main']['feels_like'] ?? 0, 1),
                'temp_min'     => round($data['main']['temp_min'] ?? 0, 1),
                'temp_max'     => round($data['main']['temp_max'] ?? 0, 1),
                'humidity'     => $data['main']['humidity'] ?? 0,
                'pressure'     => $data['main']['pressure'] ?? 0,
                'wind_speed'   => round(($data['wind']['speed'] ?? 0) * 3.6, 1), // m/s -> km/h
                'wind_deg'     => $data['wind']['deg'] ?? 0,
                'wind_gust'    => round(($data['wind']['gust'] ?? 0) * 3.6, 1),
                'visibility'   => ($data['visibility'] ?? 10000) / 1000, // m -> km
                'clouds'       => $data['clouds']['all'] ?? 0,
                'rain_1h'      => $data['rain']['1h'] ?? 0,
                'rain_3h'      => $data['rain']['3h'] ?? 0,
                'description'  => ucfirst($data['weather'][0]['description'] ?? 'Unknown'),
                'icon'         => $data['weather'][0]['icon'] ?? '01d',
                'main'         => $data['weather'][0]['main'] ?? 'Clear',
                'city'         => $data['name'] ?? 'Unknown',
                'country'      => $data['sys']['country'] ?? '',
                'sunrise'      => $data['sys']['sunrise'] ?? null,
                'sunset'       => $data['sys']['sunset'] ?? null,
                'dt'           => $data['dt'] ?? now()->timestamp,
            ];
        });
    }

    /**
     * Get 5-day / 3-hour forecast.
     */
    public function forecast(float $lat, float $lon): array
    {
        return Cache::remember("weather:forecast:{$lat}:{$lon}", 1800, function () use ($lat, $lon) {
            try {
                $response = Http::withoutVerifying()->timeout(5)->get("{$this->baseUrl}/forecast", [
                    'lat'   => $lat,
                    'lon'   => $lon,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                ]);
            } catch (\Exception $e) {
                return [];
            }

            if ($response->failed()) {
                return [];
            }

            $data = $response->json();
            $items = $data['list'] ?? [];

            return collect($items)->map(fn ($item) => [
                'dt'          => $item['dt'],
                'date'        => date('Y-m-d H:i', $item['dt']),
                'temperature' => round($item['main']['temp'] ?? 0, 1),
                'temp_min'    => round($item['main']['temp_min'] ?? 0, 1),
                'temp_max'    => round($item['main']['temp_max'] ?? 0, 1),
                'humidity'    => $item['main']['humidity'] ?? 0,
                'wind_speed'  => round(($item['wind']['speed'] ?? 0) * 3.6, 1),
                'wind_gust'   => round(($item['wind']['gust'] ?? 0) * 3.6, 1),
                'rain_3h'     => $item['rain']['3h'] ?? 0,
                'clouds'      => $item['clouds']['all'] ?? 0,
                'description' => ucfirst($item['weather'][0]['description'] ?? ''),
                'icon'        => $item['weather'][0]['icon'] ?? '01d',
                'main'        => $item['weather'][0]['main'] ?? 'Clear',
                'pop'         => round(($item['pop'] ?? 0) * 100), // probability of precipitation %
            ])->all();
        });
    }

    /**
     * Get daily summary from the forecast (group by day).
     */
    public function dailyForecast(float $lat, float $lon): array
    {
        $forecast = $this->forecast($lat, $lon);

        return collect($forecast)
            ->groupBy(fn ($item) => date('Y-m-d', $item['dt']))
            ->map(function ($dayItems, $date) {
                $temps = $dayItems->pluck('temperature');
                $rain  = $dayItems->sum('rain_3h');
                $wind  = $dayItems->max('wind_speed');
                $pop   = $dayItems->max('pop');
                // Pick noon or middle item for the icon
                $mid = $dayItems->values()->get((int) floor($dayItems->count() / 2));

                return [
                    'date'        => $date,
                    'day'         => date('D', strtotime($date)),
                    'temp_min'    => round($temps->min(), 1),
                    'temp_max'    => round($temps->max(), 1),
                    'rain_total'  => round($rain, 1),
                    'wind_max'    => round($wind, 1),
                    'pop'         => $pop,
                    'description' => $mid['description'] ?? '',
                    'icon'        => $mid['icon'] ?? '01d',
                    'main'        => $mid['main'] ?? 'Clear',
                ];
            })
            ->values()
            ->take(5)
            ->all();
    }

    /**
     * Detect severe weather conditions from current + forecast data.
     */
    public function alerts(float $lat, float $lon): array
    {
        $current  = $this->current($lat, $lon);
        $forecast = $this->forecast($lat, $lon);
        $alerts   = [];

        // Current heavy rain
        if ($current['rain_1h'] >= 7.5) {
            $alerts[] = [
                'type'     => 'critical',
                'title'    => 'Heavy Rainfall Warning',
                'message'  => "Current rainfall: {$current['rain_1h']} mm/h. Flash flooding possible.",
                'icon'     => '🌧️',
            ];
        } elseif ($current['rain_1h'] >= 2.5) {
            $alerts[] = [
                'type'     => 'warning',
                'title'    => 'Moderate Rainfall Advisory',
                'message'  => "Current rainfall: {$current['rain_1h']} mm/h. Monitor water levels.",
                'icon'     => '🌦️',
            ];
        }

        // High winds
        if ($current['wind_speed'] >= 60) {
            $alerts[] = [
                'type'    => 'critical',
                'title'   => 'Strong Wind Warning',
                'message' => "Wind speed: {$current['wind_speed']} km/h. Seek shelter.",
                'icon'    => '💨',
            ];
        } elseif ($current['wind_speed'] >= 40) {
            $alerts[] = [
                'type'    => 'warning',
                'title'   => 'Wind Advisory',
                'message' => "Wind speed: {$current['wind_speed']} km/h with gusts up to {$current['wind_gust']} km/h.",
                'icon'    => '🌬️',
            ];
        }

        // Forecast heavy rain in next 24h
        $next24h = collect($forecast)->take(8); // 8 x 3h = 24h
        $totalRain24h = $next24h->sum('rain_3h');
        $maxPop = $next24h->max('pop');

        if ($totalRain24h >= 50) {
            $alerts[] = [
                'type'    => 'critical',
                'title'   => 'Flood Risk — Heavy Rain Forecast',
                'message' => "Expected rainfall: {$totalRain24h} mm in the next 24 hours. Flood risk is high.",
                'icon'    => '⛈️',
            ];
        } elseif ($totalRain24h >= 20) {
            $alerts[] = [
                'type'    => 'warning',
                'title'   => 'Rain Forecast Advisory',
                'message' => "Expected rainfall: {$totalRain24h} mm in the next 24 hours ({$maxPop}% probability).",
                'icon'    => '🌧️',
            ];
        }

        // Thunderstorm in forecast
        $hasThunderstorm = $next24h->contains(fn ($item) => str_contains(strtolower($item['main']), 'thunderstorm'));
        if ($hasThunderstorm) {
            $alerts[] = [
                'type'    => 'warning',
                'title'   => 'Thunderstorm Alert',
                'message' => 'Thunderstorms expected in the next 24 hours. Stay indoors and avoid flood-prone areas.',
                'icon'    => '⚡',
            ];
        }

        // Low visibility
        if ($current['visibility'] < 1) {
            $alerts[] = [
                'type'    => 'warning',
                'title'   => 'Low Visibility Warning',
                'message' => "Visibility: {$current['visibility']} km. Exercise caution when traveling.",
                'icon'    => '🌫️',
            ];
        }

        return $alerts;
    }

    private function fallbackCurrent(): array
    {
        return [
            'temperature'  => 0,
            'feels_like'   => 0,
            'temp_min'     => 0,
            'temp_max'     => 0,
            'humidity'     => 0,
            'pressure'     => 0,
            'wind_speed'   => 0,
            'wind_deg'     => 0,
            'wind_gust'    => 0,
            'visibility'   => 0,
            'clouds'       => 0,
            'rain_1h'      => 0,
            'rain_3h'      => 0,
            'description'  => 'Unavailable',
            'icon'         => '01d',
            'main'         => 'Unknown',
            'city'         => 'Unknown',
            'country'      => '',
            'sunrise'      => null,
            'sunset'       => null,
            'dt'           => now()->timestamp,
        ];
    }
}
