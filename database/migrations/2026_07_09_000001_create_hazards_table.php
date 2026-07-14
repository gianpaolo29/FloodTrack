<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hazards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('category');       // flood | road
            $table->string('type');           // flash_flood, closed_road, etc.
            $table->string('severity');       // low | moderate | high | critical
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['category', 'active']);
            $table->index('active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hazards');
    }
};
