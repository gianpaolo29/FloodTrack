<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('family_members');
        Schema::dropIfExists('family_groups');
    }

    public function down(): void
    {
        // Tables were removed as part of feature removal — no rollback.
    }
};
