<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FacebookService
{
    private string $pageId;
    private string $pageAccessToken;
    private string $graphVersion;
    private string $baseUrl;

    public function __construct()
    {
        $this->pageId          = config('services.facebook.page_id');
        $this->pageAccessToken = config('services.facebook.page_access_token');
        $this->graphVersion    = config('services.facebook.graph_version', 'v21.0');
        $this->baseUrl         = "https://graph.facebook.com/{$this->graphVersion}";
    }

    /**
     * Fetch recent posts from the Facebook Page (including visitor posts).
     */
    public function getRecentPosts(int $limit = 25): array
    {
        $response = Http::get("{$this->baseUrl}/{$this->pageId}/feed", [
            'access_token' => $this->pageAccessToken,
            'fields'       => 'id,message,created_time,full_picture,attachments{media,subattachments},place,from',
            'limit'        => $limit,
        ]);

        if ($response->failed()) {
            Log::error('[FacebookService] Failed to fetch page posts', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return [];
        }

        return $response->json('data', []);
    }

    /**
     * Check if a post contains the #floodtrack hashtag.
     */
    public function hasFloodTrackHashtag(?string $message): bool
    {
        if (empty($message)) {
            return false;
        }

        return (bool) preg_match('/#floodtrack\b/i', $message);
    }

    /**
     * Check if a post message contains flood-related keywords (Tagalog/English).
     */
    public function isFloodRelated(?string $message): bool
    {
        if (empty($message)) {
            return false;
        }

        $keywords = [
            'baha', 'bumabaha', 'binaha', 'bahain', 'pagbaha', 'nabaha',
            'flood', 'flooding', 'flooded', 'flash flood',
            'tubig', 'tumataas ang tubig', 'mataas na tubig',
            'water level', 'rising water', 'high water',
            'lubog', 'lumubog', 'nalubog',
            'rescue', 'stranded', 'evacuate', 'evacuation',
            'nasiraan', 'landslide', 'storm surge',
            'ulan', 'malakas na ulan', 'heavy rain',
        ];

        $lower = mb_strtolower($message);

        foreach ($keywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a post should be imported as a report.
     */
    public function shouldImport(?string $message): bool
    {
        return $this->hasFloodTrackHashtag($message) || $this->isFloodRelated($message);
    }

    /**
     * Download an image from a URL and store it in the report's media directory.
     */
    public function downloadImage(string $url, int $reportId): ?string
    {
        try {
            $response = Http::timeout(30)->get($url);

            if ($response->failed()) {
                return null;
            }

            $extension = 'jpg';
            $contentType = $response->header('Content-Type');
            if (str_contains($contentType, 'png')) {
                $extension = 'png';
            }

            $filename = 'fb_' . uniqid() . '.' . $extension;
            $path     = "reports/{$reportId}/{$filename}";

            Storage::disk('public')->put($path, $response->body());

            return $path;
        } catch (\Throwable $e) {
            Log::warning('[FacebookService] Failed to download image', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Post a comment on a Facebook post as the Page.
     */
    public function commentOnPost(string $postId, string $message): bool
    {
        $response = Http::post("{$this->baseUrl}/{$postId}/comments", [
            'access_token' => $this->pageAccessToken,
            'message'      => $message,
        ]);

        if ($response->failed()) {
            Log::error('[FacebookService] Failed to comment on post', [
                'post_id' => $postId,
                'status'  => $response->status(),
                'body'    => $response->body(),
            ]);
            return false;
        }

        return true;
    }

    /**
     * Check if the Page Access Token is still valid.
     */
    public function isTokenValid(): bool
    {
        $response = Http::get("{$this->baseUrl}/me", [
            'access_token' => $this->pageAccessToken,
        ]);

        return $response->successful();
    }

    // ── Messenger Send API ──────────────────────────────────────────────────

    /**
     * Send a text message to a Messenger user.
     */
    public function sendMessage(string $recipientId, string $text): bool
    {
        return $this->sendRaw($recipientId, ['text' => $text]);
    }

    /**
     * Send a message with quick-reply buttons.
     */
    public function sendQuickReplies(string $recipientId, string $text, array $options): bool
    {
        $quickReplies = array_map(fn (string $label) => [
            'content_type' => 'text',
            'title'        => $label,
            'payload'      => $label,
        ], $options);

        return $this->sendRaw($recipientId, [
            'text'          => $text,
            'quick_replies' => $quickReplies,
        ]);
    }

    /**
     * Send a typing indicator.
     */
    public function sendTypingOn(string $recipientId): void
    {
        Http::post("{$this->baseUrl}/me/messages", [
            'access_token'   => $this->pageAccessToken,
            'recipient'      => ['id' => $recipientId],
            'sender_action'  => 'typing_on',
        ]);
    }

    /**
     * Download a Messenger attachment (image) by URL with the page token.
     */
    public function downloadMessengerAttachment(string $url, int $reportId, string $type = 'image'): ?array
    {
        try {
            $timeout = $type === 'video' ? 120 : 30;

            $response = Http::timeout($timeout)->withOptions([
                'allow_redirects' => true,
                'verify' => false,
            ])->get($url);

            if ($response->failed()) {
                $response = Http::timeout($timeout)->withOptions([
                    'allow_redirects' => true,
                    'verify' => false,
                ])->get($url, ['access_token' => $this->pageAccessToken]);
            }

            if ($response->failed()) {
                Log::warning('[FacebookService] Messenger attachment download failed', [
                    'url'    => $url,
                    'status' => $response->status(),
                ]);
                return null;
            }

            $contentType = $response->header('Content-Type') ?? '';

            if ($type === 'video') {
                $ext = 'mp4';
                $fileType = 'video';
            } else {
                $ext = str_contains($contentType, 'png') ? 'png' : 'jpg';
                $fileType = 'image';
            }

            $filename = 'messenger_' . uniqid() . '.' . $ext;
            $path     = "reports/{$reportId}/{$filename}";
            Storage::disk('public')->put($path, $response->body());

            return ['path' => $path, 'file_type' => $fileType];
        } catch (\Throwable $e) {
            Log::warning('[FacebookService] Messenger attachment download failed', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Get a Messenger user's profile (name, etc.) by PSID.
     */
    public function getUserProfile(string $psid): ?array
    {
        try {
            $response = Http::get("{$this->baseUrl}/{$psid}", [
                'access_token' => $this->pageAccessToken,
                'fields'       => 'first_name,last_name,name',
            ]);

            return $response->successful() ? $response->json() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function sendRaw(string $recipientId, array $message): bool
    {
        $response = Http::post("{$this->baseUrl}/me/messages", [
            'access_token' => $this->pageAccessToken,
            'recipient'    => ['id' => $recipientId],
            'message'      => $message,
        ]);

        if ($response->failed()) {
            Log::error('[FacebookService] Messenger send failed', [
                'recipient' => $recipientId,
                'status'    => $response->status(),
                'body'      => $response->body(),
            ]);
            return false;
        }

        return true;
    }
}
