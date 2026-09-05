<?php

namespace App\Http\Traits;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

trait HasPeriodStats
{
    protected function parsePeriod(Request $request): array
    {
        $period = $request->get('period', 'today');
        $customFrom = $request->get('from');
        $customTo = $request->get('to');

        if ($period === 'custom' && $customFrom) {
            $from = Carbon::parse($customFrom)->startOfDay();
            $to = $customTo ? Carbon::parse($customTo)->endOfDay() : now()->endOfDay();
        } else {
            $from = match ($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };
            $to = null;
        }

        return [$from, $to, $period];
    }

    protected function comparisonPeriod(string $period, ?CarbonInterface $from, ?CarbonInterface $to): array
    {
        if ($period === 'custom' && $from) {
            $currentTo = $to ?? now()->endOfDay();
            $rangeDays = $from->diffInDays($currentTo);
            $previousTo = $from->copy()->subDay()->endOfDay();
            $previousFrom = $previousTo->copy()->subDays($rangeDays)->startOfDay();
            $trendLabel = 'vs prior period';
            $periodLabel = $from->format('M d') . ' – ' . $currentTo->format('M d, Y');
        } else {
            $previousFrom = match ($period) {
                'today' => today()->subDay(),
                'week'  => now()->subWeek()->startOfWeek(),
                'month' => now()->subMonth()->startOfMonth(),
                default => now()->subMonth()->startOfMonth(),
            };
            $previousTo = match ($period) {
                'today' => today(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => now()->startOfMonth(),
            };
            $trendLabel = match ($period) {
                'today' => 'vs yesterday',
                'week'  => 'vs last week',
                'month' => 'vs last month',
                default => 'vs last month',
            };
            $periodLabel = match ($period) {
                'today' => today()->format('M d, Y'),
                'week'  => now()->startOfWeek()->format('M d') . ' – ' . now()->endOfWeek()->format('M d, Y'),
                'month' => now()->startOfMonth()->format('M d') . ' – ' . now()->endOfMonth()->format('M d, Y'),
                default => now()->startOfMonth()->format('M d') . ' – ' . now()->endOfMonth()->format('M d, Y'),
            };
        }

        return [$previousFrom, $previousTo, $trendLabel, $periodLabel];
    }

    protected function calcTrend(int $current, int $previous): float
    {
        return $previous > 0
            ? round((($current - $previous) / $previous) * 100, 1)
            : ($current > 0 ? 100 : 0);
    }

    protected function scopeByPeriod(Builder $query, ?CarbonInterface $from, ?CarbonInterface $to, string $column = 'created_at'): Builder
    {
        if ($from && $to) {
            $query->whereBetween($column, [$from, $to]);
        } elseif ($from) {
            $query->where($column, '>=', $from);
        }

        return $query;
    }

    protected function isUsingSqlite(): bool
    {
        return DB::getDriverName() === 'sqlite';
    }
}
