<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group');
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, boolean, integer
            $table->timestamps();
        });

        // Seed defaults
        $now = now();
        DB::table('settings')->insert([
            // General
            ['group' => 'general', 'key' => 'system_name',      'value' => 'FloodTrack',   'type' => 'string',  'created_at' => $now, 'updated_at' => $now],
            ['group' => 'general', 'key' => 'default_region',    'value' => 'Philippines',  'type' => 'string',  'created_at' => $now, 'updated_at' => $now],
            ['group' => 'general', 'key' => 'default_latitude',  'value' => '14.5995',      'type' => 'string',  'created_at' => $now, 'updated_at' => $now],
            ['group' => 'general', 'key' => 'default_longitude', 'value' => '120.9842',     'type' => 'string',  'created_at' => $now, 'updated_at' => $now],

            // Notifications
            ['group' => 'notifications', 'key' => 'email_notifications',   'value' => '1', 'type' => 'boolean', 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'notifications', 'key' => 'auto_assign',          'value' => '0', 'type' => 'boolean', 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'notifications', 'key' => 'notify_on_critical',   'value' => '1', 'type' => 'boolean', 'created_at' => $now, 'updated_at' => $now],

            // Data
            ['group' => 'data', 'key' => 'report_retention_days', 'value' => '0',          'type' => 'integer', 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'data', 'key' => 'media_storage',         'value' => 'local',       'type' => 'string',  'created_at' => $now, 'updated_at' => $now],
            ['group' => 'data', 'key' => 'max_upload_size_mb',    'value' => '10',          'type' => 'integer', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
