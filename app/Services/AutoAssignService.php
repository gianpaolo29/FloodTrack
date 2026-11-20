<?php

namespace App\Services;

use App\Http\Controllers\Api\ScheduleController;
use App\Models\Report;
use App\Models\ReportResponder;
use App\Models\ReportStatusUpdate;
use App\Models\Setting;
use App\Models\Team;
use App\Models\User;
use App\Notifications\ReportStatusChanged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\SmsService;

class AutoAssignService
{
    /**
     * Attempt to auto-assign the nearest available on-duty team to a report.
     * Returns the assigned Team on success, or null if no team was available.
     */
    public static function attemptAssign(Report $report, ?User $assignedBy = null): ?Team
    {
        if (! Setting::getValue('auto_assign', false)) {
            return null;
        }

        if (! $report->requiresAssignment()) {
            return null;
        }

        $team = static::findNearestAvailableTeam($report);

        if (! $team) {
            Log::info("Auto-assign: no available team for report {$report->reference_number}");
            return null;
        }

        static::assignTeamToReport($report, $team, $assignedBy);

        Log::info("Auto-assign: assigned team \"{$team->name}\" to report {$report->reference_number}");

        return $team;
    }

    /**
     * Find the nearest available on-duty team based on member locations.
     */
    public static function findNearestAvailableTeam(Report $report): ?Team
    {
        $onDutyTeamIds = ScheduleController::onDutyTeamIds();

        if (empty($onDutyTeamIds)) {
            return null;
        }

        $isRedAlert = Setting::getValue('schedule_level', 'white') === 'red';

        // Get on-duty teams with their members (need location data)
        $teams = Team::with(['members' => function ($q) {
            $q->select('id', 'name', 'role', 'team_id', 'current_latitude', 'current_longitude', 'location_updated_at');
        }])
            ->whereIn('id', $onDutyTeamIds)
            ->where('is_active', true)
            ->get();

        // Filter out teams that already have an active assignment (unless RED ALERT)
        if (! $isRedAlert) {
            $teams = $teams->filter(fn (Team $t) => ! $t->hasActiveAssignment());
        }

        if ($teams->isEmpty()) {
            return null;
        }

        $reportLat = $report->latitude;
        $reportLng = $report->longitude;

        if (! $reportLat || ! $reportLng) {
            // No coordinates on report — just pick the first available team
            return $teams->first();
        }

        // Calculate distance for each team using the closest member with a known location
        $bestTeam = null;
        $bestDistance = PHP_FLOAT_MAX;

        foreach ($teams as $team) {
            $closestMemberDistance = static::closestMemberDistance($team, $reportLat, $reportLng);

            if ($closestMemberDistance !== null && $closestMemberDistance < $bestDistance) {
                $bestDistance = $closestMemberDistance;
                $bestTeam = $team;
            }
        }

        // If no team has location data, fall back to the first available team
        return $bestTeam ?? $teams->first();
    }

    /**
     * Get the distance (in km) of the closest team member to the report location.
     * Returns null if no members have location data.
     */
    private static function closestMemberDistance(Team $team, float $lat, float $lng): ?float
    {
        $minDistance = null;

        foreach ($team->members as $member) {
            if (! $member->current_latitude || ! $member->current_longitude) {
                continue;
            }

            // Skip stale locations (older than 30 minutes)
            if ($member->location_updated_at && $member->location_updated_at->diffInMinutes(now()) > 30) {
                continue;
            }

            $distance = static::haversine($lat, $lng, $member->current_latitude, $member->current_longitude);

            if ($minDistance === null || $distance < $minDistance) {
                $minDistance = $distance;
            }
        }

        return $minDistance;
    }

    /**
     * Haversine formula to calculate distance between two points in km.
     */
    private static function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // km

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Unassign active missions from teams that are no longer on duty after a schedule/shift change.
     * Reports revert to 'verified' so they can be reassigned manually or via auto-assign.
     */
    public static function unassignOffDutyMissions(): int
    {
        $onDutyTeamIds = ScheduleController::onDutyTeamIds();

        // Find assigned reports whose team is no longer on duty
        $orphanedReports = Report::where('status', 'assigned')
            ->whereNotNull('assigned_team_id')
            ->when(!empty($onDutyTeamIds), fn ($q) => $q->whereNotIn('assigned_team_id', $onDutyTeamIds))
            ->with(['assignedTeam.members:id,name,team_id', 'user'])
            ->get();

        if ($orphanedReports->isEmpty()) {
            return 0;
        }

        foreach ($orphanedReports as $report) {
            $team = $report->assignedTeam;

            // Resolve existing responder rows
            DB::table('report_responders')
                ->where('report_id', $report->id)
                ->where('status', '!=', 'resolved')
                ->update([
                    'status'      => 'resolved',
                    'resolved_at' => now(),
                    'updated_at'  => now(),
                ]);

            // Refresh socket for old team members
            if ($team) {
                foreach ($team->members as $member) {
                    SocketService::refreshAssignments($member->id);
                    SocketService::toUser($member->id, 'assignment-removed', [
                        'reportId'  => $report->id,
                        'reference' => $report->reference_number,
                        'reason'    => 'schedule_change',
                    ]);
                }
            }

            // Revert report to verified
            $report->update([
                'status'           => 'verified',
                'assigned_team_id' => null,
                'assigned_to'      => null,
                'assigned_at'      => null,
            ]);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => null,
                'status'    => 'verified',
                'notes'     => 'Unassigned — team went off-duty due to schedule change. Awaiting reassignment.',
            ]);

