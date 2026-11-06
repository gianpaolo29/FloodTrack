<?php

namespace App\Services;

use App\Models\Report;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocketService
{
    public static function emit(string $room, string $event, mixed $data = null): void
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

    public static function toResponderMap(string $event, mixed $data = null): void
    {
        static::emit('responder-locations', $event, $data);
    }

    /**
     * Refresh the socket server's assignment cache for a responder.
     */
    public static function refreshAssignments(int|string $responderId): void
    {
        $url    = rtrim(config('services.socket.url'), '/') . '/internal/refresh-assignments';
        $secret = config('services.socket.secret');

        if (! $url || ! $secret) return;

        $reportIds = Report::where('assigned_to', $responderId)
            ->where('status', 'assigned')
            ->pluck('id')
            ->toArray();

        try {
            Http::timeout(3)
                ->withHeaders(['x-internal-secret' => $secret])
                ->post($url, [
                    'responder_id' => (int) $responderId,
                    'report_ids'   => $reportIds,
                ]);
        } catch (\Throwable $e) {
            Log::warning('[SocketService] refreshAssignments failed', ['responder_id' => $responderId, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Revoke all non-admin sockets from a room.
     */
    public static function revokeRoom(string $room, array $exceptRoles = ['admin']): void
    {
        $url    = rtrim(config('services.socket.url'), '/') . '/internal/room-revoke';
        $secret = config('services.socket.secret');

        if (! $url || ! $secret) return;

        try {
            Http::timeout(3)
                ->withHeaders(['x-internal-secret' => $secret])
                ->post($url, [
                    'room'         => $room,
                    'except_roles' => $exceptRoles,
                ]);
        } catch (\Throwable $e) {
            Log::warning('[SocketService] revokeRoom failed', ['room' => $room, 'error' => $e->getMessage()]);
        }
    }
}
