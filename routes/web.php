<?php

use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');
Route::inertia('/privacy', 'privacy')->name('privacy');

// Download APK — redirects to EAS build URL with proper filename
Route::get('/download', function () {
    $url = \App\Models\Setting::getValue('apk_download_url', '');
    if (!$url) {
        return redirect('/')->with('error', 'Download not available yet.');
    }
    return response()->streamDownload(function () use ($url) {
        echo file_get_contents($url);
    }, 'FloodTrack.apk', [
        'Content-Type' => 'application/vnd.android.package-archive',
    ]);
})->name('download');

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
