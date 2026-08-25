<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facebook_import_log', function (Blueprint $table) {
            $table->id();
            $table->string('facebook_post_id')->unique();
            $table->boolean('imported')->default(false);
            $table->foreignId('report_id')->nullable()->constrained()->nullOnDelete();
            $table->string('skipped_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facebook_import_log');
    }
};
