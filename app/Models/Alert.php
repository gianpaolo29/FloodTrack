<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $fillable = ['created_by', 'title', 'body', 'type', 'target_barangays'];

    protected function casts(): array
    {
        return [
            'target_barangays' => 'array',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reads()
    {
        return $this->hasMany(AlertRead::class);
    }
}
