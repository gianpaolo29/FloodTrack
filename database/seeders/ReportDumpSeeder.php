<?php

namespace Database\Seeders;

use App\Models\Report;
use App\Models\ReportMedia;
use App\Models\ReportResponder;
use App\Models\ReportSlaConfig;
use App\Models\ReportSlaTracking;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * ReportDumpSeeder — 600 reports with media, status history, SLA, notifications.
 *
 * Run AFTER DumpSeeder (needs admin, residents, teams, responders).
 *
 *   php artisan db:seed --class=ReportDumpSeeder
 */
class ReportDumpSeeder extends Seeder
{
    // ── 42 Barangays (first 10 flood-prone) ──
    private array $barangays = [
        ['name' => 'Pantalan',       'lat' => 14.08570, 'lng' => 120.62960],
        ['name' => 'Bucana',         'lat' => 14.08060, 'lng' => 120.62430],
        ['name' => 'Wawa',           'lat' => 14.07250, 'lng' => 120.62790],
        ['name' => 'Bilaran',        'lat' => 14.06840, 'lng' => 120.63560],
        ['name' => 'Lumbangan',      'lat' => 14.06160, 'lng' => 120.64020],
        ['name' => 'Kaylaway',       'lat' => 14.05790, 'lng' => 120.64120],
        ['name' => 'Poblacion 3',    'lat' => 14.07690, 'lng' => 120.63390],
        ['name' => 'Poblacion 4',    'lat' => 14.07640, 'lng' => 120.63260],
        ['name' => 'Putat',          'lat' => 14.07900, 'lng' => 120.65280],
        ['name' => 'Latag',          'lat' => 14.10050, 'lng' => 120.63050],
        ['name' => 'Calayo',         'lat' => 14.05400, 'lng' => 120.60800],
        ['name' => 'Natipuan',       'lat' => 14.04700, 'lng' => 120.61200],
        ['name' => 'Cogunan',        'lat' => 14.05100, 'lng' => 120.63400],
        ['name' => 'Tumalim',        'lat' => 14.08800, 'lng' => 120.65100],
        ['name' => 'Catandaan',      'lat' => 14.09300, 'lng' => 120.63700],
        ['name' => 'Banilad',        'lat' => 14.10600, 'lng' => 120.62300],
        ['name' => 'Dalima',         'lat' => 14.11200, 'lng' => 120.64100],
        ['name' => 'Aga',            'lat' => 14.12100, 'lng' => 120.63800],
        ['name' => 'Balaytigue',     'lat' => 14.04200, 'lng' => 120.62500],
        ['name' => 'Papaya',         'lat' => 14.06600, 'lng' => 120.65600],
        ['name' => 'Kayrilaw',       'lat' => 14.05000, 'lng' => 120.64800],
        ['name' => 'Looc',           'lat' => 14.08200, 'lng' => 120.61800],
        ['name' => 'Malapad na Bato','lat' => 14.04800, 'lng' => 120.59500],
        ['name' => 'Reparo',         'lat' => 14.07400, 'lng' => 120.64500],
        ['name' => 'Barangay 1',     'lat' => 14.07300, 'lng' => 120.63100],
        ['name' => 'Barangay 2',     'lat' => 14.07350, 'lng' => 120.63200],
        ['name' => 'Poblacion 5',    'lat' => 14.07550, 'lng' => 120.63450],
        ['name' => 'Poblacion 6',    'lat' => 14.07600, 'lng' => 120.63550],
        ['name' => 'Sitio Kanluran', 'lat' => 14.07100, 'lng' => 120.62200],
        ['name' => 'Sitio Silangan', 'lat' => 14.07200, 'lng' => 120.64800],
        ['name' => 'Bangan',         'lat' => 14.09800, 'lng' => 120.62500],
        ['name' => 'Butucan',        'lat' => 14.10400, 'lng' => 120.64800],
        ['name' => 'Mataas na Pulo', 'lat' => 14.11500, 'lng' => 120.63200],
        ['name' => 'Sinala',         'lat' => 14.09000, 'lng' => 120.64600],
        ['name' => 'Dalipit',        'lat' => 14.09500, 'lng' => 120.65200],
        ['name' => 'Bulihan',        'lat' => 14.10200, 'lng' => 120.65800],
        ['name' => 'Cahilog',        'lat' => 14.11800, 'lng' => 120.65000],
        ['name' => 'Carasuche',      'lat' => 14.06300, 'lng' => 120.62900],
        ['name' => 'Lugutan',        'lat' => 14.04500, 'lng' => 120.63200],
        ['name' => 'Parang',         'lat' => 14.08500, 'lng' => 120.66000],
        ['name' => 'Pook',           'lat' => 14.09200, 'lng' => 120.66200],
        ['name' => 'Dayap',          'lat' => 14.10800, 'lng' => 120.66500],
    ];

