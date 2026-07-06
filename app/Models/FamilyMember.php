<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyMember extends Model
{
    protected $fillable = ['family_group_id', 'user_id', 'check_in_status', 'checked_in_at', 'latitude', 'longitude'];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
        ];
    }

    public function group()
    {
        return $this->belongsTo(FamilyGroup::class, 'family_group_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
