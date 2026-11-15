<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            [
                'group'      => 'automation',
                'key'        => 'report_cooldown_minutes',
                'value'      => '5',
                'type'       => 'integer',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'group'      => 'automation',
                'key'        => 'report_daily_cap',
                'value'      => '5',
                'type'       => 'integer',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'report_cooldown_minutes',
            'report_daily_cap',
        ])->delete();
    }
};
