<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite has no ENUM — file_type is already a text column, so 'audio' is accepted as-is.
            return;
        }

        DB::statement("ALTER TABLE report_media MODIFY COLUMN file_type ENUM('image', 'video', 'audio') DEFAULT 'image'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE report_media MODIFY COLUMN file_type ENUM('image', 'video') DEFAULT 'image'");
    }
};
