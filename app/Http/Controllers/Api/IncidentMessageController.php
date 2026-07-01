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
        $messages = IncidentMessage::where('report_id', $report->id)
            ->with('user:id,name,role')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    /**
     * Create a message for a report.
     * Only the assigned responder or an admin can message.
     */
    public function store(Request $request, Report $report)
    {
        $user = $request->user();

        // Only assigned responder or admin can send messages
        $isAssignedResponder = $report->assigned_to === $user->id;
        $isAdmin = $user->isAdmin();

        if (! $isAssignedResponder && ! $isAdmin) {
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

        // Send push notification to the other party
        if ($isAdmin && $report->assigned_to) {
            // Admin sent message -> notify the assigned responder
            ExpoPushService::sendToUsers(
                $report->assigned_to,
                'New Message',
                $user->name . ': ' . \Illuminate\Support\Str::limit($data['body'], 100),
                ['type' => 'incident_message', 'report_id' => $report->id]
            );
        } elseif ($isAssignedResponder) {
            // Responder sent message -> notify all admins
            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();
            if (! empty($adminIds)) {
                ExpoPushService::sendToUsers(
                    $adminIds,
                    'New Message on Report #' . $report->reference_number,
                    $user->name . ': ' . \Illuminate\Support\Str::limit($data['body'], 100),
                    ['type' => 'incident_message', 'report_id' => $report->id]
                );
            }
        }

        return response()->json($message, 201);
    }
}
