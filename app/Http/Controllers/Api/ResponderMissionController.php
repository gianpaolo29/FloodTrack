<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
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

        // Update pivot row
        $updateData = ['status' => $newStatus, 'updated_at' => now()];
        if ($newStatus === 'en_route') {
            $updateData['en_route_at'] = now();
            // Compute route to report
            $route = \App\Services\RoutingService::computeRoute(
                (float) $user->current_latitude,
                (float) $user->current_longitude,
                (float) $report->latitude,
                (float) $report->longitude,
            );
            if ($route) {
                $updateData['route'] = json_encode($route);
            }
        }
        if ($newStatus === 'on_scene') $updateData['on_scene_at'] = now();
        if ($newStatus === 'resolved') $updateData['resolved_at'] = now();

        DB::table('report_responders')
            ->where('report_id', $report->id)
            ->where('user_id', $user->id)
            ->update($updateData);

        // Write status update log
        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $user->id,
            'status'    => $newStatus,
            'notes'     => $data['notes'] ?? null,
        ]);

        // Emit responder.status to the report room
        $statusPayload = [
            'report_id' => $report->id,
            'responder' => [
                'id'     => $user->id,
                'name'   => $user->name,
                'status' => $newStatus,
                'lat'    => $user->current_latitude ? (float) $user->current_latitude : null,
                'lng'    => $user->current_longitude ? (float) $user->current_longitude : null,
            ],
            'route' => isset($route) ? $route : null,
        ];

        SocketService::toReport($report->id, 'responder.status', $statusPayload);
        SocketService::emit('admin:responders', 'responder.status', $statusPayload);

        // Emit route.updated if a route was computed
        if (isset($route) && $route) {
            SocketService::toReport($report->id, 'route.updated', [
                'report_id'      => $report->id,
                'user_id'        => $user->id,
                'polyline'       => $route['polyline'],
                'distance_m'     => $route['distance_m'],
                'duration_s'     => $route['duration_s'],
                'hazard_warning' => $route['hazard_warning'],
            ]);
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

            // Refresh assignment cache
            SocketService::refreshAssignments($user->id);
        }

        return response()->json([
            'status'    => $newStatus,
            'report_id' => $report->id,
        ]);
    }
}