    private array $descriptions = [
        'critical' => [
            'Severe flooding — water over 1.5 meters. Multiple families stranded on rooftops. Immediate rescue needed.',
            'River overflowing, flash flood sweeping through barangay. Chest-level water inside homes. Emergency evacuation in progress.',
            'Storm surge combined with heavy rainfall. 30+ families at risk. Boats deployed for rescue.',
            'Critical water level — entire lower barangay evacuated. Covered court at capacity.',
            'Landslide debris blocking river causing rapid flooding. Water rising fast. SOS from 8 households.',
            'Flash flood warning! River breached embankment. Families trapped in second floors. Need immediate boat rescue.',
            'Extreme rainfall causing catastrophic flooding. Cars submerged. Power lines down. Mass evacuation ongoing.',
            'Bridge collapse reported due to flooding. Multiple barangays cut off. Aerial rescue requested.',
        ],
        'high' => [
            'Floodwater knee-deep and still rising. 5 families need evacuation assistance. Road to hospital cut off.',
            'Creek overflow detected. Preemptive evacuation for 10 families with elderly and children.',
            'Road flooding at main access road — waist-deep. Multiple vehicles stranded.',
            'Heavy flooding sa low-lying area. Residents moving belongings upstairs. Water entering homes.',
            'Bridge approach submerged. All traffic stopped. 3 families requesting boat rescue.',
            'Second wave of flooding during high tide. Coastal homes inundated.',
            'Drainage system overwhelmed. Entire street flooded knee-deep. Children cannot go to school.',
            'Farmland flooding threatens livestock. Farmers requesting immediate assistance for animal evacuation.',
            'Road cave-in due to water erosion. Vehicles at risk. DPWH requested for emergency repair.',
            'Fallen tree blocking drainage, causing rapid water buildup in residential area.',
        ],
        'moderate' => [
            'Ankle-to-knee deep flooding along main road. Passable for trucks but not motorcycles.',
            'Drainage overflow near school. Water pooling in parking area. Sandbags deployed.',
            'Creek level rising pero hindi pa umaapaw. Barangay tanods monitoring.',
            'Road flooding at usual low point. Alternate route available via national highway.',
            'Low-lying area flooding pero residents mas prepared na. Furniture elevated.',
            'Market area drainage clogged — knee-deep water sa gilid ng kalsada.',
            'Moderate flooding in interior streets. Water entered some homes ankle-deep.',
            'Puddles forming on school grounds. Classes suspended as precaution.',
            'Flood water from adjacent barangay slowly reaching our area. Monitoring situation.',
            'Overflowing canal near basketball court. Sandbag wall holding but needs reinforcement.',
            'Storm drain backup flooding parking lot of health center. Alternative access available.',
            'Creek water level at warning stage. Barangay monitoring and preparing for possible overflow.',
        ],
        'low' => [
            'Minor puddles on road near barangay hall. Not a hazard pero ni-report para ma-track.',
            'Light flooding sa gilid ng river. Hindi pumapasok sa bahay. Nag-subside within 2 hours.',
            'Hill runoff pooling near school. About 15cm, slowly draining. No risk to structures.',
            'Post-storm minor flooding. Water draining through cleared canal. Situation under control.',
            'Shallow road flooding. Self-resolved after rain stopped.',
            'Small drainage overflow. Cleared naturally by afternoon. No household impact.',
            'Gutter overflow on side street after heavy rain. Water less than ankle deep.',
            'Slight water accumulation in vacant lot. No threat to nearby homes.',
            'Road puddles making motorcycle travel difficult. Expected to clear by evening.',
            'Minor creek rise after upstream rain. Well within normal levels. Just reporting for records.',
        ],
    ];

