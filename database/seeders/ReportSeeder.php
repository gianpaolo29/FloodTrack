<?php

namespace Database\Seeders;

use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReportSeeder extends Seeder
{
    public function run(): void
    {
        $resident = User::where('role', 'resident')->first()
            ?? User::where('email', 'resident@floodtrack.com')->first();

        if (! $resident) {
            $this->command->error('No resident user found. Run DatabaseSeeder first.');
            return;
        }

        // Flood-prone areas around Nasugbu, Batangas
        $reports = [
            // Cluster 1 — Riverside / Pantalan area (high density, flood-prone)
            ['lat' => 14.08520, 'lng' => 120.62900, 'address' => 'Brgy. Pantalan, Nasugbu, Batangas',            'severity' => 'critical', 'desc' => 'Severe flooding near the river, water level rising fast.'],
            ['lat' => 14.08610, 'lng' => 120.62980, 'address' => 'Pantalan Riverside, Nasugbu, Batangas',         'severity' => 'critical', 'desc' => 'Road completely submerged, vehicles stranded.'],
            ['lat' => 14.08450, 'lng' => 120.62850, 'address' => 'Brgy. Pantalan, Nasugbu, Batangas',            'severity' => 'high',     'desc' => 'Floodwater entering homes along the riverbank.'],
            ['lat' => 14.08700, 'lng' => 120.63050, 'address' => 'Pantalan Bridge, Nasugbu, Batangas',           'severity' => 'high',     'desc' => 'Debris accumulating under the bridge causing water backup.'],
            ['lat' => 14.08380, 'lng' => 120.62780, 'address' => 'Lower Pantalan, Nasugbu, Batangas',            'severity' => 'high',     'desc' => 'Knee-deep flooding on residential streets.'],
            ['lat' => 14.08550, 'lng' => 120.63020, 'address' => 'Pantalan Elementary School area, Nasugbu',     'severity' => 'moderate', 'desc' => 'Minor flooding near school grounds.'],

            // Cluster 2 — Bucana / Coastal area
            ['lat' => 14.08100, 'lng' => 120.62350, 'address' => 'Brgy. Bucana, Nasugbu, Batangas',              'severity' => 'critical', 'desc' => 'Storm surge combined with river overflow, critical flooding.'],
            ['lat' => 14.08000, 'lng' => 120.62250, 'address' => 'Coastal Road, Brgy. Bucana, Nasugbu',          'severity' => 'high',     'desc' => 'Coastal flooding affecting multiple households.'],
            ['lat' => 14.07950, 'lng' => 120.62450, 'address' => 'Brgy. Bucana Interior, Nasugbu, Batangas',     'severity' => 'high',     'desc' => 'Road washed out due to persistent flooding.'],
            ['lat' => 14.08200, 'lng' => 120.62500, 'address' => 'Brgy. Bucana, Nasugbu, Batangas',              'severity' => 'moderate', 'desc' => 'Ankle-deep water on main road after heavy rain.'],

            // Cluster 3 — Poblacion / Town center
            ['lat' => 14.07750, 'lng' => 120.63800, 'address' => 'J.P. Laurel St., Poblacion, Nasugbu',          'severity' => 'moderate', 'desc' => 'Clogged drainage causing street flooding near the gym.'],
            ['lat' => 14.07400, 'lng' => 120.63500, 'address' => 'Concepcion St., Poblacion, Nasugbu',           'severity' => 'moderate', 'desc' => 'Moderate flooding on the main street.'],
            ['lat' => 14.07600, 'lng' => 120.63650, 'address' => 'Poblacion, Nasugbu, Batangas',                 'severity' => 'low',      'desc' => 'Drainage overflow near the town plaza.'],
            ['lat' => 14.07300, 'lng' => 120.63300, 'address' => 'Near West Central School, Nasugbu',            'severity' => 'moderate', 'desc' => 'Flooding near school entrance during heavy rain.'],
            ['lat' => 14.07500, 'lng' => 120.63400, 'address' => 'San Antonio Parish area, Nasugbu',             'severity' => 'low',      'desc' => 'Shallow flooding on side streets after downpour.'],

            // Cluster 4 — Wawa area
            ['lat' => 14.07200, 'lng' => 120.62750, 'address' => 'Brgy. Wawa, Nasugbu, Batangas',                'severity' => 'high',     'desc' => 'Floodwaters rising rapidly in low-lying area.'],
            ['lat' => 14.07150, 'lng' => 120.62650, 'address' => 'Wawa Creek, Nasugbu, Batangas',                'severity' => 'critical', 'desc' => 'Creek overflowing, nearby houses at risk.'],
            ['lat' => 14.07300, 'lng' => 120.62830, 'address' => 'Brgy. Wawa, Nasugbu, Batangas',                'severity' => 'moderate', 'desc' => 'Fallen tree blocking drainage channel.'],

            // Cluster 5 — Bilaran / Lumbangan area
            ['lat' => 14.06800, 'lng' => 120.63500, 'address' => 'Brgy. Bilaran, Nasugbu, Batangas',             'severity' => 'high',     'desc' => 'Heavy flooding in residential area.'],
            ['lat' => 14.06900, 'lng' => 120.63600, 'address' => 'Brgy. Bilaran, Nasugbu, Batangas',             'severity' => 'moderate', 'desc' => 'Floodwater receding but still significant.'],
            ['lat' => 14.06200, 'lng' => 120.64000, 'address' => 'Brgy. Lumbangan, Nasugbu, Batangas',           'severity' => 'high',     'desc' => 'Low-lying area completely flooded.'],
            ['lat' => 14.06100, 'lng' => 120.64100, 'address' => 'Brgy. Lumbangan, Nasugbu, Batangas',           'severity' => 'moderate', 'desc' => 'Road surface damaged by persistent flooding.'],

            // Cluster 6 — Kaylaway area
            ['lat' => 14.05850, 'lng' => 120.64050, 'address' => 'Brgy. Kaylaway, Nasugbu, Batangas',            'severity' => 'moderate', 'desc' => 'Moderate flooding near elementary school.'],
            ['lat' => 14.05750, 'lng' => 120.64150, 'address' => 'Brgy. Kaylaway, Nasugbu, Batangas',            'severity' => 'low',      'desc' => 'Minor drainage issue after rainfall.'],

            // Scattered reports
            ['lat' => 14.07050, 'lng' => 120.63150, 'address' => 'National Highway, Nasugbu, Batangas',          'severity' => 'moderate', 'desc' => 'Highway partially flooded, traffic slowdown.'],
            ['lat' => 14.06950, 'lng' => 120.63700, 'address' => 'Near District Hospital, Nasugbu, Batangas',    'severity' => 'high',     'desc' => 'Flooding near hospital entrance, access compromised.'],
            ['lat' => 14.08150, 'lng' => 120.63950, 'address' => 'Brgy. Poblacion, Nasugbu, Batangas',           'severity' => 'low',      'desc' => 'Light flooding in elevated area, draining slowly.'],
            ['lat' => 14.07850, 'lng' => 120.63100, 'address' => 'Nasugbu Public Market area, Batangas',         'severity' => 'moderate', 'desc' => 'Market area flooded, vendors relocating.'],
            ['lat' => 14.06500, 'lng' => 120.63800, 'address' => 'Sitio Malapad, Nasugbu, Batangas',             'severity' => 'high',     'desc' => 'Flash flooding in creek-adjacent settlement.'],
            ['lat' => 14.07650, 'lng' => 120.62500, 'address' => 'Coastal Brgy. area, Nasugbu, Batangas',        'severity' => 'critical', 'desc' => 'Severe tidal flooding during high tide and rain.'],
        ];

        $statuses = ['pending', 'verified', 'assigned', 'resolved'];

        foreach ($reports as $i => $r) {
            Report::firstOrCreate(
                ['latitude' => $r['lat'], 'longitude' => $r['lng']],
                [
                    'user_id'     => $resident->id,
                    'severity'    => $r['severity'],
                    'status'      => $statuses[$i % count($statuses)],
                    'description' => $r['desc'],
                    'latitude'    => $r['lat'],
                    'longitude'   => $r['lng'],
                    'address'     => $r['address'],
                    'created_at'  => now()->subHours(rand(1, 72)),
                ]
            );
        }

        $this->command->info('Seeded ' . count($reports) . ' flood reports across Nasugbu, Batangas.');
    }
}
