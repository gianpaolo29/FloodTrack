<?php

use App\Http\Controllers\Admin\ActivityController;
use App\Http\Controllers\Admin\AlertController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EvacuationCenterController;
use App\Http\Controllers\Admin\ExportController;
use App\Http\Controllers\Admin\HazardController;
use App\Http\Controllers\Admin\NotificationController;
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
        Route::post('/bulk',                     [ReportController::class, 'bulkAction'])->name('bulk');
        Route::get('/map',                       [ReportController::class, 'map'])->name('map');
        Route::get('/{report}',                  [ReportController::class, 'show'])->name('show');
        Route::put('/{report}',                  [ReportController::class, 'update'])->name('update');
        Route::delete('/{report}',               [ReportController::class, 'destroy'])->name('destroy');
        Route::post('/{report}/verify',          [ReportController::class, 'verify'])->name('verify');
        Route::post('/{report}/assign',          [ReportController::class, 'assign'])->name('assign');
        Route::post('/{report}/reject',          [ReportController::class, 'reject'])->name('reject');
        Route::post('/{report}/reopen',          [ReportController::class, 'reopen'])->name('reopen');
    });

    // Hazards
    Route::prefix('hazards')->name('hazards.')->group(function () {
        Route::get('/',                      [HazardController::class, 'index'])->name('index');
        Route::post('/',                     [HazardController::class, 'store'])->name('store');
        Route::post('/bulk',                 [HazardController::class, 'bulkAction'])->name('bulk');
        Route::put('/{hazard}',              [HazardController::class, 'update'])->name('update');
        Route::post('/{hazard}/toggle',      [HazardController::class, 'toggleActive'])->name('toggle');
        Route::delete('/{hazard}',           [HazardController::class, 'destroy'])->name('destroy');
    });

    // Evacuation Centers
    Route::prefix('evacuation-centers')->name('evacuation-centers.')->group(function () {
        Route::get('/',                              [EvacuationCenterController::class, 'index'])->name('index');
        Route::post('/',                             [EvacuationCenterController::class, 'store'])->name('store');
        Route::post('/bulk',                         [EvacuationCenterController::class, 'bulkAction'])->name('bulk');
        Route::put('/{evacuationCenter}',            [EvacuationCenterController::class, 'update'])->name('update');
        Route::post('/{evacuationCenter}/toggle',    [EvacuationCenterController::class, 'toggleActive'])->name('toggle');
        Route::delete('/{evacuationCenter}',         [EvacuationCenterController::class, 'destroy'])->name('destroy');
    });

    // Alerts
    Route::prefix('alerts')->name('alerts.')->group(function () {
        Route::get('/',             [AlertController::class, 'index'])->name('index');
        Route::post('/',            [AlertController::class, 'store'])->name('store');
        Route::post('/bulk',        [AlertController::class, 'bulkAction'])->name('bulk');
        Route::put('/{alert}',      [AlertController::class, 'update'])->name('update');
        Route::delete('/{alert}',   [AlertController::class, 'destroy'])->name('destroy');
    });

    // Users
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/',                      [UserController::class, 'index'])->name('index');
        Route::post('/',                     [UserController::class, 'store'])->name('store');
        Route::post('/bulk',                 [UserController::class, 'bulkAction'])->name('bulk');
        Route::put('/{user}',                [UserController::class, 'update'])->name('update');
        Route::patch('/{user}/role',         [UserController::class, 'updateRole'])->name('update-role');
        Route::delete('/{user}',             [UserController::class, 'destroy'])->name('destroy');
    });

    // Responders
    Route::prefix('responders')->name('responders.')->group(function () {
        Route::get('/',  [ResponderController::class, 'index'])->name('index');
        Route::post('/', [ResponderController::class, 'store'])->name('store');
    });

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
    Route::get('/settings',  [SettingsController::class, 'index'])->name('settings.index');
    Route::put('/settings',  [SettingsController::class, 'update'])->name('settings.update');

    // Notifications (JSON API)
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/',                  [NotificationController::class, 'index'])->name('index');
        Route::post('/{id}/read',        [NotificationController::class, 'markAsRead'])->name('read');
        Route::post('/mark-all-read',    [NotificationController::class, 'markAllAsRead'])->name('read-all');
    });
});