    private array $rejectionReasons = [
        'Upon verification, water was from a burst pipe, not flooding. Referred to water utility.',
        'Report is a duplicate submission. Same location reported 10 minutes earlier.',
        'Photo is from a previous flood event. Image metadata shows wrong date.',
        'Location is outside Nasugbu municipality boundaries. Redirected to correct MDRRMO.',
        'Test submission — not a real flood report.',
        'Duplicate report — another resident already reported this area.',
        'Cannot verify — photo is too blurry to assess flood level.',
        'Report retracted by submitter — confirmed as non-emergency.',
    ];

    private array $duplicateNotes = [
        'Duplicate of earlier report from same barangay. Same flood event.',
        'Same incident already reported by another resident.',
        'Duplicate submission detected — matching location and time window.',
    ];

    private array $imageUrls = [
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=75',
        'https://images.unsplash.com/photo-1614091066517-e1e4b9a6d972?w=800&q=75',
        'https://images.unsplash.com/photo-1596394723269-e8e5b2571e6d?w=800&q=75',
        'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=75',
        'https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?w=800&q=75',
        'https://images.unsplash.com/photo-1515694346937-94d85e39c93a?w=800&q=75',
        'https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&q=75',
        'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=800&q=75',
        'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&q=75',
        'https://images.unsplash.com/photo-1504560715926-bfbb1f5e8e31?w=800&q=75',
        'https://images.unsplash.com/photo-1438449805896-28a666819356?w=800&q=75',
        'https://images.unsplash.com/photo-1541919329513-35f7af297129?w=800&q=75',
    ];

    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        if (! $admin) {
            $this->command->error('No admin found. Run DumpSeeder first.');
            return;
        }

        $residents  = User::where('role', 'resident')->get()->all();
        $teams      = Team::with('members')->get()->map(function ($team) {
            $team->responders = $team->members->all();
            return $team;
        })->all();
        $responders = collect($teams)->flatMap(fn ($t) => $t->responders)->values()->all();

        if (empty($residents) || empty($responders)) {
            $this->command->error('No residents or responders found. Run DumpSeeder first.');
            return;
        }

        $images = $this->downloadImages();
        $this->seedReports($residents, $teams, $responders, $admin, $images);

        $this->command->info('');
        $this->command->info('Done! ReportDumpSeeder complete.');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  IMAGES
    // ═══════════════════════════════════════════════════════════════════════════════

    private function downloadImages(): array
    {
        $downloaded = [];
        $this->command->info('Downloading report images...');
        Storage::disk('public')->makeDirectory('reports');

        foreach ($this->imageUrls as $idx => $url) {
            try {
                $resp = Http::timeout(15)->get($url);
                if ($resp->successful()) {
                    $downloaded[] = $resp->body();
                    $this->command->info('  Image ' . ($idx + 1) . '/' . count($this->imageUrls));
                }
            } catch (\Throwable) {
                $this->command->warn('  Image ' . ($idx + 1) . ' failed');
            }
        }

        if (empty($downloaded)) {
            $this->command->warn('Downloads failed — generating placeholders...');
            $downloaded = $this->generatePlaceholders(12);
        }
        return $downloaded;
    }

