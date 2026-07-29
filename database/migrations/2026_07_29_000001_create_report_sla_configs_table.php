<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_sla_configs', function (Blueprint $table) {
            $table->id();
            $table->enum('severity', ['low', 'moderate', 'high', 'critical']);
            $table->enum('stage', ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved']);
            $table->unsignedInteger('threshold_minutes');
            $table->unsignedTinyInteger('warning_pct')->default(80);
            $table->unsignedTinyInteger('critical_pct')->default(150);
            $table->timestamps();

            $table->unique(['severity', 'stage']);
        });

        // Seed defaults
        $now = now();
        $defaults = [
            // critical: tight SLAs
            ['critical', 'pending_to_verified',    15, 80, 150],
            ['critical', 'verified_to_assigned',   30, 80, 150],
            ['critical', 'assigned_to_resolved',  120, 80, 150],
            // high
            ['high', 'pending_to_verified',    30, 80, 150],
            ['high', 'verified_to_assigned',   60, 80, 150],
            ['high', 'assigned_to_resolved',  240, 80, 150],
            // moderate
            ['moderate', 'pending_to_verified',    60, 80, 150],
            ['moderate', 'verified_to_assigned',  120, 80, 150],
            ['moderate', 'assigned_to_resolved',  480, 80, 150],
            // low
            ['low', 'pending_to_verified',   120, 80, 150],
            ['low', 'verified_to_assigned',  240, 80, 150],
            ['low', 'assigned_to_resolved',  960, 80, 150],
        ];

        foreach ($defaults as [$severity, $stage, $threshold, $warning, $critical]) {
            DB::table('report_sla_configs')->insert([
                'severity'          => $severity,
                'stage'             => $stage,
                'threshold_minutes' => $threshold,
                'warning_pct'       => $warning,
                'critical_pct'      => $critical,
                'created_at'        => $now,
                'updated_at'        => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('report_sla_configs');
    }
};
