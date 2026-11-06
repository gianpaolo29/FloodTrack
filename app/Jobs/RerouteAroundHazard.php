<?php

namespace App\Jobs;

use App\Models\Hazard;
use App\Models\Report;
use App\Models\User;
use App\Services\RoutingService;
use App\Services\SocketService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class RerouteAroundHazard implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $hazardId,
    ) {}

    public function handle(): void
    {
        $hazard = Hazard::find($this->hazardId);
        if (! $hazard || ! $hazard->active || $hazard->category !== 'road') return;

        $hLat = (float) $hazard->latitude;
        $hLng = (float) $hazard->longitude;

        // Find all en_route report_responders with a route
        $enRouteRows = DB::table('report_responders')
            ->where('status', 'en_route')
            ->whereNotNull('route')
            ->get();

        foreach ($enRouteRows as $row) {
            $routeData = json_decode($row->route, true);
            $polyline = $routeData['polyline'] ?? [];

            if (empty($polyline)) continue;

            // Check if this route passes within 60m of the new hazard
            $affected = false;
            $step = max(1, (int) floor(count($polyline) / 50));
            for ($i = 0; $i < count($polyline); $i += $step) {
                $dist = RoutingService::haversineMeters($polyline[$i][0], $polyline[$i][1], $hLat, $hLng);
                if ($dist < 60) {
                    $affected = true;
                    break;
                }
            }

            if (! $affected) continue;

            // Get the responder's current position
            $responder = User::find($row->user_id);
            $report = Report::find($row->report_id);

            if (! $responder || ! $report) continue;
            if (! $responder->current_latitude || ! $responder->current_longitude) continue;

            // Recompute route
            $newRoute = RoutingService::computeRoute(
                (float) $responder->current_latitude,
                (float) $responder->current_longitude,
                (float) $report->latitude,
                (float) $report->longitude,
            );

            if (! $newRoute) continue;

            // Update pivot
            DB::table('report_responders')
                ->where('report_id', $row->report_id)
                ->where('user_id', $row->user_id)
                ->update(['route' => json_encode($newRoute), 'updated_at' => now()]);

            // Emit route.updated
            SocketService::toReport($row->report_id, 'route.updated', [
                'report_id'      => $row->report_id,
                'user_id'        => $row->user_id,
                'polyline'       => $newRoute['polyline'],
                'distance_m'     => $newRoute['distance_m'],
                'duration_s'     => $newRoute['duration_s'],
                'hazard_warning' => $newRoute['hazard_warning'],
            ]);
        }
    }
}
