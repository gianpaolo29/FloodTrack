<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| FloodTrack API Routes
|--------------------------------------------------------------------------
| All routes return JSON. Auth routes use Sanctum token (Bearer).
*/

// ── Public ──────────────────────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// ── Authenticated ────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    // Profile
    Route::get('/me',   [UserController::class, 'me']);
    Route::patch('/me', [UserController::class, 'update']);
    Route::patch('/user/profile', [UserController::class, 'update']);
    Route::post('/user/password', [UserController::class, 'changePassword']);

    // Reports
    Route::get('/reports',          [ReportController::class, 'index']);   // list (map pins + my reports)
    Route::post('/reports',         [ReportController::class, 'store']);   // submit new report
    Route::get('/reports/{report}', [ReportController::class, 'show']);    // full detail
    Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus']); // responder/admin status update

    // Alerts / advisories
    Route::get('/alerts', [AlertController::class, 'index']);
    Route::post('/alerts/{alert}/read', [AlertController::class, 'markRead']);
    Route::post('/alerts/read-all', [AlertController::class, 'markAllRead']);

    // ── Admin only ───────────────────────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::post('/alerts',           [AlertController::class, 'store']);
        Route::patch('/reports/{report}/assign',   [ReportController::class, 'assign']);
        Route::patch('/reports/{report}/verify',   [ReportController::class, 'verify']);
        Route::patch('/reports/{report}/reject',   [ReportController::class, 'reject']);
    });
});
