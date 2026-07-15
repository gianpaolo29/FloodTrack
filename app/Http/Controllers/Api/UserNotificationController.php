<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->data['type'] ?? 'status_changed',
                'title'      => $n->data['title'] ?? 'Notification',
                'message'    => $n->data['message'] ?? '',
                'report_id'  => $n->data['report_id'] ?? null,
                'new_status' => $n->data['new_status'] ?? null,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ]);

        return response()->json($notifications);
    }

    public function markRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();
        if ($notification) {
            $notification->markAsRead();
        }
        return response()->json(['message' => 'Marked as read.']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'All marked as read.']);
    }
}
