<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\EvacuationCenter;
use App\Models\Hazard;
use App\Models\Report;
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
    // Residents
    // -------------------------------------------------------------------------

    private function seedResidents(): array
    {
        $data = [
            ['name' => 'Maria Santos',    'email' => 'maria.santos@gmail.com',    'contact_number' => '09171000001'],
            ['name' => 'Jose Reyes',      'email' => 'jose.reyes@gmail.com',      'contact_number' => '09171000002'],
            ['name' => 'Ana Dela Cruz',   'email' => 'ana.delacruz@gmail.com',    'contact_number' => '09171000003'],
            ['name' => 'Ramon Garcia',    'email' => 'ramon.garcia@gmail.com',    'contact_number' => '09171000004'],
            ['name' => 'Liza Fernandez',  'email' => 'liza.fernandez@gmail.com',  'contact_number' => '09171000005'],
        ];

        return array_map(fn($d) => User::firstOrCreate(
            ['email' => $d['email']],
            array_merge($d, [
                'password'          => bcrypt('password123'),
                'role'              => 'resident',
                'email_verified_at' => now(),
            ])
        ), $data);
    }

    // -------------------------------------------------------------------------
    // Teams & Responders
    // -------------------------------------------------------------------------

    private function seedTeams(User $admin): array
    {
        $teamData = [
            [
                'name'      => 'Alpha Response Team',
                'responders' => [
                    ['name' => 'Carlos Mendoza',   'email' => 'carlos.mendoza@floodtrack.com',   'contact_number' => '09181001001'],
                    ['name' => 'Diana Ramos',       'email' => 'diana.ramos@floodtrack.com',       'contact_number' => '09181001002'],
                    ['name' => 'Eduardo Torres',    'email' => 'eduardo.torres@floodtrack.com',    'contact_number' => '09181001003'],
                    ['name' => 'Felicia Cruz',      'email' => 'felicia.cruz@floodtrack.com',      'contact_number' => '09181001004'],
                    ['name' => 'Gregorio Lim',      'email' => 'gregorio.lim@floodtrack.com',      'contact_number' => '09181001005'],
                ],
            ],
            [
                'name'      => 'Bravo Rescue Unit',
                'responders' => [
                    ['name' => 'Herminia Bautista', 'email' => 'herminia.bautista@floodtrack.com', 'contact_number' => '09181002001'],
                    ['name' => 'Ignacio Villanueva','email' => 'ignacio.villanueva@floodtrack.com','contact_number' => '09181002002'],
                    ['name' => 'Jasmine Aquino',    'email' => 'jasmine.aquino@floodtrack.com',    'contact_number' => '09181002003'],
                    ['name' => 'Kevin Pascual',     'email' => 'kevin.pascual@floodtrack.com',     'contact_number' => '09181002004'],
                    ['name' => 'Lorraine Navarro',  'email' => 'lorraine.navarro@floodtrack.com',  'contact_number' => '09181002005'],
                ],
            ],
            [
                'name'      => 'Charlie Relief Group',
                'responders' => [
                    ['name' => 'Manuel Dizon',      'email' => 'manuel.dizon@floodtrack.com',      'contact_number' => '09181003001'],
                    ['name' => 'Nilda Ocampo',      'email' => 'nilda.ocampo@floodtrack.com',      'contact_number' => '09181003002'],
                    ['name' => 'Orlando Macaraeg',  'email' => 'orlando.macaraeg@floodtrack.com',  'contact_number' => '09181003003'],
                    ['name' => 'Patricia Soriano',  'email' => 'patricia.soriano@floodtrack.com',  'contact_number' => '09181003004'],
                    ['name' => 'Quirino Abella',    'email' => 'quirino.abella@floodtrack.com',    'contact_number' => '09181003005'],
                ],
            ],
            [
                'name'      => 'Delta Emergency Corps',
                'responders' => [
                    ['name' => 'Rosario Castillo',  'email' => 'rosario.castillo@floodtrack.com',  'contact_number' => '09181004001'],
                    ['name' => 'Salvador Dela Rosa','email' => 'salvador.delarosa@floodtrack.com', 'contact_number' => '09181004002'],
                    ['name' => 'Teresita Aguilar',  'email' => 'teresita.aguilar@floodtrack.com',  'contact_number' => '09181004003'],
                    ['name' => 'Uldarico Espinosa', 'email' => 'uldarico.espinosa@floodtrack.com', 'contact_number' => '09181004004'],
                    ['name' => 'Violeta Morales',   'email' => 'violeta.morales@floodtrack.com',   'contact_number' => '09181004005'],
                ],
            ],
            [
                'name'      => 'Echo Flood Task Force',
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
            // Create responders first (without team)
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

            // Create team with first responder as leader
            $team = Team::firstOrCreate(
                ['name' => $td['name']],
                ['leader_id' => $responderUsers[0]->id]
            );

            // Assign team_id to all responders
            foreach ($responderUsers as $ru) {
                $ru->update(['team_id' => $team->id]);
            }

            $team->responders = $responderUsers;
            $teams[] = $team;
        }

        $this->command->info('✓ Seeded 5 teams with 5 responders each.');
        return $teams;
    }

    // -------------------------------------------------------------------------
    // Reports (30 realistic flood reports)
    // -------------------------------------------------------------------------

    private function seedReports(array $residents, array $teams, User $admin): void
    {
        $reports = [
            // --- CRITICAL (recent, ongoing) ---
            [
                'address'   => 'Pantalan Riverside, Brgy. Pantalan, Nasugbu, Batangas',
                'lat'       => 14.08530, 'lng' => 120.62910,
                'severity'  => 'critical',
                'status'    => 'assigned',
                'desc'      => 'Severe flooding near the river mouth. Water level has risen over 1.5 meters. Several families stranded on rooftops.',
                'hours_ago' => 2,
                'team_idx'  => 0,
            ],
            [
                'address'   => 'Brgy. Bucana Coastal Road, Nasugbu, Batangas',
                'lat'       => 14.08050, 'lng' => 120.62300,
                'severity'  => 'critical',
                'status'    => 'assigned',
                'desc'      => 'Storm surge combined with river overflow. Floodwater entered homes up to chest level. Road completely impassable.',
                'hours_ago' => 3,
                'team_idx'  => 1,
            ],
            [
                'address'   => 'Wawa Creek, Brgy. Wawa, Nasugbu, Batangas',
                'lat'       => 14.07140, 'lng' => 120.62640,
                'severity'  => 'critical',
                'status'    => 'verified',
                'desc'      => 'Creek overflowing rapidly. Floodwater spreading into adjacent barangay. Elderly residents unable to evacuate.',
                'hours_ago' => 4,
                'team_idx'  => 2,
            ],
            [
                'address'   => 'National Highway near Public Market, Nasugbu, Batangas',
                'lat'       => 14.07830, 'lng' => 120.63120,
                'severity'  => 'critical',
                'status'    => 'verified',
                'desc'      => 'Major flooding on the highway. Market stalls submerged. Flash flood warning issued for the area.',
                'hours_ago' => 1,
                'team_idx'  => 3,
            ],
            [
                'address'   => 'Coastal Barangay near Pier, Nasugbu, Batangas',
                'lat'       => 14.07650, 'lng' => 120.62460,
                'severity'  => 'critical',
                'status'    => 'assigned',
                'desc'      => 'Tidal flooding during high tide combined with heavy rainfall. Boat rescue operations underway.',
                'hours_ago' => 5,
                'team_idx'  => 4,
            ],

            // --- HIGH (active, some assigned) ---
            [
                'address'   => 'Brgy. Pantalan, Near Elementary School, Nasugbu',
                'lat'       => 14.08450, 'lng' => 120.62860,
                'severity'  => 'high',
                'status'    => 'assigned',
                'desc'      => 'Floodwater entering school grounds. Knee-deep on residential streets. Evacuation of nearby families ongoing.',
                'hours_ago' => 6,
                'team_idx'  => 0,
            ],
            [
                'address'   => 'Pantalan Bridge Approach, Nasugbu, Batangas',
                'lat'       => 14.08700, 'lng' => 120.63050,
                'severity'  => 'high',
                'status'    => 'verified',
                'desc'      => 'Debris accumulating under the bridge causing backflow. Water rising upstream. Bridge approach flooded.',
                'hours_ago' => 7,
                'team_idx'  => 1,
            ],
            [
                'address'   => 'Brgy. Bilaran, Low-Lying Area, Nasugbu',
                'lat'       => 14.06810, 'lng' => 120.63520,
                'severity'  => 'high',
                'status'    => 'assigned',
                'desc'      => 'Heavy flooding in residential area. Several households require evacuation. Drainage completely overwhelmed.',
                'hours_ago' => 8,
                'team_idx'  => 2,
            ],
            [
                'address'   => 'Brgy. Wawa, Riverside Settlement, Nasugbu',
                'lat'       => 14.07210, 'lng' => 120.62760,
                'severity'  => 'high',
                'status'    => 'assigned',
                'desc'      => 'Floodwaters rising rapidly. Three families trapped. Rescue team requested.',
                'hours_ago' => 9,
                'team_idx'  => 3,
            ],
            [
                'address'   => 'Near District Hospital, National Highway, Nasugbu',
                'lat'       => 14.06960, 'lng' => 120.63710,
                'severity'  => 'high',
                'status'    => 'verified',
                'desc'      => 'Flooding near hospital main entrance. Access road partially blocked. Patient transport affected.',
                'hours_ago' => 10,
                'team_idx'  => 4,
            ],
            [
                'address'   => 'Brgy. Lumbangan, Sitio Malapad, Nasugbu',
                'lat'       => 14.06120, 'lng' => 120.64050,
                'severity'  => 'high',
                'status'    => 'verified',
                'desc'      => 'Low-lying barangay flooded. Road connecting to town cut off. Residents relying on bancas for transport.',
                'hours_ago' => 12,
                'team_idx'  => 0,
            ],
            [
                'address'   => 'Sitio Malapad, Brgy. Bucana, Nasugbu, Batangas',
                'lat'       => 14.06490, 'lng' => 120.63820,
                'severity'  => 'high',
                'status'    => 'assigned',
                'desc'      => 'Flash flooding in creek-adjacent settlement. Three homes partially submerged. Residents evacuating voluntarily.',
                'hours_ago' => 14,
                'team_idx'  => 1,
            ],

            // --- MODERATE (mix of verified and pending) ---
            [
                'address'   => 'J.P. Laurel St., Poblacion, Nasugbu, Batangas',
                'lat'       => 14.07760, 'lng' => 120.63810,
                'severity'  => 'moderate',
                'status'    => 'verified',
                'desc'      => 'Clogged drainage causing street flooding near the municipal gymnasium. Ankle to knee-deep water.',
                'hours_ago' => 15,
                'team_idx'  => 2,
            ],
            [
                'address'   => 'Concepcion St., Brgy. IV, Poblacion, Nasugbu',
                'lat'       => 14.07380, 'lng' => 120.63510,
                'severity'  => 'moderate',
                'status'    => 'verified',
                'desc'      => 'Moderate flooding on main street near school. Drainage system overwhelmed after 3 hours of continuous rain.',
                'hours_ago' => 16,
                'team_idx'  => 3,
            ],
            [
                'address'   => 'Near Nasugbu West Central School, Nasugbu',
                'lat'       => 14.07340, 'lng' => 120.63310,
                'severity'  => 'moderate',
                'status'    => 'pending',
                'desc'      => 'Flooding near school entrance. Students dismissed early. Water level approximately 30cm on road.',
                'hours_ago' => 18,
                'team_idx'  => null,
            ],
            [
                'address'   => 'San Antonio de Padua Parish, Poblacion, Nasugbu',
                'lat'       => 14.07440, 'lng' => 120.63440,
                'severity'  => 'moderate',
                'status'    => 'pending',
                'desc'      => 'Shallow flooding on streets surrounding the church. Drainage outlets blocked by debris from typhoon.',
                'hours_ago' => 20,
                'team_idx'  => null,
            ],
            [
                'address'   => 'Brgy. Bilaran Covered Court Area, Nasugbu',
                'lat'       => 14.06870, 'lng' => 120.63560,
                'severity'  => 'moderate',
                'status'    => 'verified',
                'desc'      => 'Floodwater receding but standing water still significant around covered court. Community shelter activated.',
                'hours_ago' => 22,
                'team_idx'  => 4,
            ],
            [
                'address'   => 'National Highway, Brgy. III, Nasugbu, Batangas',
                'lat'       => 14.07080, 'lng' => 120.63170,
                'severity'  => 'moderate',
                'status'    => 'verified',
                'desc'      => 'Highway partially flooded causing traffic slowdown. DPWH notified. One lane passable with caution.',
                'hours_ago' => 24,
                'team_idx'  => 0,
            ],
            [
                'address'   => 'Brgy. Kaylaway, Near Elementary School, Nasugbu',
                'lat'       => 14.05840, 'lng' => 120.64060,
                'severity'  => 'moderate',
                'status'    => 'pending',
                'desc'      => 'Moderate flooding near school grounds. Low-lying area collecting runoff from surrounding hills.',
                'hours_ago' => 26,
                'team_idx'  => null,
            ],
            [
                'address'   => 'Brgy. Lumbangan Road, Nasugbu, Batangas',
                'lat'       => 14.06200, 'lng' => 120.64020,
                'severity'  => 'moderate',
                'status'    => 'verified',
                'desc'      => 'Road surface eroded and flooded. Multiple potholes formed. Motorists advised to use alternate route.',
                'hours_ago' => 28,
                'team_idx'  => 1,
            ],
            [
                'address'   => 'Nasugbu Civic Center, Brgy. III, Nasugbu',
                'lat'       => 14.07090, 'lng' => 120.63120,
                'severity'  => 'moderate',
                'status'    => 'pending',
                'desc'      => 'Parking area and ground floor of civic center flooded. Event cancelled. Sump pumps deployed.',
                'hours_ago' => 30,
                'team_idx'  => null,
            ],

            // --- LOW (older reports, mostly resolved) ---
            [
                'address'   => 'Brgy. Poblacion IV, Nasugbu, Batangas',
                'lat'       => 14.07590, 'lng' => 120.63660,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Minor flooding from clogged canal, cleared within the hour. Drainage cleaned by barangay crew.',
                'hours_ago' => 48,
                'team_idx'  => 2,
            ],
            [
                'address'   => 'Side Street near Town Plaza, Nasugbu',
                'lat'       => 14.07490, 'lng' => 120.63390,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Shallow drainage overflow after afternoon downpour. Water cleared naturally within 2 hours.',
                'hours_ago' => 50,
                'team_idx'  => 3,
            ],
            [
                'address'   => 'Brgy. Kaylaway Interior, Nasugbu, Batangas',
                'lat'       => 14.05740, 'lng' => 120.64160,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Minor puddle formation on unpaved road. No household impact. Barangay crew alerted.',
                'hours_ago' => 52,
                'team_idx'  => 4,
            ],
            [
                'address'   => 'Brgy. Poblacion, Elevated Area, Nasugbu',
                'lat'       => 14.08140, 'lng' => 120.63960,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Light flooding in naturally elevated area. Draining slowly via roadside canal. No evacuation needed.',
                'hours_ago' => 54,
                'team_idx'  => 0,
            ],
            [
                'address'   => 'Pantalan Senior High School Area, Nasugbu',
                'lat'       => 14.08730, 'lng' => 120.63110,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Temporary flooding in school grounds after heavy rain. Cleared before classes resumed.',
                'hours_ago' => 60,
                'team_idx'  => 1,
            ],
            [
                'address'   => 'Brgy. Wawa, Upper Area, Nasugbu, Batangas',
                'lat'       => 14.07290, 'lng' => 120.62820,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Fallen tree partially blocking creek flow. Barangay crew removed debris. No flooding occurred.',
                'hours_ago' => 66,
                'team_idx'  => 2,
            ],
            [
                'address'   => 'Near Nasugbu East Central School, Poblacion',
                'lat'       => 14.07610, 'lng' => 120.63690,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Drainage overflow on school perimeter. Maintenance crew dispatched. Water subsided within 45 minutes.',
                'hours_ago' => 72,
                'team_idx'  => 3,
            ],
            [
                'address'   => 'Brgy. Bucana Interior, Nasugbu, Batangas',
                'lat'       => 14.07960, 'lng' => 120.62460,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Post-storm residual flooding. Residents reported water receding steadily. No assistance required.',
                'hours_ago' => 78,
                'team_idx'  => 4,
            ],
            [
                'address'   => 'Lumbangan National Road Junction, Nasugbu',
                'lat'       => 14.06050, 'lng' => 120.64110,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Shallow flooding at road junction after runoff from nearby hill. Cleared after rain stopped.',
                'hours_ago' => 84,
                'team_idx'  => 0,
            ],
            [
                'address'   => 'Brgy. Bilaran, Upper Sitio, Nasugbu, Batangas',
                'lat'       => 14.06940, 'lng' => 120.63600,
                'severity'  => 'low',
                'status'    => 'resolved',
                'desc'      => 'Light water accumulation on unpaved path. Residents managed independently. No response needed.',
                'hours_ago' => 90,
                'team_idx'  => 1,
            ],
        ];

        $residentCount = count($residents);

        foreach ($reports as $i => $r) {
            $resident = $residents[$i % $residentCount];
            $team     = $r['team_idx'] !== null ? $teams[$r['team_idx']] : null;
            $responder = $team ? $team->responders[0] ?? null : null;

            $createdAt  = now()->subHours($r['hours_ago']);
            $verifiedAt = in_array($r['status'], ['verified', 'assigned', 'resolved'])
                ? $createdAt->copy()->addMinutes(rand(15, 60))
                : null;
            $resolvedAt = $r['status'] === 'resolved'
                ? $createdAt->copy()->addHours(rand(2, 6))
                : null;

            Report::firstOrCreate(
                ['latitude' => $r['lat'], 'longitude' => $r['lng']],
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
                    'verified_by'      => $verifiedAt ? 1 : null,
                    'verified_at'      => $verifiedAt,
                    'resolved_at'      => $resolvedAt,
                    'created_at'       => $createdAt,
                    'updated_at'       => $createdAt,
                ]
            );
        }

        $this->command->info('✓ Seeded 30 flood reports.');
    }

    // -------------------------------------------------------------------------
    // Hazards
    // -------------------------------------------------------------------------

    private function seedHazards(User $admin): void
    {
        $hazards = [
            [
                'category' => 'flood',
                'type'     => 'flash_flood',
                'severity' => 'critical',
                'title'    => 'Flash Flood — Pantalan River Mouth',
                'description' => 'Rapid water level rise at river mouth due to upstream rainfall. Do not cross.',
                'lat'      => 14.08520, 'lng' => 120.62890,
                'address'  => 'Pantalan River Mouth, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'flood',
                'type'     => 'flash_flood',
                'severity' => 'high',
                'title'    => 'Flood Zone — Brgy. Bucana',
                'description' => 'Coastal flooding combined with river overflow. Residents advised to evacuate.',
                'lat'      => 14.08020, 'lng' => 120.62280,
                'address'  => 'Brgy. Bucana, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'flood',
                'type'     => 'flash_flood',
                'severity' => 'high',
                'title'    => 'Overflowing Creek — Brgy. Wawa',
                'description' => 'Wawa creek overflowing banks. Surrounding streets submerged.',
                'lat'      => 14.07130, 'lng' => 120.62630,
                'address'  => 'Wawa Creek, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'road',
                'type'     => 'closed_road',
                'severity' => 'high',
                'title'    => 'Road Closure — Pantalan Bridge',
                'description' => 'Pantalan bridge approach flooded and structurally unsafe. Road closed to all vehicles.',
                'lat'      => 14.08680, 'lng' => 120.63060,
                'address'  => 'Pantalan Bridge, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'road',
                'type'     => 'closed_road',
                'severity' => 'moderate',
                'title'    => 'Partial Road Block — National Highway',
                'description' => 'One lane of national highway flooded near public market. Slow traffic. Use alternate routes.',
                'lat'      => 14.07820, 'lng' => 120.63130,
                'address'  => 'National Highway, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'flood',
                'type'     => 'flash_flood',
                'severity' => 'moderate',
                'title'    => 'Flood Warning — Brgy. Bilaran',
                'description' => 'Low-lying barangay at risk. Residents in flood-prone zones advised to move belongings to higher floors.',
                'lat'      => 14.06820, 'lng' => 120.63540,
                'address'  => 'Brgy. Bilaran, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'road',
                'type'     => 'debris',
                'severity' => 'moderate',
                'title'    => 'Debris on Road — Brgy. Lumbangan',
                'description' => 'Fallen trees and debris blocking provincial road to Brgy. Lumbangan. Clearance in progress.',
                'lat'      => 14.06180, 'lng' => 120.64030,
                'address'  => 'Brgy. Lumbangan Road, Nasugbu, Batangas',
                'active'   => true,
            ],
            [
                'category' => 'flood',
                'type'     => 'flash_flood',
                'severity' => 'low',
                'title'    => 'Standing Water — Poblacion Streets',
                'description' => 'Minor flooding on Poblacion side streets. Passable on foot with caution. Draining gradually.',
                'lat'      => 14.07500, 'lng' => 120.63450,
                'address'  => 'Poblacion, Nasugbu, Batangas',
                'active'   => true,
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
    // Alerts & Advisories
    // -------------------------------------------------------------------------

    private function seedAlerts(User $admin): void
    {
        $alerts = [
            // CRITICAL alerts
            [
                'title'       => 'CRITICAL: Flash Flood Warning — Nasugbu Coastal Areas',
                'body'        => 'PAGASA has issued a Flash Flood Warning for coastal barangays of Nasugbu, Batangas. Residents of Brgy. Pantalan, Bucana, and Wawa are advised to EVACUATE IMMEDIATELY to designated evacuation centers. Bring essential documents, medicines, and 3-day food supply. Do not attempt to cross flooded roads.',
                'type'        => 'critical',
                'is_critical' => true,
                'hours_ago'   => 1,
            ],
            [
                'title'       => 'CRITICAL: River Level Alert — Pantalan River',
                'body'        => 'Pantalan River has exceeded critical water level threshold. All residents within 500 meters of the riverbank must evacuate immediately. NDRRMC rescue teams are on standby. Call the MDRRMO hotline for assistance: 0917-XXX-XXXX.',
                'type'        => 'critical',
                'is_critical' => true,
                'hours_ago'   => 2,
            ],

            // UPDATE alerts
            [
                'title'       => 'UPDATE: Rescue Operations Ongoing in Brgy. Pantalan',
                'body'        => 'Rescue teams Alpha and Bravo are currently conducting rescue operations in Brgy. Pantalan. 47 families have been successfully evacuated to the Nasugbu Municipal Gymnasium. Operations are still ongoing. Expect road closures around Pantalan Bridge until further notice.',
                'type'        => 'update',
                'is_critical' => false,
                'hours_ago'   => 3,
            ],
            [
                'title'       => 'UPDATE: Evacuation Centers Now Open',
                'body'        => 'The following evacuation centers are now open and accepting evacuees: Nasugbu Municipal Gymnasium (capacity: 1,200), Nasugbu National High School (capacity: 1,500), and Nasugbu West Central School (capacity: 2,000). Transportation assistance is available at Brgy. Hall. Bring valid ID.',
                'type'        => 'update',
                'is_critical' => false,
                'hours_ago'   => 4,
            ],
            [
                'title'       => 'UPDATE: Road Closure — Pantalan Bridge',
                'body'        => 'Pantalan Bridge is officially closed to all motorists effective immediately due to flood damage. DPWH engineers are assessing structural integrity. Alternate route: use the bypass road via Brgy. Bilaran. Expected duration of closure: 48–72 hours.',
                'type'        => 'update',
                'is_critical' => false,
                'hours_ago'   => 5,
            ],
            [
                'title'       => 'UPDATE: Water Level Receding in Poblacion',
                'body'        => 'Water levels in Poblacion area have started receding. Residents may return to inspect their homes but should exercise caution. Do not consume tap water without boiling. Leptospirosis risk is high — wear rubber boots and avoid wading in floodwater.',
                'type'        => 'update',
                'is_critical' => false,
                'hours_ago'   => 20,
            ],

            // ADVISORY alerts
            [
                'title'       => 'ADVISORY: Heavy Rainfall Expected — 24-Hour Warning',
                'body'        => 'PAGASA forecasts continuous moderate to heavy rainfall over Nasugbu and neighboring municipalities for the next 24 hours due to LPA (Low Pressure Area) southeast of Batangas. Residents in flood-prone barangays are advised to prepare go-bags, monitor water levels, and stay updated via FloodTrack.',
                'type'        => 'advisory',
                'is_critical' => false,
                'hours_ago'   => 6,
            ],
            [
                'title'       => 'ADVISORY: Health Warning — Post-Flood Leptospirosis Risk',
                'body'        => 'The Municipal Health Office warns residents of elevated leptospirosis risk following the flooding. Symptoms include fever, headache, muscle pain, and red eyes. Avoid contact with floodwater or mud. If symptoms appear, seek medical attention immediately at the Lian-Nasugbu District Hospital.',
                'type'        => 'advisory',
                'is_critical' => false,
                'hours_ago'   => 24,
            ],
            [
                'title'       => 'ADVISORY: Relief Operations Schedule',
                'body'        => 'The MDRRMO will distribute relief goods at the following locations starting tomorrow at 8:00 AM: (1) Nasugbu Municipal Gymnasium — Pantalan and Bucana evacuees, (2) Nasugbu National High School — Wawa and Bilaran evacuees. Bring your barangay certificate. One pack per household.',
                'type'        => 'advisory',
                'is_critical' => false,
                'hours_ago'   => 30,
            ],
            [
                'title'       => 'ADVISORY: Preparation Tips Before the Storm Season',
                'body'        => 'As typhoon season approaches, Nasugbu MDRRMO reminds all residents to: (1) Identify your nearest evacuation center, (2) Prepare a 3-day emergency kit including food, water, medicines, and documents, (3) Know your family emergency plan, (4) Report flooding incidents through the FloodTrack app. Stay safe.',
                'type'        => 'advisory',
                'is_critical' => false,
                'hours_ago'   => 72,
            ],
        ];

        foreach ($alerts as $a) {
            Alert::firstOrCreate(
                ['title' => $a['title']],
                [
                    'created_by'  => $admin->id,
                    'title'       => $a['title'],
                    'body'        => $a['body'],
                    'type'        => $a['type'],
                    'created_at'  => now()->subHours($a['hours_ago']),
                    'updated_at'  => now()->subHours($a['hours_ago']),
                ]
            );
        }

        $this->command->info('✓ Seeded 10 alerts & advisories.');
    }
}
