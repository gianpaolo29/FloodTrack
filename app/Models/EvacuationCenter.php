<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvacuationCenter extends Model
{
    protected $fillable = [
        'name',
        'address',
        'type',
        'capacity',
        'current_occupancy',
        'latitude',
        'longitude',
        'is_active',
    ];

    protected $appends = ['occupancy_pct'];

    protected function casts(): array
    {
        return [
            'capacity'          => 'integer',
            'current_occupancy' => 'integer',
            'latitude'          => 'float',
            'longitude'         => 'float',
            'is_active'         => 'boolean',
        ];
    }

    public function occupancyLogs(): HasMany
    {
        return $this->hasMany(OccupancyLog::class);
    }

    public function getOccupancyPctAttribute(): int
    {
        if ($this->capacity === 0) {
            return 0;
        }

        return (int) round($this->current_occupancy / $this->capacity * 100);
    }
}
