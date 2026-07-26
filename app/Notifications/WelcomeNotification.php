<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'welcome',
            'title'   => 'Welcome to FloodTrack!',
            'message' => 'Thank you for joining FloodTrack. You can report floods in your area, receive real-time alerts, and stay informed about flood conditions near you. Stay safe!',
        ];
    }
}
