<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Protocol extends Model
{
    protected $fillable = [
        'hazard_type',
        'hazard_label',
        'icon',
        'color',
        'safety_tip',
        'steps',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'steps'      => 'array',
            'sort_order' => 'integer',
        ];
    }
}
