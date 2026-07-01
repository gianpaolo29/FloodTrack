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
        User::factory()->create([
            'name'  => 'Admin',
            'email' => 'admin@floodtrack.com',
            'password' => 'password123',
            'role'  => 'admin',
        ]);

        // Resident account (test)
        User::factory()->create([
            'name'  => 'Test Resident',
            'email' => 'resident@floodtrack.com',
            'password' => 'password123',
            'role'  => 'resident',
        ]);

        $this->call(ResponderSeeder::class);
    }
}
