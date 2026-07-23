<?php

namespace App\Http\Controllers;

use App\Models\EvacuationCenter;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Laravel\Fortify\Features;

class WelcomeController extends Controller
{
    public function __invoke()
    {
        $stats = [
            'total_reports' => Report::count(),
            'resolved_reports' => Report::where('status', 'resolved')->count(),
            'active_responders' => User::where('role', 'responder')->where('is_on_duty', true)->count(),
            'total_responders' => User::where('role', 'responder')->count(),
            'active_incidents' => Report::whereIn('status', ['pending', 'verified', 'assigned'])->count(),
            'evacuation_centers' => EvacuationCenter::where('is_active', true)->count(),
        ];

        $evacuationCenters = EvacuationCenter::where('is_active', true)
            ->select('id', 'name', 'address', 'type', 'capacity', 'current_occupancy', 'latitude', 'longitude')
            ->orderBy('name')
            ->get();

        return Inertia::render('welcome', [
            'canRegister' => Features::enabled(Features::registration()),
            'stats' => $stats,
            'evacuationCenters' => $evacuationCenters,
        ]);
    }
}
