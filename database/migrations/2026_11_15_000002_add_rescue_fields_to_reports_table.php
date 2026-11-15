<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->unsignedInteger('rescued_count')->nullable()->after('resolved_at');
            $table->foreignId('evacuation_center_id')->nullable()->after('rescued_count')
                ->constrained('evacuation_centers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('evacuation_center_id');
            $table->dropColumn('rescued_count');
        });
    }
};
