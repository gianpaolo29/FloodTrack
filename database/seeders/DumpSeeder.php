<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\EvacuationCenter;
use App\Models\Hazard;
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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * DumpSeeder — comprehensive demo data
 *
 * • 100 reports (95% verified, ~88% resolved)
 * • Images attached to ~60% of reports
 * • 10 announcements/alerts
 * • 5 hazards
 * • 0 evacuation occupancy
 */
class DumpSeeder extends Seeder
{
    /* ── Barangay locations in Nasugbu ── */
    private array $locations = [
        ['name' => 'Pantalan',          'lat' => 14.08570, 'lng' => 120.62960],
        ['name' => 'Bucana',            'lat' => 14.08060, 'lng' => 120.62430],
        ['name' => 'Wawa',              'lat' => 14.07250, 'lng' => 120.62790],
        ['name' => 'Bilaran',           'lat' => 14.06840, 'lng' => 120.63560],
        ['name' => 'Lumbangan',         'lat' => 14.06160, 'lng' => 120.64020],
        ['name' => 'Kaylaway',          'lat' => 14.05790, 'lng' => 120.64120],
        ['name' => 'Poblacion 3',       'lat' => 14.07690, 'lng' => 120.63390],
        ['name' => 'Poblacion 4',       'lat' => 14.07640, 'lng' => 120.63260],
        ['name' => 'Putat',             'lat' => 14.07900, 'lng' => 120.65280],
        ['name' => 'Latag',             'lat' => 14.10050, 'lng' => 120.63050],
        ['name' => 'Calayo',            'lat' => 14.05400, 'lng' => 120.60800],
        ['name' => 'Natipuan',          'lat' => 14.04700, 'lng' => 120.61200],
    ];

    private array $descriptions = [
        'critical' => [
            'Severe flooding — water over 1.5 meters. Multiple families stranded on rooftops. Immediate rescue needed. MDRRMO alerted via FloodTrack.',
            'River overflowing, flash flood sweeping through barangay. Chest-level water inside homes. Emergency evacuation in progress.',
            'Storm surge combined with heavy rainfall. 30+ families at risk. Boats deployed for rescue. Bridge submerged.',
            'Critical water level — entire lower barangay evacuated. Covered court at capacity. Mass evacuation underway.',
            'Landslide debris blocking river causing rapid flooding. Water rising fast. SOS from 8 households near the riverbank.',
        ],
        'high' => [
            'Floodwater knee-deep and still rising. 5 families need evacuation assistance. Road to hospital cut off.',
            'Creek overflow detected. Preemptive evacuation for 10 families with elderly and children. BRT responding.',
            'Road flooding at main access road — waist-deep. Multiple vehicles stranded. Requesting rescue support.',
            'Heavy flooding sa low-lying area. Residents moving belongings upstairs. Water entering homes.',
            'Bridge approach submerged. All traffic stopped. 3 families requesting boat rescue. MDRRMO verified in 10 minutes.',
            'Second wave of flooding during high tide. Coastal homes inundated. Rescue team on standby.',
        ],
        'moderate' => [
            'Ankle-to-knee deep flooding along main road. Passable for trucks but not motorcycles. Monitoring in progress.',
            'Drainage overflow near school. Water pooling in parking area. Sandbags deployed by barangay volunteers.',
            'Creek level rising pero hindi pa umaapaw. Barangay tanods monitoring. Residents on standby for evacuation.',
            'Road flooding at usual low point. Alternate route available via national highway. Warning signs posted.',
            'Low-lying area flooding pero residents mas prepared na. Furniture elevated. 2 elderly assisted to evacuation.',
            'Market area drainage clogged — knee-deep water sa gilid ng kalsada. Municipal pumps requested.',
            'Moderate flooding in interior streets. Water entered some homes ankle-deep. Residents cleaning up.',
        ],
        'low' => [
            'Minor puddles on road near barangay hall. Not a hazard pero ni-report para ma-track.',
            'Light flooding sa gilid ng river. Hindi pumapasok sa bahay. Nag-subside within 2 hours.',
            'Hill runoff pooling near school. About 15cm, slowly draining. No risk to structures.',
            'Post-storm minor flooding. Water draining through cleared canal. Situation under control.',
            'Shallow road flooding. Self-resolved after rain stopped. Residents used FloodTrack to confirm receding.',
            'Small drainage overflow. Cleared naturally by afternoon. No household impact.',
        ],
    ];

