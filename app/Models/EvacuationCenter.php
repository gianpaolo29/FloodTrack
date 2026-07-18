<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
