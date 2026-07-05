<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FamilyGroup extends Model
{
    protected $fillable = ['name', 'invite_code', 'creator_id'];

    protected static function booted(): void
    {
        static::creating(function (FamilyGroup $group) {
            if (!$group->invite_code) {
                $group->invite_code = strtoupper(Str::random(8));
            }
        });
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function members()
    {
        return $this->hasMany(FamilyMember::class);
    }
}
