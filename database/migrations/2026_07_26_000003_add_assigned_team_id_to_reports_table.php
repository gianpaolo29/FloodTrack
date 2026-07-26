<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->foreignId('assigned_team_id')->nullable()->after('assigned_to')->constrained('teams')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Team::class, 'assigned_team_id');
            $table->dropColumn('assigned_team_id');
        });
    }
};
