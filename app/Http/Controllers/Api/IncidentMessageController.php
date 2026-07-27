<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentMessage;
use App\Models\Report;
use App\Models\User;
use App\Notifications\NewIncidentMessage;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class IncidentMessageController extends Controller
{
    /**
     * List messages for a report, ordered by created_at asc.
     */
    public function index(Request $request, Report $report)
    {
        $user = $request->user();

        // Only the report owner (resident) or assigned responder/team members can view messages
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
     * Only the report owner (resident) and assigned responder/team members can message.
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
            'body'           => strip_tags($data['body']),
            'is_quick_reply' => $data['is_quick_reply'] ?? false,
        ]);

        $message->load('user:id,name,role');

        // Notify only the resident and responder team (no admins)
        $snippet = \Illuminate\Support\Str::limit($data['body'], 100);

        $responderIds = $report->responders()->pluck('user_id')->toArray();
        $recipientIds = array_unique(array_filter(array_merge(
            [$report->user_id, $report->assigned_to],
            $responderIds,
        )));
        $recipientIds = array_values(array_filter($recipientIds, fn ($id) => (int) $id !== (int) $user->id));

        if (! empty($recipientIds)) {
            // Push notification
            if ((int) $user->id === (int) $report->user_id) {
                $pushTitle = 'Message from ' . $user->name;
                $pushBody  = $snippet;
            } else {
                $pushTitle = 'Update on Report #' . $report->reference_number;
                $pushBody  = $user->name . ': ' . $snippet;
            }

            ExpoPushService::sendToUsers(
                $recipientIds,
                $pushTitle,
                $pushBody,
                ['type' => 'incident_message', 'reportId' => $report->id],
                'my_reports'
            );

            // Database notification + real-time socket nudge to each recipient
            $recipients = User::whereIn('id', $recipientIds)->get();
            foreach ($recipients as $recipient) {
                $recipient->notify(new NewIncidentMessage($report, $message, $user));

                SocketService::toUser($recipient->id, 'new-notification', [
                    'type'     => 'new_message',
                    'reportId' => $report->id,
                    'senderId' => $user->id,
                ]);
            }
        }

        SocketService::toReport($report->id, 'new-message', $message->toArray());

        return response()->json($message, 201);
    }

    public function markRead(Request $request, Report $report)
    {
        $user = $request->user();
        if (! $this->canAccess($user, $report)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        IncidentMessage::where('report_id', $report->id)
            ->where('user_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Messages marked as read.']);
    }

    public function unreadCount(Request $request, Report $report)
    {
        $user = $request->user();
        if (! $this->canAccess($user, $report)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $count = IncidentMessage::where('report_id', $report->id)
            ->where('user_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    public function typing(Request $request, Report $report)
    {
        $user = $request->user();
        if (! $this->canAccess($user, $report)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        Cache::put("typing:{$report->id}:{$user->id}", [
            'id'   => $user->id,
            'name' => $user->name,
            'role' => $user->role,
        ], now()->addSeconds(4));

        SocketService::toReport($report->id, 'typing-update', [
            'id' => $user->id, 'name' => $user->name, 'role' => $user->role,
        ]);

        return response()->json(['status' => 'ok']);
    }

    public function typingUsers(Request $request, Report $report)
    {
        $user = $request->user();
        if (! $this->canAccess($user, $report)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $responderIds   = $report->responders()->pluck('user_id')->toArray();
        $participantIds = array_filter(array_merge(
            [$report->user_id, $report->assigned_to],
            $responderIds,
        ));
        $allIds = array_unique($participantIds);

        $typing = [];
        foreach ($allIds as $uid) {
            if ((int) $uid === (int) $user->id) continue;
            $data = Cache::get("typing:{$report->id}:{$uid}");
            if ($data) $typing[] = $data;
        }

        return response()->json(['typing' => $typing]);
    }

    /**
     * Check if a user can access messages for a report.
     * Allowed: report owner (resident), directly assigned responder,
     * any team member in the pivot, or any member of the assigned team.
     */
    private function canAccess(User $user, Report $report): bool
    {
        return (int) $report->user_id    === (int) $user->id   // report owner (resident)
            || (int) $report->assigned_to === (int) $user->id  // team leader (direct assignment)
            || $report->responders()->where('user_id', $user->id)->exists() // any team member in pivot
            || ($user->team_id && (int) $report->assigned_team_id === (int) $user->team_id); // member of assigned team
    }
}