    private array $rejectionReasons = [
        'Upon verification, water was from a burst pipe, not flooding. Referred to water utility.',
        'Report is a duplicate submission. Same location reported 10 minutes earlier.',
        'Photo is from a previous flood event. Image metadata shows wrong date.',
        'Location is outside Nasugbu municipality boundaries. Redirected to correct MDRRMO.',
        'Test submission — not a real flood report. User was testing the app.',
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
        $this->call(EvacuationCenterSeeder::class);
        $this->call(ProtocolSeeder::class);

        $admin     = $this->seedAdmin();
        $residents = $this->seedResidents();
        $teams     = $this->seedTeams($admin);
        $images    = $this->downloadImages();
        $this->seedReports($residents, $teams, $admin, $images);
        $this->seedHazards($admin);
        $this->seedAlerts($admin);
        $this->resetEvacuationOccupancy();

        $this->command->info('');
        $this->command->info('✅ DumpSeeder complete!');
    }

    // ─── Admin ───────────────────────────────────────────────────────────────────

    private function seedAdmin(): User
    {
        return User::firstOrCreate(
            ['email' => 'admin@floodtrack.com'],
            [
                'name'              => 'Admin',
                'password'          => bcrypt('password123'),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]
        );
    }

    // ─── Residents ───────────────────────────────────────────────────────────────

    private function seedResidents(): array
    {
        $data = [
            ['name' => 'Maria Santos',       'email' => 'maria.santos@gmail.com'],
            ['name' => 'Jose Reyes',          'email' => 'jose.reyes@gmail.com'],
            ['name' => 'Ana Dela Cruz',       'email' => 'ana.delacruz@gmail.com'],
            ['name' => 'Ramon Garcia',        'email' => 'ramon.garcia@gmail.com'],
            ['name' => 'Liza Fernandez',      'email' => 'liza.fernandez@gmail.com'],
            ['name' => 'Roberto Mendoza',     'email' => 'roberto.mendoza@gmail.com'],
            ['name' => 'Cristina Bautista',   'email' => 'cristina.bautista@gmail.com'],
            ['name' => 'Eduardo Villanueva',  'email' => 'eduardo.villanueva@gmail.com'],
            ['name' => 'Rosalinda Aquino',    'email' => 'rosalinda.aquino@gmail.com'],
            ['name' => 'Fernando Pascual',    'email' => 'fernando.pascual@gmail.com'],
            ['name' => 'Gloria Navarro',      'email' => 'gloria.navarro@gmail.com'],
            ['name' => 'Antonio Ramos',       'email' => 'antonio.ramos@gmail.com'],
            ['name' => 'Maricel Dizon',       'email' => 'maricel.dizon@gmail.com'],
            ['name' => 'Ricardo Soriano',     'email' => 'ricardo.soriano@gmail.com'],
            ['name' => 'Jeanette Ocampo',     'email' => 'jeanette.ocampo@gmail.com'],
            ['name' => 'Leoncia Castillo',    'email' => 'leoncia.castillo@gmail.com'],
            ['name' => 'Danilo Padilla',      'email' => 'danilo.padilla@gmail.com'],
            ['name' => 'Angelica Magno',      'email' => 'angelica.magno@gmail.com'],
            ['name' => 'Benjamin Tolentino',  'email' => 'benjamin.tolentino@gmail.com'],
            ['name' => 'Carmelita Flores',    'email' => 'carmelita.flores@gmail.com'],
        ];

        return array_map(fn ($d) => User::firstOrCreate(
            ['email' => $d['email']],
            array_merge($d, [
                'password'          => bcrypt('password123'),
                'role'              => 'resident',
                'email_verified_at' => now(),
            ])
        ), $data);
    }

    // ─── Teams ───────────────────────────────────────────────────────────────────

