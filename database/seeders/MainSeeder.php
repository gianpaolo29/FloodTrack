<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\EvacuationCenter;
use App\Models\Hazard;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class MainSeeder extends Seeder
{
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
    // Reports — spread across June–September 2026 (Philippine wet season)
    // 60 reports simulating 6 distinct flood events over 4 months
    // -------------------------------------------------------------------------

    private function seedReports(array $residents, array $teams, User $admin): void
    {
        $reports = [
            // ═══════════════════════════════════════════════════════════════════
            // EVENT 1: Tropical Depression "Butchoy" — June 18-19, 2026
            // Moderate rainfall, localized flooding in low-lying barangays
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06810, 'lng' => 120.63520, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Ankle-deep flooding along the main road after 4 hours of continuous rain. Some households moved belongings to upper floors.',           'date' => '2026-06-18 08:30:00', 'team_idx' => 2],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06120, 'lng' => 120.64050, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Road from Lumbangan to poblacion impassable due to flooding. Residents using alternate route through Brgy. Kaylaway.',                   'date' => '2026-06-18 09:15:00', 'team_idx' => 3],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05840, 'lng' => 120.64060, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Runoff from surrounding hills pooling near the elementary school. Water level about 15cm, slowly draining.',                              'date' => '2026-06-18 10:00:00', 'team_idx' => null],
            ['address' => 'National Highway, Brgy. III, Nasugbu, Batangas',  'lat' => 14.07080, 'lng' => 120.63170, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Minor puddles forming on the highway near the civic center. Traffic slowing down but road still passable.',                               'date' => '2026-06-18 11:20:00', 'team_idx' => null],
            ['address' => 'Concepcion St., Poblacion, Nasugbu, Batangas',    'lat' => 14.07380, 'lng' => 120.63510, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Drainage overflow near West Central School. Water receded within 2 hours after rain stopped.',                                           'date' => '2026-06-19 06:45:00', 'team_idx' => null],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07290, 'lng' => 120.62820, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Creek water level rose but did not overflow. Barangay tanods monitoring since 5 AM. Situation stabilized by noon.',                       'date' => '2026-06-19 07:30:00', 'team_idx' => 3],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 2: Southwest Monsoon intensified — July 8-10, 2026
            // Heavy rainfall, moderate flooding in several barangays
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08530, 'lng' => 120.62910, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Pantalan River rising rapidly. Knee-deep flooding on residential streets near the riverbank. 8 families voluntarily evacuated.',           'date' => '2026-07-08 14:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08050, 'lng' => 120.62300, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Floodwater from the river spreading into the coastal barangay. Several homes have 30cm of standing water inside.',                        'date' => '2026-07-08 14:45:00', 'team_idx' => 1],
            ['address' => 'Wawa Creek, Brgy. Wawa, Nasugbu, Batangas',       'lat' => 14.07140, 'lng' => 120.62640, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Wawa Creek overflowed after 6 hours of nonstop rain. Floodwater reached the barangay hall. Evacuations assisted by BRT.',                 'date' => '2026-07-08 16:30:00', 'team_idx' => 3],
            ['address' => 'Pantalan Bridge, Nasugbu, Batangas',              'lat' => 14.08700, 'lng' => 120.63050, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Debris accumulating under Pantalan Bridge causing backflow. DPWH clearing crew dispatched. Bridge approach has 20cm of water.',           'date' => '2026-07-08 17:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06870, 'lng' => 120.63560, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Low-lying area flooded again. Water entered 5 houses. Covered court opened as temporary shelter for affected families.',                   'date' => '2026-07-09 05:20:00', 'team_idx' => 2],
            ['address' => 'J.P. Laurel St., Poblacion, Nasugbu, Batangas',   'lat' => 14.07760, 'lng' => 120.63810, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Clogged drainage causing street flooding near the municipal gymnasium. Ankle to knee-deep. Cleanup crew working on the drainage.',        'date' => '2026-07-09 07:10:00', 'team_idx' => 4],
            ['address' => 'Near District Hospital, Nasugbu, Batangas',       'lat' => 14.06960, 'lng' => 120.63710, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Flooding near hospital main entrance. Sandbags deployed at doorways. Ambulance access rerouted through the back entrance.',               'date' => '2026-07-09 08:40:00', 'team_idx' => 1],
            ['address' => 'Brgy. Lumbangan Road, Nasugbu, Batangas',         'lat' => 14.06200, 'lng' => 120.64020, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Road eroded and puddles formed. Passable with caution for motorcycles. Barangay requested DPWH road repair.',                             'date' => '2026-07-10 09:00:00', 'team_idx' => null],
            ['address' => 'Side Street near Town Plaza, Nasugbu',            'lat' => 14.07490, 'lng' => 120.63390, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Reported as flooding but upon verification, it was just accumulated rainwater from a broken pipe. Referred to municipal water utility.',  'date' => '2026-07-10 10:30:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 3: Typhoon "Carina" — July 22-25, 2026
            // Strongest event — widespread critical flooding
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Pantalan Riverside, Brgy. Pantalan, Nasugbu',     'lat' => 14.08610, 'lng' => 120.62980, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Severe flooding near the river mouth. Water rose over 1.5 meters in 2 hours. Families stranded on rooftops rescued by MDRRMO boat.',      'date' => '2026-07-22 22:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana Coastal Road, Nasugbu, Batangas',    'lat' => 14.08100, 'lng' => 120.62350, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Storm surge combined with river overflow. Chest-level floodwater inside homes. Road completely impassable. 34 families evacuated.',        'date' => '2026-07-22 23:15:00', 'team_idx' => 1],
            ['address' => 'Wawa Creek, Brgy. Wawa, Nasugbu, Batangas',       'lat' => 14.07200, 'lng' => 120.62750, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Creek overflowed massively. Floodwater spreading into Brgy. Bilaran. Elderly residents unable to evacuate on their own.',                  'date' => '2026-07-23 01:40:00', 'team_idx' => 3],
            ['address' => 'National Highway near Market, Nasugbu, Batangas', 'lat' => 14.07830, 'lng' => 120.63120, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Major highway flooding. Market stalls submerged. Vendors lost merchandise. Flash flood swept away two parked tricycles.',                   'date' => '2026-07-23 02:20:00', 'team_idx' => 2],
            ['address' => 'Coastal Area near Pier, Nasugbu, Batangas',       'lat' => 14.07650, 'lng' => 120.62460, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Tidal flooding during high tide combined with typhoon rainfall. Fishing boats damaged. MDRRMO boat rescue operations underway.',            'date' => '2026-07-23 04:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Pantalan Elementary School, Nasugbu',       'lat' => 14.08450, 'lng' => 120.62860, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Floodwater entering school grounds. Classes suspended. School furniture moved to second floor. Nearby families evacuated to gymnasium.',   'date' => '2026-07-23 05:30:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bilaran, Low-Lying Area, Nasugbu',          'lat' => 14.06810, 'lng' => 120.63480, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Entire lower portion of barangay submerged. 15 families evacuated to Bilaran Covered Court. Drainage completely overwhelmed.',             'date' => '2026-07-23 06:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Lumbangan, Sitio Malapad, Nasugbu',         'lat' => 14.06120, 'lng' => 120.64080, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Road to town completely cut off by floodwater. Residents relied on boats for 2 days. Relief goods delivered by rubber boat.',               'date' => '2026-07-23 07:15:00', 'team_idx' => 3],
            ['address' => 'Sitio Malapad, Brgy. Bucana, Nasugbu',            'lat' => 14.06490, 'lng' => 120.63820, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Flash flooding in creek-adjacent settlement. Three homes partially submerged. One wall collapsed. No casualties reported.',                'date' => '2026-07-23 08:00:00', 'team_idx' => 1],
            ['address' => 'Near West Central School, Nasugbu',               'lat' => 14.07340, 'lng' => 120.63310, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Street flooding near school. Parents unable to fetch children. Students sheltered inside until water subsided around 2 PM.',               'date' => '2026-07-23 09:45:00', 'team_idx' => 4],
            ['address' => 'San Antonio de Padua Parish, Nasugbu',            'lat' => 14.07440, 'lng' => 120.63440, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Streets surrounding the church flooded with debris from typhoon. Drainage outlets blocked. Parishioners helped with cleanup.',             'date' => '2026-07-24 06:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Kaylaway Interior, Nasugbu',                'lat' => 14.05740, 'lng' => 120.64160, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Landslide debris blocked drainage canal causing localized flooding in 3 households. Barangay crew cleared debris within 5 hours.',          'date' => '2026-07-24 08:00:00', 'team_idx' => null],
            ['address' => 'Brgy. Poblacion IV, Nasugbu, Batangas',           'lat' => 14.07590, 'lng' => 120.63660, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Minor post-typhoon flooding from clogged canal. Barangay crew cleared within the hour. No household impact.',                              'date' => '2026-07-25 07:00:00', 'team_idx' => null],
            ['address' => 'Nasugbu Civic Center, Brgy. III, Nasugbu',        'lat' => 14.07090, 'lng' => 120.63120, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Reported flooding at civic center parking area. Upon checking, water was from a burst fire hydrant, not flood-related.',                    'date' => '2026-07-25 09:00:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 4: Monsoon rains — August 5-7, 2026
            // Moderate event, habagat-driven continuous rainfall
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08380, 'lng' => 120.62780, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'River bank overflowing again after 3 days of continuous monsoon rain. 12 families preemptively evacuated based on last month experience.',  'date' => '2026-08-05 15:30:00', 'team_idx' => 0],
            ['address' => 'Brgy. Wawa, Riverside Settlement, Nasugbu',       'lat' => 14.07210, 'lng' => 120.62760, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Floodwaters entering homes along the creek. Residents more prepared this time — furniture already elevated. 5 families evacuated.',          'date' => '2026-08-05 17:00:00', 'team_idx' => 3],
            ['address' => 'Brgy. Bucana Interior, Nasugbu, Batangas',        'lat' => 14.07960, 'lng' => 120.62460, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Moderate flooding in low-lying streets. Water entered some homes up to ankle level. Residents used sandbags from last distribution.',       'date' => '2026-08-06 06:20:00', 'team_idx' => 1],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06940, 'lng' => 120.63600, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Repeat flooding in the same low-lying portion. 3 families evacuated to covered court. Water level lower than July event.',                  'date' => '2026-08-06 08:45:00', 'team_idx' => 2],
            ['address' => 'Poblacion, near Municipal Hall, Nasugbu',         'lat' => 14.07500, 'lng' => 120.63700, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Drainage backup near municipal hall. Shallow flooding on sidewalk only. Municipal maintenance crew deployed pumps.',                        'date' => '2026-08-07 07:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06050, 'lng' => 120.64110, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Light flooding at road junction. Cleared naturally after rain stopped. No assistance required.',                                           'date' => '2026-08-07 10:00:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 5: Typhoon "Dindo" — August 20-23, 2026
            // Severe typhoon, second worst event after "Carina"
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Brgy. Pantalan, Nasugbu, Batangas',               'lat' => 14.08550, 'lng' => 120.63020, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Pantalan River at critical level. Entire riverside settlement flooded. Rescue boats deployed for 27 stranded families.',                   'date' => '2026-08-20 20:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana, Nasugbu, Batangas',                 'lat' => 14.08000, 'lng' => 120.62250, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Coastal flooding combined with storm surge. Waist-deep water inside homes. Fish pens destroyed. 45 families at evacuation center.',        'date' => '2026-08-20 21:30:00', 'team_idx' => 1],
            ['address' => 'Brgy. Wawa, Nasugbu, Batangas',                   'lat' => 14.07150, 'lng' => 120.62650, 'severity' => 'critical', 'status' => 'resolved',  'desc' => 'Creek walls breached. Floodwater rushing through residential area. Emergency siren activated. Mass evacuation to Wawa Covered Court.',      'date' => '2026-08-21 00:30:00', 'team_idx' => 3],
            ['address' => 'National Highway, Nasugbu Public Market',         'lat' => 14.07850, 'lng' => 120.63100, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Market and highway flooded. Vendors lost goods for second time in a month. DPWH heavy equipment deployed to clear road.',                    'date' => '2026-08-21 04:15:00', 'team_idx' => 2],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06800, 'lng' => 120.63500, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Third flooding event in 2 months. Entire lower barangay evacuated preemptively. Covered court at capacity. Overflow sent to gymnasium.',    'date' => '2026-08-21 05:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06150, 'lng' => 120.64000, 'severity' => 'high',     'status' => 'resolved',  'desc' => 'Road to town cut off again. Barangay isolated for 18 hours. Relief goods airlifted by provincial government helicopter.',                   'date' => '2026-08-21 06:30:00', 'team_idx' => 3],
            ['address' => 'Pantalan Senior High School Area, Nasugbu',       'lat' => 14.08730, 'lng' => 120.63110, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'School grounds flooded. Used as temporary parking for rescued vehicles from lower Pantalan. Water receded after 8 hours.',                 'date' => '2026-08-22 07:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05800, 'lng' => 120.64100, 'severity' => 'moderate', 'status' => 'resolved',  'desc' => 'Hill runoff flooding near elementary school worse than June. Temporary diversion canal dug by barangay volunteers.',                        'date' => '2026-08-22 08:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Poblacion, Nasugbu, Batangas',              'lat' => 14.08140, 'lng' => 120.63960, 'severity' => 'low',      'status' => 'resolved',  'desc' => 'Light flooding in elevated area. Draining slowly via roadside canal. No evacuation needed. Cleanup completed same day.',                    'date' => '2026-08-23 06:00:00', 'team_idx' => null],
            ['address' => 'Near East Central School, Poblacion, Nasugbu',    'lat' => 14.07610, 'lng' => 120.63690, 'severity' => 'low',      'status' => 'rejected',  'desc' => 'Report submitted with photo from July typhoon. Duplicate/outdated submission. Reporter advised to submit current photos only.',             'date' => '2026-08-23 09:15:00', 'team_idx' => null],

            // ═══════════════════════════════════════════════════════════════════
            // EVENT 6: Current event — September 6-9, 2026 (ongoing)
            // Active flooding — mix of statuses
            // ═══════════════════════════════════════════════════════════════════
            ['address' => 'Pantalan Riverside, Brgy. Pantalan, Nasugbu',     'lat' => 14.08530, 'lng' => 120.62910, 'severity' => 'critical', 'status' => 'assigned',  'desc' => 'Severe flooding at the same riverside area. Water level 1.2 meters and rising. 6 families on rooftops awaiting rescue.',                    'date' => '2026-09-06 21:00:00', 'team_idx' => 0],
            ['address' => 'Brgy. Bucana Coastal Road, Nasugbu, Batangas',    'lat' => 14.08050, 'lng' => 120.62300, 'severity' => 'critical', 'status' => 'assigned',  'desc' => 'Storm surge and river overflow — same pattern as July. Floodwater chest-level in some homes. Boats from LGU deployed.',                     'date' => '2026-09-06 22:30:00', 'team_idx' => 1],
            ['address' => 'Wawa Creek, Brgy. Wawa, Nasugbu',                 'lat' => 14.07140, 'lng' => 120.62640, 'severity' => 'critical', 'status' => 'verified',  'desc' => 'Creek overflowing for the third time this season. Breach in same wall section from August. MDRRMO deploying sandbag reinforcement.',       'date' => '2026-09-07 00:15:00', 'team_idx' => 3],
            ['address' => 'National Highway near Market, Nasugbu',           'lat' => 14.07830, 'lng' => 120.63120, 'severity' => 'high',     'status' => 'verified',  'desc' => 'Highway flooded near public market. Vendors proactively moved goods to higher stalls this time. Road impassable to small vehicles.',       'date' => '2026-09-07 03:00:00', 'team_idx' => 2],
            ['address' => 'Brgy. Bilaran, Nasugbu, Batangas',                'lat' => 14.06870, 'lng' => 120.63560, 'severity' => 'high',     'status' => 'assigned',  'desc' => 'Fourth flooding this wet season. Families already at covered court since yesterday. Water level rising faster than previous events.',       'date' => '2026-09-07 05:30:00', 'team_idx' => 2],
            ['address' => 'Brgy. Pantalan, Near Elementary School, Nasugbu', 'lat' => 14.08450, 'lng' => 120.62860, 'severity' => 'high',     'status' => 'assigned',  'desc' => 'School grounds flooded again. Preemptive class suspension issued. Rescue team evacuating elderly residents from nearby houses.',             'date' => '2026-09-07 06:45:00', 'team_idx' => 0],
            ['address' => 'Near District Hospital, Nasugbu, Batangas',       'lat' => 14.06960, 'lng' => 120.63710, 'severity' => 'moderate', 'status' => 'verified',  'desc' => 'Flooding near hospital entrance. Sandbag wall from August still partially intact. Emergency entrance rerouted.',                           'date' => '2026-09-07 08:20:00', 'team_idx' => 1],
            ['address' => 'Brgy. Lumbangan, Nasugbu, Batangas',              'lat' => 14.06200, 'lng' => 120.64020, 'severity' => 'moderate', 'status' => 'verified',  'desc' => 'Road flooding at the usual low point. Barangay volunteers posted warning signs. Vehicle access from the east side still open.',             'date' => '2026-09-08 06:00:00', 'team_idx' => null],
            ['address' => 'J.P. Laurel St., Poblacion, Nasugbu',             'lat' => 14.07760, 'lng' => 120.63810, 'severity' => 'moderate', 'status' => 'pending',   'desc' => 'Drainage flooding near gymnasium. Water about 20cm on the road. Residents requesting barangay pump deployment.',                            'date' => '2026-09-08 07:30:00', 'team_idx' => null],
            ['address' => 'Brgy. Kaylaway, Nasugbu, Batangas',               'lat' => 14.05840, 'lng' => 120.64060, 'severity' => 'moderate', 'status' => 'pending',   'desc' => 'Hill runoff flooding near school, same as previous events. Temporary canal from August partially collapsed and needs repair.',              'date' => '2026-09-08 09:00:00', 'team_idx' => null],
            ['address' => 'Concepcion St., Poblacion, Nasugbu',              'lat' => 14.07380, 'lng' => 120.63510, 'severity' => 'low',      'status' => 'pending',   'desc' => 'Light flooding near West Central School. Drainage clogged with leaves and plastic waste. Requesting barangay cleanup crew.',                'date' => '2026-09-08 10:15:00', 'team_idx' => null],
            ['address' => 'Brgy. Wawa, Upper Area, Nasugbu',                 'lat' => 14.07290, 'lng' => 120.62820, 'severity' => 'low',      'status' => 'pending',   'desc' => 'Fallen tree partially blocking creek flow in upper portion. No flooding yet but could worsen if not cleared before next heavy rain.',        'date' => '2026-09-09 06:30:00', 'team_idx' => null],
        ];

        $residentCount = count($residents);

        foreach ($reports as $i => $r) {
            $resident  = $residents[$i % $residentCount];
            $team      = $r['team_idx'] !== null ? $teams[$r['team_idx']] : null;
            $responder = $team ? ($team->responders[0] ?? null) : null;

            $createdAt  = Carbon::parse($r['date']);
            $verifiedAt = in_array($r['status'], ['verified', 'assigned', 'resolved', 'rejected'])
                ? $createdAt->copy()->addMinutes(rand(10, 45))
                : null;
            $assignedAt = in_array($r['status'], ['assigned', 'resolved']) && $team
                ? ($verifiedAt ?? $createdAt)->copy()->addMinutes(rand(15, 60))
                : null;
            $resolvedAt = $r['status'] === 'resolved'
                ? ($assignedAt ?? $createdAt)->copy()->addHours(rand(2, 8))
                : null;

            $report = Report::firstOrCreate(
                ['latitude' => $r['lat'], 'longitude' => $r['lng'], 'created_at' => $createdAt],
                [
                    'user_id'          => $resident->id,
                    'severity'         => $r['severity'],
                    'status'           => $r['status'],
                    'description'      => $r['desc'],
                    'latitude'         => $r['lat'],
                    'longitude'        => $r['lng'],
                    'address'          => $r['address'],
                    'assigned_to'      => $responder?->id,
                    'assigned_team_id' => $team?->id,
                    'verified_by'      => $verifiedAt ? $admin->id : null,
                    'verified_at'      => $verifiedAt,
                    'assigned_at'      => $assignedAt,
                    'resolved_at'      => $resolvedAt,
                    'created_at'       => $createdAt,
                    'updated_at'       => $resolvedAt ?? $assignedAt ?? $verifiedAt ?? $createdAt,
                ]
            );

            // Seed status update history for activity feed
            if ($report->wasRecentlyCreated) {
                $this->seedStatusUpdates($report, $r['status'], $admin, $responder, $createdAt, $verifiedAt, $assignedAt, $resolvedAt);
            }
        }

        $this->command->info('✓ Seeded ' . count($reports) . ' flood reports across 6 events (June–September 2026).');
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
