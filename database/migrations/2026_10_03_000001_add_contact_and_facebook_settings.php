<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insert([
            [
                'group' => 'general',
                'key'   => 'contact_number',
                'value' => '',
                'type'  => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'group' => 'general',
                'key'   => 'fb_page_url',
                'value' => '',
                'type'  => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['contact_number', 'fb_page_url'])->delete();
    }
};
