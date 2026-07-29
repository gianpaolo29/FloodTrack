<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupancy_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evacuation_center_id')->constrained()->cascadeOnDelete();
            $table->integer('previous_occupancy');
            $table->integer('new_occupancy');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('change_type', ['check_in', 'check_out', 'manual_update', 'bulk_update']);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('occupancy_logs');
    }
};
