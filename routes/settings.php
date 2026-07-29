<?php

use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile',         [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile',        [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/profile/avatar',  [ProfileController::class, 'updateAvatar'])->name('profile.avatar');

    Route::get('settings/appearance', [AppearanceController::class, 'edit'])->name('appearance.edit');

    Route::get('settings/notifications', fn () => \Inertia\Inertia::render('settings/notifications'))->name('notifications.edit');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');
    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');
});
