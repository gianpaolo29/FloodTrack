<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $reports = Report::with(['user:id,name', 'assignedResponder:id,name'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->hazard_type, fn ($q) => $q->where('hazard_type', $request->hazard_type))
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('address', 'like', "%{$request->search}%")
                   ->orWhere('reference_number', 'like', "%{$request->search}%");
            }))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/reports/index', [
            'reports'    => $reports,
            'responders' => User::where('role', 'responder')->get(['id', 'name']),
            'filters'    => $request->only(['status', 'severity', 'hazard_type', 'search']),
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

    public function verify(Report $report, Request $request): RedirectResponse
    {
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report verified.']);

        return back();
    }

    public function assign(Report $report, Request $request): RedirectResponse
    {
        $request->validate([
            'responder_id' => 'required|exists:users,id',
        ]);

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

        Inertia::flash('toast', ['type' => 'success', 'message' => "Assigned to {$responder->name}."]);

        return back();
    }

    public function reject(Report $report, Request $request): RedirectResponse
    {
        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $report->update(['status' => 'rejected']);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'rejected',
            'notes'     => $request->notes ?? 'Report rejected by admin.',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Report rejected.']);

        return back();
    }
}
