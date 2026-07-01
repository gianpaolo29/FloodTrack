<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_responders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['lead', 'support', 'medical', 'logistics'])->default('support');
            $table->enum('status', ['pending', 'en_route', 'on_scene', 'resolved'])->default('pending');
            $table->timestamps();

            $table->unique(['report_id', 'user_id']);
            $table->index('report_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_responders');
    }
};
