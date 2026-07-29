<?php

namespace App\Console\Commands;

use App\Models\Hazard;
use App\Models\User;
use App\Services\SocketService;
use App\Services\WeatherService;
use Illuminate\Console\Command;

class SyncWeatherHazards extends Command
{
    protected $signature = 'hazards:sync-weather';
    protected $description = 'Sync OpenWeatherMap weather alerts into hazard entries';

    /**
     * Map OpenWeatherMap alert event names to hazard attributes.
     * Keys are matched case-insensitively against the alert "event" field.
     */
    private const ALERT_MAP = [
        'flood'         => ['category' => 'flood', 'type' => 'flash_flood',   'severity' => 'critical'],
        'flash flood'   => ['category' => 'flood', 'type' => 'flash_flood',   'severity' => 'critical'],
        'coastal flood' => ['category' => 'flood', 'type' => 'coastal_flood', 'severity' => 'high'],
        'storm surge'   => ['category' => 'flood', 'type' => 'coastal_flood', 'severity' => 'critical'],
        'river flood'   => ['category' => 'flood', 'type' => 'river_flood',   'severity' => 'high'],
        'urban flood'   => ['category' => 'flood', 'type' => 'urban_flood',   'severity' => 'high'],
        'heavy rain'    => ['category' => 'flood', 'type' => 'flash_flood',   'severity' => 'high'],
        'extreme rain'  => ['category' => 'flood', 'type' => 'flash_flood',   'severity' => 'critical'],
        'thunderstorm'  => ['category' => 'flood', 'type' => 'urban_flood',   'severity' => 'moderate'],
        'typhoon'       => ['category' => 'flood', 'type' => 'coastal_flood', 'severity' => 'critical'],
        'tropical storm'=> ['category' => 'flood', 'type' => 'coastal_flood', 'severity' => 'critical'],
        'cyclone'       => ['category' => 'flood', 'type' => 'coastal_flood', 'severity' => 'critical'],
        'landslide'     => ['category' => 'road',  'type' => 'landslide',     'severity' => 'critical'],
        'mudslide'      => ['category' => 'road',  'type' => 'landslide',     'severity' => 'critical'],
        'wind'          => ['category' => 'road',  'type' => 'debris',        'severity' => 'moderate'],
        'high wind'     => ['category' => 'road',  'type' => 'debris',        'severity' => 'high'],
        'tornado'       => ['category' => 'road',  'type' => 'closed_road',   'severity' => 'critical'],
    ];

    public function handle(WeatherService $weather): int
    {
        $lat = (float) config('services.openweather.lat', 14.0656);
        $lon = (float) config('services.openweather.lon', 120.6278);

        $alerts = $weather->fetchWeatherAlerts($lat, $lon);

        if (empty($alerts)) {
            $this->info('No active weather alerts from OpenWeatherMap.');
            return self::SUCCESS;
        }

        $adminUser = User::where('role', 'admin')->first();
        $createdBy = $adminUser?->id ?? 1;
        $synced    = 0;

        foreach ($alerts as $alert) {
            $event       = $alert['event'] ?? '';
            $description = $alert['description'] ?? '';
            $sender      = $alert['sender_name'] ?? 'OpenWeatherMap';
            $start       = isset($alert['start']) ? date('Y-m-d H:i', $alert['start']) : now()->toDateTimeString();
            $end         = isset($alert['end']) ? date('Y-m-d H:i', $alert['end']) : null;

            $mapped = $this->mapAlert($event);
            if (! $mapped) {
                $this->warn("Skipping unmapped alert: {$event}");
                continue;
            }

            // Build a unique title to avoid duplicates
            $title = "[Weather Alert] {$event}";

            // Skip if we already have an active hazard with this exact title created today
            $exists = Hazard::where('title', $title)
                ->where('active', true)
                ->where('created_at', '>=', now()->startOfDay())
                ->exists();

            if ($exists) {
                $this->line("Already synced today: {$title}");
                continue;
            }

            $desc = "Source: {$sender}\nPeriod: {$start}" . ($end ? " to {$end}" : '') . "\n\n{$description}";

            Hazard::create([
                'created_by'  => $createdBy,
                'category'    => $mapped['category'],
                'type'        => $mapped['type'],
                'severity'    => $mapped['severity'],
                'title'       => $title,
                'description' => mb_substr($desc, 0, 2000),
                'latitude'    => $lat,
                'longitude'   => $lon,
                'address'     => 'Nasugbu, Batangas',
                'active'      => true,
            ]);

            $synced++;
            $this->info("Created hazard: {$title} [{$mapped['severity']}]");
        }

        if ($synced > 0) {
            SocketService::toAll('hazard-updated', ['action' => 'refresh']);
            $this->info("Synced {$synced} weather alert(s) as hazards.");
        }

        return self::SUCCESS;
    }

    private function mapAlert(string $event): ?array
    {
        $lower = strtolower($event);

        // Try exact match first
        if (isset(self::ALERT_MAP[$lower])) {
            return self::ALERT_MAP[$lower];
        }

        // Try partial match
        foreach (self::ALERT_MAP as $keyword => $mapping) {
            if (str_contains($lower, $keyword)) {
                return $mapping;
            }
        }

        // Fallback: if it mentions rain/water, treat as flood
        if (preg_match('/rain|water|monsoon|habagat|amihan/i', $event)) {
            return ['category' => 'flood', 'type' => 'flash_flood', 'severity' => 'moderate'];
        }

        return null;
    }
}
