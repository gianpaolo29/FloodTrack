<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResponderMissionController extends Controller
{
    /**
     * PATCH /api/responder/reports/{report}/mission-status
     *
     * Forward-only transitions on report_responders: pending → en_route → on_scene → resolved.
     * Updates the pivot row, emits events, auto-resolves report when all are done.
     */
    public function updateStatus(Request $request, Report $report): JsonResponse
    {
        $user = $request->user();

        // Must have a report_responders row
        $pivot = DB::table('report_responders')
            ->where('report_id', $report->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'You are not assigned to this report.'], 403);
        }

        $data = $request->validate([
            'status' => 'required|in:en_route,on_scene,resolved',
            'notes'  => 'nullable|string|max:500',
        ]);

        $newStatus = $data['status'];
        $currentStatus = $pivot->status;

        // Forward-only transition check
        $order = ['pending' => 0, 'en_route' => 1, 'on_scene' => 2, 'resolved' => 3];
        $currentOrder = $order[$currentStatus] ?? 0;
        $newOrder = $order[$newStatus] ?? 0;

        if ($newOrder <= $currentOrder) {
            return response()->json([
                'message' => "Invalid transition from {$currentStatus} to {$newStatus}",
            ], 409);
        }

        // en_route requires GPS fix within 5 min
        if ($newStatus === 'en_route') {
            if (! $user->current_latitude || ! $user->location_updated_at) {
                return response()->json(['message' => 'Waiting for your GPS fix.'], 422);
            }
            $age = now()->diffInMinutes($user->location_updated_at);
            if ($age > 5) {
                return response()->json(['message' => 'GPS fix is too old. Open the app and wait for a fresh location.'], 422);
            }
            // Report must be in assigned status
            if (! in_array($report->status, ['assigned'])) {
                return response()->json(['message' => "Report must be assigned before going en route."], 409);
            }
            // Only one active mission at a time
            $activeMission = DB::table('report_responders')
                ->where('user_id', $user->id)
                ->where('report_id', '!=', $report->id)
                ->whereIn('status', ['en_route', 'on_scene'])
                ->exists();
            if ($activeMission) {
                return response()->json(['message' => 'Finish your current report first.'], 409);
            }
        }

        // Gather all teammates on this report whose status is behind the new status
        $teammates = DB::table('report_responders')
            ->where('report_id', $report->id)
            ->get();

        foreach ($teammates as $mate) {
            $mateOrder = $order[$mate->status] ?? 0;
            if ($mateOrder >= ($order[$newStatus] ?? 0)) continue; // already at or ahead

            $mateUser = User::find($mate->user_id);
            if (! $mateUser) continue;

            $mateUpdate = ['status' => $newStatus, 'updated_at' => now()];
            if ($newStatus === 'en_route') {
                $mateUpdate['en_route_at'] = now();
                if ($mateUser->current_latitude && $mateUser->current_longitude) {
                    $mateRoute = \App\Services\RoutingService::computeRoute(
                        (float) $mateUser->current_latitude,
                        (float) $mateUser->current_longitude,
                        (float) $report->latitude,
                        (float) $report->longitude,
                    );
                    if ($mateRoute) {
                        $mateUpdate['route'] = json_encode($mateRoute);
                    }
                }
            }
            if ($newStatus === 'on_scene') $mateUpdate['on_scene_at'] = now();
            if ($newStatus === 'resolved') $mateUpdate['resolved_at'] = now();

            DB::table('report_responders')
                ->where('report_id', $report->id)
                ->where('user_id', $mate->user_id)
                ->update($mateUpdate);

            // Log for each teammate
            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $mate->user_id,
                'status'    => $newStatus,
                'notes'     => $mate->user_id === $user->id ? ($data['notes'] ?? null) : null,
            ]);

            // Emit status for each teammate
            $matePayload = [
                'report_id' => $report->id,
                'responder' => [
                    'id'     => $mateUser->id,
                    'name'   => $mateUser->name,
                    'status' => $newStatus,
                    'lat'    => $mateUser->current_latitude ? (float) $mateUser->current_latitude : null,
                    'lng'    => $mateUser->current_longitude ? (float) $mateUser->current_longitude : null,
                ],
                'route' => isset($mateRoute) ? $mateRoute : null,
            ];
            SocketService::toReport($report->id, 'responder.status', $matePayload);
            SocketService::emit('admin:responders', 'responder.status', $matePayload);

            // Emit route for teammates that got one
            if (isset($mateRoute) && $mateRoute) {
                SocketService::toReport($report->id, 'route.updated', [
                    'report_id'      => $report->id,
                    'user_id'        => $mateUser->id,
                    'polyline'       => $mateRoute['polyline'],
                    'distance_m'     => $mateRoute['distance_m'],
                    'duration_s'     => $mateRoute['duration_s'],
                    'hazard_warning' => $mateRoute['hazard_warning'],
                ]);
            }
            unset($mateRoute);

            // Refresh assignments for each teammate
            if ($newStatus === 'resolved') {
                SocketService::refreshAssignments($mateUser->id);
            }
        }

        // Notify the resident
        $statusLabels = [
            'en_route' => 'A responder is on the way',
            'on_scene' => 'A responder has arrived at the scene',
            'resolved' => 'Your report has been resolved',
        ];
        ExpoPushService::sendToUsers(
            $report->user_id,
            "Report {$report->reference_number}",
            $statusLabels[$newStatus] ?? 'Status updated',
            ['type' => 'status_update', 'reportId' => $report->id, 'status' => $newStatus],
            'my_reports'
        );

        SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => $newStatus]);

        // Auto-resolve report when ALL responders on this report are resolved
        if ($newStatus === 'resolved') {
            $allResolved = ! DB::table('report_responders')
                ->where('report_id', $report->id)
                ->where('status', '!=', 'resolved')
                ->exists();

            if ($allResolved && $report->status !== 'resolved') {
                $report->update(['status' => 'resolved', 'resolved_at' => now()]);
                app(\App\Services\SlaService::class)->advanceStage($report, 'resolved');

                SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => 'resolved']);
                SocketService::toUser($report->user_id, 'new-notification', ['type' => 'status_update', 'reportId' => $report->id, 'status' => 'resolved']);

                // Revoke non-admin sockets from this room
                SocketService::revokeRoom("report:{$report->id}");
            }

        }

        return response()->json([
            'status'    => $newStatus,
            'report_id' => $report->id,
        ]);
    }
}
