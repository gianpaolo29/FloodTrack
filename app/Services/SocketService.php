<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocketService
{
    private static function emit(string $room, string $event, mixed $data = null): void
    {
        $url    = rtrim(config('services.socket.url'), '/') . '/internal/emit';
        $secret = config('services.socket.secret');

        if (! $url || ! $secret) return;

        try {
            Http::timeout(3)
                ->withHeaders(['x-internal-secret' => $secret])
                ->post($url, compact('room', 'event', 'data'));
        } catch (\Throwable $e) {
            Log::warning('[SocketService] emit failed', ['room' => $room, 'event' => $event, 'error' => $e->getMessage()]);
        }
    }

    public static function toReport(int|string $reportId, string $event, mixed $data = null): void
    {
        static::emit("report:{$reportId}", $event, $data);
    }

    public static function toUser(int|string $userId, string $event, mixed $data = null): void
    {
        static::emit("user:{$userId}", $event, $data);
    }

    public static function toAll(string $event, mixed $data = null): void
    {
        static::emit('alerts', $event, $data);
    }
}
