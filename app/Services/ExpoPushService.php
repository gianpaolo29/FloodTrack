<?php

namespace App\Services;

use App\Models\DeviceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send a push notification to specific users.
     *
     * @param  array|int  $userIds  Single user ID or array of user IDs
     * @param  string     $title    Notification title
     * @param  string     $body     Notification body
     * @param  array      $data     Extra data payload (for navigation on tap)
     */
    public static function sendToUsers(array|int $userIds, string $title, string $body, array $data = []): void
    {
        $userIds = (array) $userIds;

        $tokens = DeviceToken::whereIn('user_id', $userIds)
            ->pluck('token')
            ->toArray();

        if (empty($tokens)) {
            return;
        }

        static::sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send a push notification to all users with a registered device.
     */
    public static function sendToAll(string $title, string $body, array $data = []): void
    {
        $tokens = DeviceToken::pluck('token')->toArray();

        if (empty($tokens)) {
            return;
        }

        static::sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notifications to a list of Expo push tokens.
     * Batches in chunks of 100 as per Expo's recommendation.
     */
    private static function sendToTokens(array $tokens, string $title, string $body, array $data = []): void
    {
        $messages = array_map(fn (string $token) => [
            'to'       => $token,
            'title'    => $title,
            'body'     => $body,
            'sound'    => 'default',
            'data'     => $data,
            'priority' => 'high',
            'channelId' => 'floodtrack',
        ], $tokens);

        // Expo recommends max 100 messages per request
        $chunks = array_chunk($messages, 100);

        foreach ($chunks as $chunk) {
            try {
                Http::withHeaders([
                    'Accept'       => 'application/json',
                    'Content-Type' => 'application/json',
                ])->post(self::EXPO_PUSH_URL, $chunk);
            } catch (\Throwable $e) {
                Log::error('[ExpoPush] Failed to send notifications', [
                    'error' => $e->getMessage(),
                    'count' => count($chunk),
                ]);
            }
        }
    }
}
