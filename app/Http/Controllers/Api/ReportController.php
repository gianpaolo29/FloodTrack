<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentMessage;
use App\Models\Report;
use App\Models\ReportMedia;
use App\Models\ReportStatusUpdate;
use App\Models\User;
use App\Notifications\NewReportSubmitted;
use App\Notifications\ReportStatusChanged;
use App\Services\ExpoPushService;
use App\Services\ReportAnalysisService;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $query = Report::with(['user:id,name,contact_number', 'media', 'statusUpdates.user:id,name,role'])
            ->when($request->my, fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->assigned === 'me', fn ($q) => $q->where('assigned_to', $request->user()->id))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->latest();

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'severity'    => 'required|in:low,moderate,high,critical',
            'description' => 'nullable|string|max:1000',
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'address'     => 'nullable|string|max:255',
            'media'       => 'nullable|array|max:5',
            'media.*'     => 'file|mimes:jpg,jpeg,png,mp4,mov|max:51200',
        ]);

        $report = $request->user()->reports()->create($data);

        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                $path = $file->store('reports/' . $report->id, 'public');
                $report->media()->create([
                    'file_path' => $path,
                    'file_type' => str_starts_with($file->getMimeType(), 'video') ? 'video' : 'image',
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'pending',
            'notes'     => 'Report submitted.',
        ]);

        // AI analysis: duplicate detection, fake report check, image verification
        $mediaFiles = $request->hasFile('media') ? $request->file('media') : [];
        $aiFlags    = ReportAnalysisService::analyze($report, $mediaFiles);
        $report->update($aiFlags);

        // Notify all admins about the new report
        $admins = User::where('role', 'admin')->get();
        Notification::send($admins, new NewReportSubmitted($report));

        return response()->json(
            $report->load(['media', 'statusUpdates.user:id,name,role']),
            201
        );
    }

    public function show(Report $report)
    {
        return response()->json(
            $report->load(['user:id,name,contact_number', 'media', 'statusUpdates.user:id,name,role', 'assignedResponder:id,name,contact_number'])
        );
    }

    public function updateStatus(Request $request, Report $report)
    {
        // Only the assigned responder or an admin can update status
        $user = $request->user();
        if (! $user->isAdmin() && (int) $report->assigned_to !== (int) $user->id) {
            return response()->json(['message' => 'You are not assigned to this report.'], 403);
        }

        $data = $request->validate([
            'status' => 'required|in:en_route,on_scene,resolved',
            'notes'  => 'nullable|string|max:500',
            'media'  => 'nullable|array|max:3',
            'media.*' => 'file|mimes:jpg,jpeg,png,mp4,mov|max:51200',
        ]);

        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                $path = $file->store('reports/' . $report->id, 'public');
                $report->media()->create([
                    'file_path' => $path,
                    'file_type' => str_starts_with($file->getMimeType(), 'video') ? 'video' : 'image',
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        if ($data['status'] === 'resolved') {
            $report->update(['status' => 'resolved', 'resolved_at' => now()]);
        }

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => $data['status'],
            'notes'     => $data['notes'] ?? null,
        ]);

        // Notify reporter about status change
        $statusLabels = [
            'en_route' => 'A responder is on the way',
            'on_scene' => 'A responder has arrived at the scene',
            'resolved' => 'Your report has been resolved',
        ];
        $label = $statusLabels[$data['status']] ?? 'Status updated';
        ExpoPushService::sendToUsers(
            $report->user_id,
            "Report {$report->reference_number}",
            $label,
            [
                'type'     => 'status_update',
                'reportId' => $report->id,
                'status'   => $data['status'],
            ]
        );

        return response()->json($report->fresh()->load(['statusUpdates.user:id,name,role']));
    }

    public function assign(Request $request, Report $report)
    {
        $data = $request->validate([
            'responder_id' => 'required|exists:users,id',
        ]);

        // Ensure the target user is actually a responder
        $responder = \App\Models\User::findOrFail($data['responder_id']);
        if (! $responder->isResponder()) {
            return response()->json(['message' => 'Selected user is not a responder.'], 422);
        }

        $report->update([
            'assigned_to' => $data['responder_id'],
            'status'      => 'assigned',
        ]);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'assigned',
            'notes'     => 'Assigned to responder.',
        ]);

        // Notify assigned responder
        ExpoPushService::sendToUsers(
            $data['responder_id'],
            'New incident assigned',
            "Flood report — {$report->address}",
            [
                'type'     => 'incident_assigned',
                'reportId' => $report->id,
                'severity' => $report->severity,
            ]
        );

        return response()->json($report->fresh()->load('assignedResponder:id,name,contact_number'));
    }

    public function verify(Request $request, Report $report)
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
        ]);

        return response()->json($report->fresh());
    }

    public function destroy(Request $request, Report $report)
    {
        if ((int) $request->user()->id !== (int) $report->user_id) {
            return response()->json(['message' => 'You are not the owner of this report.'], 403);
        }

        if ($report->status !== 'pending') {
            return response()->json(['message' => 'Only pending reports can be withdrawn.'], 422);
        }

        foreach ($report->media as $media) {
            Storage::disk('public')->delete($media->file_path);
        }

        $report->media()->delete();
        ReportStatusUpdate::where('report_id', $report->id)->delete();
        IncidentMessage::where('report_id', $report->id)->delete();
        $report->delete();

        return response()->noContent();
    }

    public function reject(Request $request, Report $report)
    {
        $request->validate(['notes' => 'nullable|string|max:500']);

        $report->update(['status' => 'rejected']);

        ReportStatusUpdate::create([
            'report_id' => $report->id,
            'user_id'   => $request->user()->id,
            'status'    => 'rejected',
            'notes'     => $request->notes,
        ]);

        return response()->json($report->fresh());
    }
}
