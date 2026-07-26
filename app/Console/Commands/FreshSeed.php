<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class FreshSeed extends Command
{
    protected $signature = 'db:fresh-seed';
    protected $description = 'Drop all tables, re-run migrations, and seed the database';

    public function handle(): void
    {
        if (! $this->confirm('This will wipe the entire database. Are you sure?', true)) {
            $this->info('Cancelled.');
            return;
        }

        DB::prohibitDestructiveCommands(false);

        $this->info('Running migrate:fresh...');
        Artisan::call('migrate:fresh', ['--force' => true], $this->output);

        $this->info('Running db:seed...');
        Artisan::call('db:seed', ['--force' => true], $this->output);

        $this->info('Done.');
    }
}
