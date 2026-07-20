<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\ReportStatusChanged;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
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
                fn ($q) => $q->whereIn('status', ['verified', 'assigned', 'resolved']))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->latest()
            ->get();

        return Inertia::render('admin/reports/map', [
            'reports' => $reports,
            'filters' => $request->only(['status', 'severity', 'date_from', 'date_to']),
        ]);
    }

    public function index(Request $request): Response
    {
        $reports = Report::with(['user:id,name', 'assignedResponder:id,name'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('address', 'like', "%{$request->search}%")
                   ->orWhere('reference_number', 'like', "%{$request->search}%");
            }))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $stats = [
            'total'    => Report::count(),
            'pending'  => Report::where('status', 'pending')->count(),
            'critical' => Report::where('severity', 'critical')->count(),
            'resolved' => Report::where('status', 'resolved')->count(),
        ];

        return Inertia::render('admin/reports/index', [
            'reports'    => $reports,
            'responders' => User::where('role', 'responder')->get(['id', 'name']),
            'filters'    => $request->only(['status', 'severity', 'search']),
            'stats'      => $stats,
        ]);
    }

    public function show(Report $report): Response
    {
        return Inertia::render('admin/reports/show', [
            'report'     => $report->load([
                'user:id,name,email,contact_number',
                'media',
                'statusUpdates.user:id,name,role',
                'assignedResponder:id,name,contact_number',
                'verifier:id,name',
            ]),
            'responders' => User::where('role', 'responder')->get(['id', 'name']),
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
        if (! in_array($report->status, ['resolved', 'rejected'])) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Only resolved or rejected reports can be reopened.']);
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

        $this->notifyStatusChange($report, $oldStatus, 'verified', $request->user()->name);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report verified.']);

        return back();
    }

    public function assign(Report $report, Request $request): RedirectResponse
    {
        $request->validate([
            'responder_id' => 'required|exists:users,id',
        ]);

        $oldStatus = $report->status;
        $responder = User::findOrFail($request->responder_id);

        $report->update([
            'assigned_to' => $responder->id,
            'status'      => 'assigned',
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'assigned',
            'notes'     => "Assigned to {$responder->name}.",
        ]);

        // Notify the assigned responder
        $responder->notify(new ReportStatusChanged($report, $oldStatus, 'assigned', $request->user()->name));
        $this->notifyStatusChange($report, $oldStatus, 'assigned', $request->user()->name);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Assigned to {$responder->name}."]);

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
            'verified' => "Report {$report->reference_number} Verified",
            'rejected' => "Report {$report->reference_number} Not Verified",
            'assigned' => "Report {$report->reference_number} — Responder Assigned",
        ];

        $bodies = [
            'verified' => 'Your flood report has been verified. Responders will be dispatched shortly.',
            'rejected' => 'Your report could not be verified.',
            'assigned' => 'A responder has been assigned to your report. Help is on the way.',
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
                ]
            );
        }

        // Real-time socket
        SocketService::toUser($report->user_id, 'report-status', ['reportId' => $report->id, 'status' => $newStatus]);
        SocketService::toUser($report->user_id, 'new-notification', ['type' => 'status_update', 'reportId' => $report->id, 'status' => $newStatus]);
    }
}
