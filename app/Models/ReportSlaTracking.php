<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class ReportSlaTracking extends Model
{
    protected $table = 'report_sla_tracking';

    protected $fillable = [
        'report_id',
        'stage',
        'started_at',
        'threshold_minutes',
        'completed_at',
        'elapsed_minutes',
        'sla_status',
        'escalation_level',
        'escalated_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at'        => 'datetime',
            'completed_at'      => 'datetime',
            'escalated_at'      => 'datetime',
            'elapsed_minutes'   => 'decimal:1',
            'threshold_minutes' => 'integer',
            'escalation_level'  => 'integer',
        ];
    }

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function getDeadlineAtAttribute(): Carbon
    {
        return $this->started_at->copy()->addMinutes($this->threshold_minutes);
    }

    public function getProgressPctAttribute(): float
    {
        if ($this->completed_at) {
            return $this->threshold_minutes > 0
                ? round(($this->elapsed_minutes / $this->threshold_minutes) * 100, 1)
                : 0;
        }

        $elapsed = $this->started_at->diffInSeconds(now()) / 60;

        return $this->threshold_minutes > 0
            ? round(($elapsed / $this->threshold_minutes) * 100, 1)
            : 0;
    }

    public function computeCurrentStatus(): string
    {
        if ($this->completed_at) {
            return $this->sla_status;
        }

        $pct = $this->progress_pct;

        $config = ReportSlaConfig::getConfig(
            $this->report->severity ?? 'low',
            $this->stage,
        );

        $warningPct  = $config->warning_pct ?? 80;
        $criticalPct = $config->critical_pct ?? 150;

        if ($pct >= 100) {
            return 'breached';
        }

        if ($pct >= $warningPct) {
            return 'at_risk';
        }

        return 'on_track';
    }
}
