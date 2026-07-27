<?php

namespace App\Notifications;

use App\Models\IncidentMessage;
use App\Models\Report;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class NewIncidentMessage extends Notification
{
    use Queueable;

    public function __construct(
        public Report $report,
        public IncidentMessage $message,
        public User $sender,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'             => 'new_message',
            'title'            => 'New message from ' . $this->sender->name,
            'message'          => Str::limit($this->message->body, 100),
            'report_id'        => $this->report->id,
            'reference_number' => $this->report->reference_number,
            'sender_name'      => $this->sender->name,
            'sender_role'      => $this->sender->role,
        ];
    }
}
