<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Admin account
        User::firstOrCreate(
            ['email' => 'admin@floodtrack.com'],
            [
                'name'              => 'Admin',
                'password'          => bcrypt('password123'),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // Resident account (test)
        User::firstOrCreate(
            ['email' => 'resident@floodtrack.com'],
            [
                'name'              => 'Test Resident',
                'password'          => bcrypt('password123'),
                'role'              => 'resident',
                'email_verified_at' => now(),
            ]
        );
    }
}
