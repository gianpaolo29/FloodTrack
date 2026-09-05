<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\ReportStatusUpdate;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    use HasPeriodStats;

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);

        $activities = ReportStatusUpdate::with([
                'user:id,name,role',
                'report:id,reference_number,severity',
            ])
            ->tap(fn ($q) => $this->scopeByPeriod($q, $from, $to))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->team_id, fn ($q) => $q->whereHas('report', function ($q2) use ($request) {
                $q2->where('assigned_team_id', $request->team_id);
            }))
            ->when($request->search, fn ($q) => $q->whereHas('report', function ($q2) use ($request) {
                $q2->where('reference_number', 'like', "%{$request->search}%");
            }))
            ->latest()
            ->paginate(20)
            ->withQueryString();
        [$prevFrom, $prevTo, $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        $curTotal    = $this->scopeByPeriod(ReportStatusUpdate::query(), $from, $to)->count();
        $curResolved = $this->scopeByPeriod(ReportStatusUpdate::where('status', 'resolved'), $from, $to)->count();
        $curPending  = $this->scopeByPeriod(ReportStatusUpdate::where('status', 'pending'), $from, $to)->count();

        $prevTotal    = ReportStatusUpdate::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevResolved = ReportStatusUpdate::where('status', 'resolved')->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevPending  = ReportStatusUpdate::where('status', 'pending')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $stats = [
            'total'    => $curTotal,
            'today'    => ReportStatusUpdate::whereDate('created_at', today())->count(),
            'resolved' => $curResolved,
            'pending'  => $curPending,
        ];

        $trends = [
            'total'        => $this->calcTrend($curTotal, $prevTotal),
            'resolved'     => $this->calcTrend($curResolved, $prevResolved),
            'pending'      => $this->calcTrend($curPending, $prevPending),
            'label'        => $trendLabel,
            'period_label' => $periodLabel,
        ];

        return Inertia::render('admin/activity/index', [
            'activities'  => $activities,
            'filters'     => $request->only(['status', 'search', 'team_id']),
            'stats'       => $stats,
            'trends'      => $trends,
            'period'      => $period,
            'custom_from' => $request->get('from'),
            'custom_to'   => $request->get('to'),
            'teams'       => Team::orderBy('name')->get(['id', 'name']),
        ]);
    }
}
