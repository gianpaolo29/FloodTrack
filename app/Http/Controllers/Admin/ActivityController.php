<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReportStatusUpdate;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function index(Request $request): Response
    {
        $activities = ReportStatusUpdate::with([
                'user:id,name,role',
                'report:id,reference_number,hazard_type,severity',
            ])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->search, fn ($q) => $q->whereHas('report', function ($q2) use ($request) {
                $q2->where('reference_number', 'like', "%{$request->search}%");
            }))
            ->latest()
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('admin/activity/index', [
            'activities' => $activities,
            'filters'    => $request->only(['status', 'search']),
        ]);
    }
}
