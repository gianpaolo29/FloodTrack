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
     * Fetch recent posts from the managed Facebook Page.
     */
    public function getRecentPosts(int $limit = 25): array
    {
        $response = Http::get("{$this->baseUrl}/{$this->pageId}/posts", [
            'access_token' => $this->pageAccessToken,
            'fields'       => 'id,message,created_time,full_picture,attachments{media,subattachments},place',
            'limit'        => $limit,
        ]);

        if ($response->failed()) {
            Log::error('[FacebookService] Failed to fetch posts', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return [];
        }

        return $response->json('data', []);
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
     * Download an image from a URL and store it in the report's media directory.
     * Returns the storage path or null on failure.
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
     * Check if the Page Access Token is still valid.
     */
    public function isTokenValid(): bool
    {
        $response = Http::get("{$this->baseUrl}/me", [
            'access_token' => $this->pageAccessToken,
        ]);

        return $response->successful();
    }
}
