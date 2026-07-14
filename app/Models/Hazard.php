<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hazard extends Model
{
    protected $fillable = [
        'created_by',
        'category',
        'type',
        'severity',
        'title',
        'description',
        'latitude',
        'longitude',
        'address',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'latitude'  => 'float',
            'longitude' => 'float',
            'active'    => 'boolean',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }
}
