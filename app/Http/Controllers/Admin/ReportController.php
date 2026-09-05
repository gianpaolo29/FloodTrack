<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\FieldReport;
use App\Models\Report;
use App\Models\ReportResponder;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use App\Notifications\ReportStatusChanged;
use App\Services\AdvisoryService;
use App\Services\ExpoPushService;
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
                'latitude', 'longitude', 'address', 'user_id', 'created_at',
                'verified_at', 'resolved_at',
            ])
            ->with(['user:id,name'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status),
                fn ($q) => $q->whereIn('status', ['verified', 'acknowledged', 'assigned', 'resolved']))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
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

        return Inertia::render('admin/reports/map', [
            'reports'            => $reports,
            'filters'            => $request->only(['status', 'severity', 'date_from', 'date_to']),
            'evacuation_centers' => $evacuationCenters,
        ]);
    }

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        $reports = Report::with(['user:id,name', 'assignedResponder:id,name', 'assignedTeam:id,name', 'slaTracking'])
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->team_id, fn ($q) => $q->where('assigned_team_id', $request->team_id))
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('address', 'like', "%{$request->search}%")
                   ->orWhere('reference_number', 'like', "%{$request->search}%");
            }))
            ->latest()
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

        $fieldReport = FieldReport::where('report_id', $report->id)
            ->with('user:id,name,role')
            ->first();

        return Inertia::render('admin/reports/show', [
            'report' => array_merge($report->toArray(), [
                'team_members'    => $teamMembers,
                'member_statuses' => $memberStatuses,
            ]),
            'teams'       => Team::with('members:id,name,team_id')
                ->where('is_active', true)
                ->withCount(['reports as active_assignments' => fn ($q) => $q->where('status', 'assigned')])
                ->get(['id', 'name', 'leader_id']),
            'field_report' => $fieldReport,
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

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:reports,id',
            'action' => 'required|in:verify,reject,delete,reopen',
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

        // Low/moderate: generate AI advisory and transition to acknowledged
        if (! $report->requiresAssignment()) {
            $advisory = AdvisoryService::generate($report);
            $report->update([
                'status'   => 'acknowledged',
                'advisory' => $advisory,
            ]);

            ReportStatusUpdate::create([
                'report_id' => $report->id,
                'user_id'   => $request->user()->id,
                'status'    => 'acknowledged',
                'notes'     => 'AI advisory generated with nearby evacuation centers and safety guidance.',
            ]);

            app(SlaService::class)->advanceStage($report, 'acknowledged');

            $this->notifyStatusChange($report, 'verified', 'acknowledged', $request->user()->name);

            Inertia::flash('toast', ['type' => 'success', 'message' => 'Report verified and advisory sent to resident.']);

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

        $oldStatus = $report->status;
        $team      = Team::with('members:id,name')->findOrFail($request->team_id);

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

        // Real-time socket event to each team member
        foreach ($team->members as $member) {
            SocketService::toUser($member->id, 'new-assignment', [
                'reportId'  => $report->id,
                'reference' => $report->reference_number,
                'severity'  => $report->severity,
                'address'   => $report->address,
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

        $this->notifyStatusChange($report, $oldStatus, 'rejected', $request->user()->name);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report rejected.']);

        return back();
    }

    /**
     * Notify the report owner about a status change.
     */
    private function notifyStatusChange(Report $report, string $oldStatus, string $newStatus, string $changedBy): void
    {
        $report->loadMissing('user');

        if (!$report->user) {
            return;
        }

        // Database notification
        $report->user->notify(new ReportStatusChanged($report, $oldStatus, $newStatus, $changedBy));

        // Push notification
        $titles = [
            'verified'     => "Report {$report->reference_number} Verified",
            'rejected'     => "Report {$report->reference_number} Not Verified",
            'assigned'     => "Report {$report->reference_number} — Responder Assigned",
            'acknowledged' => "Report {$report->reference_number} — Safety Advisory",
        ];

        $bodies = [
            'verified'     => 'Your flood report has been verified. Responders will be dispatched shortly.',
            'rejected'     => 'Your report could not be verified.',
            'assigned'     => 'A responder has been assigned to your report. Help is on the way.',
            'acknowledged' => 'We\'ve reviewed your report and prepared safety guidance for you. Open the app for details.',
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
    }
}
