<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reference_number',
        'severity',
        'status',
        'description',
        'latitude',
        'longitude',
        'address',
        'assigned_to',
        'verified_by',
        'verified_at',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'    => 'float',
            'longitude'   => 'float',
            'verified_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Report $report) {
            $report->reference_number ??= 'FT-' . strtoupper(Str::random(8));
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedResponder()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function media()
    {
        return $this->hasMany(ReportMedia::class);
    }

    public function statusUpdates()
    {
        return $this->hasMany(ReportStatusUpdate::class)->latest();
    }

    public function responders()
    {
        return $this->hasMany(ReportResponder::class);
    }

    public function responderUsers()
    {
        return $this->belongsToMany(User::class, 'report_responders')
            ->withPivot('role', 'status')
            ->withTimestamps();
    }
}
