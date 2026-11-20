<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            'group'      => 'general',
            'key'        => 'coverage_area',
            'value'      => 'nasugbu',
            'type'       => 'string',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'coverage_area')->delete();
    }
};
