<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send a push notification to specific users.
     *
     * @param  array|int       $userIds  Single user ID or array of user IDs
     * @param  string          $title    Notification title
     * @param  string          $body     Notification body
     * @param  array           $data     Extra data payload (for navigation on tap)
     * @param  string|null     $prefKey  If set, skip users who disabled this pref (critical|advisory|my_reports)
     */
    public static function sendToUsers(array|int $userIds, string $title, string $body, array $data = [], ?string $prefKey = null): void
    {
        $userIds = (array) $userIds;

        if ($prefKey !== null) {
            $userIds = User::whereIn('id', $userIds)
                ->where(function ($q) use ($prefKey) {
                    $q->whereNull('notification_prefs')
                      ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(notification_prefs, '$.{$prefKey}')) != 'false'");
                })
                ->pluck('id')
                ->toArray();
        }

        if (empty($userIds)) {
            return;
        }

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
     *
     * @param  string      $title    Notification title
     * @param  string      $body     Notification body
     * @param  array       $data     Extra data payload
     * @param  string|null $prefKey  If set, skip users who disabled this pref (critical|advisory|my_reports)
     */
    public static function sendToAll(string $title, string $body, array $data = [], ?string $prefKey = null): void
    {
        if ($prefKey !== null) {
            $tokens = DeviceToken::join('users', 'users.id', '=', 'device_tokens.user_id')
                ->where(function ($q) use ($prefKey) {
                    $q->whereNull('users.notification_prefs')
                      ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(users.notification_prefs, '$.{$prefKey}')) != 'false'");
                })
                ->pluck('device_tokens.token')
                ->toArray();
        } else {
            $tokens = DeviceToken::pluck('token')->toArray();
        }

        if (empty($tokens)) {
            return;
        }

        static::sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send a push notification to users in specific barangays.
     *
     * @param  array       $barangays  List of barangay names to target
     * @param  string      $title      Notification title
     * @param  string      $body       Notification body
     * @param  array       $data       Extra data payload
     * @param  string|null $prefKey    If set, skip users who disabled this pref
     */
    public static function sendToBarangays(array $barangays, string $title, string $body, array $data = [], ?string $prefKey = null): void
    {
        if (empty($barangays)) {
            static::sendToAll($title, $body, $data, $prefKey);
            return;
        }

        $query = DeviceToken::join('users', 'users.id', '=', 'device_tokens.user_id')
            ->whereIn('users.home_address', $barangays);

        if ($prefKey !== null) {
            $query->where(function ($q) use ($prefKey) {
                $q->whereNull('users.notification_prefs')
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(users.notification_prefs, '$.{$prefKey}')) != 'false'");
            });
        }

        $tokens = $query->pluck('device_tokens.token')->toArray();

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
                $response = Http::withHeaders([
                    'Accept'       => 'application/json',
                    'Content-Type' => 'application/json',
                ])->post(self::EXPO_PUSH_URL, $chunk);

                $body = $response->json();
                Log::info('[ExpoPush] Response', ['status' => $response->status(), 'body' => $body]);

                // Check for per-ticket errors (e.g. DeviceNotRegistered)
                if (isset($body['data'])) {
                    foreach ($body['data'] as $i => $ticket) {
                        if (($ticket['status'] ?? '') === 'error') {
                            Log::error('[ExpoPush] Ticket error', [
                                'token'   => $chunk[$i]['to'] ?? 'unknown',
                                'message' => $ticket['message'] ?? '',
                                'details' => $ticket['details'] ?? [],
                            ]);

                            // Remove invalid tokens
                            if (($ticket['details']['error'] ?? '') === 'DeviceNotRegistered') {
                                DeviceToken::where('token', $chunk[$i]['to'] ?? '')->delete();
                                Log::info('[ExpoPush] Removed invalid token', ['token' => $chunk[$i]['to'] ?? '']);
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::error('[ExpoPush] Failed to send notifications', [
                    'error' => $e->getMessage(),
                    'count' => count($chunk),
                ]);
            }
        }
    }
}
