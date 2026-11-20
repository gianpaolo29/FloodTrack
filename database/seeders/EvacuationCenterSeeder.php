<?php

namespace Database\Seeders;

use App\Models\EvacuationCenter;
use Illuminate\Database\Seeder;

class EvacuationCenterSeeder extends Seeder
{
    public function run(): void
    {
        $centers = [
            ['name' => 'Nasugbu West Central School',           'address' => 'Brgy. IV, Nasugbu, Batangas',                   'type' => 'school', 'capacity' => 2000, 'latitude' => 14.07362, 'longitude' => 120.63332],
            ['name' => 'Nasugbu East Central School',           'address' => 'Poblacion, Nasugbu, Batangas',                  'type' => 'school', 'capacity' => 900,  'latitude' => 14.07620, 'longitude' => 120.63680],
            ['name' => 'Nasugbu National High School',          'address' => 'Brgy. Poblacion, Nasugbu, Batangas',            'type' => 'school', 'capacity' => 1500, 'latitude' => 14.08100, 'longitude' => 120.63900],
            ['name' => 'Pantalan Elementary School',            'address' => 'Brgy. Pantalan, Nasugbu, Batangas',             'type' => 'school', 'capacity' => 450,  'latitude' => 14.08560, 'longitude' => 120.62950],
            ['name' => 'Kaylaway Elementary School',            'address' => 'Brgy. Kaylaway, Nasugbu, Batangas',             'type' => 'school', 'capacity' => 350,  'latitude' => 14.05800, 'longitude' => 120.64100],
            ['name' => 'Bilaran Elementary School',             'address' => 'Brgy. Bilaran, Nasugbu, Batangas',              'type' => 'school', 'capacity' => 350,  'latitude' => 14.06850, 'longitude' => 120.63550],
            ['name' => 'Lumbangan Elementary School',           'address' => 'Brgy. Lumbangan, Nasugbu, Batangas',            'type' => 'school', 'capacity' => 400,  'latitude' => 14.06150, 'longitude' => 120.64030],
            ['name' => 'Wawa Elementary School',                'address' => 'Brgy. Wawa, Nasugbu, Batangas',                 'type' => 'school', 'capacity' => 300,  'latitude' => 14.07240, 'longitude' => 120.62780],
            ['name' => 'Bucana Elementary School',              'address' => 'Brgy. Bucana, Nasugbu, Batangas',               'type' => 'school', 'capacity' => 280,  'latitude' => 14.08050, 'longitude' => 120.62400],
            ['name' => 'Calayo Elementary School',              'address' => 'Brgy. Calayo, Nasugbu, Batangas',               'type' => 'school', 'capacity' => 300,  'latitude' => 14.10200, 'longitude' => 120.60300],
            ['name' => 'Lojo Elementary School',                'address' => 'Brgy. Lojo, Nasugbu, Batangas',                 'type' => 'school', 'capacity' => 350,  'latitude' => 14.05100, 'longitude' => 120.65200],
            ['name' => 'Natipuan Elementary School',            'address' => 'Brgy. Natipuan, Nasugbu, Batangas',             'type' => 'school', 'capacity' => 320,  'latitude' => 14.09500, 'longitude' => 120.61800],
            ['name' => 'Cogunan Elementary School',             'address' => 'Brgy. Cogunan, Nasugbu, Batangas',              'type' => 'school', 'capacity' => 280,  'latitude' => 14.04800, 'longitude' => 120.65800],
            ['name' => 'Aga Elementary School',                 'address' => 'Brgy. Aga, Nasugbu, Batangas',                  'type' => 'school', 'capacity' => 300,  'latitude' => 14.03900, 'longitude' => 120.66500],
        ];

        foreach ($centers as $center) {
            EvacuationCenter::firstOrCreate(
                ['name' => $center['name']],
                $center
            );
        }
    }
}
