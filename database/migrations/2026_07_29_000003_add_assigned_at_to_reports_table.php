<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->timestamp('assigned_at')->nullable()->after('verified_at');
        });

        // Backfill existing assigned/resolved reports
        DB::table('reports')
            ->whereIn('status', ['assigned', 'resolved'])
            ->whereNull('assigned_at')
            ->update(['assigned_at' => DB::raw('verified_at')]);
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('assigned_at');
        });
    }
};
