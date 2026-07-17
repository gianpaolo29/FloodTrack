<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('home_address')->nullable()->after('contact_number');
            $table->decimal('home_latitude',  10, 7)->nullable()->after('home_address');
            $table->decimal('home_longitude', 10, 7)->nullable()->after('home_latitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['home_address', 'home_latitude', 'home_longitude']);
        });
    }
};