    private function generatePlaceholders(int $n): array
    {
        if (function_exists('imagecreatetruecolor')) {
            $imgs = [];
            $colors = [[80,120,60],[100,85,60],[70,100,130],[90,75,55],[60,90,70],[110,100,80]];
            for ($i = 0; $i < $n; $i++) {
                $img = imagecreatetruecolor(800, 600);
                $c = $colors[$i % count($colors)];
                for ($y = 0; $y < 600; $y++) {
                    $r = $y < 200 ? 160 - (int)($y * 0.4) : $c[0] + rand(-5,5);
                    $g = $y < 200 ? 165 - (int)($y * 0.4) : $c[1] + rand(-5,5);
                    $b = $y < 200 ? 175 - (int)($y * 0.3) : $c[2] + rand(-5,5);
                    $col = imagecolorallocate($img, max(0,min(255,$r)), max(0,min(255,$g)), max(0,min(255,$b)));
                    imageline($img, 0, $y, 799, $y, $col);
                }
                ob_start(); imagejpeg($img, null, 80); $imgs[] = ob_get_clean(); imagedestroy($img);
            }
            return $imgs;
        }

        $this->command->info('GD not available — using minimal JPEG placeholders...');
        $base64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsK'
                . 'CwsLDBAQDQ4RDAsLEBYQEREYFBUVFAwPFxgWEhcYFRX/2wBDAQMEBAUEBQkFBQkVDQsNFRUVFRUV'
                . 'FRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRX/wAARCAABAAEDASIA'
                . 'AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA'
                . 'AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3'
                . 'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm'
                . 'p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA'
                . 'AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx'
                . 'BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/RFhHRUYnJCk6OEk6Q0RFRUVG'
                . 'R0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKz'
                . 'tLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A'
                . '/VPxR4q0fwbpMmp61qFvpthF964upAiAnoBnqT2A5NZf/C7fh7/0Omg/+DKL/GvAf+CgfhTUfEv'
                . 'w+0O70+2e5i07VBPOEGSqGJlyfoWUV+c/wDwi+rf9A25/wC/Zr8J4r42x2S5r9Rw1GEoqKleTl1'
                . 'v0SXY/Y+HuCcHmmV/XMRWnFuTjaKj0t1bfc/W/8A4Xb8Pf8AodNB/wDBlF/jR/wu34e/9DpoP/gy'
                . 'i/xr8kf+EX1b/oG3P/fs0f8ACL6t/wBA25/79mvi/wDiIGa/8+Kf/kx9h/xDvK/+f9T/wAlP//Z';
        $jpgBytes = base64_decode($base64);
        return array_fill(0, $n, $jpgBytes);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  600 REPORTS
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedReports(array $residents, array $teams, array $responders, User $admin, array $images): void
    {
        // ── Distribution targets ──
        // Status: resolved 540, rejected 60 (45 dup + 15 invalid) = 600
        // Severity: low 210, moderate 210, high 120, critical 60
        // Avg response time (created_at → resolved_at): ~20-30 min

        $total     = 600;
        $now       = Carbon::now();
        $startDate = $now->copy()->subMonths(6);

        // 3 typhoon spike days (~80 reports each = 240), 360 across remaining days
        $typhoonDays = [
            $startDate->copy()->addDays(42),
            $startDate->copy()->addDays(98),
            $startDate->copy()->addDays(155),
        ];

        $severityPool = array_merge(
            array_fill(0, 210, 'low'),
            array_fill(0, 210, 'moderate'),
            array_fill(0, 120, 'high'),
            array_fill(0, 60, 'critical'),
        );
        shuffle($severityPool);

        $statusPool = array_merge(
            array_fill(0, 45, 'rejected_dup'),
            array_fill(0, 15, 'rejected_invalid'),
            array_fill(0, 540, 'resolved'),
        );
        shuffle($statusPool);

        $channelPool = array_merge(
            array_fill(0, 450, 'app'),
            array_fill(0, 150, 'messenger'),
        );
        shuffle($channelPool);

        // Generate timestamps
        $dates = [];
        foreach ($typhoonDays as $day) {
            for ($i = 0; $i < 80; $i++) {
                $dates[] = $day->copy()->addMinutes(rand(0, 1439));
            }
        }
        $totalDays = (int) $startDate->diffInDays($now);
        for ($i = 0; $i < 360; $i++) {
            $attempts = 0;
            do {
                $dayOff = rand(0, $totalDays);
                $dt = $startDate->copy()->addDays($dayOff)->addMinutes(rand(360, 1320));
                $isTyphoon = false;
                foreach ($typhoonDays as $td) {
                    if (abs($dt->diffInDays($td)) <= 1) { $isTyphoon = true; break; }
                }
                $attempts++;
            } while ($isTyphoon && $attempts < 20);
            $dates[] = $dt;
        }
        shuffle($dates);
        usort($dates, fn ($a, $b) => $a->timestamp <=> $b->timestamp);

        $residentCount  = count($residents);
        $responderCount = count($responders);
        $teamCount      = count($teams);
        $imageCount     = count($images);
        $mediaCreated   = 0;
        $notifCount     = 0;
        $responderAssignCount = 0;
        $statusHistoryCount = 0;
        $responderIdx   = 0;
        $createdReportIds = [];

        for ($idx = 0; $idx < $total; $idx++) {
            $severity  = $severityPool[$idx];
            $rawStatus = $statusPool[$idx];
            $channel   = $channelPool[$idx];
            $createdAt = $dates[$idx];

            $isDupReject = $rawStatus === 'rejected_dup';
            $isReject    = $isDupReject || $rawStatus === 'rejected_invalid';
            $finalStatus = $isReject ? 'rejected' : $rawStatus;
            $reportStatus = $finalStatus; // only 'resolved' or 'rejected'

            // Location: 60% flood-prone, 40% other
            $brgy = $idx < 360
                ? $this->barangays[rand(0, 9)]
                : $this->barangays[rand(10, 41)];
            $lat = $brgy['lat'] + (rand(-60, 60) / 100000);
            $lng = $brgy['lng'] + (rand(-60, 60) / 100000);

            $resident = $residents[$idx % $residentCount];

            $desc = $isReject
                ? ($isDupReject
                    ? $this->duplicateNotes[array_rand($this->duplicateNotes)]
                    : $this->rejectionReasons[array_rand($this->rejectionReasons)])
                : $this->descriptions[$severity][array_rand($this->descriptions[$severity])];

            $speedFactor = match ($severity) {
                'critical' => 0.5, 'high' => 0.7, 'moderate' => 1.0, 'low' => 1.3,
            };

            $verifiedAt = null;
            $assignedAt = null;
            $enRouteAt  = null;
            $onSceneAt  = null;
            $resolvedAt = null;
            $assignedTeam = null;
            $assignedResponder = null;

            // Submitted → Verified/Rejected: 3-5 min
            $verifiedAt = $createdAt->copy()->addMinutes((int)(rand(3, 5) * $speedFactor));

            if ($finalStatus === 'resolved') {
                $assignedAt = $verifiedAt->copy()->addMinutes((int)(rand(2, 4) * $speedFactor));
                $teamIdx = $responderIdx % $teamCount;
                $assignedTeam = $teams[$teamIdx];
                $assignedResponder = $responders[$responderIdx % $responderCount];
                $responderIdx++;

                $enRouteAt  = $assignedAt->copy()->addMinutes((int)(rand(2, 3) * $speedFactor));
                $onSceneAt  = $enRouteAt->copy()->addMinutes((int)(rand(5, 8) * $speedFactor));
                $resolvedAt = $onSceneAt->copy()->addMinutes((int)(rand(8, 12) * $speedFactor));
            }

            $depthFt = match ($severity) {
                'low'      => round(rand(3, 10) / 10, 1),
                'moderate' => round(rand(10, 25) / 10, 1),
                'high'     => round(rand(25, 40) / 10, 1),
                'critical' => round(rand(40, 54) / 10, 1),
            };

            $potentialDupOf = null;
            if ($isDupReject && count($createdReportIds) > 5) {
                $potentialDupOf = $createdReportIds[array_rand($createdReportIds)];
            }

            $report = Report::create([
                'user_id'               => $resident->id,
                'reference_number'      => 'FT-' . strtoupper(Str::random(8)),
                'severity'              => $severity,
                'depth_ft'              => $depthFt,
                'status'                => $reportStatus,
                'source'                => $channel,
                'messenger_sender_name' => $channel === 'messenger' ? $resident->name : null,
                'description'           => $desc,
                'latitude'              => $lat,
                'longitude'             => $lng,
                'address'               => "Brgy. {$brgy['name']}, Nasugbu, Batangas",
                'assigned_to'           => $assignedResponder?->id,
                'assigned_team_id'      => $assignedTeam?->id,
                'verified_by'           => $verifiedAt ? $admin->id : null,
                'verified_at'           => $verifiedAt,
                'assigned_at'           => $assignedAt,
                'resolved_at'           => $resolvedAt,
                'potential_duplicate_of' => $potentialDupOf,
                'created_at'            => $createdAt,
                'updated_at'            => $resolvedAt ?? $verifiedAt ?? $createdAt,
            ]);

            $createdReportIds[] = $report->id;

            $statusHistoryCount += $this->seedStatusHistory(
                $report, $finalStatus, $admin, $assignedResponder,
                $createdAt, $verifiedAt, $assignedAt, $enRouteAt, $onSceneAt, $resolvedAt
            );

            $this->seedSla($report, $severity, $createdAt, $verifiedAt, $assignedAt, $resolvedAt);

            if ($assignedResponder && $finalStatus === 'resolved') {
                ReportResponder::firstOrCreate(
                    ['report_id' => $report->id, 'user_id' => $assignedResponder->id],
                    [
                        'role'        => 'lead',
                        'status'      => 'resolved',
                        'en_route_at' => $enRouteAt,
                        'on_scene_at' => $onSceneAt,
                        'resolved_at' => $resolvedAt,
                    ]
                );
                $responderAssignCount++;

                if ($severity === 'critical') {
                    $secondResp = $responders[($responderIdx) % $responderCount];
                    if ($secondResp->id !== $assignedResponder->id) {
                        ReportResponder::firstOrCreate(
                            ['report_id' => $report->id, 'user_id' => $secondResp->id],
                            [
                                'role'        => 'support',
                                'status'      => 'resolved',
                                'en_route_at' => $enRouteAt->copy()->addMinutes(rand(1, 3)),
                                'on_scene_at' => $onSceneAt->copy()->addMinutes(rand(1, 3)),
                                'resolved_at' => $resolvedAt,
                            ]
                        );
                        $responderAssignCount++;
                    }
                }
            }

            if (!$isReject && $imageCount > 0 && rand(1, 100) <= 70) {
                $numMedia = match ($severity) {
                    'critical' => rand(2, 3), 'high' => rand(1, 3),
                    'moderate' => rand(1, 2), 'low'  => 1,
                };
                $dir = 'reports/' . $report->id;
                Storage::disk('public')->makeDirectory($dir);

                for ($j = 0; $j < $numMedia; $j++) {
                    $imgData  = $images[($report->id + $j) % $imageCount];
                    $filename = "flood-evidence-" . ($j + 1) . ".jpg";
                    $path     = "$dir/$filename";
                    Storage::disk('public')->put($path, $imgData);
                    ReportMedia::create([
                        'report_id' => $report->id, 'file_path' => $path,
                        'file_type' => 'image', 'file_size' => strlen($imgData),
                        'created_at' => $createdAt, 'updated_at' => $createdAt,
                    ]);
                    $mediaCreated++;
                }
            }

            $notifCount += $this->seedNotifications(
                $report, $finalStatus, $resident, $assignedResponder, $admin,
                $createdAt, $verifiedAt, $assignedAt, $resolvedAt, $severity
            );

            if ($idx > 0 && $idx % 100 === 0) {
                $this->command->info("  ... {$idx}/{$total} reports");
            }
        }

        $this->command->info("Seeded {$total} reports, {$mediaCreated} media files.");
        $this->command->info("  Status history rows: {$statusHistoryCount}");
        $this->command->info("  Responder assignments: {$responderAssignCount}");
        $this->command->info("  Notifications: {$notifCount}");
    }

    private function seedStatusHistory(
        Report $report, string $finalStatus, User $admin, ?User $responder,
        Carbon $created, ?Carbon $verified, ?Carbon $assigned,
        ?Carbon $enRoute, ?Carbon $onScene, ?Carbon $resolved
    ): int {
        $rows = 0;

        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $report->user_id,
            'status' => 'pending', 'notes' => 'Report submitted via ' . $report->source . '.',
            'created_at' => $created, 'updated_at' => $created,
        ]);
        $rows++;

