<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Traits\HasPeriodStats;
use App\Jobs\GenerateAdvisoryJob;
use App\Models\Hazard;
use App\Models\Report;
use App\Models\Setting;
use App\Models\ReportResponder;
use App\Models\User;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use App\Notifications\ReportStatusChanged;
use App\Services\ExpoPushService;
use App\Services\FacebookService;
use App\Services\SlaService;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    use HasPeriodStats;

    public function map(Request $request): Response
    {
        $request->validate([
            'status'      => 'nullable|in:pending,verified,assigned,resolved,rejected',
            'severity'    => 'nullable|in:low,moderate,high,critical',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date|after_or_equal:date_from',
        ]);

        $reports = Report::select([
                'id', 'reference_number', 'severity', 'status',
                'latitude', 'longitude', 'address', 'user_id', 'assigned_to', 'created_at',
                'verified_at', 'resolved_at',
            ])
            ->with(['user:id,name'])
            ->when($request->status, fn ($q) => str_contains($request->status, ',')
                ? $q->whereIn('status', explode(',', $request->status))
                : $q->where('status', $request->status),
                fn ($q) => $q->whereIn('status', ['verified', 'acknowledged', 'assigned', 'resolved']))
            ->when($request->severity, fn ($q) => str_contains($request->severity, ',')
                ? $q->whereIn('severity', explode(',', $request->severity))
                : $q->where('severity', $request->severity))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->latest()
            ->get();

        $evacuationCenters = \App\Models\EvacuationCenter::where('is_active', true)
            ->select(['id', 'name', 'address', 'type', 'capacity', 'current_occupancy', 'latitude', 'longitude'])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        $responders = User::where('role', 'responder')
            ->where('is_on_duty', true)
            ->whereNotNull('current_latitude')
            ->whereNotNull('current_longitude')
            ->select(['id', 'name', 'avatar', 'team_id', 'current_latitude', 'current_longitude', 'location_updated_at'])
            ->with('team:id,name')
            ->get();

        $hazards = Hazard::where('active', true)
            ->select(['id', 'category', 'type', 'severity', 'title', 'latitude', 'longitude'])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        $floodZones = collect(config('barangays'))
            ->filter(fn ($b) => $b['flood_prone'])
            ->map(fn ($b) => [
                'name'       => $b['name'],
                'latitude'   => $b['latitude'],
                'longitude'  => $b['longitude'],
                'near_river' => $b['near_river'],
                'coastal'    => $b['coastal'],
                'elevation'  => $b['elevation_m'],
            ])
            ->values()
            ->all();

        return Inertia::render('admin/reports/map', [
            'reports'            => $reports,
            'filters'            => $request->only(['status', 'severity', 'date_from', 'date_to']),
            'evacuation_centers' => $evacuationCenters,
            'responders'         => $responders,
            'hazards'            => $hazards,
            'flood_zones'        => $floodZones,
        ]);
    }

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        // Priority triage sort: severity weight + time waiting (oldest first as tiebreaker)
        $severityOrder = "CASE severity
            WHEN 'critical' THEN 4
            WHEN 'high'     THEN 3
            WHEN 'moderate' THEN 2
            WHEN 'low'      THEN 1
            ELSE 0 END";

        $statusOrder = "CASE status
            WHEN 'pending'  THEN 3
            WHEN 'verified' THEN 2
            WHEN 'assigned' THEN 1
            ELSE 0 END";

        $reports = Report::with(['user:id,name', 'assignedResponder:id,name', 'assignedTeam:id,name', 'slaTracking'])
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->when($request->status, fn ($q) => str_contains($request->status, ',')
                ? $q->whereIn('status', explode(',', $request->status))
                : $q->where('status', $request->status))
            ->when($request->severity, fn ($q) => str_contains($request->severity, ',')
                ? $q->whereIn('severity', explode(',', $request->severity))
                : $q->where('severity', $request->severity))
            ->when($request->team_id, fn ($q) => $q->where('assigned_team_id', $request->team_id))
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('address', 'like', "%{$request->search}%")
                   ->orWhere('reference_number', 'like', "%{$request->search}%");
            }))
            ->orderByRaw("DATE(created_at) DESC")
            ->orderByRaw("{$severityOrder} DESC")
            ->orderByRaw("COALESCE(depth_ft, 0) DESC")
            ->orderByRaw("{$statusOrder} DESC")
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();
        [$prevFrom, $prevTo, $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        $curTotal    = $this->scopeByPeriod(Report::query(), $from, $to)->count();
        $curPending  = $this->scopeByPeriod(Report::where('status', 'pending'), $from, $to)->count();
        $curCritical = $this->scopeByPeriod(Report::where('severity', 'critical'), $from, $to)->count();
        $curResolved = $this->scopeByPeriod(Report::where('status', 'resolved'), $from, $to)->count();

        $prevTotal    = Report::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevPending  = Report::where('status', 'pending')->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevCritical = Report::where('severity', 'critical')->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevResolved = Report::where('status', 'resolved')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $stats = [
            'total'    => $curTotal,
            'pending'  => $curPending,
            'critical' => $curCritical,
            'resolved' => $curResolved,
        ];

        $trends = [
            'total'        => $this->calcTrend($curTotal, $prevTotal),
            'pending'      => $this->calcTrend($curPending, $prevPending),
            'critical'     => $this->calcTrend($curCritical, $prevCritical),
            'resolved'     => $this->calcTrend($curResolved, $prevResolved),
            'label'        => $trendLabel,
            'period_label' => $periodLabel,
        ];

        return Inertia::render('admin/reports/index', [
            'reports'     => $reports,
            'filters'     => $request->only(['status', 'severity', 'search', 'team_id']),
            'stats'       => $stats,
            'trends'      => $trends,
            'period'      => $period,
            'custom_from' => $request->get('from'),
            'custom_to'   => $request->get('to'),
            'teams'       => Team::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Report $report): Response
    {
        $report->load([
            'user:id,name,email,contact_number',
            'media',
            'statusUpdates.user:id,name,role',
            'assignedResponder:id,name,contact_number',
            'assignedTeam:id,name,leader_id',
            'verifier:id,name',
            'responderUsers',
            'slaTracking',
        ]);

        // Build member_statuses from the pivot rows
        $memberStatuses = $report->responderUsers->map(fn ($u) => [
            'user_id'    => $u->id,
            'user_name'  => $u->name,
            'avatar_url' => $u->avatar_url,
            'status'     => $u->pivot->status,
            'updated_at' => $u->pivot->updated_at,
        ]);

        // Build team_members with is_leader flag
        $teamMembers = $report->responderUsers->map(fn ($u) => [
            'id'         => $u->id,
            'name'       => $u->name,
            'avatar_url' => $u->avatar_url,
            'is_leader'  => $report->assignedTeam && $report->assignedTeam->leader_id === $u->id,
        ]);

        return Inertia::render('admin/reports/show', [
            'report' => array_merge($report->toArray(), [
                'team_members'    => $teamMembers,
                'member_statuses' => $memberStatuses,
            ]),
            'teams'       => $this->getAvailableTeams($report),
            'schedule_level' => Setting::getValue('schedule_level', 'white'),
        ]);
    }

    public function update(Report $report, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'severity'    => 'required|in:low,moderate,high,critical',
            'address'     => 'nullable|string|max:500',
            'description' => 'nullable|string|max:2000',
        ]);

        $changes = [];
        foreach ($validated as $field => $value) {
            if ($report->{$field} !== $value) {
                $changes[] = $field;
            }
        }

        $report->update($validated);

        if (count($changes) > 0) {
            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $request->user()->id,
                'status'    => $report->status,
                'notes'     => 'Updated: ' . implode(', ', $changes) . '.',
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report updated.']);

        return back();
    }

    public function destroy(Report $report, Request $request): RedirectResponse
    {
        $ref = $report->reference_number;

        $report->statusUpdates()->delete();
        $report->media()->delete();
        $report->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Report {$ref} deleted."]);

        return redirect()->route('admin.reports.index');
    }

    public function reopen(Report $report, Request $request): RedirectResponse
    {
        if (! in_array($report->status, ['resolved', 'rejected', 'acknowledged'])) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Only resolved, rejected, or acknowledged reports can be reopened.']);
            return back();
        }

        $report->update([
            'status'      => 'pending',
            'resolved_at' => null,
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'pending',
            'notes'     => 'Report reopened by admin.',
        ]);

        app(SlaService::class)->initializeTracking($report);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report reopened.']);

        return back();
    }

    public function resolve(Report $report, Request $request): RedirectResponse
    {
        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        if (in_array($report->status, ['resolved', 'rejected'])) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'This report is already closed.']);
            return back();
        }

        $oldStatus = $report->status;

        $report->update([
            'status'      => 'resolved',
            'resolved_at' => now(),
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'resolved',
            'notes'     => $request->notes,
        ]);

        app(SlaService::class)->advanceStage($report, 'resolved');

        $this->notifyStatusChange($report, $oldStatus, 'resolved', $request->user()->name);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report marked as resolved.']);

        return back();
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:reports,id',
            'action' => 'required|in:verify,reject,delete,reopen,resolve',
            'responder_id' => 'nullable|integer|exists:users,id',
            'notes'  => 'nullable|string|max:500',
        ]);

        $reports = Report::whereIn('id', $request->ids)->get();
        $count = 0;

        foreach ($reports as $report) {
            switch ($request->action) {
                case 'verify':
                    if ($report->status === 'pending') {
                        $report->update([
                            'status'      => 'verified',
                            'verified_by' => $request->user()->id,
                            'verified_at' => now(),
                        ]);
                        ReportStatusUpdate::create([
                            'report_id' => $report->id,
                            'user_id'   => $request->user()->id,
                            'status'    => 'verified',
                            'notes'     => 'Bulk verified by admin.',
                        ]);
                        app(SlaService::class)->advanceStage($report, 'verified');
                        $count++;
                    }
                    break;

                case 'reject':
                    if (in_array($report->status, ['pending', 'verified'])) {
                        $report->update(['status' => 'rejected']);
                        ReportStatusUpdate::create([
                            'report_id' => $report->id,
                            'user_id'   => $request->user()->id,
                            'status'    => 'rejected',
                            'notes'     => $request->notes ?? 'Bulk rejected by admin.',
                        ]);
                        app(SlaService::class)->advanceStage($report, 'rejected');
                        $count++;
                    }
                    break;

                case 'delete':
                    $report->statusUpdates()->delete();
                    $report->media()->delete();
                    $report->delete();
                    $count++;
                    break;

                case 'resolve':
                    if (in_array($report->status, ['verified', 'acknowledged', 'assigned'])) {
                        $report->update(['status' => 'resolved', 'resolved_at' => now()]);
                        ReportStatusUpdate::create([
                            'report_id' => $report->id,
                            'user_id'   => $request->user()->id,
                            'status'    => 'resolved',
                            'notes'     => $request->notes ?? 'Bulk resolved by admin.',
                        ]);
                        app(SlaService::class)->advanceStage($report, 'resolved');
                        $this->notifyStatusChange($report, $report->getOriginal('status'), 'resolved', $request->user()->name);
                        $count++;
                    }
                    break;

                case 'reopen':
                    if (in_array($report->status, ['resolved', 'rejected'])) {
                        $report->update(['status' => 'pending', 'resolved_at' => null]);
                        ReportStatusUpdate::create([
                            'report_id' => $report->id,
                            'user_id'   => $request->user()->id,
                            'status'    => 'pending',
                            'notes'     => 'Bulk reopened by admin.',
                        ]);
                        app(SlaService::class)->initializeTracking($report);
                        $count++;
                    }
                    break;
            }
        }

        $actionLabel = match ($request->action) {
            'verify' => 'verified',
            'reject' => 'rejected',
            'resolve' => 'resolved',
            'delete' => 'deleted',
            'reopen' => 'reopened',
        };

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} report(s) {$actionLabel}."]);

        return back();
    }

    public function verify(Report $report, Request $request): RedirectResponse
    {
        $oldStatus = $report->status;

        $report->update([
            'status'      => 'verified',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'verified',
            'notes'     => 'Report verified by admin.',
        ]);

        app(SlaService::class)->advanceStage($report, 'verified');

        // Low/moderate: go straight to acknowledged in one click.
        // Advisory is generated in the background.
        if (! $report->requiresAssignment()) {
            $report->update(['status' => 'acknowledged']);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $request->user()->id,
                'status'    => 'acknowledged',
                'notes'     => 'Report verified and acknowledged.',
            ]);

            app(SlaService::class)->advanceStage($report, 'acknowledged');
            $this->notifyStatusChange($report, $oldStatus, 'acknowledged', $request->user()->name);

            // Generate advisory in background
            GenerateAdvisoryJob::dispatch($report->id, $request->user()->id);

            Inertia::flash('toast', ['type' => 'success', 'message' => 'Report verified & acknowledged.']);

            return back();
        }

        $this->notifyStatusChange($report, $oldStatus, 'verified', $request->user()->name);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report verified.']);

        return back();
    }

    public function assign(Report $report, Request $request): RedirectResponse
    {
        $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $team = Team::with('members:id,name,team_id')->findOrFail($request->team_id);

        // Enforce one-to-one: a team can only be assigned to one active report at a time
        $activeReport = $team->activeReport()->where('id', '!=', $report->id)->first();
        if ($activeReport) {
            Inertia::flash('toast', [
                'type'    => 'error',
                'message' => "Team \"{$team->name}\" is already assigned to report {$activeReport->reference_number}.",
            ]);
            return back();
        }

        $oldStatus = $report->status;

        $report->update([
            'assigned_team_id' => $team->id,
            'assigned_to'      => $team->leader_id,
            'status'           => 'assigned',
            'assigned_at'      => now(),
        ]);

        // Upsert each team member into report_responders
        foreach ($team->members as $member) {
            ReportResponder::updateOrCreate(
                ['report_id' => $report->id, 'user_id' => $member->id],
                [
                    'role'   => $member->id === $team->leader_id ? 'lead' : 'support',
                    'status' => 'pending',
                ]
            );
        }

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'assigned',
            'notes'     => "Assigned to team \"{$team->name}\".",
        ]);

        app(SlaService::class)->advanceStage($report, 'assigned');

        foreach ($team->members as $member) {
            $member->notify(new ReportStatusChanged($report, $oldStatus, 'assigned', $request->user()->name));
        }

        // Push notification to all team members
        ExpoPushService::sendToUsers(
            $team->members->pluck('id')->toArray(),
            "New Assignment — {$report->reference_number}",
            "You have been assigned to a {$report->severity} flood report. Open the app for details.",
            ['type' => 'assignment', 'reportId' => $report->id]
        );

        // Real-time socket events to each team member
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

        $this->notifyStatusChange($report, $oldStatus, 'assigned', $request->user()->name);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Assigned to team \"{$team->name}\"."]);

        return back();
    }

    public function reject(Report $report, Request $request): RedirectResponse
    {
        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $oldStatus = $report->status;

        $report->update(['status' => 'rejected']);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'rejected',
            'notes'     => $request->notes ?? 'Report rejected by admin.',
        ]);

        app(SlaService::class)->advanceStage($report, 'rejected');

        $this->notifyStatusChange($report, $oldStatus, 'rejected', $request->user()->name, $request->notes);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report rejected.']);

        return back();
    }

    /**
     * Notify the report owner about a status change.
     */
    private function notifyStatusChange(Report $report, string $oldStatus, string $newStatus, string $changedBy, ?string $reason = null): void
    {
        $report->loadMissing('user');

        if (!$report->user) {
            return;
        }

        // Database notification
        $report->user->notify(new ReportStatusChanged($report, $oldStatus, $newStatus, $changedBy, $reason));

        // Push notification
        $titles = [
            'verified'     => "Report {$report->reference_number} Verified",
            'rejected'     => "Report {$report->reference_number} Not Verified",
            'assigned'     => "Report {$report->reference_number} — Responder Assigned",
            'acknowledged' => "Report {$report->reference_number} — Safety Advisory",
            'resolved'     => "Report {$report->reference_number} — Resolved",
        ];

        $bodies = [
            'verified'     => 'Your flood report has been verified. Responders will be dispatched shortly.',
            'rejected'     => $reason
                ? "Your report could not be verified. Reason: {$reason}"
                : 'Your report could not be verified.',
            'assigned'     => 'A responder has been assigned to your report. Help is on the way.',
            'acknowledged' => 'We\'ve reviewed your report and prepared safety guidance for you. Open the app for details.',
            'resolved'     => 'Your flood report has been resolved. Thank you for helping keep your community safe.',
        ];

        if (isset($titles[$newStatus])) {
            ExpoPushService::sendToUsers(
                $report->user_id,
                $titles[$newStatus],
                $bodies[$newStatus],
                [
                    'type'     => 'status_update',
                    'reportId' => $report->id,
                    'status'   => $newStatus,
                ],
                'my_reports'
            );
        }

        // Real-time socket
        SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => $newStatus]);
        SocketService::toUser($report->user_id, 'new-notification', ['type' => 'status_update', 'reportId' => $report->id, 'status' => $newStatus]);

        // Messenger notification — send status update back to the Messenger user
        if ($report->source === 'messenger' && $report->messenger_sender_id) {
            $ref = $report->reference_number;
            $messengerMessages = [
                'verified'     => "✅ Your flood report {$ref} has been verified. Responders will be dispatched shortly.",
                'rejected'     => $reason
                    ? "❌ Your report {$ref} could not be verified.\nReason: {$reason}"
                    : "❌ Your report {$ref} could not be verified.",
                'assigned'     => "🚑 A responder has been assigned to your report {$ref}. Help is on the way!",
                'acknowledged' => "📋 Your report {$ref} has been reviewed. Stay safe and follow local advisories.",
                'resolved'     => "✅ Your report {$ref} has been resolved. Thank you for helping keep your community safe!",
            ];

            if (isset($messengerMessages[$newStatus])) {
                try {
                    app(FacebookService::class)->sendMessage(
                        $report->messenger_sender_id,
                        $messengerMessages[$newStatus]
                    );
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('[Messenger] Failed to send status update', [
                        'report_id' => $report->id,
                        'error'     => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * Get teams available for assignment.
     * - Normal (white): only teams whose shift matches the current shift
     * - Red alert: all active teams
     * - Always includes the currently assigned team
     */
    private function getAvailableTeams(Report $report)
    {
        $level = Setting::getValue('schedule_level', 'white');
        $currentShift = ScheduleController::currentShift();
        $isRedAlert = $level === 'red';

        $query = Team::with([
                'members:id,name,team_id,is_on_duty',
                'leader:id,current_latitude,current_longitude,home_latitude,home_longitude',
            ])
            ->where('is_active', true)
            ->withCount([
                'reports as active_assignments' => fn ($q) => $q->where('status', 'assigned'),
                'members as on_duty_count',
            ]);

        // During normal operations, only show teams on the current shift
        if (! $isRedAlert) {
            $assignedTeamId = $report->assigned_team_id;
            $query->where(function ($q) use ($currentShift, $assignedTeamId) {
                $q->where('shift', $currentShift);
                // Always keep the currently assigned team visible for reassignment
                if ($assignedTeamId) {
                    $q->orWhere('id', $assignedTeamId);
                }
            });
        }

        return $query
            ->get(['id', 'name', 'leader_id', 'shift'])
            ->map(function ($team) use ($report, $isRedAlert, $currentShift) {
                $leader = $team->leader;
                $lat = $leader->current_latitude ?? $leader->home_latitude ?? null;
                $lng = $leader->current_longitude ?? $leader->home_longitude ?? null;

                $team->distance_km = ($lat && $lng && $report->latitude && $report->longitude)
                    ? round($this->haversine($report->latitude, $report->longitude, $lat, $lng), 1)
                    : null;

                // Indicate if this team is on the current shift
                $team->is_on_shift = $isRedAlert || ($team->shift === $currentShift);

                unset($team->leader);

                return $team;
            })
            ->sortBy('distance_km')
            ->values();
    }

    /** Haversine distance between two points in kilometres. */
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r = 6371; // Earth radius in km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
