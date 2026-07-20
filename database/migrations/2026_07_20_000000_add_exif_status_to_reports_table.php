<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->string('ai_exif_status', 20)->nullable()->after('ai_image_notes');
            $table->text('ai_exif_notes')->nullable()->after('ai_exif_status');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn(['ai_exif_status', 'ai_exif_notes']);
        });
    }
};
