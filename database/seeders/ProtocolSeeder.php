<?php

namespace Database\Seeders;

use App\Models\Protocol;
use Illuminate\Database\Seeder;

class ProtocolSeeder extends Seeder
{
    public function run(): void
    {
        $protocols = [
            [
                'hazard_type'  => 'flood',
                'hazard_label' => 'Flood Response',
                'icon'         => 'water',
                'color'        => '#3B82F6',
                'safety_tip'   => 'Never enter floodwater above knee level. Watch for debris and fast currents.',
                'sort_order'   => 1,
                'steps'        => [
                    'Assess water level, depth, and flow direction from a safe vantage point',
                    'Identify trapped or stranded residents — prioritize elderly, children, PWDs',
                    'Establish evacuation routes away from rising water levels',
                    'Deploy sandbags or barriers to protect critical infrastructure',
                    'Coordinate with rescue boats if water depth exceeds safe wading level',
                    'Set up temporary shelter and distribute emergency supplies',
                    'Document water marks on structures for damage assessment',
                    'Monitor weather updates for additional rainfall warnings',
                    'Ensure electrical mains are disconnected in flooded areas',
                    'Report structural damage to buildings coordination center',
                ],
            ],
        ];

        foreach ($protocols as $protocol) {
            Protocol::firstOrCreate(
                ['hazard_type' => $protocol['hazard_type']],
                $protocol
            );
        }
    }
}