        if ($finalStatus === 'rejected') {
            ReportStatusUpdate::create([
                'report_id' => $report->id, 'user_id' => $admin->id,
                'status' => 'rejected',
                'notes' => $report->potential_duplicate_of
                    ? 'Duplicate report rejected.'
                    : 'Report does not meet verification criteria.',
                'created_at' => $verified, 'updated_at' => $verified,
            ]);
            return $rows + 1;
        }

        $teamName = $report->assignedTeam?->name ?? 'response team';

        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $admin->id,
            'status' => 'verified', 'notes' => 'Report verified by MDRRMO admin.',
            'created_at' => $verified, 'updated_at' => $verified,
        ]);
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $admin->id,
            'status' => 'assigned', 'notes' => "Assigned to {$teamName}.",
            'created_at' => $assigned, 'updated_at' => $assigned,
        ]);
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $responder?->id,
            'status' => 'en_route', 'notes' => 'Responder en route to location.',
            'created_at' => $enRoute, 'updated_at' => $enRoute,
        ]);
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $responder?->id,
            'status' => 'on_scene', 'notes' => 'Responder arrived on scene. Assessing situation.',
            'created_at' => $onScene, 'updated_at' => $onScene,
        ]);
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $responder?->id ?? $admin->id,
            'status' => 'resolved',
            'notes' => 'Situation resolved. Floodwater receded and affected residents assisted.',
            'created_at' => $resolved, 'updated_at' => $resolved,
        ]);

        return $rows + 5;
    }

    private function seedSla(
        Report $report, string $severity, Carbon $created,
        ?Carbon $verified, ?Carbon $assigned, ?Carbon $resolved
    ): void {
        $stages = [
            ['stage' => 'pending_to_verified',  'start' => $created,  'end' => $verified],
            ['stage' => 'verified_to_assigned',  'start' => $verified, 'end' => $assigned],
            ['stage' => 'assigned_to_resolved',  'start' => $assigned, 'end' => $resolved],
        ];

        foreach ($stages as $s) {
            if (!$s['start']) continue;
            $config = ReportSlaConfig::where('severity', $severity)->where('stage', $s['stage'])->first();
            if (!$config) continue;

            $elapsed = $s['end'] ? round($s['start']->diffInMinutes($s['end']), 1) : null;
            $slaStatus = 'on_track';
            if ($elapsed !== null) {
                if ($elapsed > $config->threshold_minutes * ($config->critical_pct / 100)) $slaStatus = 'breached';
                elseif ($elapsed > $config->threshold_minutes * ($config->warning_pct / 100)) $slaStatus = 'at_risk';
                else $slaStatus = 'met';
            }

            ReportSlaTracking::create([
                'report_id'         => $report->id,
                'stage'             => $s['stage'],
                'started_at'        => $s['start'],
                'threshold_minutes' => $config->threshold_minutes,
                'completed_at'      => $s['end'],
                'elapsed_minutes'   => $elapsed,
                'sla_status'        => $slaStatus,
                'escalation_level'  => 0,
                'created_at'        => $s['start'],
                'updated_at'        => $s['end'] ?? $s['start'],
            ]);
        }
    }

    private function seedNotifications(
        Report $report, string $finalStatus, User $resident, ?User $responder,
        User $admin, Carbon $created, ?Carbon $verified, ?Carbon $assigned,
        ?Carbon $resolved, string $severity
    ): int {
        $count = 0;
        $ref = $report->reference_number;

        $insert = function (User $user, string $title, string $body, Carbon $at) use (&$count) {
            DB::table('notifications')->insert([
                'id'              => Str::uuid()->toString(),
                'type'            => 'App\\Notifications\\ReportStatusChanged',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id'   => $user->id,
                'data'            => json_encode(['title' => $title, 'body' => $body]),
                'read_at'         => rand(0, 1) ? $at->copy()->addMinutes(rand(1, 60)) : null,
                'created_at'      => $at,
                'updated_at'      => $at,
            ]);
            $count++;
        };

        $statusChanges = [];
        if ($verified) {
            $statusChanges[] = ['Verified', "Your report ({$ref}) has been verified.", $verified];
        }
        if ($finalStatus === 'rejected') {
            $statusChanges[] = ['Rejected', "Your report ({$ref}) has been rejected.", $verified];
        }
        if ($assigned) {
            $statusChanges[] = ['Assigned', "A team has been assigned to your report ({$ref}).", $assigned];
        }
        if ($finalStatus === 'resolved' && $resolved) {
            $statusChanges[] = ['Resolved', "Your report ({$ref}) has been resolved.", $resolved];
        }
        foreach ($statusChanges as [$title, $body, $at]) {
            $insert($resident, $title, $body, $at);
        }

        if ($responder && $assigned) {
            $insert($responder, 'New Assignment', "You have been assigned to report {$ref}.", $assigned);
        }

        if ($severity === 'critical') {
            $insert($admin, 'Critical Report', "Critical flood report submitted: {$ref}.", $created);
        }

        return $count;
    }
}