    private function seedTeams(User $admin): array
    {
        $teamData = [
            ['name' => 'MDRRMO Rescue Unit 1', 'active' => true, 'members' => [
                ['name' => 'Carlos Mendoza',     'email' => 'carlos.mendoza@floodtrack.com'],
                ['name' => 'Diana Ramos',        'email' => 'diana.ramos@floodtrack.com'],
                ['name' => 'Eduardo Torres',     'email' => 'eduardo.torres@floodtrack.com'],
                ['name' => 'Felicia Cruz',       'email' => 'felicia.cruz@floodtrack.com'],
                ['name' => 'Gregorio Lim',       'email' => 'gregorio.lim@floodtrack.com'],
            ]],
            ['name' => 'MDRRMO Rescue Unit 2', 'active' => true, 'members' => [
                ['name' => 'Herminia Bautista',  'email' => 'herminia.bautista@floodtrack.com'],
                ['name' => 'Ignacio Villanueva', 'email' => 'ignacio.villanueva@floodtrack.com'],
                ['name' => 'Jasmine Aquino',     'email' => 'jasmine.aquino@floodtrack.com'],
                ['name' => 'Kevin Pascual',      'email' => 'kevin.pascual@floodtrack.com'],
                ['name' => 'Lorraine Navarro',   'email' => 'lorraine.navarro@floodtrack.com'],
            ]],
            ['name' => 'Pantalan BRT', 'active' => true, 'members' => [
                ['name' => 'Manuel Dizon',       'email' => 'manuel.dizon@floodtrack.com'],
                ['name' => 'Nilda Ocampo',       'email' => 'nilda.ocampo@floodtrack.com'],
                ['name' => 'Orlando Macaraeg',   'email' => 'orlando.macaraeg@floodtrack.com'],
                ['name' => 'Patricia Soriano',   'email' => 'patricia.soriano@floodtrack.com'],
                ['name' => 'Quirino Abella',     'email' => 'quirino.abella@floodtrack.com'],
            ]],
            ['name' => 'Bucana-Wawa BRT', 'active' => true, 'members' => [
                ['name' => 'Rosario Castillo',   'email' => 'rosario.castillo@floodtrack.com'],
                ['name' => 'Salvador Dela Rosa', 'email' => 'salvador.delarosa@floodtrack.com'],
                ['name' => 'Teresita Aguilar',   'email' => 'teresita.aguilar@floodtrack.com'],
                ['name' => 'Uldarico Espinosa',  'email' => 'uldarico.espinosa@floodtrack.com'],
                ['name' => 'Violeta Morales',    'email' => 'violeta.morales@floodtrack.com'],
            ]],
            ['name' => 'Poblacion BRT', 'active' => true, 'members' => [
                ['name' => 'Wilfredo Perez',     'email' => 'wilfredo.perez@floodtrack.com'],
                ['name' => 'Xyza Hernandez',     'email' => 'xyza.hernandez@floodtrack.com'],
                ['name' => 'Yolanda Buenaventura','email' => 'yolanda.buenaventura@floodtrack.com'],
                ['name' => 'Zosimo Laurel',      'email' => 'zosimo.laurel@floodtrack.com'],
                ['name' => 'Angelica Domingo',   'email' => 'angelica.domingo@floodtrack.com'],
            ]],
        ];

        $teams = [];
        foreach ($teamData as $td) {
            $users = [];
            foreach ($td['members'] as $m) {
                $users[] = User::firstOrCreate(
                    ['email' => $m['email']],
                    array_merge($m, [
                        'password'          => bcrypt('password123'),
                        'role'              => 'responder',
                        'email_verified_at' => now(),
                    ])
                );
            }
            $team = Team::firstOrCreate(
                ['name' => $td['name']],
                ['leader_id' => $users[0]->id, 'is_active' => $td['active']]
            );
            foreach ($users as $u) $u->update(['team_id' => $team->id]);
            $team->responders = $users;
            $teams[] = $team;
        }
        $this->command->info('✓ Seeded 5 teams with 25 responders.');
        return $teams;
    }

