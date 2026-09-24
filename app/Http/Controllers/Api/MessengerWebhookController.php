<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\NewReportSubmitted;
use App\Services\FacebookService;
use App\Services\SlaService;
use App\Services\SocketService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class MessengerWebhookController extends Controller
{
    /**
     * Webhook verification (GET).
     */
    public function verify(Request $request)
    {
        $verifyToken = config('services.facebook.webhook_verify_token')
            ?: config('services.facebook.app_secret');

        if ($request->query('hub_mode') === 'subscribe'
            && $request->query('hub_verify_token') === $verifyToken) {
            return response($request->query('hub_challenge'), 200);
        }

        return response('Forbidden', 403);
    }

    /**
     * Handle incoming Messenger events (POST).
     */
    public function handle(Request $request)
    {
        $payload = $request->all();

        if (($payload['object'] ?? null) !== 'page') {
            return response()->json(['status' => 'ignored']);
        }

        dispatch(function () use ($payload) {
            $this->processEntries($payload['entry'] ?? []);
        })->afterResponse();

        return response()->json(['status' => 'ok']);
    }

    private function processEntries(array $entries): void
    {
        $fb = app(FacebookService::class);

        foreach ($entries as $entry) {
            foreach ($entry['messaging'] ?? [] as $event) {
                $senderId = $event['sender']['id'] ?? null;

                if (! $senderId || $senderId === config('services.facebook.page_id')) {
                    continue;
                }

                // Handle postbacks (button clicks)
                if (isset($event['postback'])) {
                    $this->handleMessage($fb, $senderId, $event['postback']['payload'] ?? '');
                    continue;
                }

                // Handle messages
                if (isset($event['message'])) {
                    $message = $event['message'];

                    // Check for image attachments
                    if (! empty($message['attachments'])) {
                        foreach ($message['attachments'] as $att) {
                            if ($att['type'] === 'image' && ! empty($att['payload']['url'])) {
                                $this->handleImage($fb, $senderId, $att['payload']['url']);
                                return;
                            }
                            if ($att['type'] === 'location' && ! empty($att['payload']['coordinates'])) {
                                $coords = $att['payload']['coordinates'];
                                $this->handleLocation($fb, $senderId, $coords['lat'], $coords['long']);
                                return;
                            }
                        }
                    }

                    $text = $message['text'] ?? '';
                    if ($text) {
                        $this->handleMessage($fb, $senderId, $text);
                    }
                }
            }
        }
    }

    // ── Conversation state ──────────────────────────────────────────────────

    private function cacheKey(string $senderId): string
    {
        return "messenger_session:{$senderId}";
    }

    private function getSession(string $senderId): array
    {
        return Cache::get($this->cacheKey($senderId), ['step' => 'idle']);
    }

    private function setSession(string $senderId, array $data): void
    {
        Cache::put($this->cacheKey($senderId), $data, now()->addHours(1));
    }

    private function clearSession(string $senderId): void
    {
        Cache::forget($this->cacheKey($senderId));
    }

    // ── Message handlers ────────────────────────────────────────────────────

    private function handleMessage(FacebookService $fb, string $senderId, string $text): void
    {
        $session = $this->getSession($senderId);
        $step    = $session['step'] ?? 'idle';
        $lower   = mb_strtolower(trim($text));

        // Cancel at any time
        if (in_array($lower, ['cancel', 'stop', 'exit', 'quit'])) {
            $this->clearSession($senderId);
            $fb->sendMessage($senderId, "Report cancelled. Send \"report\" anytime to start a new flood report.");
            return;
        }

        // Handle by step
        match ($step) {
            'idle'              => $this->stepIdle($fb, $senderId, $lower),
            'awaiting_location' => $this->stepLocation($fb, $senderId, $text),
            'awaiting_severity' => $this->stepSeverity($fb, $senderId, $lower, $session),
            'awaiting_photo'    => $this->stepPhoto($fb, $senderId, $lower, $session),
            'awaiting_description' => $this->stepDescription($fb, $senderId, $text, $session),
            default             => $this->stepIdle($fb, $senderId, $lower),
        };
    }

    private function stepIdle(FacebookService $fb, string $senderId, string $text): void
    {
        $greetings = ['hi', 'hello', 'hey', 'kumusta', 'magandang araw', 'good morning', 'good afternoon', 'good evening'];
        $reportTriggers = ['report', 'flood', 'baha', 'mag-report', 'ireport', 'i-report'];

        if (collect($reportTriggers)->contains(fn ($k) => str_contains($text, $k))) {
            $this->startReport($fb, $senderId);
            return;
        }

        if (collect($greetings)->contains(fn ($k) => str_contains($text, $k))) {
            $fb->sendQuickReplies(
                $senderId,
                "Kumusta! Ako ang FloodTrack Bot. 🌊\n\nPwede kitang tulungan mag-report ng baha sa inyong lugar.",
                ['Report Flood', 'Help']
            );
            return;
        }

        if (in_array($text, ['help', 'tulong', 'commands'])) {
            $fb->sendMessage($senderId,
                "FloodTrack Bot Commands:\n\n"
                . "📝 \"Report\" — Submit a flood report\n"
                . "❌ \"Cancel\" — Cancel current report\n"
                . "❓ \"Help\" — Show this message\n\n"
                . "You can also send a photo of flooding anytime to start a report."
            );
            return;
        }

        $fb->sendQuickReplies(
            $senderId,
            "Send \"Report\" to submit a flood report, or \"Help\" for commands.",
            ['Report Flood', 'Help']
        );
    }

    private function startReport(FacebookService $fb, string $senderId): void
    {
        $this->setSession($senderId, ['step' => 'awaiting_location']);

        $fb->sendMessage($senderId,
            "📍 Step 1/4 — Location\n\n"
            . "Saan ang baha? You can:\n"
            . "• Send your 📍 location pin\n"
            . "• Type the address (e.g. \"Brgy. Wawa, Nasugbu\")\n\n"
            . "Send \"cancel\" to stop."
        );
    }

    private function stepLocation(FacebookService $fb, string $senderId, string $text): void
    {
        // Try to parse coordinates from text like "14.0681, 120.6236"
        if (preg_match('/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/', $text, $m)) {
            $this->handleLocation($fb, $senderId, (float) $m[1], (float) $m[2]);
            return;
        }

        // Treat as address text
        $session = $this->getSession($senderId);
        $session['step']    = 'awaiting_severity';
        $session['address'] = mb_substr($text, 0, 255);
        // Default coordinates (Nasugbu center) — address text only
        $session['latitude']  = (float) config('services.openweather.lat', 14.0656);
        $session['longitude'] = (float) config('services.openweather.lon', 120.6278);
        $this->setSession($senderId, $session);

        $this->askSeverity($fb, $senderId);
    }

    private function handleLocation(FacebookService $fb, string $senderId, float $lat, float $lng): void
    {
        $session = $this->getSession($senderId);

        if (! in_array($session['step'], ['awaiting_location', 'idle'])) {
            // If they send location at another step, update it
            $session['latitude']  = $lat;
            $session['longitude'] = $lng;
            $this->setSession($senderId, $session);
            $fb->sendMessage($senderId, "📍 Location updated. Continuing...");
            return;
        }

        $session['step']      = 'awaiting_severity';
        $session['latitude']  = $lat;
        $session['longitude'] = $lng;
        $session['address']   = $session['address'] ?? null;
        $this->setSession($senderId, $session);

        $this->askSeverity($fb, $senderId);
    }

    private function askSeverity(FacebookService $fb, string $senderId): void
    {
        $fb->sendQuickReplies(
            $senderId,
            "⚠️ Step 2/4 — Severity\n\n"
            . "Gaano kalala ang baha?\n\n"
            . "🟢 Low — Ankle level\n"
            . "🟡 Moderate — Knee level\n"
            . "🟠 High — Waist level or higher\n"
            . "🔴 Critical — Life-threatening",
            ['Low', 'Moderate', 'High', 'Critical']
        );
    }

    private function stepSeverity(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        $severityMap = [
            'low' => 'low', 'green' => 'low', 'mababa' => 'low',
            'moderate' => 'moderate', 'yellow' => 'moderate', 'katamtaman' => 'moderate',
            'high' => 'high', 'orange' => 'high', 'mataas' => 'high',
            'critical' => 'critical', 'red' => 'critical', 'malala' => 'critical', 'delikado' => 'critical',
        ];

        $severity = $severityMap[$text] ?? null;

        if (! $severity) {
            $fb->sendQuickReplies(
                $senderId,
                "Please choose a severity level:",
                ['Low', 'Moderate', 'High', 'Critical']
            );
            return;
        }

        $session['step']     = 'awaiting_photo';
        $session['severity'] = $severity;
        $this->setSession($senderId, $session);

        $fb->sendQuickReplies(
            $senderId,
            "📸 Step 3/4 — Photo\n\n"
            . "Send a photo of the flooding para ma-verify ang report.\n\n"
            . "You can also skip this step.",
            ['Skip']
        );
    }

    private function handleImage(FacebookService $fb, string $senderId, string $imageUrl): void
    {
        $session = $this->getSession($senderId);

        if ($session['step'] === 'idle') {
            // Photo sent without starting a report — auto-start
            $session['step']     = 'awaiting_location';
            $session['image_url'] = $imageUrl;
            $this->setSession($senderId, $session);

            $fb->sendMessage($senderId,
                "📸 Photo received! Let's create a flood report.\n\n"
                . "📍 Step 1/4 — Where is the flooding?\n"
                . "Send your location pin or type the address."
            );
            return;
        }

        if ($session['step'] === 'awaiting_photo') {
            $session['step']      = 'awaiting_description';
            $session['image_url'] = $imageUrl;
            $this->setSession($senderId, $session);

            $fb->sendQuickReplies(
                $senderId,
                "📸 Photo received!\n\n"
                . "📝 Step 4/4 — Description (optional)\n\n"
                . "Describe the situation or skip to submit.",
                ['Skip']
            );
            return;
        }

        // At any other step, save the image
        $session['image_url'] = $imageUrl;
        $this->setSession($senderId, $session);
        $fb->sendMessage($senderId, "📸 Photo saved. Continuing with your report...");
    }

    private function stepPhoto(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        if (in_array($text, ['skip', 'wala', 'no', 'none'])) {
            $session['step'] = 'awaiting_description';
            $this->setSession($senderId, $session);

            $fb->sendQuickReplies(
                $senderId,
                "📝 Step 4/4 — Description (optional)\n\n"
                . "Describe the flooding situation, or skip to submit.",
                ['Skip']
            );
            return;
        }

        $fb->sendQuickReplies(
            $senderId,
            "Please send a photo of the flooding, or skip this step.",
            ['Skip']
        );
    }

    private function stepDescription(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        $lower = mb_strtolower(trim($text));

        if (! in_array($lower, ['skip', 'wala', 'no', 'none'])) {
            $session['description'] = mb_substr($text, 0, 1000);
        }

        $this->submitReport($fb, $senderId, $session);
    }

    // ── Submit report ───────────────────────────────────────────────────────

    private function submitReport(FacebookService $fb, string $senderId, array $session): void
    {
        $fb->sendTypingOn($senderId);

        $adminUser = User::where('role', 'admin')->first();

        $report = Report::create([
            'user_id'     => $adminUser?->id ?? 1,
            'severity'    => $session['severity'] ?? 'moderate',
            'status'      => 'pending',
            'description' => $session['description'] ?? "Flood report via Messenger (sender: {$senderId})",
            'latitude'    => $session['latitude'] ?? (float) config('services.openweather.lat', 14.0656),
            'longitude'   => $session['longitude'] ?? (float) config('services.openweather.lon', 120.6278),
            'address'     => $session['address'] ?? null,
            'source'      => 'messenger',
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => null,
            'status'    => 'pending',
            'notes'     => "Submitted via Facebook Messenger (PSID: {$senderId}).",
        ]);

        // Download and attach photo if provided
        if (! empty($session['image_url'])) {
            try {
                $path = $fb->downloadMessengerAttachment($session['image_url'], $report->id);
                if ($path) {
                    $report->media()->create([
                        'file_path' => $path,
                        'file_type' => 'image',
                        'file_size' => Storage::disk('public')->size($path),
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('[Messenger] Failed to download image', ['error' => $e->getMessage()]);
            }
        }

        app(SlaService::class)->initializeTracking($report);

        // Notify admins
        $admins = User::where('role', 'admin')->get();
        Notification::send($admins, new NewReportSubmitted($report));

        SocketService::toAll('new-report', [
            'reportId'  => $report->id,
            'reference' => $report->reference_number,
            'severity'  => $report->severity,
            'address'   => $report->address,
            'source'    => 'messenger',
        ]);

        $this->clearSession($senderId);

        $severityEmoji = match ($report->severity) {
            'critical' => '🔴',
            'high'     => '🟠',
            'moderate' => '🟡',
            default    => '🟢',
        };

        $fb->sendMessage($senderId,
            "✅ Report submitted!\n\n"
            . "📋 Reference: {$report->reference_number}\n"
            . "{$severityEmoji} Severity: " . ucfirst($report->severity) . "\n"
            . ($report->address ? "📍 Location: {$report->address}\n" : '')
            . "\nYour report is now pending review. Mag-ingat po!\n\n"
            . "Send \"report\" to submit another."
        );

        Log::info('[Messenger] Report created', [
            'sender'    => $senderId,
            'report_id' => $report->id,
            'reference' => $report->reference_number,
        ]);
    }
}
