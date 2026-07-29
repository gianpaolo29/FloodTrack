<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_sla_tracking', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->enum('stage', ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved']);
            $table->timestamp('started_at');
            $table->unsignedInteger('threshold_minutes');
            $table->timestamp('completed_at')->nullable();
            $table->decimal('elapsed_minutes', 8, 1)->nullable();
            $table->enum('sla_status', ['on_track', 'at_risk', 'breached', 'met'])->default('on_track');
            $table->unsignedTinyInteger('escalation_level')->default(0);
            $table->timestamp('escalated_at')->nullable();
            $table->timestamps();

            $table->unique(['report_id', 'stage']);
            $table->index(['sla_status', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_sla_tracking');
    }
};
