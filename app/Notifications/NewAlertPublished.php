<?php

namespace App\Notifications;

use App\Models\Alert;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewAlertPublished extends Notification
{
    use Queueable;

    public function __construct(public Alert $alert) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'     => 'new_alert',
            'title'    => 'New Alert Published',
            'message'  => "[{$this->alert->type}] {$this->alert->title}",
            'alert_id' => $this->alert->id,
            'alert_type' => $this->alert->type,
            'url'      => '/admin/alerts',
        ];
    }
}
