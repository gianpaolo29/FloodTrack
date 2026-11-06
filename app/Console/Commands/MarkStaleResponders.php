<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\SocketService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class MarkStaleResponders extends Command
{
    protected $signature = 'responders:mark-stale';
    protected $description = 'Emit responder.stale for on-duty users with no location update in 2+ minutes';

    public function handle(): int
    {
        $staleThreshold = now()->subMinutes(2);
        $emitted = 0;

        $staleResponders = User::where('role', 'responder')
            ->where('is_on_duty', true)
            ->whereNotNull('location_updated_at')
            ->where('location_updated_at', '<', $staleThreshold)
            ->select(['id', 'name', 'location_updated_at'])
            ->get();

        foreach ($staleResponders as $r) {
            // Only emit once per transition (not every minute)
            $cacheKey = "stale_emitted:{$r->id}";
            if (Cache::has($cacheKey)) continue;

            Cache::put($cacheKey, true, 300); // 5 min TTL
            $emitted++;

            SocketService::emit('admin:responders', 'responder.stale', [
                'user_id'   => $r->id,
                'last_seen' => $r->location_updated_at->toIso8601String(),
            ]);
        }

        // Clear stale cache for responders that came back online
        $freshResponders = User::where('role', 'responder')
            ->where('is_on_duty', true)
            ->whereNotNull('location_updated_at')
            ->where('location_updated_at', '>=', $staleThreshold)
            ->pluck('id');

        foreach ($freshResponders as $id) {
            Cache::forget("stale_emitted:{$id}");
        }

        if ($emitted > 0) {
            $this->info("{$emitted} responder(s) marked stale.");
        }

        return 0;
    }
}
