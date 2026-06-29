<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlertRead extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'alert_id', 'read_at'];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function alert()
    {
        return $this->belongsTo(Alert::class);
    }
}
