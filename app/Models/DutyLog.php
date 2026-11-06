<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DutyLog extends Model
{
    protected $fillable = [
        'user_id',
        'started_at',
        'ended_at',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at'   => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
