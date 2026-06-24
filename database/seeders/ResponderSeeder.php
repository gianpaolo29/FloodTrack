<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class ResponderSeeder extends Seeder
{
    /**
     * Seed responder accounts for testing the mobile app.
     */
    public function run(): void
    {
        $responders = [
            [
                'name'           => 'Juan Dela Cruz',
                'email'          => 'responder@floodtrack.com',
                'password'       => 'password123',
                'role'           => 'responder',
                'contact_number' => '09171234567',
            ],
            [
                'name'           => 'Maria Santos',
                'email'          => 'maria.responder@floodtrack.com',
                'password'       => 'password123',
                'role'           => 'responder',
                'contact_number' => '09181234567',
            ],
            [
                'name'           => 'Pedro Reyes',
                'email'          => 'pedro.responder@floodtrack.com',
                'password'       => 'password123',
                'role'           => 'responder',
                'contact_number' => '09191234567',
            ],
        ];

        foreach ($responders as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                $data,
            );
        }
    }
}
