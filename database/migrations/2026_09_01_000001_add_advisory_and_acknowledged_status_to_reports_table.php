<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE reports MODIFY COLUMN status ENUM('pending', 'verified', 'acknowledged', 'assigned', 'resolved', 'rejected') NOT NULL DEFAULT 'pending'");

        Schema::table('reports', function (Blueprint $table) {
            $table->json('advisory')->nullable()->after('ai_exif_notes');
        });
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE reports MODIFY COLUMN status ENUM('pending', 'verified', 'assigned', 'resolved', 'rejected') NOT NULL DEFAULT 'pending'");

        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('advisory');
        });
    }
};
