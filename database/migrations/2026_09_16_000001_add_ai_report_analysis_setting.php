<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            'group'      => 'automation',
            'key'        => 'ai_report_analysis',
            'value'      => '1',
            'type'       => 'boolean',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'ai_report_analysis')->delete();
    }
};
