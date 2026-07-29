<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccupancyLog extends Model
{
    protected $fillable = [
        'evacuation_center_id',
        'previous_occupancy',
        'new_occupancy',
        'changed_by',
        'change_type',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'previous_occupancy' => 'integer',
            'new_occupancy'      => 'integer',
        ];
    }

    public function evacuationCenter(): BelongsTo
    {
        return $this->belongsTo(EvacuationCenter::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
