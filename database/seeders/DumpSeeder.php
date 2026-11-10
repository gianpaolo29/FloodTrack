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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * DumpSeeder — 176 users, 600 reports, 510 media, 2646 status rows,
 *              450 responder assignments, ~2556 notifications
 *
 * Dates scattered over the past 6 months with 3 typhoon spike days.
 */
class DumpSeeder extends Seeder
{
    // ── 42 Barangays of Nasugbu with realistic coordinates ──
    // First 10 are flood-prone (60% of reports go here)
    private array $barangays = [
        // ─ Flood-prone (10) ─
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
        // ─ Other 32 barangays ─
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

    // Hazard type weights: flood 330, clogged drainage 150, road hazard 120 = 600
    private array $hazardTypes = [
        ['type' => 'flood',           'weight' => 330],
        ['type' => 'clogged_drainage','weight' => 150],
        ['type' => 'road_hazard',     'weight' => 120],
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

    // ── 150 Filipino resident names ──
    private array $residentNames = [
        'Maria Santos','Jose Reyes','Ana Dela Cruz','Ramon Garcia','Liza Fernandez',
        'Roberto Mendoza','Cristina Bautista','Eduardo Villanueva','Rosalinda Aquino','Fernando Pascual',
        'Gloria Navarro','Antonio Ramos','Maricel Dizon','Ricardo Soriano','Jeanette Ocampo',
        'Leoncia Castillo','Danilo Padilla','Angelica Magno','Benjamin Tolentino','Carmelita Flores',
        'Renato Cruz','Minerva Gonzales','Rodrigo Bautista','Elena Villanueva','Francisco Santos',
        'Carmen Reyes','Pablo Aquino','Lucinda Torres','Armando Mendoza','Beatriz Ramos',
        'Crisanto Navarro','Dolores Pascual','Ernesto Dizon','Felicidad Ocampo','Gerardo Soriano',
        'Helena Castillo','Isidro Padilla','Josefina Magno','Kenneth Tolentino','Lourdes Flores',
        'Marcelo Cruz','Natividad Gonzales','Oscar Bautista','Patricia Villanueva','Quintin Santos',
        'Remedios Reyes','Sergio Aquino','Teresita Torres','Ulysses Mendoza','Virginia Ramos',
        'Wenceslao Navarro','Ximena Pascual','Yolanda Dizon','Zenaida Ocampo','Alfredo Soriano',
        'Benedicta Castillo','Conrado Padilla','Dominga Magno','Emilio Tolentino','Florencia Flores',
        'Gregoria Cruz','Hilario Gonzales','Imelda Bautista','Juanito Villanueva','Kristina Santos',
        'Leonardo Reyes','Magdalena Aquino','Nestor Torres','Ofelia Mendoza','Perfecto Ramos',
        'Quirina Navarro','Ruperto Pascual','Soledad Dizon','Timoteo Ocampo','Ursula Soriano',
        'Valentin Castillo','Wilma Padilla','Xerxes Magno','Ysmael Tolentino','Zacarias Flores',
        'Adelaida Cruz','Basilio Gonzales','Celestina Bautista','Delfin Villanueva','Esperanza Santos',
        'Federico Reyes','Gaudencia Aquino','Hermogenes Torres','Irene Mendoza','Justino Ramos',
        'Katarina Navarro','Laureano Pascual','Milagros Dizon','Narciso Ocampo','Olympia Soriano',
        'Patricio Castillo','Regina Padilla','Simplicio Magno','Triana Tolentino','Umberto Flores',
        'Viviana Cruz','Wilhelmina Gonzales','Xenia Bautista','Ygnacio Villanueva','Zenon Santos',
        'Amado Reyes','Brigida Aquino','Clemente Torres','Divina Mendoza','Eugenio Ramos',
        'Francisca Navarro','Gumersindo Pascual','Hortensia Dizon','Ildefonso Ocampo','Jacinta Soriano',
        'Kalisto Castillo','Ligaya Padilla','Maximo Magno','Nicanor Tolentino','Obdulia Flores',
        'Pelagia Cruz','Regalado Gonzales','Silvestre Bautista','Tranquilina Villanueva','Venancio Santos',
        'Aurora Reyes','Buenaventura Aquino','Concepcion Torres','Demetrio Mendoza','Estela Ramos',
        'Filomena Navarro','Generoso Pascual','Heraclio Dizon','Indalecia Ocampo','Januario Soriano',
        'Leonida Castillo','Macario Padilla','Norberto Magno','Petronila Tolentino','Rosendo Flores',
        'Salvadora Cruz','Tadeo Gonzales','Victorina Bautista','Apolinario Villanueva','Bartolome Santos',
        'Corazon Reyes','Domingo Aquino','Eufemia Torres','Froilan Mendoza','Graciana Ramos',
    ];

    public function run(): void
    {
        $this->call(EvacuationCenterSeeder::class);
        $this->call(ProtocolSeeder::class);

        $admin      = $this->seedAdmin();
        $residents  = $this->seedResidents();
        $teams      = $this->seedTeams();
        $responders = collect($teams)->flatMap(fn ($t) => $t->responders)->values()->all();
        $images     = $this->downloadImages();

        $this->seedReports($residents, $teams, $responders, $admin, $images);
        $this->seedHazards($admin);
        $this->seedAlerts($admin);
        $this->resetEvacuationOccupancy();

        $this->command->info('');
        $this->command->info('Done! DumpSeeder complete.');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  ADMIN (1)
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedAdmin(): User
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@floodtrack.com'],
            [
                'name'              => 'MDRRMO Admin',
                'password'          => bcrypt('password123'),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info('Seeded 1 admin.');
        return $admin;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  RESIDENTS (150)
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedResidents(): array
    {
        $residents = [];
        foreach ($this->residentNames as $i => $name) {
            $slug = Str::slug($name, '.');
            $brgy = $this->barangays[$i % count($this->barangays)];
            $residents[] = User::firstOrCreate(
                ['email' => "{$slug}@gmail.com"],
                [
                    'name'              => $name,
                    'password'          => bcrypt('password123'),
                    'role'              => 'resident',
                    'email_verified_at' => now(),
                    'home_address'      => "Brgy. {$brgy['name']}, Nasugbu, Batangas",
                    'home_latitude'     => $brgy['lat'] + (rand(-30, 30) / 100000),
                    'home_longitude'    => $brgy['lng'] + (rand(-30, 30) / 100000),
                ]
            );
        }
        $this->command->info('Seeded 150 residents.');
        return $residents;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  TEAMS (5) + RESPONDERS (25)
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedTeams(): array
    {
        $teamData = [
            ['name' => 'MDRRMO Rescue Unit 1', 'shift' => 'A', 'members' => [
                'Carlos Mendoza','Diana Ramos','Eduardo Torres','Felicia Cruz','Gregorio Lim',
            ]],
            ['name' => 'MDRRMO Rescue Unit 2', 'shift' => 'A', 'members' => [
                'Herminia Bautista','Ignacio Villanueva','Jasmine Aquino','Kevin Pascual','Lorraine Navarro',
            ]],
            ['name' => 'Pantalan BRT', 'shift' => 'B', 'members' => [
                'Manuel Dizon','Nilda Ocampo','Orlando Macaraeg','Patricia Soriano','Quirino Abella',
            ]],
            ['name' => 'Bucana-Wawa BRT', 'shift' => 'B', 'members' => [
                'Rosario Castillo','Salvador Dela Rosa','Teresita Aguilar','Uldarico Espinosa','Violeta Morales',
            ]],
            ['name' => 'Poblacion BRT', 'shift' => 'A', 'members' => [
                'Wilfredo Perez','Xyza Hernandez','Yolanda Buenaventura','Zosimo Laurel','Angelica Domingo',
            ]],
        ];

        $teams = [];
        foreach ($teamData as $td) {
            $users = [];
            foreach ($td['members'] as $name) {
                $slug = Str::slug($name, '.');
                $users[] = User::firstOrCreate(
                    ['email' => "{$slug}@floodtrack.com"],
                    [
                        'name'              => $name,
                        'password'          => bcrypt('password123'),
                        'role'              => 'responder',
                        'email_verified_at' => now(),
                        'is_on_duty'        => false,
                    ]
                );
            }
            $team = Team::firstOrCreate(
                ['name' => $td['name']],
                ['leader_id' => $users[0]->id, 'is_active' => true, 'shift' => $td['shift']]
            );
            foreach ($users as $u) $u->update(['team_id' => $team->id]);
            $team->responders = $users;
            $teams[] = $team;
        }
        $this->command->info('Seeded 5 teams with 25 responders.');
        return $teams;
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
            $this->command->warn('Downloads failed — generating GD placeholders...');
            $downloaded = $this->generatePlaceholders(12);
        }
        return $downloaded;
    }

    private function generatePlaceholders(int $n): array
    {
        // Try GD first
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

        // Fallback: use a known-good minimal red 1×1 JPEG (267 bytes) as template
        // Duplicated n times — all images will look the same but are valid JPEGs
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
        $imgs = [];
        for ($i = 0; $i < $n; $i++) {
            $imgs[] = $jpgBytes;
        }
        return $imgs;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  600 REPORTS
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedReports(array $residents, array $teams, array $responders, User $admin, array $images): void
    {
        // ── Distribution targets ──
        // Status: pending 108, rejected 60 (45 dup + 15 invalid), verified 18,
        //         assigned 18, en_route 12, on_scene 24, resolved 360 = 600
        // Severity: low 210, moderate 210, high 120, critical 60
        // Channel: app 450 (GPS), messenger 150 (landmark)
        // Location: 360 in flood-prone (first 10 brgys), 240 in other 32

        $total    = 600;
        $now      = Carbon::now();
        $startDate = $now->copy()->subMonths(6);

        // 3 typhoon spike days (~80 reports each = 240), 360 across remaining ~177 days
        $typhoonDays = [
            $startDate->copy()->addDays(42),   // ~6 weeks in
            $startDate->copy()->addDays(98),   // ~14 weeks in
            $startDate->copy()->addDays(155),  // ~22 weeks in
        ];

        // Build severity pool: low 210, moderate 210, high 120, critical 60
        $severityPool = array_merge(
            array_fill(0, 210, 'low'),
            array_fill(0, 210, 'moderate'),
            array_fill(0, 120, 'high'),
            array_fill(0, 60, 'critical'),
        );
        shuffle($severityPool);

        // Build status pool
        $statusPool = array_merge(
            array_fill(0, 108, 'pending'),
            array_fill(0, 45, 'rejected_dup'),
            array_fill(0, 15, 'rejected_invalid'),
            array_fill(0, 18, 'verified'),
            array_fill(0, 18, 'assigned'),
            array_fill(0, 12, 'en_route'),
            array_fill(0, 24, 'on_scene'),
            array_fill(0, 360, 'resolved'),
        );
        shuffle($statusPool);

        // Build channel pool: app 450, messenger 150
        $channelPool = array_merge(
            array_fill(0, 450, 'app'),
            array_fill(0, 150, 'messenger'),
        );
        shuffle($channelPool);

        // Generate timestamps: 240 on typhoon days, 360 scattered
        $dates = [];
        foreach ($typhoonDays as $day) {
            for ($i = 0; $i < 80; $i++) {
                $dates[] = $day->copy()->addMinutes(rand(0, 1439)); // random within 24h
            }
        }
        $totalDays = (int) $startDate->diffInDays($now);
        // Exclude typhoon day windows (±1 day)
        for ($i = 0; $i < 360; $i++) {
            $attempts = 0;
            do {
                $dayOff = rand(0, $totalDays);
                $dt = $startDate->copy()->addDays($dayOff)->addMinutes(rand(360, 1320)); // 6am-10pm
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

        // Track which reports we've created for potential_duplicate_of
        $createdReportIds = [];

        for ($idx = 0; $idx < $total; $idx++) {
            $severity  = $severityPool[$idx];
            $rawStatus = $statusPool[$idx];
            $channel   = $channelPool[$idx];
            $createdAt = $dates[$idx];

            // Determine if rejected-duplicate or rejected-invalid
            $isDupReject = $rawStatus === 'rejected_dup';
            $isReject    = $isDupReject || $rawStatus === 'rejected_invalid';
            $finalStatus = $isReject ? 'rejected' : $rawStatus;

            // Map internal statuses to reports.status enum
            $reportStatus = match ($finalStatus) {
                'pending'   => 'pending',
                'rejected'  => 'rejected',
                'verified'  => 'verified',
                'assigned','en_route','on_scene' => 'assigned',
                'resolved'  => 'resolved',
            };

            // Location: 60% flood-prone, 40% other
            if ($idx < 360) {
                $brgy = $this->barangays[rand(0, 9)]; // flood-prone
            } else {
                $brgy = $this->barangays[rand(10, 41)]; // other
            }
            $lat = $brgy['lat'] + (rand(-60, 60) / 100000);
            $lng = $brgy['lng'] + (rand(-60, 60) / 100000);

            // Resident assignment — spread across 150
            $resident = $residents[$idx % $residentCount];

            // Description
            $desc = $isReject
                ? ($isDupReject
                    ? $this->duplicateNotes[array_rand($this->duplicateNotes)]
                    : $this->rejectionReasons[array_rand($this->rejectionReasons)])
                : $this->descriptions[$severity][array_rand($this->descriptions[$severity])];

            // Timing — critical reports ~2x faster
            $speedFactor = match ($severity) {
                'critical' => 0.5,
                'high'     => 0.7,
                'moderate' => 1.0,
                'low'      => 1.3,
            };

            $verifiedAt = null;
            $assignedAt = null;
            $resolvedAt = null;
            $assignedTeam = null;
            $assignedResponder = null;

            // Status progression timestamps
            if (!in_array($finalStatus, ['pending'])) {
                // Submitted → Verified/Rejected: 5-30 min
                $verifiedAt = $createdAt->copy()->addMinutes((int)(rand(5, 30) * $speedFactor));
            }

            if (in_array($finalStatus, ['assigned','en_route','on_scene','resolved'])) {
                // Verified → Assigned: 2-10 min
                $assignedAt = $verifiedAt->copy()->addMinutes((int)(rand(2, 10) * $speedFactor));
                $teamIdx = $responderIdx % $teamCount;
                $assignedTeam = $teams[$teamIdx];
                $assignedResponder = $responders[$responderIdx % $responderCount];
                $responderIdx++;
            }

            if ($finalStatus === 'resolved') {
                // On Scene → Resolved: 1-6 hours
                $enRouteAt = $assignedAt->copy()->addMinutes((int)(rand(1, 5) * $speedFactor));
                $onSceneAt = $enRouteAt->copy()->addMinutes((int)(rand(15, 45) * $speedFactor));
                $resolvedAt = $onSceneAt->copy()->addMinutes((int)(rand(60, 360) * $speedFactor));
            }

            // depth_ft based on severity
            $depthFt = match ($severity) {
                'low'      => round(rand(3, 10) / 10, 1),   // 0.3 - 1.0 ft
                'moderate' => round(rand(10, 25) / 10, 1),   // 1.0 - 2.5 ft
                'high'     => round(rand(25, 40) / 10, 1),   // 2.5 - 4.0 ft
                'critical' => round(rand(40, 54) / 10, 1),   // 4.0 - 5.4 ft
            };

            // Potential duplicate reference
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
                'updated_at'            => $resolvedAt ?? $assignedAt ?? $verifiedAt ?? $createdAt,
            ]);

            $createdReportIds[] = $report->id;

            // ── Status history ──
            $statusHistoryCount += $this->seedStatusHistory(
                $report, $finalStatus, $admin, $assignedResponder,
                $createdAt, $verifiedAt, $assignedAt, $resolvedAt, $severity
            );

            // ── SLA tracking ──
            $this->seedSla($report, $severity, $createdAt, $verifiedAt, $assignedAt, $resolvedAt);

            // ── Responder assignments ──
            if ($assignedResponder && in_array($finalStatus, ['assigned','en_route','on_scene','resolved'])) {
                $pivotStatus = match ($finalStatus) {
                    'assigned'  => 'pending',
                    'en_route'  => 'en_route',
                    'on_scene'  => 'on_scene',
                    'resolved'  => 'resolved',
                };
                ReportResponder::firstOrCreate(
                    ['report_id' => $report->id, 'user_id' => $assignedResponder->id],
                    [
                        'role'        => 'lead',
                        'status'      => $pivotStatus,
                        'en_route_at' => in_array($finalStatus, ['en_route','on_scene','resolved'])
                            ? $assignedAt->copy()->addMinutes((int)(rand(1, 5) * $speedFactor)) : null,
                        'on_scene_at' => in_array($finalStatus, ['on_scene','resolved'])
                            ? $assignedAt->copy()->addMinutes((int)(rand(16, 50) * $speedFactor)) : null,
                        'resolved_at' => $finalStatus === 'resolved' ? $resolvedAt : null,
                    ]
                );
                $responderAssignCount++;

                // Second responder on critical resolved reports
                if ($severity === 'critical' && $finalStatus === 'resolved') {
                    $secondResp = $responders[($responderIdx) % $responderCount];
                    if ($secondResp->id !== $assignedResponder->id) {
                        ReportResponder::firstOrCreate(
                            ['report_id' => $report->id, 'user_id' => $secondResp->id],
                            [
                                'role'        => 'support',
                                'status'      => 'resolved',
                                'en_route_at' => $assignedAt->copy()->addMinutes((int)(rand(2, 8) * $speedFactor)),
                                'on_scene_at' => $assignedAt->copy()->addMinutes((int)(rand(20, 55) * $speedFactor)),
                                'resolved_at' => $resolvedAt,
                            ]
                        );
                        $responderAssignCount++;
                    }
                }
            }

            // ── Media (photos, voice, video) ──
            if (!$isReject && $imageCount > 0 && rand(1, 100) <= 70) {
                $numMedia = match ($severity) {
                    'critical' => rand(2, 3),
                    'high'     => rand(1, 3),
                    'moderate' => rand(1, 2),
                    'low'      => 1,
                };
                $dir = 'reports/' . $report->id;
                Storage::disk('public')->makeDirectory($dir);

                for ($j = 0; $j < $numMedia; $j++) {
                    $imgData  = $images[($report->id + $j) % $imageCount];
                    $filename = "flood-evidence-" . ($j + 1) . ".jpg";
                    $path     = "$dir/$filename";
                    Storage::disk('public')->put($path, $imgData);
                    ReportMedia::create([
                        'report_id'  => $report->id,
                        'file_path'  => $path,
                        'file_type'  => 'image',
                        'file_size'  => strlen($imgData),
                        'created_at' => $createdAt,
                        'updated_at' => $createdAt,
                    ]);
                    $mediaCreated++;
                }
            }

            // ── Notifications (stored in DB) ──
            $notifCount += $this->seedNotifications($report, $finalStatus, $resident, $assignedResponder, $admin, $createdAt, $verifiedAt, $assignedAt, $resolvedAt, $severity);

            if ($idx > 0 && $idx % 100 === 0) {
                $this->command->info("  ... {$idx}/{$total} reports");
            }
        }

        $this->command->info("Seeded {$total} reports, {$mediaCreated} media files.");
        $this->command->info("  Status history rows: {$statusHistoryCount}");
        $this->command->info("  Responder assignments: {$responderAssignCount}");
        $this->command->info("  Notifications: {$notifCount}");
    }

    // ── Status history with correct row counts per final status ──
    private function seedStatusHistory(
        Report $report, string $finalStatus, User $admin, ?User $responder,
        Carbon $created, ?Carbon $verified, ?Carbon $assigned, ?Carbon $resolved,
        string $severity
    ): int {
        $rows = 0;
        $speedFactor = match ($severity) {
            'critical' => 0.5, 'high' => 0.7, 'moderate' => 1.0, 'low' => 1.3,
        };

        // Row 1: pending (always)
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $report->user_id,
            'status' => 'pending', 'notes' => 'Report submitted via ' . $report->source . '.',
            'created_at' => $created, 'updated_at' => $created,
        ]);
        $rows++;

        if ($finalStatus === 'pending') return $rows;

        // Row 2: verified or rejected
        if ($finalStatus === 'rejected') {
            ReportStatusUpdate::create([
                'report_id' => $report->id, 'user_id' => $admin->id,
                'status' => 'rejected',
                'notes' => $report->potential_duplicate_of
                    ? 'Duplicate report rejected.'
                    : 'Report does not meet verification criteria.',
                'created_at' => $verified, 'updated_at' => $verified,
            ]);
            return $rows + 1; // 2 rows total for rejected
        }

        // Row 2: verified
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $admin->id,
            'status' => 'verified', 'notes' => 'Report verified by MDRRMO admin.',
            'created_at' => $verified, 'updated_at' => $verified,
        ]);
        $rows++;

        if ($finalStatus === 'verified') return $rows; // 2 rows

        // Row 3: assigned
        $teamName = $report->assignedTeam?->name ?? 'response team';
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $admin->id,
            'status' => 'assigned',
            'notes' => "Assigned to {$teamName}.",
            'created_at' => $assigned, 'updated_at' => $assigned,
        ]);
        $rows++;

