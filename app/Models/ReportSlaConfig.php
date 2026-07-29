<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportSlaConfig extends Model
{
    protected $fillable = [
        'severity',
        'stage',
        'threshold_minutes',
        'warning_pct',
        'critical_pct',
    ];

    protected function casts(): array
    {
        return [
            'threshold_minutes'      => 'integer',
            'warning_pct'            => 'integer',
            'critical_pct'           => 'integer',
        ];
    }

    public static function getConfig(string $severity, string $stage): ?self
    {
        return static::where('severity', $severity)->where('stage', $stage)->first();
    }

    public static function allGroupedBySeverity(): array
    {
        return static::all()
            ->groupBy('severity')
            ->map(fn ($items) => $items->keyBy('stage'))
            ->toArray();
    }
}
