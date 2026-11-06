<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeController extends Controller
{
    /**
     * GET /api/realtime/authorize
     *
     * Returns the rooms this user is allowed to join, computed from DB at call time.
     */
    public function authorize(Request $request): JsonResponse
    {
        $user  = $request->user();
        $rooms = [];

        if ($user->isAdmin()) {
            // Admins join the admin responder room + all active report rooms
            $rooms[] = 'admin:responders';
            $rooms[] = 'responder-locations';
            $rooms[] = 'alerts';

            $activeReportIds = Report::whereNotIn('status', ['resolved', 'rejected'])
                ->pluck('id');
            foreach ($activeReportIds as $id) {
                $rooms[] = "report:{$id}";
            }
        } elseif ($user->isResponder()) {
            $rooms[] = 'alerts';
            $rooms[] = "user:{$user->id}";

            // Reports where this responder has an active row
            $reportIds = \DB::table('report_responders')
                ->where('user_id', $user->id)
                ->where('status', '!=', 'resolved')
                ->pluck('report_id');

            foreach ($reportIds as $id) {
                $rooms[] = "report:{$id}";
            }
        } else {
            // Resident
            $rooms[] = 'alerts';
            $rooms[] = "user:{$user->id}";

            // Their own non-resolved/rejected reports
            $reportIds = Report::where('user_id', $user->id)
                ->whereNotIn('status', ['resolved', 'rejected'])
                ->pluck('id');

            foreach ($reportIds as $id) {
                $rooms[] = "report:{$id}";
            }
        }

        return response()->json([
            'user_id' => $user->id,
            'role'    => $user->role,
            'rooms'   => array_values(array_unique($rooms)),
        ]);
    }
}
