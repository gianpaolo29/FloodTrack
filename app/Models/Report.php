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
        'assigned_team_id',
        'verified_by',
        'verified_at',
        'assigned_at',
        'resolved_at',
        'ai_flagged',
        'ai_flag_reason',
        'ai_image_verified',
        'ai_image_notes',
        'ai_exif_status',
        'ai_exif_notes',
        'potential_duplicate_of',
        'source',
        'facebook_post_id',
        'advisory',
    ];

    protected $appends = ['hazard_type', 'sla_status'];

    public function getHazardTypeAttribute(): string
    {
        return 'flood';
    }

    protected function casts(): array
    {
        return [
            'latitude'          => 'float',
            'longitude'         => 'float',
            'verified_at'       => 'datetime',
            'assigned_at'       => 'datetime',
            'resolved_at'       => 'datetime',
            'ai_flagged'        => 'boolean',
            'ai_image_verified' => 'boolean',
            'advisory'          => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Report $report) {
            $report->reference_number ??= 'FT-' . strtoupper(Str::random(8));
        });
    }

    public function requiresAssignment(): bool
    {
        return in_array($this->severity, ['high', 'critical']);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedResponder()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedTeam()
    {
        return $this->belongsTo(Team::class, 'assigned_team_id');
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

    public function slaTracking()
    {
        return $this->hasMany(ReportSlaTracking::class);
    }

    public function getSlaStatusAttribute(): ?string
    {
        if (! Setting::getValue('sla_enabled')) {
            return null;
        }

        if (in_array($this->status, ['resolved', 'rejected', 'acknowledged'])) {
            $tracking = $this->relationLoaded('slaTracking')
                ? $this->slaTracking
                : $this->slaTracking()->get();

            if ($tracking->isEmpty()) {
                return null;
            }

            return $tracking->contains('sla_status', 'breached') ? 'breached' : 'met';
        }

        $active = $this->relationLoaded('slaTracking')
            ? $this->slaTracking->whereNull('completed_at')->first()
            : $this->slaTracking()->whereNull('completed_at')->first();

        if (! $active) {
            return null;
        }

        return $active->computeCurrentStatus();
    }
}
