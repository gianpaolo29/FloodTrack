<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ResponderStatsController;
use App\Http\Controllers\Api\IncidentMessageController;
use App\Http\Controllers\Api\FieldReportController;
use App\Http\Controllers\Api\WeatherController;
use App\Http\Controllers\Api\FamilyController;
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

    // Push notification tokens
    Route::post('/device-tokens',   [DeviceTokenController::class, 'store']);
    Route::delete('/device-tokens', [DeviceTokenController::class, 'destroy']);
    Route::patch('/user/profile', [UserController::class, 'update']);
    Route::post('/user/password', [UserController::class, 'changePassword']);
    Route::patch('/user/duty-status', [UserController::class, 'updateDutyStatus']);

    // Reports (read access for all authenticated users)
    Route::get('/reports',          [ReportController::class, 'index']);
    Route::get('/reports/{report}', [ReportController::class, 'show']);

    // Weather
    Route::get('/weather', [WeatherController::class, 'current']);

    // Alerts / advisories (read access for all)
    Route::get('/alerts', [AlertController::class, 'index']);
    Route::post('/alerts/{alert}/read', [AlertController::class, 'markRead']);
    Route::post('/alerts/read-all', [AlertController::class, 'markAllRead']);

    // ── Reports: submit + withdraw ──────────────────────────────────────
    Route::post('/reports', [ReportController::class, 'store']);
    Route::delete('/reports/{report}', [ReportController::class, 'destroy']);

    // ── Messages (auth handled by controller canAccess) ──────────────────
    Route::get('/reports/{report}/messages',  [IncidentMessageController::class, 'index']);
    Route::post('/reports/{report}/messages', [IncidentMessageController::class, 'store'])->middleware('throttle:30,1');
    Route::post('/reports/{report}/messages/read', [IncidentMessageController::class, 'markRead']);
    Route::get('/reports/{report}/messages/unread-count', [IncidentMessageController::class, 'unreadCount']);
    Route::post('/reports/{report}/typing', [IncidentMessageController::class, 'typing'])->middleware('throttle:60,1');
    Route::get('/reports/{report}/typing', [IncidentMessageController::class, 'typingUsers']);

    // ── Family safety group ─────────────────────────────────────────────
    Route::get('/family',                  [FamilyController::class, 'show']);
    Route::post('/family',                 [FamilyController::class, 'store']);
    Route::post('/family/join/{code}',     [FamilyController::class, 'join']);
    Route::post('/family/invite',          [FamilyController::class, 'invite']);
    Route::post('/family/check-in',        [FamilyController::class, 'checkIn']);
    Route::delete('/family/leave',         [FamilyController::class, 'leave']);
    Route::delete('/family/members/{id}',  [FamilyController::class, 'removeMember']);

    // Avatar upload
    Route::post('/user/avatar', [UserController::class, 'updateAvatar']);

    // ── Responder only ───────────────────────────────────────────────────
    Route::middleware('role:responder,admin')->prefix('responder')->group(function () {
        Route::get('/assigned-reports', [ReportController::class, 'index']);  // with ?assigned=me
        Route::patch('/reports/{report}/status', [ReportController::class, 'updateStatus']);
        Route::get('/stats', [ResponderStatsController::class, 'index']);
        Route::get('/reports/{report}/field-report', [FieldReportController::class, 'show']);
        Route::post('/reports/{report}/field-report', [FieldReportController::class, 'store']);
    });

    // ── Admin only ───────────────────────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::post('/alerts',                             [AlertController::class, 'store']);
        Route::patch('/reports/{report}/assign',           [ReportController::class, 'assign']);
        Route::patch('/reports/{report}/verify',           [ReportController::class, 'verify']);
        Route::patch('/reports/{report}/reject',           [ReportController::class, 'reject']);
    });
});
