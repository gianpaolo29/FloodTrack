<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentMessage extends Model
{
    protected $fillable = [
        'report_id',
        'user_id',
        'body',
        'is_quick_reply',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'is_quick_reply' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
