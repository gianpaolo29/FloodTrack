<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('duty_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->datetime('started_at');
            $table->datetime('ended_at')->nullable();
            $table->string('source'); // 'shift' or 'override'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('duty_logs');
    }
};
