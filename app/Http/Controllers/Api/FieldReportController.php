<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FieldReport;
use App\Models\Report;
use Illuminate\Http\Request;

class FieldReportController extends Controller
{
    /**
     * Get the field report for a report (or 404).
     */
    public function show(Report $report)
    {
        $fieldReport = FieldReport::where('report_id', $report->id)->first();

        if (! $fieldReport) {
            return response()->json(['message' => 'Field report not found.'], 404);
        }

        $fieldReport->load('user:id,name,role');

        return response()->json($fieldReport);
    }

    /**
     * Create or update field report for a report.
     * Only the assigned responder or an admin can submit.
     */
    public function store(Request $request, Report $report)
    {
        $user = $request->user();

        $isAssignedResponder = $report->assigned_to === $user->id;
        $isAdmin = $user->isAdmin();

        if (! $isAssignedResponder && ! $isAdmin) {
            return response()->json(['message' => 'You are not authorized to submit a field report.'], 403);
        }

        $data = $request->validate([
            'actions_taken'     => 'required|string',
            'resources_used'    => 'nullable|string',
            'people_assisted'   => 'sometimes|integer|min:0',
            'damage_assessment' => 'nullable|string',
            'checklist'         => 'nullable|array',
        ]);

        $fieldReport = FieldReport::updateOrCreate(
            ['report_id' => $report->id],
            array_merge($data, ['user_id' => $user->id])
        );

        $fieldReport->load('user:id,name,role');

        return response()->json($fieldReport, 201);
    }
}
