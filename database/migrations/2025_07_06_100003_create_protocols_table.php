<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocols', function (Blueprint $table) {
            $table->id();
            $table->string('hazard_type');
            $table->string('hazard_label');
            $table->string('icon')->default('warning');
            $table->string('color')->default('#3B82F6');
            $table->text('safety_tip');
            $table->json('steps');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocols');
    }
};
