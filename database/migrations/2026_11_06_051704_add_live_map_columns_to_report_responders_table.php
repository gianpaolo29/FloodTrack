<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_responders', function (Blueprint $table) {
            $table->json('route')->nullable()->after('status');
            $table->datetime('en_route_at')->nullable()->after('route');
            $table->datetime('on_scene_at')->nullable()->after('en_route_at');
            $table->datetime('resolved_at')->nullable()->after('on_scene_at');
        });
    }

    public function down(): void
    {
        Schema::table('report_responders', function (Blueprint $table) {
            $table->dropColumn(['route', 'en_route_at', 'on_scene_at', 'resolved_at']);
        });
    }
};
