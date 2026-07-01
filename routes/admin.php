<?php

use App\Http\Controllers\Admin\ActivityController;
use App\Http\Controllers\Admin\AlertController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ExportController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ResponderController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StatisticsController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WeatherController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {

    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Reports
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/',                          [ReportController::class, 'index'])->name('index');
        Route::get('/map',                       [ReportController::class, 'map'])->name('map');
        Route::get('/{report}',                  [ReportController::class, 'show'])->name('show');
        Route::post('/{report}/verify',          [ReportController::class, 'verify'])->name('verify');
        Route::post('/{report}/assign',          [ReportController::class, 'assign'])->name('assign');
        Route::post('/{report}/reject',          [ReportController::class, 'reject'])->name('reject');
    });

    // Alerts
    Route::prefix('alerts')->name('alerts.')->group(function () {
        Route::get('/',             [AlertController::class, 'index'])->name('index');
        Route::post('/',            [AlertController::class, 'store'])->name('store');
        Route::delete('/{alert}',   [AlertController::class, 'destroy'])->name('destroy');
    });

    // Users
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/',                      [UserController::class, 'index'])->name('index');
        Route::patch('/{user}/role',         [UserController::class, 'updateRole'])->name('update-role');
    });

    // Responders
    Route::get('/responders', [ResponderController::class, 'index'])->name('responders.index');

    // Weather
    Route::get('/weather', [WeatherController::class, 'index'])->name('weather.index');

    // Statistics
    Route::get('/statistics', [StatisticsController::class, 'index'])->name('statistics.index');

    // Export
    Route::get('/export',          [ExportController::class, 'index'])->name('export.index');
    Route::get('/export/download', [ExportController::class, 'download'])->name('export.download');

    // Activity Log
    Route::get('/activity', [ActivityController::class, 'index'])->name('activity.index');

    // Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
});
