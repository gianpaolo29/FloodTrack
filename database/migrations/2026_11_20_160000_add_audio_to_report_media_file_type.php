<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE report_media MODIFY COLUMN file_type ENUM('image', 'video', 'audio') DEFAULT 'image'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE report_media MODIFY COLUMN file_type ENUM('image', 'video') DEFAULT 'image'");
    }
};
