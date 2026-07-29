<?php

namespace App\Services;

use App\Models\Report;
use App\Models\ReportSlaConfig;
use App\Models\ReportSlaTracking;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\SlaBreachNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class SlaService
{
    private const STAGE_MAP = [
        'pending'  => 'pending_to_verified',
        'verified' => 'verified_to_assigned',
        'assigned' => 'assigned_to_resolved',
    ];

    private const NEXT_STAGE = [
        'pending_to_verified'    => 'verified_to_assigned',
        'verified_to_assigned'   => 'assigned_to_resolved',
        'assigned_to_resolved'   => null,
    ];

    public function initializeTracking(Report $report): void
    {
        if (! Setting::getValue('sla_enabled')) {
            return;
        }

        // Clear any existing tracking (for reopened reports)
        $report->slaTracking()->delete();

        $config = ReportSlaConfig::getConfig($report->severity, 'pending_to_verified');

        if (! $config) {
            return;
        }

        ReportSlaTracking::create([
            'report_id'         => $report->id,
            'stage'             => 'pending_to_verified',
            'started_at'        => $report->created_at,
            'threshold_minutes' => $config->threshold_minutes,
        ]);
    }

    public function advanceStage(Report $report, string $newStatus): void
    {
        if (! Setting::getValue('sla_enabled')) {
            return;
        }

        // Complete the current active tracking entry
        $active = $report->slaTracking()->whereNull('completed_at')->first();

        if ($active) {
            $elapsed = $active->started_at->diffInSeconds(now()) / 60;
            $active->update([
                'completed_at'    => now(),
                'elapsed_minutes' => round($elapsed, 1),
                'sla_status'      => $elapsed <= $active->threshold_minutes ? 'met' : 'breached',
            ]);
        }

        // Terminal statuses don't start a new stage
        if (in_array($newStatus, ['resolved', 'rejected'])) {
            return;
        }

        // Determine the next stage to start
        $nextStage = self::STAGE_MAP[$newStatus] ?? null;

        if (! $nextStage) {
            return;
        }

        // Don't create duplicate tracking
        if ($report->slaTracking()->where('stage', $nextStage)->exists()) {
            return;
        }

        $config = ReportSlaConfig::getConfig($report->severity, $nextStage);

        if (! $config) {
            return;
        }

        $startedAt = match ($nextStage) {
            'verified_to_assigned'  => $report->verified_at ?? now(),
            'assigned_to_resolved'  => $report->assigned_at ?? now(),
            default                 => now(),
        };

        ReportSlaTracking::create([
            'report_id'         => $report->id,
            'stage'             => $nextStage,
            'started_at'        => $startedAt,
            'threshold_minutes' => $config->threshold_minutes,
        ]);
    }

    public function checkAndEscalate(): int
    {
        $count = 0;

        $trackingEntries = ReportSlaTracking::with('report')
            ->whereNull('completed_at')
            ->get();

        foreach ($trackingEntries as $tracking) {
            if (! $tracking->report) {
                continue;
            }

            $config = ReportSlaConfig::getConfig($tracking->report->severity, $tracking->stage);

            if (! $config) {
                continue;
            }

            $pct        = $tracking->progress_pct;
            $warningPct = $config->warning_pct;
            $critPct    = $config->critical_pct;

            // Determine escalation level: 0 = ok, 1 = warning, 2 = breached, 3 = critical
            $newLevel = 0;
            if ($pct >= $critPct) {
                $newLevel = 3;
            } elseif ($pct >= 100) {
                $newLevel = 2;
            } elseif ($pct >= $warningPct) {
                $newLevel = 1;
            }

            if ($newLevel <= $tracking->escalation_level) {
                continue;
            }

            $newStatus = $newLevel >= 2 ? 'breached' : ($newLevel >= 1 ? 'at_risk' : 'on_track');

            $tracking->update([
                'sla_status'       => $newStatus,
                'escalation_level' => $newLevel,
                'escalated_at'     => now(),
            ]);

            // Notify admins
            $admins = User::where('role', 'admin')->get();
            $elapsed = round($tracking->started_at->diffInSeconds(now()) / 60, 1);

            Notification::send($admins, new SlaBreachNotification(
                $tracking->report,
                $tracking->stage,
                $newLevel,
                $elapsed,
                $tracking->threshold_minutes,
            ));

            // Push notification for level 2+
            if ($newLevel >= 2) {
                $levelLabel = $newLevel >= 3 ? 'CRITICAL' : 'BREACHED';
                $stageLabel = self::stageLabel($tracking->stage);

                ExpoPushService::sendToUsers(
                    $admins->pluck('id')->toArray(),
                    "SLA {$levelLabel} — {$tracking->report->reference_number}",
                    "{$stageLabel} exceeded: {$elapsed} min / {$tracking->threshold_minutes} min threshold.",
                    [
                        'type'     => 'sla_breach',
                        'reportId' => $tracking->report->id,
                    ],
                    'critical'
                );
            }

            $count++;
        }

        return $count;
    }

    public function getComplianceStats(?string $period = null): array
    {
        $query = ReportSlaTracking::query();

        if ($period && $period !== 'all') {
            $from = match ($period) {
                'today' => now()->startOfDay(),
                'week'  => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };
            if ($from) {
                $query->where('started_at', '>=', $from);
            }
        }

        $all = $query->get();

        $completed     = $all->whereNotNull('completed_at');
        $metCount      = $completed->where('sla_status', 'met')->count();
        $breachedCount = $completed->where('sla_status', 'breached')->count();
        $totalDone     = $completed->count();
        $complianceRate = $totalDone > 0 ? round(($metCount / $totalDone) * 100, 1) : 100;

        $activeBreaches = $all->whereNull('completed_at')
            ->whereIn('sla_status', ['breached', 'at_risk'])
            ->count();

        // Per-stage averages
        $stages = ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved'];
        $stageStats = [];
        foreach ($stages as $stage) {
            $stageItems = $completed->where('stage', $stage);
            $stageStats[$stage] = [
                'avg_minutes' => $stageItems->count() > 0
                    ? round($stageItems->avg('elapsed_minutes'), 1)
                    : 0,
                'met'      => $stageItems->where('sla_status', 'met')->count(),
                'breached' => $stageItems->where('sla_status', 'breached')->count(),
                'total'    => $stageItems->count(),
            ];
        }

        // Per-severity breakdown
        $severityStats = [];
        foreach (['critical', 'high', 'moderate', 'low'] as $severity) {
            $sevItems = $completed->filter(fn ($t) => $t->report && $t->report->severity === $severity);
            $sevMet   = $sevItems->where('sla_status', 'met')->count();
            $sevTotal = $sevItems->count();
            $severityStats[$severity] = [
                'met'      => $sevMet,
                'breached' => $sevItems->where('sla_status', 'breached')->count(),
                'total'    => $sevTotal,
                'rate'     => $sevTotal > 0 ? round(($sevMet / $sevTotal) * 100, 1) : 100,
            ];
        }

        // 30-day breach trend
        $breachTrend = ReportSlaTracking::where('sla_status', 'breached')
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(completed_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();

        return [
            'compliance_rate'  => $complianceRate,
            'met_count'        => $metCount,
            'breached_count'   => $breachedCount,
            'total_completed'  => $totalDone,
            'active_breaches'  => $activeBreaches,
            'stage_stats'      => $stageStats,
            'severity_stats'   => $severityStats,
            'breach_trend'     => $breachTrend,
        ];
    }

    public static function stageLabel(string $stage): string
    {
        return match ($stage) {
            'pending_to_verified'  => 'Time to Verify',
            'verified_to_assigned' => 'Time to Assign',
            'assigned_to_resolved' => 'Time to Resolve',
            default                => $stage,
        };
    }
}