            // Notify admin dashboard
            SocketService::toAll('report-status', [
                'reportId' => $report->id,
                'status'   => 'verified',
            ]);
        }

        // Try auto-assigning the orphaned reports to on-duty teams
        foreach ($orphanedReports as $report) {
            $report->refresh();
            static::attemptAssign($report);
        }

        return $orphanedReports->count();
    }

    /**
     * Assign a team to a report — shared logic used by both auto-assign and manual assign.
     */
    public static function assignTeamToReport(Report $report, Team $team, ?User $assignedBy = null): void
    {
        $oldStatus = $report->status;

        // If reassigning, resolve existing responder rows from the old team
        if ($report->assigned_team_id && $report->assigned_team_id !== $team->id) {
            DB::table('report_responders')
                ->where('report_id', $report->id)
                ->where('status', '!=', 'resolved')
                ->update([
                    'status'      => 'resolved',
                    'resolved_at' => now(),
                    'updated_at'  => now(),
                ]);

            $oldMemberIds = DB::table('report_responders')
                ->where('report_id', $report->id)
                ->pluck('user_id');
            foreach ($oldMemberIds as $mId) {
                SocketService::refreshAssignments($mId);
            }
        }

        $report->update([
            'assigned_team_id' => $team->id,
            'assigned_to'      => $team->leader_id,
            'status'           => 'assigned',
            'assigned_at'      => now(),
        ]);

        // Load members with role so notifications can distinguish responder vs resident
        $team->loadMissing('members:id,name,role,team_id');

        // Seed report_responders for all team members
        foreach ($team->members as $member) {
            ReportResponder::updateOrCreate(
                ['report_id' => $report->id, 'user_id' => $member->id],
                [
                    'role'        => $member->id === $team->leader_id ? 'lead' : 'support',
                    'status'      => 'pending',
                    'en_route_at' => null,
                    'on_scene_at' => null,
                    'resolved_at' => null,
                    'route'       => null,
                ]
            );
        }

        // Refresh socket assignment cache
        foreach ($team->members as $member) {
            SocketService::refreshAssignments($member->id);
        }

        $assignerName = $assignedBy?->name ?? 'System (Auto-Assign)';

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $assignedBy?->id,
            'status'    => 'assigned',
            'notes'     => "Assigned to team \"{$team->name}\".",
        ]);

        app(SlaService::class)->advanceStage($report, 'assigned');

        // Notify team members
        foreach ($team->members as $member) {
            $member->notify(new ReportStatusChanged($report, $oldStatus, 'assigned', $assignerName));
        }

        // Push notifications
        $address = $report->address ? " at {$report->address}" : '';
        $memberIds = $team->members->pluck('id')->toArray();
        ExpoPushService::sendToUsers(
            $memberIds,
            "🚨 Your team has been dispatched!",
            "A {$report->severity} flood incident{$address} needs your response. Stay safe, stay ready!",
            ['type' => 'assignment', 'reportId' => $report->id]
        );

        // Real-time socket events
        foreach ($team->members as $member) {
            SocketService::toUser($member->id, 'new-assignment', [
                'reportId'  => $report->id,
                'reference' => $report->reference_number,
                'severity'  => $report->severity,
                'address'   => $report->address,
            ]);
            SocketService::toUser($member->id, 'new-notification', [
                'type'      => 'assignment',
                'reportId'  => $report->id,
                'reference' => $report->reference_number,
                'status'    => 'assigned',
            ]);
        }

        // Notify the resident (report owner) that a responder has been assigned
        // Skip if the report owner is a responder or already a team member
        $report->loadMissing('user');
        $memberIds = $team->members->pluck('id')->map(fn ($id) => (int) $id)->toArray();
        if ($report->user && $report->user->role !== 'responder' && !in_array((int) $report->user_id, $memberIds, true)) {
            $report->user->notify(new ReportStatusChanged($report, $oldStatus, 'assigned', $assignerName));

            ExpoPushService::sendToUsers(
                $report->user_id,
                "🛟 Help is on the way!",
                "A rescue team has been dispatched to your report ({$report->reference_number}). Hang tight!",
                [
                    'type'     => 'assignment_update',
                    'reportId' => $report->id,
                    'status'   => 'assigned',
                ],
                'my_reports'
            );

            SmsService::queueToUsers(
                $report->user_id,
                SmsService::format(
                    "Help is on the way!",
                    "A rescue team has been dispatched to your report ({$report->reference_number}). Hang tight!"
                ),
                'my_reports'
            );

            SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => 'assigned']);
            SocketService::toUser($report->user_id, 'new-notification', ['type' => 'status_update', 'reportId' => $report->id, 'status' => 'assigned']);
        }
    }
}