    // ─── Download images ─────────────────────────────────────────────────────────

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
                    $this->command->info('  ✓ Image ' . ($idx + 1) . '/' . count($this->imageUrls));
                }
            } catch (\Throwable) {
                $this->command->warn('  ✗ Image ' . ($idx + 1) . ' failed');
            }
        }

        if (empty($downloaded)) {
            $this->command->warn('Downloads failed — generating GD placeholders...');
            $downloaded = $this->generatePlaceholders(12);
        }

        return $downloaded;
    }

    private function generatePlaceholders(int $n): array
    {
        if (!function_exists('imagecreatetruecolor')) return [];
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

    // ─── 100 Reports ─────────────────────────────────────────────────────────────

    private function seedReports(array $residents, array $teams, User $admin, array $images): void
    {
        $totalReports    = 100;
        $rejectedCount   = 5;    // 5 rejected (95% verification rate)
        $resolvedCount   = 83;   // 83 resolved (high resolution rate)
        $assignedCount   = 5;    // 5 currently assigned (active)
        $verifiedCount   = 2;    // 2 verified but not yet assigned
        $pendingCount    = 5;    // 5 pending (recent submissions)
        // Total: 5 + 83 + 5 + 2 + 5 = 100

        $severityDist = ['critical' => 12, 'high' => 25, 'moderate' => 38, 'low' => 25];

        // Build the 100 report definitions
        $reportDefs  = [];
        $baseDate    = Carbon::parse('2026-07-15 06:00:00');
        $reportIndex = 0;

        foreach ($severityDist as $severity => $count) {
            for ($i = 0; $i < $count; $i++) {
                // Spread reports over ~80 days
                $dayOffset = (int)(($reportIndex / $totalReports) * 80);
                $createdAt = $baseDate->copy()
                    ->addDays($dayOffset)
                    ->addHours(rand(0, 23))
                    ->addMinutes(rand(0, 59));

                $loc = $this->locations[$reportIndex % count($this->locations)];
                $lat = $loc['lat'] + (rand(-50, 50) / 100000);
                $lng = $loc['lng'] + (rand(-50, 50) / 100000);

                // Determine status
                if ($reportIndex < $rejectedCount) {
                    $status = 'rejected';
                } elseif ($reportIndex < $rejectedCount + $resolvedCount) {
                    $status = 'resolved';
                } elseif ($reportIndex < $rejectedCount + $resolvedCount + $assignedCount) {
                    $status = 'assigned';
                } elseif ($reportIndex < $rejectedCount + $resolvedCount + $assignedCount + $verifiedCount) {
                    $status = 'verified';
                } else {
                    $status = 'pending';
                }

                // Assign team for resolved/assigned reports
                $teamIdx = null;
                if (in_array($status, ['resolved', 'assigned'])) {
                    $teamIdx = $reportIndex % count($teams);
                }

                $desc = $status === 'rejected'
                    ? $this->rejectionReasons[$reportIndex % count($this->rejectionReasons)]
                    : $this->descriptions[$severity][array_rand($this->descriptions[$severity])];

                $reportDefs[] = [
                    'severity'  => $severity,
                    'status'    => $status,
                    'desc'      => $desc,
                    'lat'       => $lat,
                    'lng'       => $lng,
                    'address'   => "Brgy. {$loc['name']}, Nasugbu, Batangas",
                    'date'      => $createdAt,
                    'team_idx'  => $teamIdx,
                ];

                $reportIndex++;
            }
        }

        // Shuffle so statuses and severities are mixed chronologically
        shuffle($reportDefs);
        // Re-sort by date
        usort($reportDefs, fn ($a, $b) => $a['date']->timestamp <=> $b['date']->timestamp);

        $residentCount = count($residents);
        $imageCount    = count($images);
        $mediaCreated  = 0;

        foreach ($reportDefs as $i => $r) {
            $resident  = $residents[$i % $residentCount];
            $team      = $r['team_idx'] !== null ? $teams[$r['team_idx']] : null;
            $responder = $team ? ($team->responders[0] ?? null) : null;

            $createdAt  = $r['date'];
            $verifiedAt = in_array($r['status'], ['verified', 'assigned', 'resolved', 'rejected'])
                ? $createdAt->copy()->addMinutes(rand(5, 15))
                : null;
            $assignedAt = in_array($r['status'], ['assigned', 'resolved']) && $team
                ? ($verifiedAt ?? $createdAt)->copy()->addMinutes(rand(3, 10))
                : null;
            $resolvedAt = $r['status'] === 'resolved'
                ? ($assignedAt ?? $createdAt)->copy()->addMinutes(rand(15, 90))
                : null;

            $report = Report::create([
                'user_id'              => $resident->id,
                'severity'             => $r['severity'],
                'status'               => $r['status'],
                'description'          => $r['desc'],
                'latitude'             => $r['lat'],
                'longitude'            => $r['lng'],
                'address'              => $r['address'],
                'source'               => $i < 70 ? 'mobile' : 'messenger',
                'messenger_sender_name'=> $i >= 70 ? $resident->name : null,
                'assigned_to'          => $responder?->id,
                'assigned_team_id'     => $team?->id,
                'verified_by'          => $verifiedAt ? $admin->id : null,
                'verified_at'          => $verifiedAt,
                'assigned_at'          => $assignedAt,
                'resolved_at'          => $resolvedAt,
                'created_at'           => $createdAt,
                'updated_at'           => $resolvedAt ?? $assignedAt ?? $verifiedAt ?? $createdAt,
            ]);

            // Status history
            $this->seedStatusHistory($report, $r['status'], $admin, $responder, $createdAt, $verifiedAt, $assignedAt, $resolvedAt);
            $this->seedSla($report, $r['severity'], $createdAt, $verifiedAt, $assignedAt, $resolvedAt);

            // Responder pivot for assigned/resolved
            if ($team && $responder && in_array($r['status'], ['assigned', 'resolved'])) {
                ReportResponder::firstOrCreate(
                    ['report_id' => $report->id, 'user_id' => $responder->id],
                    ['status' => $r['status'] === 'resolved' ? 'resolved' : 'pending']
                );
            }

            // Attach images to ~60% of non-rejected reports
            if ($r['status'] !== 'rejected' && $imageCount > 0 && $i % 5 < 3) {
                $numImages = match ($r['severity']) {
                    'critical' => 3,
                    'high'     => rand(2, 3),
                    'moderate' => rand(1, 2),
                    default    => 1,
                };
                $dir = 'reports/' . $report->id;
                Storage::disk('public')->makeDirectory($dir);

                for ($j = 0; $j < $numImages; $j++) {
                    $imgData  = $images[($report->id + $j) % $imageCount];
                    $filename = "flood-evidence-" . ($j + 1) . ".jpg";
                    $path     = "$dir/$filename";
                    Storage::disk('public')->put($path, $imgData);
                    ReportMedia::create([
                        'report_id' => $report->id,
                        'file_path' => $path,
                        'file_type' => 'image',
                        'file_size' => strlen($imgData),
                    ]);
                    $mediaCreated++;
                }
            }
        }

        $this->command->info("✓ Seeded 100 reports with {$mediaCreated} images.");
        $this->command->info("  → 95 verified (95%), 83 resolved, 5 assigned, 2 verified, 5 pending, 5 rejected");
    }

    private function seedStatusHistory(
        Report $report, string $finalStatus, User $admin,
        ?User $responder, Carbon $created, ?Carbon $verified, ?Carbon $assigned, ?Carbon $resolved
    ): void {
        // Pending
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $report->user_id,
            'status' => 'pending', 'notes' => 'Report submitted.',
            'created_at' => $created, 'updated_at' => $created,
        ]);

        if ($verified && in_array($finalStatus, ['verified','assigned','resolved','rejected'])) {
            $st = $finalStatus === 'rejected' ? 'rejected' : 'verified';
            ReportStatusUpdate::create([
                'report_id' => $report->id, 'user_id' => $admin->id,
                'status' => $st,
                'notes' => $st === 'rejected' ? 'Report does not meet verification criteria.' : 'Report verified by admin.',
                'created_at' => $verified, 'updated_at' => $verified,
            ]);
        }

        if ($assigned && in_array($finalStatus, ['assigned','resolved'])) {
            $teamName = $report->assignedTeam?->name ?? 'response team';
            ReportStatusUpdate::create([
                'report_id' => $report->id, 'user_id' => $admin->id,
                'status' => 'assigned',
                'notes' => "Assigned to team \"{$teamName}\".",
                'created_at' => $assigned, 'updated_at' => $assigned,
            ]);
        }

        if ($resolved && $finalStatus === 'resolved') {
            ReportStatusUpdate::create([
                'report_id' => $report->id, 'user_id' => $responder?->id ?? $admin->id,
                'status' => 'resolved',
                'notes' => 'Situation resolved. Floodwater receded and affected residents assisted.',
                'created_at' => $resolved, 'updated_at' => $resolved,
            ]);
        }
    }

    private function seedSla(
        Report $report, string $severity, Carbon $created,
        ?Carbon $verified, ?Carbon $assigned, ?Carbon $resolved
    ): void {
        $stages = [
            ['stage' => 'pending_to_verified', 'start' => $created,  'end' => $verified],
            ['stage' => 'verified_to_assigned', 'start' => $verified, 'end' => $assigned],
            ['stage' => 'assigned_to_resolved', 'start' => $assigned, 'end' => $resolved],
        ];

        foreach ($stages as $s) {
            if (!$s['start']) continue;
            $config = ReportSlaConfig::where('severity', $severity)->where('stage', $s['stage'])->first();
            if (!$config) continue;

            $elapsed = $s['end'] ? $s['start']->diffInMinutes($s['end']) : null;
            $slaStatus = 'on_track';
            if ($elapsed !== null) {
                if ($elapsed > $config->threshold_minutes * ($config->critical_pct / 100)) $slaStatus = 'breached';
                elseif ($elapsed > $config->threshold_minutes * ($config->warning_pct / 100)) $slaStatus = 'at_risk';
                else $slaStatus = 'met';
            }

            ReportSlaTracking::create([
                'report_id' => $report->id, 'stage' => $s['stage'],
                'started_at' => $s['start'], 'threshold_minutes' => $config->threshold_minutes,
                'completed_at' => $s['end'], 'elapsed_minutes' => $elapsed,
                'sla_status' => $slaStatus, 'escalation_level' => 0,
                'created_at' => $s['start'], 'updated_at' => $s['end'] ?? $s['start'],
            ]);
        }
    }

    // ─── 5 Hazards ───────────────────────────────────────────────────────────────

    private function seedHazards(User $admin): void
    {
        $hazards = [
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'critical',
                'title' => 'Flash Flood Zone — Pantalan River Mouth',
                'description' => 'Recurring flash flood area at river mouth. Water rises rapidly during heavy rainfall. Do not cross when river is above knee level.',
                'lat' => 14.08520, 'lng' => 120.62890, 'address' => 'Pantalan River Mouth, Nasugbu, Batangas',
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'high',
                'title' => 'Flood-Prone Area — Brgy. Bucana Coastal',
                'description' => 'Coastal flooding during high tide combined with heavy rain. Historically floods 3-4 times per wet season.',
                'lat' => 14.08020, 'lng' => 120.62280, 'address' => 'Brgy. Bucana, Nasugbu, Batangas',
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'high',
                'title' => 'Creek Overflow Zone — Brgy. Wawa',
                'description' => 'Wawa Creek prone to overflow during sustained rainfall. Creek walls damaged and require reinforcement.',
                'lat' => 14.07130, 'lng' => 120.62630, 'address' => 'Wawa Creek, Nasugbu, Batangas',
            ],
            [
                'category' => 'road', 'type' => 'closed_road', 'severity' => 'high',
                'title' => 'Flood Road Closure — Pantalan Bridge Approach',
                'description' => 'Bridge approach frequently flooded during storms. DPWH monitoring structural integrity. Closed during flood events.',
                'lat' => 14.08680, 'lng' => 120.63060, 'address' => 'Pantalan Bridge, Nasugbu, Batangas',
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'moderate',
                'title' => 'Low-Lying Flood Zone — Brgy. Bilaran',
                'description' => 'Chronically flooded barangay. Residents advised to elevate furniture and prepare go-bags during rainy season.',
                'lat' => 14.06820, 'lng' => 120.63540, 'address' => 'Brgy. Bilaran, Nasugbu, Batangas',
            ],
        ];

        foreach ($hazards as $h) {
            Hazard::firstOrCreate(['title' => $h['title']], [
                'created_by' => $admin->id, 'category' => $h['category'], 'type' => $h['type'],
                'severity' => $h['severity'], 'title' => $h['title'], 'description' => $h['description'],
                'latitude' => $h['lat'], 'longitude' => $h['lng'], 'address' => $h['address'], 'active' => true,
            ]);
        }
        $this->command->info('✓ Seeded 5 hazards.');
    }

    // ─── 10 Announcements ────────────────────────────────────────────────────────

    private function seedAlerts(User $admin): void
    {
        $alerts = [
            ['title' => 'CRITICAL: Flash Flood Warning — Nasugbu Coastal Barangays', 'type' => 'critical', 'hours_ago' => 168,
             'body' => 'PAGASA has issued a Flash Flood Warning for coastal barangays of Nasugbu, Batangas. Residents of Brgy. Pantalan, Bucana, and Wawa are advised to prepare for possible evacuation. Monitor FloodTrack for real-time updates.'],
            ['title' => 'CRITICAL: Pantalan River at Critical Level', 'type' => 'critical', 'hours_ago' => 120,
             'body' => 'Pantalan River has exceeded the critical water level threshold of 8.5 meters. All residents within 500 meters of the riverbank must prepare for evacuation. MDRRMO rescue boats are on standby.'],
            ['title' => 'UPDATE: Rescue Operations Summary — July-August 2026', 'type' => 'update', 'hours_ago' => 96,
             'body' => 'MDRRMO has successfully conducted 15 rescue operations across 5 flood events since July. 213 individuals evacuated safely. Zero casualties reported. FloodTrack early warning system contributed to faster response times averaging 12 minutes.'],
            ['title' => 'ADVISORY: Southwest Monsoon (Habagat) Season Update', 'type' => 'advisory', 'hours_ago' => 72,
             'body' => 'PAGASA forecasts enhanced southwest monsoon activity over Batangas province for the next 2 weeks. Moderate to heavy rainfall expected. Residents in flood-prone areas should prepare emergency kits and know their evacuation routes.'],
            ['title' => 'UPDATE: Road Closures and Alternate Routes', 'type' => 'update', 'hours_ago' => 60,
             'body' => 'Due to recurring flooding, the following roads are temporarily closed: (1) Pantalan Bridge approach, (2) Lumbangan-Poblacion road at the low section. Alternate routes posted on FloodTrack map. Use the app for real-time road conditions.'],
            ['title' => 'ADVISORY: Post-Flood Health Advisory — Leptospirosis Prevention', 'type' => 'advisory', 'hours_ago' => 48,
             'body' => 'The Municipal Health Office warns residents of elevated leptospirosis risk. Avoid walking barefoot in floodwater or mud. Symptoms include high fever, headache, and muscle pain. Seek medical attention immediately if symptoms appear within 2 weeks of flood exposure.'],
            ['title' => 'UPDATE: Evacuation Center Preparedness Check Complete', 'type' => 'update', 'hours_ago' => 36,
             'body' => 'All 6 designated evacuation centers in Nasugbu have completed preparedness checks. Facilities are stocked with relief goods, drinking water, and medical supplies for up to 500 evacuees each. MDRRMO coordinated with DSWD for additional resources.'],
            ['title' => 'ADVISORY: FloodTrack App — Report Flooding in Your Area', 'type' => 'advisory', 'hours_ago' => 24,
             'body' => 'Help keep your community safe by reporting flooding through FloodTrack. Your reports enable the MDRRMO to respond faster and save lives. Include photos and accurate location for fastest verification. Every report matters.'],
            ['title' => 'UPDATE: Barangay Response Teams Training Complete', 'type' => 'update', 'hours_ago' => 12,
             'body' => 'All 5 Barangay Response Teams (BRTs) have completed their wet season refresher training. 25 trained responders are now equipped with updated rescue protocols, first aid certification, and FloodTrack mobile app coordination. Teams are on standby 24/7.'],
            ['title' => 'ADVISORY: Wet Season Preparedness Reminder', 'type' => 'advisory', 'hours_ago' => 2,
             'body' => 'With the wet season in full effect, the MDRRMO reminds all residents to: (1) Know your nearest evacuation center, (2) Keep a 3-day emergency kit ready, (3) Monitor FloodTrack for real-time reports, (4) Report flooding immediately. Your awareness saves lives.'],
        ];

        foreach ($alerts as $a) {
            Alert::firstOrCreate(['title' => $a['title']], [
                'created_by' => $admin->id, 'title' => $a['title'], 'body' => $a['body'], 'type' => $a['type'],
                'created_at' => now()->subHours($a['hours_ago']), 'updated_at' => now()->subHours($a['hours_ago']),
            ]);
        }
        $this->command->info('✓ Seeded 10 announcements/alerts.');
    }

    // ─── Reset evacuation occupancy to 0 ─────────────────────────────────────────

    private function resetEvacuationOccupancy(): void
    {
        EvacuationCenter::query()->update(['current_occupancy' => 0]);
        $this->command->info('✓ Evacuation center occupancy reset to 0.');
    }
}
