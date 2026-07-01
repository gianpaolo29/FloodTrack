<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportResponder extends Model
{
    protected $fillable = [
        'report_id',
        'user_id',
        'role',
        'status',
    ];

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
