<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sla:check-breaches')->everyMinute()->withoutOverlapping();
Schedule::command('duty:sync')->everyMinute()->withoutOverlapping();
Schedule::command('responders:mark-stale')->everyMinute()->withoutOverlapping();
Schedule::command('history:prune')->dailyAt('03:00');
Schedule::command('facebook:import-reports')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('schedule:shift-reminders')->everyMinute()->withoutOverlapping();