        if ($finalStatus === 'assigned') return $rows; // 3 rows

        // Row 4: en_route
        $enRouteAt = $assigned->copy()->addMinutes((int)(rand(1, 5) * $speedFactor));
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $responder?->id,
            'status' => 'en_route', 'notes' => 'Responder en route to location.',
            'created_at' => $enRouteAt, 'updated_at' => $enRouteAt,
        ]);
        $rows++;

        if ($finalStatus === 'en_route') return $rows; // 4 rows

        // Row 5: on_scene
        $onSceneAt = $enRouteAt->copy()->addMinutes((int)(rand(15, 45) * $speedFactor));
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $responder?->id,
            'status' => 'on_scene', 'notes' => 'Responder arrived on scene. Assessing situation.',
            'created_at' => $onSceneAt, 'updated_at' => $onSceneAt,
        ]);
        $rows++;

        if ($finalStatus === 'on_scene') return $rows; // 5 rows

        // Row 6: resolved
        ReportStatusUpdate::create([
            'report_id' => $report->id, 'user_id' => $responder?->id ?? $admin->id,
            'status' => 'resolved',
            'notes' => 'Situation resolved. Floodwater receded and affected residents assisted.',
            'created_at' => $resolved, 'updated_at' => $resolved,
        ]);
        return $rows + 1; // 6 rows for resolved
    }

    // ── SLA tracking ──
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

    // ── Notifications ──
    private function seedNotifications(
        Report $report, string $finalStatus, User $resident, ?User $responder,
        User $admin, Carbon $created, ?Carbon $verified, ?Carbon $assigned,
        ?Carbon $resolved, string $severity
    ): int {
        $count = 0;
        $ref = $report->reference_number;

        // Helper to insert a notification row
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

        // Notify resident on each status change after submission
        $statusChanges = [];
        if ($verified && $finalStatus !== 'pending') {
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

        // Notify responder on assignment
        if ($responder && $assigned) {
            $insert($responder, 'New Assignment', "You have been assigned to report {$ref}.", $assigned);
        }

        // Notify admin on critical reports
        if ($severity === 'critical') {
            $insert($admin, 'Critical Report', "Critical flood report submitted: {$ref}.", $created);
        }

        return $count;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  HAZARDS (5)
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedHazards(User $admin): void
    {
        $hazards = [
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'critical',
                'title' => 'Flash Flood Zone — Pantalan River Mouth',
                'description' => 'Recurring flash flood area at river mouth. Water rises rapidly during heavy rainfall.',
                'lat' => 14.08520, 'lng' => 120.62890, 'address' => 'Pantalan River Mouth, Nasugbu, Batangas',
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'high',
                'title' => 'Flood-Prone Area — Brgy. Bucana Coastal',
                'description' => 'Coastal flooding during high tide combined with heavy rain.',
                'lat' => 14.08020, 'lng' => 120.62280, 'address' => 'Brgy. Bucana, Nasugbu, Batangas',
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'high',
                'title' => 'Creek Overflow Zone — Brgy. Wawa',
                'description' => 'Wawa Creek prone to overflow during sustained rainfall.',
                'lat' => 14.07130, 'lng' => 120.62630, 'address' => 'Wawa Creek, Nasugbu, Batangas',
            ],
            [
                'category' => 'road', 'type' => 'closed_road', 'severity' => 'high',
                'title' => 'Flood Road Closure — Pantalan Bridge Approach',
                'description' => 'Bridge approach frequently flooded during storms. Closed during flood events.',
                'lat' => 14.08680, 'lng' => 120.63060, 'address' => 'Pantalan Bridge, Nasugbu, Batangas',
            ],
            [
                'category' => 'flood', 'type' => 'flash_flood', 'severity' => 'moderate',
                'title' => 'Low-Lying Flood Zone — Brgy. Bilaran',
                'description' => 'Chronically flooded barangay. Residents advised to prepare go-bags during rainy season.',
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
        $this->command->info('Seeded 5 hazards.');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  ALERTS (11)
    // ═══════════════════════════════════════════════════════════════════════════════

    private function seedAlerts(User $admin): void
    {
        $alerts = [
            ['title' => 'CRITICAL: Flash Flood Warning — Nasugbu Coastal Barangays', 'type' => 'critical', 'hours_ago' => 168,
             'body' => 'PAGASA has issued a Flash Flood Warning for coastal barangays of Nasugbu, Batangas. Residents of Brgy. Pantalan, Bucana, and Wawa are advised to prepare for possible evacuation.'],
            ['title' => 'CRITICAL: Pantalan River at Critical Level', 'type' => 'critical', 'hours_ago' => 120,
             'body' => 'Pantalan River has exceeded the critical water level threshold. All residents within 500 meters of the riverbank must prepare for evacuation.'],
            ['title' => 'UPDATE: Rescue Operations Summary', 'type' => 'update', 'hours_ago' => 96,
             'body' => 'MDRRMO has successfully conducted rescue operations across multiple flood events. FloodTrack early warning system contributed to faster response times.'],
            ['title' => 'ADVISORY: Southwest Monsoon (Habagat) Season Update', 'type' => 'advisory', 'hours_ago' => 72,
             'body' => 'PAGASA forecasts enhanced southwest monsoon activity over Batangas province. Moderate to heavy rainfall expected.'],
            ['title' => 'UPDATE: Road Closures and Alternate Routes', 'type' => 'update', 'hours_ago' => 60,
             'body' => 'Due to recurring flooding, Pantalan Bridge approach and Lumbangan-Poblacion road are temporarily closed.'],
            ['title' => 'ADVISORY: Post-Flood Health Advisory — Leptospirosis Prevention', 'type' => 'advisory', 'hours_ago' => 48,
             'body' => 'The Municipal Health Office warns residents of elevated leptospirosis risk. Avoid walking barefoot in floodwater.'],
            ['title' => 'UPDATE: Evacuation Center Preparedness Check Complete', 'type' => 'update', 'hours_ago' => 36,
             'body' => 'All designated evacuation centers have completed preparedness checks. Facilities are stocked with relief goods.'],
            ['title' => 'ADVISORY: FloodTrack App — Report Flooding in Your Area', 'type' => 'advisory', 'hours_ago' => 24,
             'body' => 'Help keep your community safe by reporting flooding through FloodTrack. Include photos and accurate location.'],
            ['title' => 'UPDATE: Barangay Response Teams Training Complete', 'type' => 'update', 'hours_ago' => 12,
             'body' => 'All 5 Barangay Response Teams have completed their wet season refresher training. 25 trained responders ready.'],
            ['title' => 'ADVISORY: Wet Season Preparedness Reminder', 'type' => 'advisory', 'hours_ago' => 2,
             'body' => 'The MDRRMO reminds all residents to know your nearest evacuation center, keep emergency kits ready, and monitor FloodTrack.'],
            ['title' => 'CRITICAL: Typhoon Signal No. 2 — Nasugbu Under Direct Path', 'type' => 'critical', 'hours_ago' => 4,
             'body' => 'PAGASA has raised Typhoon Signal No. 2 over Nasugbu. All residents in flood-prone barangays must evacuate to designated centers immediately.'],
        ];

        foreach ($alerts as $a) {
            Alert::firstOrCreate(['title' => $a['title']], [
                'created_by' => $admin->id, 'title' => $a['title'], 'body' => $a['body'], 'type' => $a['type'],
                'created_at' => now()->subHours($a['hours_ago']), 'updated_at' => now()->subHours($a['hours_ago']),
            ]);
        }
        $this->command->info('Seeded 11 alerts.');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    //  RESET EVACUATION OCCUPANCY
    // ═══════════════════════════════════════════════════════════════════════════════

    private function resetEvacuationOccupancy(): void
    {
        EvacuationCenter::query()->update(['current_occupancy' => 0]);
        $this->command->info('Evacuation center occupancy reset to 0.');
    }
}
