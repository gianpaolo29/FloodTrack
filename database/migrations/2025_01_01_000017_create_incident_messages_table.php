<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_quick_reply')->default(false);
            $table->timestamps();

            $table->index('report_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_messages');
    }
};
