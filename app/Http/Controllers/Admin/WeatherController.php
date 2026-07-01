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
    public function index(Request $request, WeatherService $weather)
    {
        if ($request->has('lat') && $request->has('lon')) {
            $lat = (float) $request->get('lat');
            $lon = (float) $request->get('lon');
        } else {
            [$lat, $lon] = $this->geolocateIp($request->ip());
        }

        return Inertia::render('admin/weather/index', [
            'current'        => $weather->current($lat, $lon),
            'daily_forecast' => $weather->dailyForecast($lat, $lon),
            'hourly_forecast'=> array_slice($weather->forecast($lat, $lon), 0, 12),
            'alerts'         => $weather->alerts($lat, $lon),
            'coordinates'    => ['lat' => $lat, 'lon' => $lon],
        ]);
    }

    /**
     * Get coordinates from IP address using ipapi.co
     */
    private function geolocateIp(string $ip): array
    {
        $defaultLat = (float) config('services.openweather.lat', 14.5995);
        $defaultLon = (float) config('services.openweather.lon', 120.9842);

        // Local/private IPs can't be geolocated
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
