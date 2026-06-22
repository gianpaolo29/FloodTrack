<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportMedia extends Model
{
    protected $fillable = ['report_id', 'file_path', 'file_type', 'file_size'];

    protected $appends = ['url'];

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->file_path);
    }
}
