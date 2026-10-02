<?php

namespace Database\Seeders;

use App\Models\Report;
use App\Models\ReportMedia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ReportMediaSeeder extends Seeder
{
    /**
     * Flood-related image URLs from Unsplash (free, no API key needed for small images).
     * These are real flood/disaster photos that will be downloaded and stored locally.
     */
    private array $floodImages = [
        // Flooded streets
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80',
        'https://images.unsplash.com/photo-1614091066517-e1e4b9a6d972?w=800&q=80',
        'https://images.unsplash.com/photo-1596394723269-e8e5b2571e6d?w=800&q=80',
        'https://images.unsplash.com/photo-1559060530-c30e01e7b0d9?w=800&q=80',
        // Water/rain/storm
        'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80',
        'https://images.unsplash.com/photo-1509635022432-0220ac4f4ce5?w=800&q=80',
        'https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?w=800&q=80',
        'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800&q=80',
        // Rainy roads / aftermath
        'https://images.unsplash.com/photo-1515694346937-94d85e39c93a?w=800&q=80',
        'https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&q=80',
        'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=800&q=80',
        'https://images.unsplash.com/photo-1438449805896-28a666819356?w=800&q=80',
        // Heavy rain / wet conditions
        'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&q=80',
        'https://images.unsplash.com/photo-1433863448220-78aaa30e0b8d?w=800&q=80',
        'https://images.unsplash.com/photo-1503435980610-a51f3ddfee50?w=800&q=80',
        'https://images.unsplash.com/photo-1541919329513-35f7af297129?w=800&q=80',
        'https://images.unsplash.com/photo-1504560715926-bfbb1f5e8e31?w=800&q=80',
        'https://images.unsplash.com/photo-1501691223387-dd0500403074?w=800&q=80',
        'https://images.unsplash.com/photo-1470770841497-7b0376e8ff10?w=800&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    ];

    public function run(): void
    {
        $reports = Report::all();

        if ($reports->isEmpty()) {
            $this->command->warn('No reports found. Run MainSeeder first.');
            return;
        }

        // Ensure storage directory exists
        Storage::disk('public')->makeDirectory('reports');

        $downloaded = [];
        $failed = 0;

        $this->command->info('Downloading flood images...');

        // Download images upfront
        foreach ($this->floodImages as $idx => $url) {
            try {
                $response = Http::timeout(15)->get($url);
                if ($response->successful()) {
                    $downloaded[] = $response->body();
                    $this->command->info('  ✓ Image ' . ($idx + 1) . '/' . count($this->floodImages));
                } else {
                    $failed++;
                    $this->command->warn("  ✗ Failed to download image " . ($idx + 1));
                }
            } catch (\Throwable $e) {
                $failed++;
                $this->command->warn("  ✗ Error downloading image " . ($idx + 1) . ": " . $e->getMessage());
            }
        }

        // Fallback: generate images with GD if downloads failed
        if (empty($downloaded)) {
            $this->command->warn('All downloads failed. Generating placeholder images with GD...');
            $downloaded = $this->generatePlaceholderImages(20);
        }

        if (empty($downloaded)) {
            $this->command->error('Could not download or generate any images. Skipping media seeding.');
            return;
        }

        $this->command->info('Attaching images to reports...');

        $imageCount = count($downloaded);
        $mediaCreated = 0;

        foreach ($reports as $report) {
            // Skip reports that already have media
            if ($report->media()->exists()) {
                continue;
            }

            // Each report gets 1-3 images based on severity
            $numImages = match ($report->severity) {
                'critical' => 3,
                'high'     => rand(2, 3),
                'moderate' => rand(1, 2),
                default    => 1,
            };

            $dir = 'reports/' . $report->id;
            Storage::disk('public')->makeDirectory($dir);

            for ($i = 0; $i < $numImages; $i++) {
                $imageData = $downloaded[($report->id + $i) % $imageCount];
                $filename = 'flood-evidence-' . ($i + 1) . '.jpg';
                $path = $dir . '/' . $filename;

                Storage::disk('public')->put($path, $imageData);

                ReportMedia::create([
                    'report_id' => $report->id,
                    'file_path' => $path,
                    'file_type' => 'image',
                    'file_size' => strlen($imageData),
                ]);

                $mediaCreated++;
            }
        }

        $this->command->info("✓ Attached {$mediaCreated} images to " . $reports->count() . " reports.");
        if ($failed > 0) {
            $this->command->warn("  ({$failed} image downloads failed, used available images as fallback)");
        }
    }

    /**
     * Generate placeholder flood-themed images using GD as fallback.
     */
    private function generatePlaceholderImages(int $count): array
    {
        if (!function_exists('imagecreatetruecolor')) {
            $this->command->warn('GD library not available. Cannot generate placeholders.');
            return [];
        }

        $images = [];
        $floodColors = [
            [80, 120, 60],    // murky green water
            [100, 85, 60],    // muddy brown
            [70, 100, 130],   // grey-blue water
            [90, 75, 55],     // dark muddy
            [60, 90, 70],     // dark green flood
            [110, 100, 80],   // light muddy
            [75, 110, 140],   // steel blue water
            [85, 70, 50],     // brown water
        ];

        for ($i = 0; $i < $count; $i++) {
            $img = imagecreatetruecolor(800, 600);
            $colorSet = $floodColors[$i % count($floodColors)];

            // Background gradient (sky to water)
            for ($y = 0; $y < 600; $y++) {
                $ratio = $y / 600;
                if ($y < 200) {
                    // Sky portion — grey overcast
                    $r = (int)(160 - $ratio * 80);
                    $g = (int)(165 - $ratio * 85);
                    $b = (int)(175 - $ratio * 75);
                } else {
                    // Water/flood portion
                    $waterRatio = ($y - 200) / 400;
                    $r = (int)($colorSet[0] + $waterRatio * 30 + rand(-5, 5));
                    $g = (int)($colorSet[1] + $waterRatio * 20 + rand(-5, 5));
                    $b = (int)($colorSet[2] + $waterRatio * 10 + rand(-5, 5));
                }
                $r = max(0, min(255, $r));
                $g = max(0, min(255, $g));
                $b = max(0, min(255, $b));
                $color = imagecolorallocate($img, $r, $g, $b);
                imageline($img, 0, $y, 799, $y, $color);
            }

            // Add some water reflection lines
            for ($j = 0; $j < 15; $j++) {
                $lineY = rand(250, 580);
                $lineColor = imagecolorallocatealpha($img, 255, 255, 255, rand(100, 120));
                imageline($img, rand(0, 300), $lineY, rand(400, 799), $lineY + rand(-2, 2), $lineColor);
            }

            ob_start();
            imagejpeg($img, null, 85);
            $images[] = ob_get_clean();
            imagedestroy($img);
        }

        return $images;
    }
}
