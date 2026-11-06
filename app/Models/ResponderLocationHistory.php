<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResponderLocationHistory extends Model
{
    public $timestamps = false;

    protected $table = 'responder_location_history';

    protected $fillable = [
        'user_id',
        'latitude',
        'longitude',
        'speed',
        'accuracy',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'    => 'float',
            'longitude'   => 'float',
            'speed'       => 'float',
            'accuracy'    => 'float',
            'recorded_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
