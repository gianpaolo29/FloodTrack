<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\NewReportSubmitted;
use App\Services\FacebookService;
use App\Services\ReportAnalysisService;
use App\Services\SlaService;
use App\Services\SocketService;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class MessengerWebhookController extends Controller
{
    private const MAX_RETRIES = 3;

    // Nasugbu, Batangas bounding box — reject coordinates outside this region
    private const MIN_LAT = 13.85;
    private const MAX_LAT = 14.25;
    private const MIN_LNG = 120.45;
    private const MAX_LNG = 120.80;

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

        Log::info('[Messenger] Webhook received', ['payload' => $payload]);

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

                if (isset($event['postback'])) {
                    $this->handleMessage($fb, $senderId, $event['postback']['payload'] ?? '');
                    continue;
                }

                if (isset($event['message'])) {
                    $message = $event['message'];

                    // Ignore echo messages (sent by the page itself)
                    if (! empty($message['is_echo'])) {
                        continue;
                    }

                    if (! empty($message['attachments'])) {
                        $handled = false;
                        foreach ($message['attachments'] as $att) {
                            if (in_array($att['type'], ['image', 'video']) && ! empty($att['payload']['url'])) {
                                $this->handleMedia($fb, $senderId, $att['payload']['url'], $att['type']);
                                $handled = true;
                            }
                            if ($att['type'] === 'location' && ! empty($att['payload']['coordinates'])) {
                                $coords = $att['payload']['coordinates'];
                                $this->handleLocation($fb, $senderId, $coords['lat'], $coords['long']);
                                $handled = true;
                                break;
                            }
                        }
                        if (! $handled) {
                            $session = $this->getSession($senderId);
                            if ($session['step'] === 'awaiting_media') {
                                $fb->sendQuickReplies($senderId,
                                    "Please send a photo or video, not a sticker or GIF.\n\nOr tap Done/Skip.",
                                    ['Done', 'Skip']
                                );
                            }
                        }
                        continue;
                    }

                    $text = $message['text'] ?? '';
                    if ($text) {
                        $this->handleMessage($fb, $senderId, $text);
                    }
                }
            }
        }
    }

    // ── Session helpers ──────────────────────────────────────────────────────

    private function cacheKey(string $senderId): string
    {
        return "messenger_session:{$senderId}";
    }

    private function getSession(string $senderId): array
    {
        return Cache::get($this->cacheKey($senderId), ['step' => 'idle', 'retries' => []]);
    }

    private function setSession(string $senderId, array $data): void
    {
        Cache::put($this->cacheKey($senderId), $data, now()->addHours(1));
    }

    private function clearSession(string $senderId): void
    {
        Cache::forget($this->cacheKey($senderId));
    }

    private function getRetries(array $session, string $step): int
    {
        return $session['retries'][$step] ?? 0;
    }

    private function incrementRetry(array &$session, string $step): int
    {
        $session['retries'][$step] = ($session['retries'][$step] ?? 0) + 1;
        return $session['retries'][$step];
    }

    // ── Message router ──────────────────────────────────────────────────────

    private function handleMessage(FacebookService $fb, string $senderId, string $text): void
    {
        $session = $this->getSession($senderId);
        $step    = $session['step'] ?? 'idle';
        $lower   = mb_strtolower(trim($text));

        // Cancel at any time
        if (in_array($lower, ['cancel', 'stop', 'exit', 'quit', 'icancel'])) {
            $this->clearSession($senderId);
            $fb->sendQuickReplies($senderId,
                "Report cancelled.\n\nSend \"Report\" anytime to start a new one.",
                ['Report Flood']
            );
            return;
        }

        // Allow restarting mid-flow
        if ($step !== 'idle' && in_array($lower, ['report', 'restart', 'start over', 'ulit'])) {
            $this->clearSession($senderId);
            $this->startReport($fb, $senderId);
            return;
        }

        // Status check
        if (str_contains($lower, 'status') || str_contains($lower, 'check')) {
            $this->handleStatusCheck($fb, $senderId, $text);
            return;
        }

        match ($step) {
            'idle'                 => $this->stepIdle($fb, $senderId, $lower),
            'awaiting_location'    => $this->stepLocation($fb, $senderId, $text, $session),
            'awaiting_severity'    => $this->stepSeverity($fb, $senderId, $lower, $session),
            'awaiting_media'       => $this->stepMedia($fb, $senderId, $lower, $session),
            'awaiting_description' => $this->stepDescription($fb, $senderId, $text, $session),
            'awaiting_confirm'     => $this->stepConfirm($fb, $senderId, $lower, $session),
            default                => $this->stepIdle($fb, $senderId, $lower),
        };
    }

    // ── Idle / greeting ─────────────────────────────────────────────────────

    private function stepIdle(FacebookService $fb, string $senderId, string $text): void
    {
        $greetings = ['hi', 'hello', 'hey', 'kumusta', 'magandang araw', 'good morning', 'good afternoon', 'good evening', 'musta', 'oi', 'hoy'];
        $reportTriggers = ['report', 'flood', 'baha', 'mag-report', 'ireport', 'i-report', 'report flood'];

        if (collect($reportTriggers)->contains(fn ($k) => str_contains($text, $k))) {
            $this->startReport($fb, $senderId);
            return;
        }

        if (collect($greetings)->contains(fn ($k) => str_contains($text, $k))) {
            $profile = app(FacebookService::class)->getUserProfile($senderId);
            $name = $profile['first_name'] ?? 'po';

            $fb->sendQuickReplies(
                $senderId,
                "Kumusta, {$name}! Ako ang FloodTrack Bot.\n\n"
                . "Pwede kitang tulungan:\n"
                . "- Mag-report ng baha\n"
                . "- I-check ang status ng report\n\n"
                . "Ano ang kailangan mo?",
                ['Report Flood', 'Check Status', 'Help']
            );
            return;
        }

        if (in_array($text, ['help', 'tulong', 'commands', 'ano'])) {
            $fb->sendMessage($senderId,
                "FloodTrack Bot — Help\n\n"
                . "\"Report\" — Mag-submit ng flood report\n"
                . "\"Status FT-XXXXXXXX\" — Check report status\n"
                . "Send a photo — Auto-start a flood report\n"
                . "\"Cancel\" — I-cancel ang current report\n"
                . "\"Restart\" — Ulitin mula sa simula\n\n"
                . "Available 24/7. Mag-ingat po!"
            );
            return;
        }

        $fb->sendQuickReplies(
            $senderId,
            "Hindi ko po naintindihan.\n\nPiliin po sa options below o type \"Help\" para sa commands.",
            ['Report Flood', 'Check Status', 'Help']
        );
    }

    // ── Status check ────────────────────────────────────────────────────────

    private function handleStatusCheck(FacebookService $fb, string $senderId, string $text): void
    {
        // Try to find reference number in the text
        if (preg_match('/FT-[A-Z0-9]{6,}/i', $text, $m)) {
            $ref = strtoupper($m[0]);
            $report = Report::where('reference_number', $ref)->first();

            if ($report) {
                $fb->sendMessage($senderId,
                    "Report Status\n\n"
                    . "Reference: {$report->reference_number}\n"
                    . "Status: " . ucfirst($report->status) . "\n"
                    . "📅 Submitted: " . $report->created_at->format('M d, Y g:i A') . "\n"
                    . ($report->address ? "Location: {$report->address}\n" : '')
                );
            } else {
                $fb->sendMessage($senderId, "Hindi mahanap ang report na \"{$ref}\".\n\nPlease check the reference number and try again.");
            }
            return;
        }

        // Check for reports from this sender
        $recentReports = Report::where('messenger_sender_id', $senderId)
            ->latest()
            ->take(3)
            ->get();

        if ($recentReports->isNotEmpty()) {
            $lines = $recentReports->map(function ($r) {
                return "- {$r->reference_number} — " . ucfirst($r->status);
            })->join("\n");

            $fb->sendMessage($senderId,
                "Your recent reports:\n\n{$lines}\n\n"
                . "To check a specific report, send:\n\"Status FT-XXXXXXXX\""
            );
        } else {
            $fb->sendMessage($senderId,
                "Wala kang recent reports.\n\n"
                . "To check a specific report, send:\n\"Status FT-XXXXXXXX\""
            );
        }
    }

    // ── Step 1: Location ────────────────────────────────────────────────────

    private function startReport(FacebookService $fb, string $senderId): void
    {
        $this->setSession($senderId, ['step' => 'awaiting_location', 'retries' => []]);

        $fb->sendMessage($senderId,
            "New Flood Report\n\n"
            . "Step 1/4 — Location\n\n"
            . "Saan ang baha?\n\n"
            . "- I-type ang address o barangay name\n"
            . "   (e.g. \"Wawa\", \"near the bridge sa Pantalan\")\n\n"
            . "- O i-paste ang coordinates\n"
            . "   (e.g. \"14.0681, 120.6236\")\n\n"
            . "Send \"cancel\" anytime to stop."
        );
    }

    private function stepLocation(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        $trimmed = trim($text);

        // Validate not too short
        if (mb_strlen($trimmed) < 3) {
            $retries = $this->incrementRetry($session, 'location');
            $this->setSession($senderId, $session);

            if ($retries >= self::MAX_RETRIES) {
                $this->clearSession($senderId);
                $fb->sendQuickReplies($senderId,
                    "Too many invalid attempts. Report cancelled.\n\nSend \"Report\" to try again.",
                    ['Report Flood']
                );
                return;
            }

            $fb->sendMessage($senderId,
                "Location is too short. Please provide a more specific address.\n\n"
                . "Examples:\n"
                . "- \"Wawa\" or \"Pantalan\"\n"
                . "- \"near the bridge sa Bucana\"\n"
                . "- \"14.0681, 120.6236\""
            );
            return;
        }

        // Try to parse coordinates
        if (preg_match('/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/', $trimmed, $m)) {
            $lat = (float) $m[1];
            $lng = (float) $m[2];

            if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
                $retries = $this->incrementRetry($session, 'location');
                $this->setSession($senderId, $session);
                $fb->sendMessage($senderId, "Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.\n\nPlease try again.");
                return;
            }

            if ($lat < self::MIN_LAT || $lat > self::MAX_LAT || $lng < self::MIN_LNG || $lng > self::MAX_LNG) {
                $retries = $this->incrementRetry($session, 'location');
                $this->setSession($senderId, $session);
                $fb->sendMessage($senderId,
                    "Ang coordinates na \"{$lat}, {$lng}\" ay nasa labas ng service area (Nasugbu, Batangas).\n\n"
                    . "Please provide coordinates within Nasugbu, or type the barangay name instead."
                );
                return;
            }

            $this->handleLocation($fb, $senderId, $lat, $lng);
            return;
        }

        // AI-powered geocoding
        $geocoded = $this->geocodeAddress($trimmed);

        $session['step'] = 'awaiting_severity';

        if ($geocoded) {
            $session['address']   = $geocoded['address'] ?? mb_substr($trimmed, 0, 255);
            $session['latitude']  = $geocoded['lat'];
            $session['longitude'] = $geocoded['lng'];
            $this->setSession($senderId, $session);

            $fb->sendMessage($senderId, "Location found: {$session['address']}\nCoordinates: {$geocoded['lat']}, {$geocoded['lng']}");
        } else {
            $session['address']   = mb_substr($trimmed, 0, 255);
            $session['latitude']  = (float) config('services.openweather.lat', 14.0656);
            $session['longitude'] = (float) config('services.openweather.lon', 120.6278);
            $this->setSession($senderId, $session);

            $fb->sendMessage($senderId,
                "Address saved: {$trimmed}\n"
                . "Note: Hindi ma-pinpoint ang exact coordinates. Default Nasugbu coordinates ang gagamitin.\n"
                . "Para mas accurate, i-type ang barangay name (e.g. \"Wawa\") o paste ang Google Maps coordinates."
            );
        }

        $this->askSeverity($fb, $senderId);
    }

    private function handleLocation(FacebookService $fb, string $senderId, float $lat, float $lng): void
    {
        $session = $this->getSession($senderId);

        if (! in_array($session['step'], ['awaiting_location', 'idle'])) {
            $session['latitude']  = $lat;
            $session['longitude'] = $lng;
            $this->setSession($senderId, $session);
            $fb->sendMessage($senderId, "Location updated to {$lat}, {$lng}.");
            return;
        }

        $session['step']      = 'awaiting_severity';
        $session['latitude']  = $lat;
        $session['longitude'] = $lng;
        $session['address']   = $session['address'] ?? $this->reverseGeocode($lat, $lng);
        $this->setSession($senderId, $session);

        $addressNote = $session['address'] ? " ({$session['address']})" : '';
        $fb->sendMessage($senderId, "Location set: {$lat}, {$lng}{$addressNote}");

        $this->askSeverity($fb, $senderId);
    }

    // ── Step 2: Severity ────────────────────────────────────────────────────

    private function askSeverity(FacebookService $fb, string $senderId): void
    {
        $fb->sendQuickReplies(
            $senderId,
            "Step 2/4 — Severity\n\n"
            . "Gaano kalala ang baha?\n\n"
            . "Low — Bukong-bukong / Ankle level\n"
            . "Moderate — Tuhod / Knee level\n"
            . "High — Baywang / Waist level or higher\n"
            . "Critical — Banta sa buhay / Life-threatening",
            ['Low', 'Moderate', 'High', 'Critical']
        );
    }

    private function stepSeverity(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        $severityMap = [
            // English
            'low' => 'low', '1' => 'low', 'ankle' => 'low', 'light' => 'low', 'minor' => 'low',
            'moderate' => 'moderate', '2' => 'moderate', 'knee' => 'moderate', 'medium' => 'moderate',
            'high' => 'high', '3' => 'high', 'waist' => 'high', 'severe' => 'high', 'major' => 'high',
            'critical' => 'critical', '4' => 'critical', 'extreme' => 'critical', 'emergency' => 'critical', 'danger' => 'critical',
            // Tagalog
            'mababa' => 'low', 'konti' => 'low', 'kaunti' => 'low',
            'katamtaman' => 'moderate', 'medium' => 'moderate',
            'mataas' => 'high', 'malakas' => 'high',
            'malala' => 'critical', 'delikado' => 'critical', 'grabe' => 'critical', 'sobra' => 'critical',
        ];

        $severity = $severityMap[$text] ?? null;

        if (! $severity) {
            $retries = $this->incrementRetry($session, 'severity');
            $this->setSession($senderId, $session);

            if ($retries >= self::MAX_RETRIES) {
                $this->clearSession($senderId);
                $fb->sendQuickReplies($senderId,
                    "Too many invalid attempts. Report cancelled.\n\nSend \"Report\" to try again.",
                    ['Report Flood']
                );
                return;
            }

            $fb->sendQuickReplies(
                $senderId,
                "Hindi valid ang \"{$text}\".\n\nPiliin ang severity level, or type: Low, Moderate, High, or Critical.",
                ['Low', 'Moderate', 'High', 'Critical']
            );
            return;
        }

        $session['step']     = 'awaiting_media';
        $session['severity'] = $severity;
        $this->setSession($senderId, $session);

        $fb->sendQuickReplies(
            $senderId,
            "Step 3/4 — Photo / Video\n\n"
            . "Mag-send ng photo o video ng baha para ma-verify ng AI.\n\n"
            . "Pwede kang mag-send ng hanggang 5 files (photo o video, max 15 min).\n"
            . "Pwede ring i-skip.",
            ['Skip']
        );
    }

    // ── Step 3: Media (photo/video, up to 5) ────────────────────────────────

    private const MAX_MEDIA = 5;

    private function handleMedia(FacebookService $fb, string $senderId, string $url, string $type): void
    {
        $session = $this->getSession($senderId);
        $media = $session['media'] ?? [];

        if (count($media) >= self::MAX_MEDIA) {
            $fb->sendQuickReplies($senderId,
                "Maximum 5 files na. Tap \"Done\" to continue.",
                ['Done']
            );
            return;
        }

        $media[] = ['url' => $url, 'type' => $type];
        $session['media'] = $media;

        if ($session['step'] === 'idle') {
            $session['step']    = 'awaiting_location';
            $session['retries'] = [];
            $this->setSession($senderId, $session);

            $label = $type === 'video' ? 'Video' : 'Photo';
            $fb->sendMessage($senderId,
                "{$label} received! Let's create a flood report.\n\n"
                . "Step 1/4 — Saan ang baha?\n\n"
                . "Type the address or paste coordinates."
            );
            return;
        }

        if ($session['step'] === 'awaiting_media') {
            $this->setSession($senderId, $session);
            $count = count($media);
            $remaining = self::MAX_MEDIA - $count;
            $label = $type === 'video' ? 'Video' : 'Photo';

            if ($remaining > 0) {
                $fb->sendQuickReplies($senderId,
                    "{$label} saved! ({$count}/" . self::MAX_MEDIA . ")\n\n"
                    . "Send more photos/videos, or tap \"Done\" to continue.",
                    ['Done']
                );
            } else {
                $session['step'] = 'awaiting_description';
                $this->setSession($senderId, $session);
                $fb->sendQuickReplies($senderId,
                    "All {$count} files received!\n\n"
                    . "Step 4/4 — Description (optional)\n\n"
                    . "Describe the situation, o i-skip para i-submit agad.",
                    ['Skip', 'Submit na']
                );
            }
            return;
        }

        // At any other step, save it
        $this->setSession($senderId, $session);
        $label = $type === 'video' ? 'Video' : 'Photo';
        $fb->sendMessage($senderId, "{$label} saved. ({$count}/" . self::MAX_MEDIA . ") Continuing...");
    }

    private function stepMedia(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        if (in_array($text, ['skip', 'skip photo', 'wala', 'no', 'none', 'walang photo', 'next', 'done'])) {
            $session['step'] = 'awaiting_description';
            $this->setSession($senderId, $session);

            $fb->sendQuickReplies(
                $senderId,
                "Step 4/4 — Description (optional)\n\n"
                . "I-describe ang sitwasyon:\n"
                . "- Gaano kataas ang tubig?\n"
                . "- May mga stranded ba?\n"
                . "- Anong kalsada ang apektado?\n\n"
                . "O i-skip para i-submit agad.",
                ['Skip', 'Submit na']
            );
            return;
        }

        $retries = $this->incrementRetry($session, 'media');
        $this->setSession($senderId, $session);

        if ($retries >= self::MAX_RETRIES) {
            $session['step'] = 'awaiting_description';
            $this->setSession($senderId, $session);
            $fb->sendQuickReplies($senderId,
                "Skipping media.\n\nStep 4/4 — Description (optional)\n\nDescribe the situation or skip to submit.",
                ['Skip', 'Submit na']
            );
            return;
        }

        $fb->sendQuickReplies(
            $senderId,
            "Please send a photo or video file, or tap \"Skip\" to continue.",
            ['Skip']
        );
    }

    // ── Step 4: Description ─────────────────────────────────────────────────

    private function stepDescription(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        $lower = mb_strtolower(trim($text));

        if (in_array($lower, ['skip', 'wala', 'no', 'none', 'next', 'submit', 'submit na', 'send', 'send na'])) {
            $session['description'] = null;
        } else {
            // Validate description length
            if (mb_strlen(trim($text)) < 3) {
                $fb->sendQuickReplies($senderId,
                    "Description is too short. Please write at least a few words, or tap Skip.",
                    ['Skip']
                );
                return;
            }
            $session['description'] = mb_substr(trim($text), 0, 1000);
        }

        // Show confirmation before submitting
        $this->showConfirmation($fb, $senderId, $session);
    }

    // ── Confirmation ────────────────────────────────────────────────────────

    private function showConfirmation(FacebookService $fb, string $senderId, array $session): void
    {
        $session['step'] = 'awaiting_confirm';
        $this->setSession($senderId, $session);

        $summary = "Report Summary — Please confirm\n\n"
            . "Location: " . ($session['address'] ?? "{$session['latitude']}, {$session['longitude']}") . "\n"
            . "Coordinates: {$session['latitude']}, {$session['longitude']}\n"
            . "Severity: " . ucfirst($session['severity'] ?? 'moderate') . "\n"
            . "Media: " . (! empty($session['media']) ? count($session['media']) . ' file(s)' : 'None') . "\n"
            . "Description: " . ($session['description'] ?? 'None') . "\n\n"
            . "Submit this report?";

        $fb->sendQuickReplies($senderId, $summary, ['Submit', 'Cancel', 'Restart']);
    }

    private function stepConfirm(FacebookService $fb, string $senderId, string $text, array $session): void
    {
        $confirmWords = ['submit', 'yes', 'oo', 'sige', 'confirm', 'go', 'send', 'ok', 'okay'];
        $cancelWords  = ['cancel', 'no', 'hindi'];
        $restartWords = ['restart', 'ulit', 'start over'];

        if (collect($cancelWords)->contains(fn ($w) => str_contains($text, $w))) {
            $this->clearSession($senderId);
            $fb->sendQuickReplies($senderId, "Report cancelled.", ['Report Flood']);
            return;
        }

        if (collect($restartWords)->contains(fn ($w) => str_contains($text, $w))) {
            $this->clearSession($senderId);
            $this->startReport($fb, $senderId);
            return;
        }

        if (collect($confirmWords)->contains(fn ($w) => str_contains($text, $w))) {
            $this->submitReport($fb, $senderId, $session);
            return;
        }

        $fb->sendQuickReplies($senderId,
            "Please confirm: Submit this report?",
            ['Submit', 'Cancel', 'Restart']
        );
    }

    // ── AI-powered geocoding ────────────────────────────────────────────────

    private function geocodeAddress(string $address): ?array
    {
        // Build barangay context for the AI
        $barangays = config('barangays', []);
        $brgyList = collect($barangays)->map(fn ($b) => "{$b['name']}: {$b['latitude']}, {$b['longitude']}")->join("\n");

        $prompt = <<<PROMPT
You are a geocoding assistant for Nasugbu, Batangas, Philippines.

Given the user's location description, return the most accurate latitude and longitude coordinates.

Known barangays and their coordinates:
{$brgyList}

Rules:
- If the description matches or is near a known barangay, use those coordinates (adjust slightly if the description specifies a sub-area like "near the bridge" or "sa may palengke").
- If it's a well-known landmark, road, or establishment in Nasugbu, use your knowledge to provide accurate coordinates.
- Coordinates MUST be within Nasugbu, Batangas (lat: 13.85-14.25, lng: 120.45-120.80).
- Also provide a cleaned-up address string.

Respond ONLY with valid JSON, no other text:
{"lat": 14.xxxx, "lng": 120.xxxx, "address": "Cleaned address, Nasugbu, Batangas"}

If you cannot determine the location, respond: {"lat": null, "lng": null, "address": null}

User's location description: "{$address}"
PROMPT;

        try {
            $client = \OpenAI::factory()
                ->withApiKey(config('services.openai.key'))
                ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                ->make();

            $response = $client->chat()->create([
                'model'       => 'gpt-4o-mini',
                'messages'    => [['role' => 'user', 'content' => $prompt]],
                'temperature' => 0,
                'max_tokens'  => 100,
            ]);

            $content = trim($response->choices[0]->message->content ?? '');

            // Strip markdown code fences if present
            $content = preg_replace('/^```json\s*|\s*```$/s', '', $content);

            $result = json_decode($content, true);

            if (! $result || empty($result['lat']) || empty($result['lng'])) {
                return null;
            }

            $lat = round((float) $result['lat'], 7);
            $lng = round((float) $result['lng'], 7);

            // Validate within service area
            if ($lat < self::MIN_LAT || $lat > self::MAX_LAT || $lng < self::MIN_LNG || $lng > self::MAX_LNG) {
                return null;
            }

            return [
                'lat'     => $lat,
                'lng'     => $lng,
                'address' => $result['address'] ?? $address,
            ];
        } catch (\Throwable $e) {
            Log::warning('[Messenger] AI geocoding failed', ['address' => $address, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function reverseGeocode(float $lat, float $lng): ?string
    {
        $barangays = config('barangays', []);
        $nearest = null;
        $minDist = PHP_FLOAT_MAX;

        foreach ($barangays as $brgy) {
            $dist = sqrt(pow($lat - $brgy['latitude'], 2) + pow($lng - $brgy['longitude'], 2));
            if ($dist < $minDist) {
                $minDist = $dist;
                $nearest = $brgy['name'];
            }
        }

        return $nearest ? "{$nearest}, Nasugbu, Batangas" : null;
    }

    // ── Submit report ───────────────────────────────────────────────────────

    private function submitReport(FacebookService $fb, string $senderId, array $session): void
    {
        $fb->sendTypingOn($senderId);

        $profile = $fb->getUserProfile($senderId);
        $senderName = $profile['name'] ?? $profile['first_name'] ?? null;

        $adminUser = User::where('role', 'admin')->first();

        $description = $session['description'] ?? 'Flood report via Messenger';
        if ($senderName) {
            $description = "[{$senderName} — Messenger] " . $description;
        }

        $lat = (float) ($session['latitude'] ?? config('services.openweather.lat', 14.0656));
        $lng = (float) ($session['longitude'] ?? config('services.openweather.lon', 120.6278));

        // Final coordinate validation
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            $lat = (float) config('services.openweather.lat', 14.0656);
            $lng = (float) config('services.openweather.lon', 120.6278);
        }

        $report = Report::create([
            'user_id'              => $adminUser?->id ?? 1,
            'severity'             => $session['severity'] ?? 'moderate',
            'status'               => 'pending',
            'description'          => mb_substr($description, 0, 1000),
            'latitude'             => $lat,
            'longitude'            => $lng,
            'address'              => $session['address'] ?? null,
            'source'               => 'messenger',
            'messenger_sender_id'  => $senderId,
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => null,
            'status'    => 'pending',
            'notes'     => "Submitted via Messenger" . ($senderName ? " by {$senderName}" : '') . ".",
        ]);

        // Download and attach media (up to 5 photos/videos)
        $mediaFiles = [];
        foreach ($session['media'] ?? [] as $item) {
            try {
                $result = $fb->downloadMessengerAttachment($item['url'], $report->id, $item['type']);
                if ($result) {
                    $report->media()->create([
                        'file_path' => $result['path'],
                        'file_type' => $result['file_type'],
                        'file_size' => Storage::disk('public')->size($result['path']),
                    ]);
                    if ($result['file_type'] === 'image') {
                        $fullPath = Storage::disk('public')->path($result['path']);
                        $mediaFiles[] = new \Illuminate\Http\UploadedFile($fullPath, basename($result['path']), 'image/jpeg', null, true);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('[Messenger] Media download failed', ['error' => $e->getMessage()]);
            }
        }

        // AI analysis
        $aiNote = '';
        try {
            $aiFlags = ReportAnalysisService::analyze($report, $mediaFiles);
            $report->update($aiFlags);

            $hasThunderstorm = false;
            try {
                $weather = app(WeatherService::class)->current($report->latitude, $report->longitude);
                $hasThunderstorm = str_contains(strtolower($weather['main'] ?? ''), 'thunderstorm');
            } catch (\Throwable) {}

            $exifFailed = ($aiFlags['ai_exif_status'] ?? null) === 'fail';
            $autoVerified = ($aiFlags['ai_image_verified'] ?? false) === true
                && ! $exifFailed
                && ($hasThunderstorm || ($aiFlags['ai_flagged'] === false && $aiFlags['potential_duplicate_of'] === null));
            $autoRejected = ($aiFlags['ai_image_verified'] ?? null) === false || $exifFailed;

            $aiReason = $aiFlags['ai_image_notes'] ?? $aiFlags['ai_flag_reason'] ?? null;

            if ($autoVerified) {
                $report->update(['status' => 'verified', 'verified_at' => now()]);
                ReportStatusUpdate::create([
                    'report_id' => $report->id,
                    'user_id'   => null,
                    'status'    => 'verified',
                    'notes'     => 'Auto-verified: AI confirmed flood in Messenger photo.',
                ]);
                $aiNote = "\nAI: Photo verified as flood-related. Report is now being processed.";
            } elseif ($autoRejected) {
                $report->update(['status' => 'rejected']);
                ReportStatusUpdate::create([
                    'report_id' => $report->id,
                    'user_id'   => null,
                    'status'    => 'rejected',
                    'notes'     => 'Auto-rejected: ' . ($aiReason ?? 'Photo did not pass AI verification.'),
                ]);
                $aiNote = "\nAI: " . ($aiReason ?? 'Photo could not be confirmed as flood-related.');
            } elseif ($aiReason) {
                $aiNote = "\nAI Note: {$aiReason}";
            }
        } catch (\Throwable $e) {
            Log::error('[Messenger] AI analysis failed', ['report_id' => $report->id, 'error' => $e->getMessage()]);
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

        $report->refresh();
        $statusLabel = ucfirst($report->status);

        $fb->sendQuickReplies($senderId,
            "Report Submitted!\n\n"
            . "Reference: {$report->reference_number}\n"
            . "Status: {$statusLabel}\n"
            . "Severity: " . ucfirst($report->severity) . "\n"
            . ($report->address ? "Location: {$report->address}\n" : '')
            . "Coordinates: {$report->latitude}, {$report->longitude}"
            . $aiNote
            . "\n\nMa-uupdate ka rito sa Messenger kapag may changes sa report mo. Mag-ingat po!",
            ['Report Another', 'Check Status']
        );

        Log::info('[Messenger] Report created', [
            'sender'    => $senderId,
            'name'      => $senderName,
            'report_id' => $report->id,
            'reference' => $report->reference_number,
            'lat'       => $report->latitude,
            'lng'       => $report->longitude,
        ]);
    }
}
