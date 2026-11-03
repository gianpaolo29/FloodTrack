<?php

namespace App\Services;

use App\Jobs\SendSmsJob;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send an SMS to one or more recipients via the GoIP SIM Gateway.
     */
    public static function send(string|array $to, string $message, string $from = '1'): array
    {
        $host     = config('services.simgateway.host');
        $username = config('services.simgateway.username');
        $password = config('services.simgateway.password');
        $token    = config('services.simgateway.auth_token');

        if (! $host) {
            Log::warning('[SMS] SIM Gateway host not configured');
            return ['success' => false, 'response' => 'SIM Gateway not configured'];
        }

        $recipients = is_array($to) ? array_values($to) : [$to];
        $recipients = array_filter($recipients);

        if (empty($recipients)) {
            return ['success' => false, 'response' => 'No recipients'];
        }

        $tasks = [];
        foreach ($recipients as $i => $number) {
            $tasks[] = [
                'tid'  => 1001 + $i,
                'from' => $from,
                'to'   => static::normalizeNumber($number),
                'sms'  => $message,
            ];
        }

        $url = rtrim($host, '/') . '/goip_post_sms.html?' . http_build_query([
            'version'  => '1.1',
            'username' => $username,
            'password' => $password,
        ]);

        try {
            $response = Http::withoutVerifying()->withHeaders([
                'Content-Type' => 'application/json;charset=utf-8',
                'Accept'       => 'application/json',
                'X-Api-Key'    => $token,
            ])->post($url, [
                'type'     => 'send-sms',
                'task_num' => count($tasks),
                'tasks'    => $tasks,
            ]);

            $body = $response->body();

            Log::info('[SMS] Sent', [
                'recipients' => count($recipients),
                'status'     => $response->status(),
                'response'   => $body,
            ]);

            return [
                'success'  => $response->successful(),
                'response' => $body,
            ];
        } catch (\Throwable $e) {
            Log::error('[SMS] Failed to send', [
                'error'      => $e->getMessage(),
                'recipients' => $recipients,
            ]);

            return ['success' => false, 'response' => $e->getMessage()];
        }
    }

    /**
     * Queue SMS to users by their IDs (looks up contact_number, respects notification prefs).
     *
     * @param  string|null  $prefKey  If set, skip users who disabled this pref (critical|advisory|my_reports)
     */
    public static function queueToUsers(array|int $userIds, string $message, ?string $prefKey = null, string $from = '1'): void
    {
        $userIds = (array) $userIds;

        $query = User::whereIn('id', $userIds)
            ->whereNotNull('contact_number')
            ->where('contact_number', '!=', '');

        if ($prefKey !== null) {
            $query->where(function ($q) use ($prefKey) {
                $q->whereNull('notification_prefs')
                  ->orWhereRaw("json_extract(notification_prefs, '$.{$prefKey}') != 'false'");
            });
        }

        $numbers = $query->pluck('contact_number')->toArray();

        if (empty($numbers)) {
            return;
        }

        SendSmsJob::dispatch($numbers, $message, $from);
    }

    /**
     * Format an SMS with the official FloodTrack header and sign-off.
     */
    public static function format(string $title, string $body): string
    {
        return "[FLOODTRACK ALERT]\n{$title}\n\n{$body}\n\n- FloodTrack, Brgy. Disaster Risk Reduction";
    }

    /**
     * Normalize a Philippine phone number to 09XXXXXXXXX format.
     */
    private static function normalizeNumber(string $number): string
    {
        $number = preg_replace('/[^0-9+]/', '', $number);

        // +639XXXXXXXXX → 09XXXXXXXXX
        if (str_starts_with($number, '+63')) {
            $number = '0' . substr($number, 3);
        }

        // 639XXXXXXXXX → 09XXXXXXXXX
        if (str_starts_with($number, '63') && strlen($number) === 12) {
            $number = '0' . substr($number, 2);
        }

        return $number;
    }
}
