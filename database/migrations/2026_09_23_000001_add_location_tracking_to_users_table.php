<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('current_latitude', 10, 7)->nullable()->after('home_longitude');
            $table->decimal('current_longitude', 10, 7)->nullable()->after('current_latitude');
            $table->timestamp('location_updated_at')->nullable()->after('current_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['current_latitude', 'current_longitude', 'location_updated_at']);
        });
    }
};
