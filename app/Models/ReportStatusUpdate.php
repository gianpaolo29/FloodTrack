<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportStatusUpdate extends Model
{
    protected $fillable = ['report_id', 'user_id', 'status', 'notes'];

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
