<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->float('current_heading')->nullable()->after('current_longitude');
            $table->float('current_speed')->nullable()->after('current_heading');
            $table->string('duty_override')->nullable()->after('is_on_duty'); // 'on' | 'off' | null
            $table->index(['role', 'is_on_duty']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['current_heading', 'current_speed', 'duty_override']);
            $table->dropIndex(['role', 'is_on_duty']);
        });
    }
};
