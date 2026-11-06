<?php

namespace App\Jobs;

use App\Models\Report;
use App\Models\User;
use App\Services\RoutingService;
use App\Services\SocketService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MaybeReroute implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public float $lat,
        public float $lng,
    ) {}

    public function handle(): void
    {
        // Rate limit: max once per 30s per responder
        $cacheKey = "reroute_cooldown:{$this->userId}";
        if (Cache::has($cacheKey)) return;

        // Find the en_route row for this responder
        $pivot = DB::table('report_responders')
            ->where('user_id', $this->userId)
            ->where('status', 'en_route')
            ->first();

        if (! $pivot || ! $pivot->route) return;

        $routeData = json_decode($pivot->route, true);
        $polyline = $routeData['polyline'] ?? [];

        if (empty($polyline)) return;

        // Check if responder is off the polyline (> 100m)
        if (! RoutingService::isOffPolyline($this->lat, $this->lng, $polyline, 100)) {
            return; // Still on route, no action needed
        }

        // Set cooldown
        Cache::put($cacheKey, true, 30);

        // Get the report destination
        $report = Report::find($pivot->report_id);
        if (! $report) return;

        // Recompute route
        $newRoute = RoutingService::computeRoute(
            $this->lat,
            $this->lng,
            (float) $report->latitude,
            (float) $report->longitude,
        );

        if (! $newRoute) return;

        // Update pivot
        DB::table('report_responders')
            ->where('report_id', $pivot->report_id)
            ->where('user_id', $this->userId)
            ->update(['route' => json_encode($newRoute), 'updated_at' => now()]);

        // Emit route.updated
        SocketService::toReport($pivot->report_id, 'route.updated', [
            'report_id'      => $pivot->report_id,
            'user_id'        => $this->userId,
            'polyline'       => $newRoute['polyline'],
            'distance_m'     => $newRoute['distance_m'],
            'duration_s'     => $newRoute['duration_s'],
            'hazard_warning' => $newRoute['hazard_warning'],
        ]);
    }
}
