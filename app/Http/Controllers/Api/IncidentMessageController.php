<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentMessage;
use App\Models\Report;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;

class IncidentMessageController extends Controller
{
    /**
     * List messages for a report, ordered by created_at asc.
     */
    public function index(Request $request, Report $report)
    {
        $user = $request->user();

        // Only the report owner, assigned responder, or admin can view messages
        if (! $this->canAccess($user, $report)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $messages = IncidentMessage::where('report_id', $report->id)
            ->with('user:id,name,role')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    /**
     * Create a message for a report.
     * The report owner (resident), assigned responder, or admin can message.
     */
    public function store(Request $request, Report $report)
    {
        $user = $request->user();

        if (! $this->canAccess($user, $report)) {
            return response()->json(['message' => 'You are not authorized to message on this report.'], 403);
        }

        $data = $request->validate([
            'body'           => 'required|string|max:1000',
            'is_quick_reply' => 'sometimes|boolean',
        ]);

        $message = IncidentMessage::create([
            'report_id'      => $report->id,
            'user_id'        => $user->id,
            'body'           => $data['body'],
            'is_quick_reply' => $data['is_quick_reply'] ?? false,
        ]);

        $message->load('user:id,name,role');

        // Send push notifications to the other parties
        $snippet = \Illuminate\Support\Str::limit($data['body'], 100);

        if ($user->id === $report->user_id) {
            // Resident sent message -> notify assigned responder + admins
            $notifyIds = [];
            if ($report->assigned_to) $notifyIds[] = $report->assigned_to;
            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();
            $notifyIds = array_unique(array_merge($notifyIds, $adminIds));

            if (! empty($notifyIds)) {
                ExpoPushService::sendToUsers(
                    $notifyIds,
                    'Message from ' . $user->name,
                    $snippet,
                    ['type' => 'incident_message', 'reportId' => $report->id]
                );
            }
        } elseif ($report->assigned_to === $user->id) {
            // Responder sent message -> notify reporter + admins
            $notifyIds = [$report->user_id];
            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();
            $notifyIds = array_unique(array_merge($notifyIds, $adminIds));

            ExpoPushService::sendToUsers(
                $notifyIds,
                'Update on Report #' . $report->reference_number,
                $user->name . ': ' . $snippet,
                ['type' => 'incident_message', 'reportId' => $report->id]
            );
        } elseif ($user->isAdmin()) {
            // Admin sent message -> notify reporter + assigned responder
            $notifyIds = [$report->user_id];
            if ($report->assigned_to) $notifyIds[] = $report->assigned_to;
            $notifyIds = array_unique(array_filter($notifyIds));

            ExpoPushService::sendToUsers(
                $notifyIds,
                'Message from dispatch',
                $snippet,
                ['type' => 'incident_message', 'reportId' => $report->id]
            );
        }

        return response()->json($message, 201);
    }

    /**
     * Check if a user can access messages for a report.
     */
    private function canAccess(User $user, Report $report): bool
    {
        return $user->isAdmin()
            || $report->user_id === $user->id          // report owner (resident)
            || $report->assigned_to === $user->id;      // assigned responder
    }
}
