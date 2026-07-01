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

// ── Authenticated (all roles) ───────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    // Profile
    Route::get('/me',   [UserController::class, 'me']);
    Route::patch('/me', [UserController::class, 'update']);
    Route::patch('/user/profile', [UserController::class, 'update']);
    Route::post('/user/password', [UserController::class, 'changePassword']);

    // Reports (read access for all authenticated users)
    Route::get('/reports',          [ReportController::class, 'index']);
    Route::get('/reports/{report}', [ReportController::class, 'show']);

    // Alerts / advisories (read access for all)
    Route::get('/alerts', [AlertController::class, 'index']);
    Route::post('/alerts/{alert}/read', [AlertController::class, 'markRead']);
    Route::post('/alerts/read-all', [AlertController::class, 'markAllRead']);

    // ── Resident + Responder: submit reports ─────────────────────────────
    Route::middleware('role:resident,responder,admin')->group(function () {
        Route::post('/reports', [ReportController::class, 'store']);
    });

    // ── Responder only ───────────────────────────────────────────────────
    Route::middleware('role:responder,admin')->prefix('responder')->group(function () {
        Route::get('/assigned-reports', [ReportController::class, 'index']);  // with ?assigned=me
        Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus']);
    });

    // ── Admin only ───────────────────────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::post('/alerts',                             [AlertController::class, 'store']);
        Route::patch('/reports/{report}/assign',           [ReportController::class, 'assign']);
        Route::patch('/reports/{report}/verify',           [ReportController::class, 'verify']);
        Route::patch('/reports/{report}/reject',           [ReportController::class, 'reject']);
    });
});
