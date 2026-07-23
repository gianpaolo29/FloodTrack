<?php

use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Resident dashboard (default)
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Responder dashboard
    Route::middleware('role:responder,admin')->prefix('responder')->name('responder.')->group(function () {
        Route::inertia('dashboard', 'responder/dashboard')->name('dashboard');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
