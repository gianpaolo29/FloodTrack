<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->boolean('ai_flagged')->default(false)->after('resolved_at');
            $table->text('ai_flag_reason')->nullable()->after('ai_flagged');
            $table->boolean('ai_image_verified')->nullable()->after('ai_flag_reason');
            $table->text('ai_image_notes')->nullable()->after('ai_image_verified');
            $table->foreignId('potential_duplicate_of')->nullable()->after('ai_image_notes')
                ->constrained('reports')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropForeign(['potential_duplicate_of']);
            $table->dropColumn([
                'ai_flagged',
                'ai_flag_reason',
                'ai_image_verified',
                'ai_image_notes',
                'potential_duplicate_of',
            ]);
        });
    }
};
