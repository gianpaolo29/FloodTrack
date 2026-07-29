<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            ['group' => 'notifications', 'key' => 'occupancy_alert_threshold', 'value' => '90', 'type' => 'integer'],
            ['group' => 'notifications', 'key' => 'sla_notifications_enabled', 'value' => '1', 'type' => 'boolean'],
            ['group' => 'notifications', 'key' => 'occupancy_notifications_enabled', 'value' => '1', 'type' => 'boolean'],
            ['group' => 'notifications', 'key' => 'default_pref_critical', 'value' => '1', 'type' => 'boolean'],
            ['group' => 'notifications', 'key' => 'default_pref_advisory', 'value' => '1', 'type' => 'boolean'],
            ['group' => 'notifications', 'key' => 'default_pref_my_reports', 'value' => '1', 'type' => 'boolean'],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['group' => $setting['group'], 'key' => $setting['key']],
                $setting,
            );
        }
    }

    public function down(): void
    {
        DB::table('settings')
            ->where('group', 'notifications')
            ->whereIn('key', [
                'occupancy_alert_threshold',
                'sla_notifications_enabled',
                'occupancy_notifications_enabled',
                'default_pref_critical',
                'default_pref_advisory',
                'default_pref_my_reports',
            ])
            ->delete();
    }
};
