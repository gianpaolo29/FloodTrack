<?php

namespace App\Services;

use App\Models\Hazard;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RoutingService
{
    /**
     * OSRM public demo server. For production, self-host with Philippines extract.
     */
    private const OSRM_URL = 'https://router.project-osrm.org';

    /**
     * Minimum distance (meters) a route must maintain from active road hazards.
     */
    private const HAZARD_BUFFER_M = 60;

    /**
     * Compute a driving route from origin to destination, avoiding road hazards.
     *
     * @return array{polyline: array, distance_m: int, duration_s: int, hazard_warning: bool, computed_at: string}|null
     */
    public static function computeRoute(
        float $fromLat,
        float $fromLng,
        float $toLat,
        float $toLng,
    ): ?array {
        try {
            $response = Http::timeout(10)->get(self::OSRM_URL . '/route/v1/driving/' .
                "{$fromLng},{$fromLat};{$toLng},{$toLat}", [
                'overview'     => 'full',
                'geometries'   => 'geojson',
                'alternatives' => 'true',
                'steps'        => 'false',
            ]);

            if (! $response->ok()) {
                Log::warning('[RoutingService] OSRM returned ' . $response->status());
                return self::straightLineFallback($fromLat, $fromLng, $toLat, $toLng);
            }

            $data = $response->json();
            if (($data['code'] ?? '') !== 'Ok' || empty($data['routes'])) {
                return self::straightLineFallback($fromLat, $fromLng, $toLat, $toLng);
            }

            // Get active road hazards
            $hazards = Hazard::where('active', true)
                ->where('category', 'road')
                ->select(['latitude', 'longitude'])
                ->get()
                ->map(fn ($h) => [(float) $h->latitude, (float) $h->longitude])
                ->toArray();

            // Evaluate each route alternative
            $bestRoute = null;
            $bestClean = null; // best route that avoids all hazards

            foreach ($data['routes'] as $route) {
                $coords = $route['geometry']['coordinates'] ?? [];
                // GeoJSON is [lng, lat], convert to [lat, lng]
                $polyline = array_map(fn ($c) => [$c[1], $c[0]], $coords);
                $distanceM = (int) ($route['distance'] ?? 0);
                $durationS = (int) ($route['duration'] ?? 0);

                $hitsHazard = self::routeHitsHazard($polyline, $hazards);

                $routeData = [
                    'polyline'       => $polyline,
                    'distance_m'     => $distanceM,
                    'duration_s'     => $durationS,
                    'hazard_warning' => $hitsHazard,
                    'computed_at'    => now()->toIso8601String(),
                ];

                if (! $hitsHazard && $bestClean === null) {
                    $bestClean = $routeData;
                }
                if ($bestRoute === null) {
                    $bestRoute = $routeData;
                }
            }

            // Prefer the clean route; fall back to shortest with hazard_warning
            return $bestClean ?? $bestRoute;

        } catch (\Throwable $e) {
            Log::warning('[RoutingService] OSRM failed: ' . $e->getMessage());
            return self::straightLineFallback($fromLat, $fromLng, $toLat, $toLng);
        }
    }

    /**
     * Check if a polyline passes within HAZARD_BUFFER_M of any hazard.
     */
    public static function routeHitsHazard(array $polyline, array $hazards): bool
    {
        if (empty($hazards) || empty($polyline)) return false;

        // Sample every 5th point for performance (most polylines have many points)
        $step = max(1, (int) floor(count($polyline) / 50));
        for ($i = 0; $i < count($polyline); $i += $step) {
            $pLat = $polyline[$i][0];
            $pLng = $polyline[$i][1];

            foreach ($hazards as [$hLat, $hLng]) {
                if (self::haversineMeters($pLat, $pLng, $hLat, $hLng) < self::HAZARD_BUFFER_M) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if a point is more than $thresholdM meters from the nearest point on a polyline.
     */
    public static function isOffPolyline(float $lat, float $lng, array $polyline, float $thresholdM = 100): bool
    {
        if (empty($polyline)) return true;

        $minDist = PHP_FLOAT_MAX;
        $step = max(1, (int) floor(count($polyline) / 100));

        for ($i = 0; $i < count($polyline); $i += $step) {
            $dist = self::haversineMeters($lat, $lng, $polyline[$i][0], $polyline[$i][1]);
            if ($dist < $thresholdM) return false; // early exit
            $minDist = min($minDist, $dist);
        }

        return $minDist > $thresholdM;
    }

    /**
     * Straight-line fallback when OSRM is unavailable.
     */
    private static function straightLineFallback(float $fromLat, float $fromLng, float $toLat, float $toLng): array
    {
        $dist = self::haversineMeters($fromLat, $fromLng, $toLat, $toLng);
        // Rough estimate: 30 km/h average urban speed
        $durationS = (int) ($dist / (30000 / 3600));

        return [
            'polyline'       => [[$fromLat, $fromLng], [$toLat, $toLng]],
            'distance_m'     => (int) $dist,
            'duration_s'     => $durationS,
            'hazard_warning' => false,
            'computed_at'    => now()->toIso8601String(),
        ];
    }

    /**
     * Haversine distance in meters.
     */
    public static function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
