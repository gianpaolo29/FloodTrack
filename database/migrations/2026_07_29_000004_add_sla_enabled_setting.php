<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            'group' => 'sla',
            'key'   => 'sla_enabled',
            'value' => '1',
            'type'  => 'boolean',
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'sla_enabled')->delete();
    }
};
