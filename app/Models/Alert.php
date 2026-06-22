<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $fillable = ['created_by', 'title', 'body', 'type', 'is_critical', 'expires_at'];

    protected function casts(): array
    {
        return [
            'is_critical' => 'boolean',
            'expires_at'  => 'datetime',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
