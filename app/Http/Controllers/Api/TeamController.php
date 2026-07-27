<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportResponder;
use App\Models\ReportStatusUpdate;
use App\Notifications\ReportStatusChanged;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TeamController extends Controller
{
    /**
     * GET /responder/team
     * Returns the authenticated responder's team with all members.
     */
    public function myTeam(Request $request): JsonResponse
    {
        $user = $request->user()->load('team.members');

        if (! $user->team) {
            return response()->json(['data' => null]);
        }

        $team = $user->team;
        $team->members->each(fn ($m) => $m->append('avatar_url'));

        return response()->json([
            'data' => [
                'id'        => $team->id,
                'name'      => $team->name,
                'leader_id' => $team->leader_id,
                'members'   => $team->members->map(fn ($m) => [
                    'id'         => $m->id,
                    'name'       => $m->name,
                    'avatar_url' => $m->avatar_url,
                    'is_leader'  => $m->id === $team->leader_id,
                ]),
            ],
        ]);
    }

    /**
     * GET /responder/reports/{report}/member-statuses
     * Returns current per-member status for a report.
     */
    public function memberStatuses(Report $report): JsonResponse
    {
        $statuses = ReportResponder::where('report_id', $report->id)
            ->with('user:id,name,avatar')
            ->get()
            ->map(fn ($rr) => [
                'user_id'    => $rr->user_id,
                'user_name'  => $rr->user->name,
                'avatar_url' => $rr->user->avatar_url,
                'status'     => $rr->status,
                'updated_at' => $rr->updated_at,
            ]);

        return response()->json(['data' => $statuses]);
    }

    /**
     * PATCH /responder/reports/{report}/member-status
     * Submit this responder's individual status on a report.
     */
    public function submitMemberStatus(Report $report, Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,en_route,on_scene,resolved',
            'notes'  => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        $pivot = ReportResponder::where('report_id', $report->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'You are not assigned to this report.'], 403);
        }

        $pivot->update(['status' => $request->status]);

        if ($request->notes) {
            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $user->id,
                'status'    => $request->status,
                'notes'     => $request->notes,
            ]);
        }

        // Broadcast updated member statuses to all clients watching this report
        SocketService::toReport($report->id, 'member-status-updated', [
            'report_id' => $report->id,
            'user_id'   => $user->id,
            'status'    => $request->status,
        ]);

        return response()->json(['message' => 'Status updated.']);
    }

    /**
     * PATCH /responder/reports/{report}/confirm-status
     * Leader-only: advance the team-level report status.
     */
    public function confirmTeamStatus(Report $report, Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:en_route,on_scene,resolved',
            'notes'  => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // Only the team leader may confirm
        if (! $user->team || $user->team->leader_id !== $user->id) {
            return response()->json(['message' => 'Only the team leader can confirm team status.'], 403);
        }

        $newStatus = $request->status === 'resolved' ? 'resolved' : 'assigned';

        $report->update([
            'status'      => $newStatus,
            'resolved_at' => $request->status === 'resolved' ? now() : null,
        ]);

        // Update every assigned member's individual status to match the team status
        ReportResponder::where('report_id', $report->id)
            ->update(['status' => $request->status, 'updated_at' => now()]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $user->id,
            'status'    => $request->status,
            'notes'     => $request->notes ?? "Team status confirmed: {$request->status} by {$user->name}.",
        ]);

        SocketService::toReport($report->id, 'report-status', [
            'reportId' => $report->id,
            'status'   => $request->status,
        ]);

        // Notify the report owner (resident)
        if ($report->user_id) {
            // Real-time socket
            SocketService::toUser($report->user_id, 'report-status', [
                'reportId' => $report->id,
                'status'   => $request->status,
            ]);

            $pushTitles = [
                'en_route' => "Responder En Route — {$report->reference_number}",
                'on_scene' => "Responder On Scene — {$report->reference_number}",
                'resolved' => "Report Resolved — {$report->reference_number}",
            ];
            $pushBodies = [
                'en_route' => 'A responder is on the way to your location. Please stay safe.',
                'on_scene' => 'A responder has arrived at your location.',
                'resolved' => 'Your report has been resolved. Thank you for keeping your community safe.',
            ];

            // Push notification
            if (isset($pushTitles[$request->status])) {
                ExpoPushService::sendToUsers(
                    $report->user_id,
                    $pushTitles[$request->status],
                    $pushBodies[$request->status],
                    ['type' => 'status_update', 'reportId' => $report->id, 'status' => $request->status]
                );
            }

            // Database notification
            $report->loadMissing('user');
            if ($report->user) {
                $report->user->notify(
                    new ReportStatusChanged($report, $report->status, $request->status, $user->name)
                );

                // Socket nudge so the resident's alerts list refreshes immediately
                SocketService::toUser($report->user_id, 'new-notification', [
                    'type'     => 'status_update',
                    'reportId' => $report->id,
                    'status'   => $request->status,
                ]);
            }
        }

        return response()->json(['message' => 'Team status confirmed.']);
    }
}
