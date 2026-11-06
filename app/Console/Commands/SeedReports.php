<?php

namespace App\Console\Commands;

use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use Illuminate\Console\Command;

class SeedReports extends Command
{
    protected $signature = 'reports:seed
        {--count=5 : Number of reports to create}
        {--severity=high : Severity level (low, moderate, high, critical)}
        {--status=pending : Report status (pending, verified, assigned, resolved)}
        {--force : Required in production}';

    protected $description = 'Seed dummy flood reports for testing';

    private const LOCATIONS = [
        ['Barangay 1 (Pob.), Nasugbu, Batangas', 14.0690, 120.6310],
        ['Barangay 2 (Pob.), Nasugbu, Batangas', 14.0705, 120.6295],
        ['Barangay 3 (Pob.), Nasugbu, Batangas', 14.0720, 120.6250],
        ['Barangay 4 (Pob.), Nasugbu, Batangas', 14.0695, 120.6280],
        ['Barangay 5 (Pob.), Nasugbu, Batangas', 14.0680, 120.6270],
        ['Barangay 7 (Pob.), Nasugbu, Batangas', 14.0650, 120.6280],
        ['Barangay Bilaran, Nasugbu, Batangas', 14.0550, 120.6180],
        ['Barangay Lumbangan, Nasugbu, Batangas', 14.0760, 120.6340],
        ['Barangay Wawa, Nasugbu, Batangas', 14.0620, 120.6350],
        ['Barangay Bucana, Nasugbu, Batangas', 14.0580, 120.6220],
        ['Barangay Natipuan, Nasugbu, Batangas', 14.0480, 120.6150],
        ['Barangay Calayo, Nasugbu, Batangas', 14.0420, 120.6100],
        ['Barangay Kaylaway, Nasugbu, Batangas', 14.0900, 120.6400],
        ['Barangay Aga, Nasugbu, Batangas', 14.0350, 120.6050],
        ['Barangay Cogunan, Nasugbu, Batangas', 14.0820, 120.6380],
    ];

    private const DESCRIPTIONS = [
        'Heavy flooding reported. Water level rising rapidly. Roads impassable.',
        'Flood water entering residential area. Several families affected.',
        'Flash flood from nearby river. Water chest-deep in some areas.',
        'Road completely submerged. Vehicles stranded. Need immediate assistance.',
        'Continuous rain causing severe flooding. Evacuation may be needed.',
        'Water level has not receded. Requesting rescue team for elderly residents.',
        'Flooding in low-lying area. Power lines down. Dangerous conditions.',
        'Creek overflowed. Multiple houses flooded. Residents on rooftops.',
    ];

    private const DEPTH_RANGES = [
        'low'      => [0.3, 0.8],
        'moderate' => [1.0, 2.0],
        'high'     => [2.5, 3.5],
        'critical' => [3.5, 5.0],
    ];

    public function handle(): int
    {
        if (app()->isProduction() && ! $this->option('force')) {
            $this->error('Use --force to run in production.');
            return 1;
        }

        $count    = (int) $this->option('count');
        $severity = $this->option('severity');
        $status   = $this->option('status');

        if (! in_array($severity, ['low', 'moderate', 'high', 'critical'])) {
            $this->error("Invalid severity: {$severity}. Use: low, moderate, high, critical");
            return 1;
        }

        if (! in_array($status, ['pending', 'verified', 'assigned', 'resolved'])) {
            $this->error("Invalid status: {$status}. Use: pending, verified, assigned, resolved");
            return 1;
        }

        $user = User::where('role', 'resident')->first();
        if (! $user) {
            $this->error('No resident user found in database.');
            return 1;
        }

        $depthRange = self::DEPTH_RANGES[$severity];

        $this->info("Creating {$count} {$severity} {$status} reports...");

        for ($i = 0; $i < $count; $i++) {
            $loc   = self::LOCATIONS[$i % count(self::LOCATIONS)];
            $desc  = self::DESCRIPTIONS[$i % count(self::DESCRIPTIONS)];
            $depth = round(rand($depthRange[0] * 10, $depthRange[1] * 10) / 10, 1);

            // Add slight randomness to coordinates
            $lat = $loc[1] + (rand(-50, 50) / 100000);
            $lng = $loc[2] + (rand(-50, 50) / 100000);

            $report = Report::create([
                'user_id'          => $user->id,
                'reference_number' => 'FT-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)),
                'hazard_type'      => 'flood',
                'severity'         => $severity,
                'depth_ft'         => $depth,
                'status'           => $status,
                'description'      => $desc,
                'latitude'         => $lat,
                'longitude'        => $lng,
                'address'          => $loc[0],
            ]);

            // Create status history
            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $user->id,
                'status'    => 'pending',
                'notes'     => 'Report submitted.',
            ]);

            if (in_array($status, ['verified', 'assigned', 'resolved'])) {
                ReportStatusUpdate::create([
                    'report_id' => $report->id,
                    'user_id'   => 1,
                    'status'    => 'verified',
                    'notes'     => 'Verified by admin.',
                ]);
            }

            if (in_array($status, ['assigned', 'resolved'])) {
                $responder = User::where('role', 'responder')->inRandomOrder()->first();
                if ($responder) {
                    $report->update(['assigned_to' => $responder->id]);
                    ReportStatusUpdate::create([
                        'report_id' => $report->id,
                        'user_id'   => 1,
                        'status'    => 'assigned',
                        'notes'     => "Assigned to {$responder->name}.",
                    ]);
                }
            }

            if ($status === 'resolved') {
                $report->update(['resolved_at' => now()]);
                ReportStatusUpdate::create([
                    'report_id' => $report->id,
                    'user_id'   => $report->assigned_to ?? 1,
                    'status'    => 'resolved',
                    'notes'     => 'Incident resolved.',
                ]);
            }

            $this->line("  ✓ {$report->reference_number} | {$loc[0]} | {$depth}ft");
        }

        $this->info("Done! Created {$count} reports.");
        return 0;
    }
}
