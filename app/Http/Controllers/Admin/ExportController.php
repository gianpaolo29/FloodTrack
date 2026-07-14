<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function index(): Response
    {
        $counts = [
            'total'    => Report::count(),
            'pending'  => Report::where('status', 'pending')->count(),
            'resolved' => Report::where('status', 'resolved')->count(),
        ];

        return Inertia::render('admin/export/index', [
            'counts' => $counts,
        ]);
    }

    public function download(Request $request): StreamedResponse
    {
        $request->validate([
            'status'      => 'nullable|in:pending,verified,assigned,resolved,rejected',
            'severity'    => 'nullable|in:low,moderate,high,critical',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date',
        ]);

        $reports = Report::with(['user:id,name', 'assignedResponder:id,name'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->latest()
            ->get();

        $filename = 'floodtrack-reports-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($reports) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Reference', 'Severity', 'Status',
                'Description', 'Address', 'Latitude', 'Longitude',
                'Reporter', 'Assigned To', 'Created At', 'Verified At', 'Resolved At',
            ]);

            foreach ($reports as $report) {
                fputcsv($handle, [
                    $report->reference_number,
                    $report->severity,
                    $report->status,
                    $report->description,
                    $report->address,
                    $report->latitude,
                    $report->longitude,
                    $report->user?->name ?? '',
                    $report->assignedResponder?->name ?? '',
                    $report->created_at,
                    $report->verified_at,
                    $report->resolved_at,
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
