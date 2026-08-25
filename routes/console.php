<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('hazards:sync-weather')->everyThirtyMinutes();
Schedule::command('sla:check-breaches')->everyMinute()->withoutOverlapping();
Schedule::command('facebook:import-reports')->everyFifteenMinutes()->withoutOverlapping();
