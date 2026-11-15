<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;
use App\Models\OccupancyLog;
use App\Models\Report;
use App\Models\ReportResponder;
use App\Models\ReportStatusUpdate;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\ReportStatusChanged;
use App\Notifications\TeamResolvedReport;
use App\Services\AdvisoryService;
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
            'status'                => 'required|in:pending,en_route,on_scene,resolved',
            'notes'                 => 'nullable|string|max:1000',
            'media'                 => 'nullable|array|max:5',
            'media.*'               => 'file|mimes:jpg,jpeg,png,mp4,mov|max:51200',
            'rescued_count'         => 'nullable|integer|min:0|max:9999',
            'evacuation_center_id'  => 'nullable|integer|exists:evacuation_centers,id',
        ]);

        $user = $request->user();

        $pivot = ReportResponder::where('report_id', $report->id)
            ->where('user_id', $user->id)
            ->first();

        // Auto-add team member to pivot if they belong to the assigned team
        if (! $pivot && $user->team_id && (int) $report->assigned_team_id === (int) $user->team_id) {
            $pivot = ReportResponder::create([
                'report_id' => $report->id,
                'user_id'   => $user->id,
                'status'    => 'pending',
            ]);
        }

        if (! $pivot) {
            return response()->json(['message' => 'You are not assigned to this report.'], 403);
        }

        $pivot->update(['status' => $request->status]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $user->id,
            'status'    => $request->status,
            'notes'     => $request->notes,
        ]);

        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                $path = $file->store('reports/' . $report->id . '/updates', 'public');
                $report->media()->create([
                    'file_path' => $path,
                    'file_type' => str_starts_with($file->getMimeType(), 'video') ? 'video' : 'image',
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        // Broadcast updated member statuses to all clients watching this report
        SocketService::toReport($report->id, 'member-status-updated', [
            'report_id' => $report->id,
            'user_id'   => $user->id,
            'status'    => $request->status,
        ]);

        // Also notify all team members via their personal rooms
        // so home/assignments pages update even when not viewing this report
        $teamMemberIds = $report->responders()->pluck('user_id')->toArray();
        foreach ($teamMemberIds as $memberId) {
            if ((int) $memberId === (int) $user->id) continue;
            SocketService::toUser($memberId, 'report-status', [
                'reportId' => $report->id,
                'status'   => $request->status,
            ]);
        }

        // When a responder marks as resolved, update the main report status
        // and notify admin + resident (same as leader confirmation flow)
        if ($request->status === 'resolved' && $report->status !== 'resolved') {
            // Mark all team members as resolved
            ReportResponder::where('report_id', $report->id)
                ->update(['status' => 'resolved', 'updated_at' => now()]);

            $report->update([
                'status'                => 'resolved',
                'resolved_at'           => now(),
                'rescued_count'         => $request->rescued_count,
                'evacuation_center_id'  => $request->evacuation_center_id,
            ]);

            // Auto check-in rescued residents at evacuation center
            $this->checkInRescued($report, $request->user());

            // Broadcast report-status to the report room
            SocketService::toReport($report->id, 'report-status', [
                'reportId' => $report->id,
                'status'   => 'resolved',
            ]);

            // Notify the resident
            if ($report->user_id) {
                SocketService::toUser($report->user_id, 'report-status', [
                    'reportId' => $report->id,
                    'status'   => 'resolved',
                ]);

                ExpoPushService::sendToUsers(
                    $report->user_id,
                    "Report Resolved — {$report->reference_number}",
                    'Your report has been resolved. Thank you for keeping your community safe.',
                    ['type' => 'status_update', 'reportId' => $report->id, 'status' => 'resolved']
                );

                $report->loadMissing('user');
                if ($report->user) {
                    $report->user->notify(
                        new ReportStatusChanged($report, $report->status, 'resolved', $user->name)
                    );

                    SocketService::toUser($report->user_id, 'new-notification', [
                        'type'     => 'status_update',
                        'reportId' => $report->id,
                        'status'   => 'resolved',
                    ]);
                }
            }

            // Notify all admins
            $teamName = $user->team?->name ?? 'Unknown team';
            $address  = $report->address ?? 'unknown location';

            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $admin->notify(new TeamResolvedReport($report, $teamName, $address));

                SocketService::toUser($admin->id, 'new-notification', [
                    'type'     => 'team_resolved',
                    'reportId' => $report->id,
                    'team'     => $teamName,
                ]);
            }
        }

        return response()->json(['message' => 'Status updated.']);
    }

    /**
     * PATCH /responder/reports/{report}/confirm-status
     * Leader-only: advance the team-level report status.
     */
    public function confirmTeamStatus(Report $report, Request $request): JsonResponse
    {
        $request->validate([
            'status'                => 'required|in:en_route,on_scene,resolved',
            'notes'                 => 'nullable|string|max:1000',
            'rescued_count'         => 'nullable|integer|min:0|max:9999',
            'evacuation_center_id'  => 'nullable|integer|exists:evacuation_centers,id',
        ]);

        $user = $request->user();

        // Only the team leader may confirm
        if (! $user->team || $user->team->leader_id !== $user->id) {
            return response()->json(['message' => 'Only the team leader can confirm team status.'], 403);
        }

        $newStatus = $request->status === 'resolved' ? 'resolved' : 'assigned';

        $updateData = [
            'status'      => $newStatus,
            'resolved_at' => $request->status === 'resolved' ? now() : null,
        ];

        if ($request->status === 'resolved') {
            $updateData['rescued_count']        = $request->rescued_count;
            $updateData['evacuation_center_id']  = $request->evacuation_center_id;
        }

        $report->update($updateData);

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
                'on_scene' => 'A responder has arrived at your location. Check the app for safety guidance.',
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

        // Generate advisory for resident when responder arrives on scene
        if ($request->status === 'on_scene' && ! $report->advisory) {
            $this->generateArrivalAdvisory($report);
        }

        // Auto check-in rescued residents at evacuation center
        if ($request->status === 'resolved') {
            $this->checkInRescued($report, $user);
        }

        // Notify all admins when a report is resolved
        if ($request->status === 'resolved') {
            $teamName = $user->team->name;
            $address  = $report->address ?? 'unknown location';

            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $admin->notify(new TeamResolvedReport($report, $teamName, $address));

                SocketService::toUser($admin->id, 'new-notification', [
                    'type'     => 'team_resolved',
                    'reportId' => $report->id,
                    'team'     => $teamName,
                ]);
            }
        }

        return response()->json(['message' => 'Team status confirmed.']);
    }

    private function generateArrivalAdvisory(Report $report): void
    {
        try {
            $aiEnabled = Setting::getValue('ai_report_analysis', true);
            $advisory = $aiEnabled
                ? AdvisoryService::generate($report)
                : AdvisoryService::generateWithoutAI($report);

            $report->update(['advisory' => $advisory]);

            // Notify resident about the advisory
            if ($report->user_id) {
                ExpoPushService::sendToUsers(
                    $report->user_id,
                    "Safety Advisory — {$report->reference_number}",
                    'A responder has arrived. We\'ve prepared safety guidance and nearby evacuation centers for you.',
                    ['type' => 'advisory', 'reportId' => $report->id, 'status' => 'on_scene'],
                    'my_reports'
                );

                SocketService::toUser($report->user_id, 'report-status', [
                    'reportId' => $report->id,
                    'status'   => 'on_scene',
                    'advisory' => true,
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[TeamController] Advisory generation failed', [
                'report_id' => $report->id,
                'error'     => $e->getMessage(),
            ]);
        }
    }

    private function checkInRescued(Report $report, User $user): void
    {
        if (! $report->rescued_count || $report->rescued_count <= 0 || ! $report->evacuation_center_id) {
            return;
        }

        $center = EvacuationCenter::find($report->evacuation_center_id);
        if (! $center) return;

        $previous = $center->current_occupancy;
        $new = min($previous + $report->rescued_count, $center->capacity);

        OccupancyLog::create([
            'evacuation_center_id' => $center->id,
            'previous_occupancy'   => $previous,
            'new_occupancy'        => $new,
            'changed_by'           => $user->id,
            'change_type'          => 'check_in',
        ]);

        $center->update(['current_occupancy' => $new]);

        $pct = $center->capacity > 0 ? (int) round($new / $center->capacity * 100) : 0;

        SocketService::toAll('evacuation-updated', [
            'id'                => $center->id,
            'name'              => $center->name,
            'current_occupancy' => $new,
            'capacity'          => $center->capacity,
            'occupancy_pct'     => $pct,
        ]);
    }
}
