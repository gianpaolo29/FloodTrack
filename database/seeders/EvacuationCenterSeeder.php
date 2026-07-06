<?php

namespace Database\Seeders;

use App\Models\EvacuationCenter;
use Illuminate\Database\Seeder;

class EvacuationCenterSeeder extends Seeder
{
    public function run(): void
    {
        $centers = [
            ['name' => 'Nasugbu Municipal Gymnasium',        'address' => 'J.P. Laurel St., Poblacion, Nasugbu, Batangas',           'type' => 'gymnasium',        'capacity' => 1200, 'latitude' => 14.07780, 'longitude' => 120.63820],
            ['name' => 'Nasugbu West Central School',        'address' => 'Concepcion St., Brgy. IV, Nasugbu, Batangas',             'type' => 'school',           'capacity' => 2000, 'latitude' => 14.07362, 'longitude' => 120.63332],
            ['name' => 'Nasugbu East Central School',        'address' => 'Poblacion, Nasugbu, Batangas',                            'type' => 'school',           'capacity' => 900,  'latitude' => 14.07620, 'longitude' => 120.63680],
            ['name' => 'Nasugbu National High School',       'address' => 'Brgy. Poblacion, Nasugbu, Batangas',                      'type' => 'school',           'capacity' => 1500, 'latitude' => 14.08100, 'longitude' => 120.63900],
            ['name' => 'Pantalan Elementary School',         'address' => 'Brgy. Pantalan, Nasugbu, Batangas',                       'type' => 'school',           'capacity' => 450,  'latitude' => 14.08560, 'longitude' => 120.62950],
            ['name' => 'Pantalan Senior High School',        'address' => 'Brgy. Pantalan, Nasugbu, Batangas',                       'type' => 'school',           'capacity' => 600,  'latitude' => 14.08720, 'longitude' => 120.63100],
            ['name' => 'Brgy. Bilaran Covered Court',        'address' => 'Brgy. Bilaran, Nasugbu, Batangas',                        'type' => 'barangay_hall',    'capacity' => 350,  'latitude' => 14.06850, 'longitude' => 120.63550],
            ['name' => 'Brgy. Lumbangan Barangay Hall',      'address' => 'Brgy. Lumbangan, Nasugbu, Batangas',                      'type' => 'barangay_hall',    'capacity' => 400,  'latitude' => 14.06150, 'longitude' => 120.64030],
            ['name' => 'San Antonio de Padua Parish',        'address' => 'Poblacion, Nasugbu, Batangas',                            'type' => 'church',           'capacity' => 500,  'latitude' => 14.07450, 'longitude' => 120.63450],
            ['name' => 'Nasugbu Civic Center',               'address' => 'National Highway, Brgy. III, Nasugbu, Batangas',          'type' => 'community_center', 'capacity' => 800,  'latitude' => 14.07100, 'longitude' => 120.63150],
            ['name' => 'Kaylaway Elementary School',         'address' => 'Brgy. Kaylaway, Nasugbu, Batangas',                       'type' => 'school',           'capacity' => 350,  'latitude' => 14.05800, 'longitude' => 120.64100],
            ['name' => 'Brgy. Wawa Covered Court',           'address' => 'Brgy. Wawa, Nasugbu, Batangas',                           'type' => 'barangay_hall',    'capacity' => 300,  'latitude' => 14.07240, 'longitude' => 120.62780],
            ['name' => 'Brgy. Bucana Evacuation Center',     'address' => 'Brgy. Bucana, Nasugbu, Batangas',                         'type' => 'community_center', 'capacity' => 280,  'latitude' => 14.08050, 'longitude' => 120.62400],
            ['name' => 'Lian-Nasugbu District Hospital',     'address' => 'National Highway, Brgy. I, Nasugbu, Batangas',            'type' => 'community_center', 'capacity' => 200,  'latitude' => 14.06950, 'longitude' => 120.63700],
        ];

        foreach ($centers as $center) {
            EvacuationCenter::firstOrCreate(
                ['name' => $center['name']],
                $center
            );
        }
    }
}
