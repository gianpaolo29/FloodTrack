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
use App\Http\Controllers\Api\EvacuationCenterController;
use App\Http\Controllers\Api\ProtocolController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\UserNotificationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| FloodTrack API Routes
|--------------------------------------------------------------------------
| All routes return JSON. Auth routes use Sanctum token (Bearer).
*/

// ── Public ──────────────────────────────────────────────────────────────
Route::post('/register',       [AuthController::class, 'register']);
Route::post('/login',          [AuthController::class, 'login']);
Route::post('/check-email',    [AuthController::class, 'checkEmail']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

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

    // ── Reports: submit + edit + withdraw ─────────────────────────────────
    Route::post('/reports', [ReportController::class, 'store']);
    Route::put('/reports/{report}', [ReportController::class, 'update']);
    Route::delete('/reports/{report}', [ReportController::class, 'destroy']);
    Route::delete('/reports/{report}/media/{media}', [ReportController::class, 'destroyMedia']);

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

    // Personal in-app notifications
    Route::get('/user/notifications',              [UserNotificationController::class, 'index']);
    Route::post('/user/notifications/read-all',    [UserNotificationController::class, 'markAllRead']);
    Route::post('/user/notifications/{id}/read',   [UserNotificationController::class, 'markRead']);

    // Evacuation centers and protocols (read-only for all users)
    Route::get('/evacuation-centers', [EvacuationCenterController::class, 'index']);
    Route::get('/protocols',          [ProtocolController::class, 'index']);

    // Active hazards (read-only for all users — shown on map)
    Route::get('/hazards', function () {
        return \App\Models\Hazard::where('active', true)->latest()->get();
    });

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
        Route::get('/admin/stats',                         [AdminStatsController::class, 'index']);

        // Hazard management (admin API for mobile app)
        Route::get('/admin/hazards',              function () {
            return ['data' => \App\Models\Hazard::with('creator:id,name')->latest()->get()];
        });
        Route::post('/admin/hazards',             function (\Illuminate\Http\Request $request) {
            $validated = $request->validate([
                'category'    => 'required|in:flood,road',
                'type'        => 'required|string|max:50',
                'severity'    => 'required|in:low,moderate,high,critical',
                'title'       => 'required|string|max:255',
                'description' => 'nullable|string',
                'latitude'    => 'required|numeric|between:-90,90',
                'longitude'   => 'required|numeric|between:-180,180',
                'address'     => 'nullable|string|max:500',
            ]);
            return \App\Models\Hazard::create([...$validated, 'created_by' => $request->user()->id]);
        });
        Route::put('/admin/hazards/{hazard}',     function (\Illuminate\Http\Request $request, \App\Models\Hazard $hazard) {
            $validated = $request->validate([
                'category'    => 'sometimes|in:flood,road',
                'type'        => 'sometimes|string|max:50',
                'severity'    => 'sometimes|in:low,moderate,high,critical',
                'title'       => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'latitude'    => 'sometimes|numeric|between:-90,90',
                'longitude'   => 'sometimes|numeric|between:-180,180',
                'address'     => 'nullable|string|max:500',
                'active'      => 'sometimes|boolean',
            ]);
            $hazard->update($validated);
            return $hazard;
        });
        Route::delete('/admin/hazards/{hazard}',  function (\App\Models\Hazard $hazard) {
            $hazard->delete();
            return response()->noContent();
        });
    });
});
