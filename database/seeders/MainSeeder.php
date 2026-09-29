<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\EvacuationCenter;
use App\Models\Hazard;
use App\Models\Report;
use App\Models\ReportSlaConfig;
use App\Models\ReportSlaTracking;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class MainSeeder extends Seeder
{
    private function resolveBarangay(?string $address, float $lat, float $lng): string
    {
        $barangays = config('barangays', []);
        $nearest = null;
        $minDist = PHP_FLOAT_MAX;
        foreach ($barangays as $brgy) {
            $dist = sqrt(pow($lat - $brgy['latitude'], 2) + pow($lng - $brgy['longitude'], 2));
            if ($dist < $minDist) { $minDist = $dist; $nearest = $brgy['name']; }
        }
        return $nearest ? "{$nearest}, Nasugbu, Batangas" : ($address ?? 'Nasugbu, Batangas');
    }

    public function run(): void
    {
        $this->call(EvacuationCenterSeeder::class);
        $this->call(ProtocolSeeder::class);

        $admin = $this->seedAdmin();
        $residents = $this->seedResidents();
        $teams = $this->seedTeams($admin);
        $this->seedReports($residents, $teams, $admin);
        $this->seedHazards($admin);
        $this->seedAlerts($admin);
        $this->seedEvacuationOccupancy();

        $this->command->info('✓ MainSeeder complete.');
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Residents (15 realistic Nasugbu residents)
    // -------------------------------------------------------------------------

    private function seedResidents(): array
    {
        $data = [
            ['name' => 'Maria Santos',         'email' => 'maria.santos@gmail.com',         'contact_number' => '09171234501'],
            ['name' => 'Jose Reyes',            'email' => 'jose.reyes@gmail.com',           'contact_number' => '09181234502'],
            ['name' => 'Ana Dela Cruz',         'email' => 'ana.delacruz@gmail.com',         'contact_number' => '09191234503'],
            ['name' => 'Ramon Garcia',          'email' => 'ramon.garcia@gmail.com',         'contact_number' => '09171234504'],
            ['name' => 'Liza Fernandez',        'email' => 'liza.fernandez@gmail.com',       'contact_number' => '09181234505'],
            ['name' => 'Roberto Mendoza',       'email' => 'roberto.mendoza@gmail.com',      'contact_number' => '09191234506'],
            ['name' => 'Cristina Bautista',     'email' => 'cristina.bautista@gmail.com',    'contact_number' => '09171234507'],
            ['name' => 'Eduardo Villanueva',    'email' => 'eduardo.villanueva@gmail.com',   'contact_number' => '09181234508'],
            ['name' => 'Rosalinda Aquino',      'email' => 'rosalinda.aquino@gmail.com',     'contact_number' => '09191234509'],
            ['name' => 'Fernando Pascual',      'email' => 'fernando.pascual@gmail.com',     'contact_number' => '09171234510'],
            ['name' => 'Gloria Navarro',        'email' => 'gloria.navarro@gmail.com',       'contact_number' => '09181234511'],
            ['name' => 'Antonio Ramos',         'email' => 'antonio.ramos@gmail.com',        'contact_number' => '09191234512'],
            ['name' => 'Maricel Dizon',         'email' => 'maricel.dizon@gmail.com',        'contact_number' => '09171234513'],
            ['name' => 'Ricardo Soriano',       'email' => 'ricardo.soriano@gmail.com',      'contact_number' => '09181234514'],
            ['name' => 'Jeanette Ocampo',       'email' => 'jeanette.ocampo@gmail.com',      'contact_number' => '09191234515'],
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

    // -------------------------------------------------------------------------
    // Teams & Responders (5 teams, 5 members each)
    // -------------------------------------------------------------------------

    private function seedTeams(User $admin): array
    {
        $teamData = [
            [
                'name'       => 'MDRRMO Rescue Unit 1',
                'is_active'  => true,
                'responders' => [
                    ['name' => 'Carlos Mendoza',    'email' => 'carlos.mendoza@floodtrack.com',    'contact_number' => '09181001001'],
                    ['name' => 'Diana Ramos',       'email' => 'diana.ramos@floodtrack.com',       'contact_number' => '09181001002'],
                    ['name' => 'Eduardo Torres',    'email' => 'eduardo.torres@floodtrack.com',    'contact_number' => '09181001003'],
                    ['name' => 'Felicia Cruz',      'email' => 'felicia.cruz@floodtrack.com',      'contact_number' => '09181001004'],
                    ['name' => 'Gregorio Lim',      'email' => 'gregorio.lim@floodtrack.com',      'contact_number' => '09181001005'],
                ],
            ],
            [
                'name'       => 'MDRRMO Rescue Unit 2',
                'is_active'  => true,
                'responders' => [
                    ['name' => 'Herminia Bautista', 'email' => 'herminia.bautista@floodtrack.com', 'contact_number' => '09181002001'],
                    ['name' => 'Ignacio Villanueva','email' => 'ignacio.villanueva@floodtrack.com','contact_number' => '09181002002'],
                    ['name' => 'Jasmine Aquino',    'email' => 'jasmine.aquino@floodtrack.com',    'contact_number' => '09181002003'],
                    ['name' => 'Kevin Pascual',     'email' => 'kevin.pascual@floodtrack.com',     'contact_number' => '09181002004'],
                    ['name' => 'Lorraine Navarro',  'email' => 'lorraine.navarro@floodtrack.com',  'contact_number' => '09181002005'],
                ],
            ],
            [
                'name'       => 'Pantalan BRT',
                'is_active'  => true,
                'responders' => [
                    ['name' => 'Manuel Dizon',      'email' => 'manuel.dizon@floodtrack.com',      'contact_number' => '09181003001'],
                    ['name' => 'Nilda Ocampo',      'email' => 'nilda.ocampo@floodtrack.com',      'contact_number' => '09181003002'],
                    ['name' => 'Orlando Macaraeg',  'email' => 'orlando.macaraeg@floodtrack.com',  'contact_number' => '09181003003'],
                    ['name' => 'Patricia Soriano',  'email' => 'patricia.soriano@floodtrack.com',  'contact_number' => '09181003004'],
                    ['name' => 'Quirino Abella',    'email' => 'quirino.abella@floodtrack.com',    'contact_number' => '09181003005'],
                ],
            ],
            [
                'name'       => 'Bucana-Wawa BRT',
                'is_active'  => true,
                'responders' => [
                    ['name' => 'Rosario Castillo',  'email' => 'rosario.castillo@floodtrack.com',  'contact_number' => '09181004001'],
                    ['name' => 'Salvador Dela Rosa','email' => 'salvador.delarosa@floodtrack.com', 'contact_number' => '09181004002'],
                    ['name' => 'Teresita Aguilar',  'email' => 'teresita.aguilar@floodtrack.com',  'contact_number' => '09181004003'],
                    ['name' => 'Uldarico Espinosa', 'email' => 'uldarico.espinosa@floodtrack.com', 'contact_number' => '09181004004'],
                    ['name' => 'Violeta Morales',   'email' => 'violeta.morales@floodtrack.com',   'contact_number' => '09181004005'],
                ],
            ],
            [
                'name'       => 'Poblacion BRT',
                'is_active'  => false,
                'responders' => [
                    ['name' => 'Wilfredo Perez',    'email' => 'wilfredo.perez@floodtrack.com',    'contact_number' => '09181005001'],
                    ['name' => 'Xyza Hernandez',    'email' => 'xyza.hernandez@floodtrack.com',    'contact_number' => '09181005002'],
                    ['name' => 'Yolanda Buenaventura','email'=>'yolanda.buenaventura@floodtrack.com','contact_number'=>'09181005003'],
                    ['name' => 'Zosimo Laurel',     'email' => 'zosimo.laurel@floodtrack.com',     'contact_number' => '09181005004'],
                    ['name' => 'Angelica Domingo',  'email' => 'angelica.domingo@floodtrack.com',  'contact_number' => '09181005005'],
                ],
            ],
        ];

        $teams = [];
        foreach ($teamData as $td) {
            $responderUsers = [];
            foreach ($td['responders'] as $rd) {
                $responderUsers[] = User::firstOrCreate(
                    ['email' => $rd['email']],
                    array_merge($rd, [
                        'password'          => bcrypt('password123'),
                        'role'              => 'responder',
                        'email_verified_at' => now(),
                    ])
                );
            }

            $team = Team::firstOrCreate(
                ['name' => $td['name']],
                ['leader_id' => $responderUsers[0]->id, 'is_active' => $td['is_active']]
            );

            foreach ($responderUsers as $ru) {
                $ru->update(['team_id' => $team->id]);
            }

            $team->responders = $responderUsers;
            $teams[] = $team;
        }

        $this->command->info('✓ Seeded 5 teams with 25 responders (1 team inactive).');
        return $teams;
    }

    // -------------------------------------------------------------------------
    // Reports — spread across August–September 2026 (Philippine wet season)
    // 65 reports simulating 5 distinct flood events over 2 months
    // -------------------------------------------------------------------------

    private function seedReports(array $residents, array $teams, User $admin): void
    {
        $reports = [
            // ═══════════════════════════════════════════════════════════════════
            // EVENT 1: Habagat (Southwest Monsoon) — August 3-5, 2026
            // Moderate rainfall, flooding in low-lying barangays
            // 8 reports (7 resolved, 1 rejected)
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08570, 'lng' => 120.62960, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Baha sa kalsada malapit sa ilog, tuhod na ang lalim. Nag-report agad sa FloodTrack app. MDRRMO nag-verify within 12 minutes.',                                          'date' => '2026-08-03 06:30:00', 'team_idx' => 2],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06840, 'lng' => 120.63560, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Ankle-deep flooding along main road after 5 hours of continuous habagat rain. 4 households moved belongings to upper floors as precaution.',                             'date' => '2026-08-03 07:15:00', 'team_idx' => 2],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07250, 'lng' => 120.62790, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Creek water level rising pero hindi pa umaapaw. Barangay tanods monitoring since 5 AM. Residents along the creek on standby for evacuation.',                           'date' => '2026-08-03 08:45:00', 'team_idx' => 3],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06160, 'lng' => 120.64020, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Road from Lumbangan to poblacion may baha. Residents using alternate route via Kaylaway. Hindi naman malalim, passable pa for motorcycles.',                             'date' => '2026-08-03 10:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05790, 'lng' => 120.64120, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Hill runoff pooling near elementary school. Water about 15cm, slowly draining. No risk to structures. Cleared by afternoon.',                                            'date' => '2026-08-03 11:30:00', 'team_idx' => null],
            ['address' => 'Barangay 3, Poblacion, Nasugbu, Batangas',        'lat' => 14.07690, 'lng' => 120.63390, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Minor drainage overflow near West Central School. Water receded within 2 hours after rain stopped. No household impact.',                                                'date' => '2026-08-04 06:45:00', 'team_idx' => null],
            ['address' => 'Brgy. Putat, Nasugbu, Batangas',                  'lat' => 14.07900, 'lng' => 120.65280, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Light flooding sa gilid ng river. Hindi naman pumapasok sa bahay. Nag-subside na by 10 AM. Residents monitored through the app.',                                        'date' => '2026-08-05 07:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Latag, Nasugbu, Batangas',                  'lat' => 14.10050, 'lng' => 120.63050, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Upon verification, water was from a burst pipe, not flooding. Referred to municipal water utility for repair.',                                                          'date' => '2026-08-05 09:30:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 2: Tropical Storm "Enteng" — August 15-18, 2026
            // Strong storm, widespread flooding
            // 15 reports (13 resolved, 2 rejected)
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08600, 'lng' => 120.62930, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Pantalan River overflowing. Water rose 1.2 meters in 2 hours. 7 families stranded on rooftops. MDRRMO rescue boat deployed within 15 minutes of FloodTrack alert.',      'date' => '2026-08-15 21:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08060, 'lng' => 120.62430, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Storm surge combined with river overflow. Chest-level floodwater inside homes. 34 families evacuated to gymnasium. Rescue Unit 2 on site within 20 minutes.',            'date' => '2026-08-15 22:30:00', 'team_idx' => 1],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07210, 'lng' => 120.62760, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Creek overflow detected early through resident report on FloodTrack. Preemptive evacuation saved 5 families with children under 5. BRT responded in 18 minutes.',        'date' => '2026-08-16 00:15:00', 'team_idx' => 3],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06860, 'lng' => 120.63540, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Buong lower portion ng barangay lubog. 15 families evacuated to Bilaran Covered Court. Pantalan BRT assisted with elderly na hindi makalakad.',                          'date' => '2026-08-16 02:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08480, 'lng' => 120.62870, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Floodwater entering school grounds. Classes suspended since yesterday. School furniture moved to 2nd floor. 12 elderly evacuated before water reached waist level.',      'date' => '2026-08-16 04:30:00', 'team_idx' => 0],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06130, 'lng' => 120.64050, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Road to town completely cut off by floodwater. 3 pregnant women evacuated by rubber boat to district hospital. FloodTrack report enabled fast coordination.',            'date' => '2026-08-16 05:45:00', 'team_idx' => 3],
            ['address' => 'Barangay 4, Poblacion, Nasugbu, Batangas',        'lat' => 14.07640, 'lng' => 120.63260, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Clogged drainage causing street flooding near municipal gymnasium. Ankle to knee-deep. Poblacion BRT deployed pumps within 30 minutes of report.',                        'date' => '2026-08-16 07:00:00', 'team_idx' => 4],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08010, 'lng' => 120.62380, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Moderate flooding in interior streets. Water entered homes ankle-deep. Residents already prepared — furniture elevated from previous experience.',                        'date' => '2026-08-16 09:20:00', 'team_idx' => 1],
            ['address' => 'Barangay 3, Poblacion, Nasugbu, Batangas',        'lat' => 14.07670, 'lng' => 120.63410, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Drainage overflow near market area. Vendors na-warn through FloodTrack advisory. Nagligpit agad ng goods bago tumaas ang tubig.',                                        'date' => '2026-08-17 06:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05810, 'lng' => 120.64080, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Hill runoff worse than August 3 event. Temporary diversion canal dug by barangay volunteers. 2 families with infants relocated to relatives.',                           'date' => '2026-08-17 08:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Putat, Nasugbu, Batangas',                  'lat' => 14.07870, 'lng' => 120.65310, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'River adjacent area may baha pero shallow lang. Nag-monitor ang residents gamit ang app. Hindi na kailangan ng rescue team.',                                            'date' => '2026-08-17 10:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Latag, Nasugbu, Batangas',                  'lat' => 14.09970, 'lng' => 120.63020, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Light flooding at road junction near river. Self-resolved after rain stopped. Residents posted updates on FloodTrack showing water receding.',                           'date' => '2026-08-18 07:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07280, 'lng' => 120.62810, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Post-storm minor flooding. Water draining slowly through cleared canal. No further assistance needed. Situation fully resolved by noon.',                                'date' => '2026-08-18 08:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08540, 'lng' => 120.63000, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Report is a duplicate of FT-20260816-0004 submitted 10 minutes earlier. Same location and description.',                                                                'date' => '2026-08-16 02:10:00', 'team_idx' => null],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06900, 'lng' => 120.63580, 'severity' => 'moderate', 'status' => 'rejected',  'desc' => 'Photo is from a previous flood event (July). Not current. Reporter advised to submit current photos only.',                                                             'date' => '2026-08-18 09:15:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 3: Monsoon surge — September 1-3, 2026
            // Continuous habagat rain, quick response
            // 12 reports (11 resolved, 1 rejected)
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08550, 'lng' => 120.62980, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Baha sa kalsada, tuhod na ang lalim. 3 pamilya nailigtas ng BRT team bago tumaas pa ang tubig. FloodTrack report verified in 8 minutes.',                                'date' => '2026-09-01 05:30:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08040, 'lng' => 120.62450, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Coastal flooding sa habagat surge. MDRRMO verified in 10 minutes. Rescue Unit 2 evacuated 8 families including 4 senior citizens. Lahat safe.',                          'date' => '2026-09-01 06:45:00', 'team_idx' => 1],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07230, 'lng' => 120.62770, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Creek rising fast — same breach point as August. Bucana-Wawa BRT dispatched in 12 minutes. 6 families evacuated. Sandbag wall reinforced.',                              'date' => '2026-09-01 07:30:00', 'team_idx' => 3],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06870, 'lng' => 120.63510, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Low-lying area flooding again pero residents mas prepared na. Furniture naka-elevate from experience noong August. 2 elderly na-assist sa evacuation.',                   'date' => '2026-09-01 08:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06140, 'lng' => 120.64070, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Road flooding at usual low point. Barangay volunteers already posted warning signs before MDRRMO arrived. System working — community prepared.',                          'date' => '2026-09-01 09:15:00', 'team_idx' => null],
            ['address' => 'Barangay 3, Poblacion, Nasugbu, Batangas',        'lat' => 14.07700, 'lng' => 120.63350, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Drainage overflow sa market area. Municipal maintenance crew deployed pumps within 25 minutes. Water cleared by 11 AM.',                                                  'date' => '2026-09-01 10:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05780, 'lng' => 120.64130, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Minor hill runoff. Diversion canal from August still functional. Residents monitored via app and confirmed no escalation needed.',                                       'date' => '2026-09-02 06:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Putat, Nasugbu, Batangas',                  'lat' => 14.07910, 'lng' => 120.65240, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Shallow flooding near riverbank. Self-resolved within 3 hours. Resident submitted follow-up report confirming water receded.',                                           'date' => '2026-09-02 07:30:00', 'team_idx' => null],
            ['address' => 'Barangay 4, Poblacion, Nasugbu, Batangas',        'lat' => 14.07650, 'lng' => 120.63300, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Shallow puddles on road near municipal hall. Not enough for concern pero ni-report para ma-track. Cleared naturally by afternoon.',                                      'date' => '2026-09-02 09:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Latag, Nasugbu, Batangas',                  'lat' => 14.10010, 'lng' => 120.62980, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Minor road flooding. Quickly drained. Resident used FloodTrack to report and track — resolved before any team needed to respond.',                                       'date' => '2026-09-03 06:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08590, 'lng' => 120.62940, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Post-monsoon cleanup. Some debris blocking drainage near river. Pantalan BRT cleared within 2 hours. System back to normal.',                                            'date' => '2026-09-03 08:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08090, 'lng' => 120.62410, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Location is outside Nasugbu municipality boundaries. Coordinates point to Lian town. Reporter redirected to Lian MDRRMO.',                                              'date' => '2026-09-03 10:00:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 4: Typhoon "Ferdie" — September 12-15, 2026
            // Strongest event — critical flooding, mass evacuation
            // 18 reports (15 resolved, 3 rejected)
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08620, 'lng' => 120.62970, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Severe flooding at river mouth. Water rose over 1.5 meters in 90 minutes. Resident reported via FloodTrack at 2AM. MDRRMO verified in 8 minutes and dispatched rescue. 12 elderly evacuated before water reached chest level.', 'date' => '2026-09-12 02:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08030, 'lng' => 120.62370, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Storm surge plus river overflow. Worst flooding this season. 45 families at evacuation center. Fish pens destroyed. Rescue Unit 2 saved a family of 6 trapped in single-story home.', 'date' => '2026-09-12 03:30:00', 'team_idx' => 1],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07180, 'lng' => 120.62680, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Creek walls breached at same point as August and September 1. Emergency siren activated. Mass evacuation to Wawa Covered Court — 28 families, 112 individuals. Zero casualties thanks to early FloodTrack warning.', 'date' => '2026-09-12 04:15:00', 'team_idx' => 3],
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08460, 'lng' => 120.62880, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Pantalan bridge approach completely submerged. Two tricycles swept by flash flood — drivers rescued by MDRRMO Rescue Unit 1. Bridge closed to all traffic.',              'date' => '2026-09-12 05:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06830, 'lng' => 120.63490, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Worst flooding sa Bilaran this season. Entire lower barangay evacuated — covered court at capacity. Overflow sent to municipal gymnasium. 23 families, 89 individuals safe.', 'date' => '2026-09-12 06:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.07990, 'lng' => 120.62350, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Second wave of coastal flooding during high tide. Rescue Unit 2 still on site from earlier deployment. Additional 8 families evacuated. Coordination through FloodTrack dashboard.', 'date' => '2026-09-12 09:30:00', 'team_idx' => 1],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06180, 'lng' => 120.64000, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Road to town cut off for third time this wet season. Barangay isolated. Relief goods delivered by rubber boat. 2 dialysis patients evacuated to district hospital via alternate route.', 'date' => '2026-09-13 05:00:00', 'team_idx' => 3],
            ['address' => 'Barangay 3, Poblacion, Nasugbu, Batangas',        'lat' => 14.07710, 'lng' => 120.63370, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Major highway flooding near public market. Vendors lost goods pero less damage than August kasi nag-prepare na based on FloodTrack advisory. DPWH heavy equipment deployed.', 'date' => '2026-09-13 07:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Latag, Nasugbu, Batangas',                  'lat' => 14.10030, 'lng' => 120.63010, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'River adjacent area flooded — knee-deep sa main road. 4 families evacuated. Pantalan BRT assisted since MDRRMO units deployed elsewhere. Multi-team coordination via FloodTrack.', 'date' => '2026-09-13 08:30:00', 'team_idx' => 2],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05820, 'lng' => 120.64090, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Hill runoff worse than all previous events. Diversion canal overflowed. 3 families with children relocated to barangay hall. Volunteers reinforced canal walls.',           'date' => '2026-09-13 10:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Putat, Nasugbu, Batangas',                  'lat' => 14.07860, 'lng' => 120.65290, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'River flooding entered 4 homes. Residents had go-bags ready from FloodTrack preparedness advisory. Self-evacuated to relatives on higher ground before team arrived.',    'date' => '2026-09-14 06:00:00', 'team_idx' => null],
            ['address' => 'Barangay 4, Poblacion, Nasugbu, Batangas',        'lat' => 14.07620, 'lng' => 120.63280, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Post-typhoon drainage overflow. Municipal crew deployed pumps. Area cleared within 4 hours. Cleanup crew collected debris from streets.',                                 'date' => '2026-09-14 08:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07260, 'lng' => 120.62740, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Floodwater receding pero may debris blocking creek flow. Bucana-Wawa BRT cleared blockage. Water level back to normal by 3 PM.',                                         'date' => '2026-09-15 07:00:00', 'team_idx' => 3],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06890, 'lng' => 120.63530, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Post-typhoon cleanup. Residents returning home. Some houses need minor repair. Barangay captain coordinated through FloodTrack status updates.',                          'date' => '2026-09-15 09:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08510, 'lng' => 120.63010, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Final cleanup around Pantalan bridge approach. Debris cleared. Road reopened to light vehicles. DPWH conducting structural assessment.',                                  'date' => '2026-09-15 11:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07190, 'lng' => 120.62720, 'severity' => 'high',     'status' => 'rejected',  'desc' => 'Test submission. Not a real flood report. User was testing the FloodTrack app functionality.',                                                                           'date' => '2026-09-12 10:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06100, 'lng' => 120.64060, 'severity' => 'moderate', 'status' => 'rejected',  'desc' => 'Report is a duplicate of FT-20260913-0007 submitted 10 minutes earlier. Same location, same reporter.',                                                                  'date' => '2026-09-13 05:10:00', 'team_idx' => null],
            ['address' => 'Barangay 4, Poblacion, Nasugbu, Batangas',        'lat' => 14.07600, 'lng' => 120.63310, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Photo is from a previous flood event (August). Image metadata shows date August 16. Not current situation.',                                                             'date' => '2026-09-14 09:30:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 5: Current flooding — September 27-30, 2026 (ongoing)
            // Mix of severities, 5 pending reports from latest days
            // 12 reports (4 resolved, 3 rejected, 5 pending)
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08580, 'lng' => 120.62950, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Habagat-driven flooding sa riverside. MDRRMO responded within 15 minutes. 5 families evacuated. Water level stabilized after 4 hours. Sandbag walls held this time.',     'date' => '2026-09-27 14:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08070, 'lng' => 120.62420, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Moderate coastal flooding during high tide. Residents self-evacuated before team arrived — they learned from the September 12 experience. FloodTrack alerts worked.',      'date' => '2026-09-27 16:30:00', 'team_idx' => 1],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07240, 'lng' => 120.62780, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Creek level rising pero reinforced sandbag wall holding. BRT monitored for 3 hours. No evacuation needed. Residents stayed vigilant using FloodTrack updates.',            'date' => '2026-09-27 18:00:00', 'team_idx' => 3],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06850, 'lng' => 120.63500, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Low-lying area flooding pero less severe than Typhoon Ferdie. 2 families voluntarily went to covered court. Cleared within 5 hours.',                                     'date' => '2026-09-28 06:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Latag, Nasugbu, Batangas',                  'lat' => 14.09980, 'lng' => 120.63040, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Upon verification, flooding reported is in adjacent municipality of Lian, not Nasugbu. Location is outside Nasugbu municipality boundaries.',                             'date' => '2026-09-27 17:00:00', 'team_idx' => null],
            ['address' => 'Barangay 3, Poblacion, Nasugbu, Batangas',        'lat' => 14.07680, 'lng' => 120.63380, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Report is a duplicate of FT-20260928-0004 submitted 15 minutes earlier by same user. Duplicate entry.',                                                                  'date' => '2026-09-28 06:15:00', 'team_idx' => null],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05800, 'lng' => 120.64100, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Upon verification, water was from a clogged irrigation canal, not natural flooding. Referred to municipal agriculture office.',                                           'date' => '2026-09-28 08:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08560, 'lng' => 120.62990, 'severity' => 'high',     'status' => 'pending',   'desc' => 'Tubig tumataas ulit sa riverside area. Mga 2 feet na sa kalsada. May mga bata at matanda na kailangan i-evacuate. Paki-dispatch po ng rescue team.',                     'date' => '2026-09-28 22:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08080, 'lng' => 120.62390, 'severity' => 'high',     'status' => 'pending',   'desc' => 'Storm surge warning from PAGASA. Coastal area flooding na. 3 families requesting evacuation assistance. Water entering homes.',                                           'date' => '2026-09-29 01:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07200, 'lng' => 120.62750, 'severity' => 'moderate', 'status' => 'pending',   'desc' => 'Creek level approaching overflow point. Sandbag wall may not hold. Requesting preemptive evacuation order for 4 families nearest the creek.',                              'date' => '2026-09-29 05:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06170, 'lng' => 120.64040, 'severity' => 'moderate', 'status' => 'pending',   'desc' => 'Road flooding again at the usual low point. Hindi pa naman malalim pero tumataas. Requesting barangay volunteers to post warning signs.',                                'date' => '2026-09-29 06:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06880, 'lng' => 120.63570, 'severity' => 'low',      'status' => 'pending',   'desc' => 'Nag-start na mag-baha sa lower portion. Hindi pa malalim pero based sa experience, tataas pa ito. Nag-report agad para ma-monitor ng MDRRMO.',                            'date' => '2026-09-29 07:45:00', 'team_idx' => null],
        ];

        $residentCount = count($residents);

        foreach ($reports as $i => $r) {
            $resident  = $residents[$i % $residentCount];
            $team      = $r['team_idx'] !== null ? $teams[$r['team_idx']] : null;
            $responder = $team ? ($team->responders[0] ?? null) : null;

            $createdAt  = Carbon::parse($r['date']);
            $verifiedAt = in_array($r['status'], ['verified', 'assigned', 'resolved', 'rejected'])
                ? $createdAt->copy()->addMinutes(rand(3, 8))
                : null;
            $assignedAt = in_array($r['status'], ['assigned', 'resolved']) && $team
                ? ($verifiedAt ?? $createdAt)->copy()->addMinutes(rand(2, 5))
                : null;
            $resolvedAt = $r['status'] === 'resolved'
                ? ($assignedAt ?? $createdAt)->copy()->addMinutes(rand(8, 20))
                : null;

            // Normalize address to nearest barangay
            $normalizedAddress = $this->resolveBarangay($r['address'], $r['lat'], $r['lng']);

            // First 30 from mobile app, rest from messenger
            $source = $i < 30 ? 'mobile' : 'messenger';
            $messengerName = $source === 'messenger' ? $resident->name : null;

            $report = Report::firstOrCreate(
                ['latitude' => $r['lat'], 'longitude' => $r['lng'], 'created_at' => $createdAt],
                [
                    'user_id'              => $resident->id,
                    'severity'             => $r['severity'],
                    'status'               => $r['status'],
                    'description'          => $r['desc'],
                    'latitude'             => $r['lat'],
                    'longitude'            => $r['lng'],
                    'address'              => $normalizedAddress,
                    'source'               => $source,
                    'messenger_sender_name'=> $messengerName,
                    'assigned_to'          => $responder?->id,
                    'assigned_team_id'     => $team?->id,
                    'verified_by'          => $verifiedAt ? $admin->id : null,
                    'verified_at'          => $verifiedAt,
                    'assigned_at'          => $assignedAt,
                    'resolved_at'          => $resolvedAt,
                    'created_at'           => $createdAt,
                    'updated_at'           => $resolvedAt ?? $assignedAt ?? $verifiedAt ?? $createdAt,
                ]
            );

            // Seed status update history for activity feed
            if ($report->wasRecentlyCreated) {
                $this->seedStatusUpdates($report, $r['status'], $admin, $responder, $createdAt, $verifiedAt, $assignedAt, $resolvedAt);
                $this->seedSlaTracking($report, $r['severity'], $createdAt, $verifiedAt, $assignedAt, $resolvedAt);
            }
        }

        $this->command->info('✓ Seeded ' . count($reports) . ' flood reports across 5 events (August–September 2026).');
    }

    private function seedStatusUpdates(
        Report $report, string $finalStatus, User $admin,
        ?User $responder, Carbon $createdAt,
        ?Carbon $verifiedAt, ?Carbon $assignedAt, ?Carbon $resolvedAt
    ): void {
        if ($verifiedAt && in_array($finalStatus, ['verified', 'assigned', 'resolved', 'rejected'])) {
            $status = $finalStatus === 'rejected' ? 'rejected' : 'verified';
            ReportStatusUpdate::create([
                'report_id'  => $report->id,
                'user_id'    => $admin->id,
                'status'     => $status,
                'notes'      => $status === 'rejected' ? 'Report does not meet verification criteria.' : 'Report verified and confirmed.',
                'created_at' => $verifiedAt,
                'updated_at' => $verifiedAt,
            ]);
        }

        if ($assignedAt && in_array($finalStatus, ['assigned', 'resolved'])) {
            ReportStatusUpdate::create([
                'report_id'  => $report->id,
                'user_id'    => $admin->id,
                'status'     => 'assigned',
                'notes'      => 'Response team dispatched to the area.',
                'created_at' => $assignedAt,
                'updated_at' => $assignedAt,
            ]);
        }

        if ($resolvedAt && $finalStatus === 'resolved') {
            ReportStatusUpdate::create([
                'report_id'  => $report->id,
                'user_id'    => $responder?->id ?? $admin->id,
                'status'     => 'resolved',
                'notes'      => 'Situation resolved. Floodwater receded and affected residents assisted.',
                'created_at' => $resolvedAt,
                'updated_at' => $resolvedAt,
            ]);
        }
    }

    private function seedSlaTracking(
        Report $report, string $severity, Carbon $createdAt,
        ?Carbon $verifiedAt, ?Carbon $assignedAt, ?Carbon $resolvedAt
    ): void {
        $stages = [
            ['stage' => 'pending_to_verified',  'start' => $createdAt,   'end' => $verifiedAt],
            ['stage' => 'verified_to_assigned',  'start' => $verifiedAt,  'end' => $assignedAt],
            ['stage' => 'assigned_to_resolved',  'start' => $assignedAt,  'end' => $resolvedAt],
        ];

        foreach ($stages as $s) {
            if (!$s['start']) continue;

            $config = ReportSlaConfig::where('severity', $severity)
                ->where('stage', $s['stage'])
                ->first();

            if (!$config) continue;

            $elapsed = $s['end'] ? $s['start']->diffInMinutes($s['end']) : null;
            $slaStatus = 'on_track';
            if ($elapsed !== null) {
                if ($elapsed > $config->threshold_minutes * ($config->critical_pct / 100)) {
                    $slaStatus = 'breached';
                } elseif ($elapsed > $config->threshold_minutes * ($config->warning_pct / 100)) {
                    $slaStatus = 'at_risk';
                } else {
                    $slaStatus = 'met';
                }
            }

            ReportSlaTracking::create([
                'report_id'          => $report->id,
                'stage'              => $s['stage'],
                'started_at'         => $s['start'],
                'threshold_minutes'  => $config->threshold_minutes,
                'completed_at'       => $s['end'],
                'elapsed_minutes'    => $elapsed,
                'sla_status'         => $slaStatus,
                'escalation_level'   => 0,
                'escalated_at'       => null,
                'created_at'         => $s['start'],
                'updated_at'         => $s['end'] ?? $s['start'],
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Hazards
    // -------------------------------------------------------------------------

    private function seedHazards(User $admin): void
    {
        $hazards = [
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'critical',
                'title'       => 'Flash Flood Zone — Pantalan River Mouth',
                'description' => 'Recurring flash flood area at river mouth. Water rises rapidly during heavy rainfall. Do not cross when river is above knee level.',
                'lat' => 14.08520, 'lng' => 120.62890,
                'address' => 'Pantalan River Mouth, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'high',
                'title'       => 'Flood-Prone Area — Brgy. Bucana Coastal',
                'description' => 'Coastal flooding during high tide combined with heavy rain. Historically floods 3-4 times per wet season.',
                'lat' => 14.08020, 'lng' => 120.62280,
                'address' => 'Brgy. Bucana, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'high',
                'title'       => 'Creek Overflow Zone — Brgy. Wawa',
                'description' => 'Wawa Creek prone to overflow during sustained rainfall. Creek walls damaged and require reinforcement.',
                'lat' => 14.07130, 'lng' => 120.62630,
                'address' => 'Wawa Creek, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'road', 'type' => 'closed_road', 'severity' => 'high',
                'title'       => 'Flood Road Closure — Pantalan Bridge Approach',
                'description' => 'Bridge approach frequently flooded. DPWH monitoring structural integrity. Closed during flood events.',
                'lat' => 14.08680, 'lng' => 120.63060,
                'address' => 'Pantalan Bridge, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'road', 'type' => 'closed_road', 'severity' => 'moderate',
                'title'       => 'Road Flooding — National Highway near Market',
                'description' => 'Highway section near public market floods during moderate to heavy rainfall. One lane usually remains passable.',
                'lat' => 14.07820, 'lng' => 120.63130,
                'address' => 'National Highway, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'moderate',
                'title'       => 'Low-Lying Flood Zone — Brgy. Bilaran',
                'description' => 'Chronically flooded barangay. Residents advised to elevate furniture and prepare go-bags during rainy season.',
                'lat' => 14.06820, 'lng' => 120.63540,
                'address' => 'Brgy. Bilaran, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'road', 'type' => 'debris', 'severity' => 'moderate',
                'title'       => 'Road Erosion — Brgy. Lumbangan',
                'description' => 'Provincial road repeatedly damaged by flooding. Multiple potholes and eroded sections. Drive with extreme caution.',
                'lat' => 14.06180, 'lng' => 120.64030,
                'address' => 'Brgy. Lumbangan Road, Nasugbu, Batangas',
                'active' => true,
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'low',
                'title'       => 'Drainage Issues — Poblacion Streets',
                'description' => 'Recurring drainage overflow on Poblacion side streets during heavy rain. Usually clears within 2 hours.',
                'lat' => 14.07500, 'lng' => 120.63450,
                'address' => 'Poblacion, Nasugbu, Batangas',
                'active' => true,
            ],
        ];

        foreach ($hazards as $h) {
            Hazard::firstOrCreate(
                ['title' => $h['title']],
                [
                    'created_by'  => $admin->id,
                    'category'    => $h['category'],
                    'type'        => $h['type'],
                    'severity'    => $h['severity'],
                    'title'       => $h['title'],
                    'description' => $h['description'],
                    'latitude'    => $h['lat'],
                    'longitude'   => $h['lng'],
                    'address'     => $h['address'],
                    'active'      => $h['active'],
                ]
            );
        }

        $this->command->info('✓ Seeded 8 hazards.');
    }

    // -------------------------------------------------------------------------
    // Alerts & Advisories (for the current September event)
    // -------------------------------------------------------------------------

    private function seedAlerts(User $admin): void
    {
        $alerts = [
            [
                'title'     => 'CRITICAL: Flash Flood Warning — Nasugbu Coastal Barangays',
                'body'      => 'PAGASA has issued a Flash Flood Warning for coastal barangays of Nasugbu, Batangas effective September 6, 2026. Residents of Brgy. Pantalan, Bucana, and Wawa are advised to EVACUATE IMMEDIATELY to designated evacuation centers. Bring essential documents, medicines, and 3-day food supply. Do not attempt to cross flooded roads or rivers.',
                'type'      => 'critical',
                'hours_ago' => 60,
            ],
            [
                'title'     => 'CRITICAL: Pantalan River at Critical Level',
                'body'      => 'Pantalan River has exceeded the critical water level threshold of 8.5 meters as of 9:00 PM, September 6. All residents within 500 meters of the riverbank must evacuate immediately. MDRRMO rescue boats are deployed. Call the hotline 0917-XXX-XXXX for emergency assistance.',
                'type'      => 'critical',
                'hours_ago' => 58,
            ],
            [
                'title'     => 'UPDATE: Rescue Operations in Brgy. Pantalan and Bucana',
                'body'      => 'MDRRMO Rescue Units 1 and 2 are conducting rescue operations in Brgy. Pantalan and Bucana since last night. 52 families (213 individuals) have been successfully evacuated to the Nasugbu Municipal Gymnasium and National High School. Operations are ongoing. Road closures remain around Pantalan Bridge.',
                'type'      => 'update',
                'hours_ago' => 50,
            ],
            [
                'title'     => 'UPDATE: Evacuation Centers Status — September 7',
                'body'      => 'Current evacuation center status: Nasugbu Municipal Gymnasium — 156 evacuees (13% capacity), Nasugbu National High School — 89 evacuees (6% capacity), Bilaran Covered Court — 47 evacuees (13% capacity), Wawa Covered Court — 38 evacuees (13% capacity). All centers have sufficient food and water supply for 48 hours.',
                'type'      => 'update',
                'hours_ago' => 40,
            ],
            [
                'title'     => 'UPDATE: Pantalan Bridge Closed to All Traffic',
                'body'      => 'Pantalan Bridge is closed to all motorists effective September 7 due to flood damage and debris accumulation. DPWH engineers will assess structural integrity once water levels recede. Alternate route: use the bypass road via Brgy. Bilaran to the national highway. Expected closure duration: 48-72 hours.',
                'type'      => 'update',
                'hours_ago' => 36,
            ],
            [
                'title'     => 'ADVISORY: Continuous Rainfall Expected — 48-Hour Forecast',
                'body'      => 'PAGASA forecasts continuous moderate to heavy rainfall over Nasugbu and neighboring towns for the next 48 hours due to the enhanced southwest monsoon (habagat). Residents in flood-prone barangays should remain in evacuation centers. Do not return to flooded homes until official clearance from the MDRRMO.',
                'type'      => 'advisory',
                'hours_ago' => 30,
            ],
            [
                'title'     => 'ADVISORY: Post-Flood Health Warning — Leptospirosis',
                'body'      => 'The Municipal Health Office warns residents of elevated leptospirosis risk following the September flooding. Symptoms include high fever, headache, muscle pain, and jaundice. Avoid walking barefoot in floodwater or mud. If symptoms appear within 2 weeks of flood exposure, seek medical attention immediately at the Lian-Nasugbu District Hospital.',
                'type'      => 'advisory',
                'hours_ago' => 24,
            ],
            [
                'title'     => 'ADVISORY: Relief Distribution Schedule — September 9',
                'body'      => 'The MDRRMO and DSWD will distribute relief goods on September 9 at 8:00 AM at the following locations: (1) Nasugbu Municipal Gymnasium — Pantalan, Bucana, and Wawa evacuees, (2) Bilaran Covered Court — Bilaran and Lumbangan evacuees. Bring your barangay certificate and valid ID. One relief pack per household.',
                'type'      => 'advisory',
                'hours_ago' => 12,
            ],
            [
                'title'     => 'UPDATE: Water Levels Stabilizing — September 9 Morning',
                'body'      => 'As of 6:00 AM today, Pantalan River water level has dropped to 6.2 meters (below alarm level). Floodwater in most barangays is receding. However, residents should NOT return to their homes until the MDRRMO issues a formal clearance. Structural damage assessments are ongoing.',
                'type'      => 'update',
                'hours_ago' => 3,
            ],
            [
                'title'     => 'ADVISORY: Wet Season Preparedness Reminder',
                'body'      => 'With 3 major flood events since June, the MDRRMO reminds all Nasugbu residents to: (1) Know your nearest evacuation center and route, (2) Keep a 3-day emergency kit ready at all times, (3) Monitor FloodTrack for real-time flood reports, (4) Report flooding immediately through the app to help the MDRRMO respond faster. Your reports save lives.',
                'type'      => 'advisory',
                'hours_ago' => 1,
            ],
        ];

        foreach ($alerts as $a) {
            Alert::firstOrCreate(
                ['title' => $a['title']],
                [
                    'created_by' => $admin->id,
                    'title'      => $a['title'],
                    'body'       => $a['body'],
                    'type'       => $a['type'],
                    'created_at' => now()->subHours($a['hours_ago']),
                    'updated_at' => now()->subHours($a['hours_ago']),
                ]
            );
        }

        $this->command->info('✓ Seeded 10 alerts & advisories.');
    }

    // -------------------------------------------------------------------------
    // Evacuation Center Occupancy (reflecting current September event)
    // -------------------------------------------------------------------------

    private function seedEvacuationOccupancy(): void
    {
        $occupancy = [
            'Nasugbu Municipal Gymnasium'    => 156,
            'Nasugbu National High School'   => 89,
            'Brgy. Bilaran Covered Court'    => 47,
            'Brgy. Wawa Covered Court'       => 38,
            'Brgy. Bucana Evacuation Center' => 62,
            'Brgy. Lumbangan Barangay Hall'  => 23,
        ];

        foreach ($occupancy as $name => $count) {
            EvacuationCenter::where('name', $name)->update(['current_occupancy' => $count]);
        }

        $this->command->info('✓ Updated evacuation center occupancy.');
    }
}
