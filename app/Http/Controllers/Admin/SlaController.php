<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\ReportSlaConfig;
use App\Models\Setting;
use App\Services\SlaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SlaController extends Controller
{
    use HasPeriodStats;

    public function index(Request $request, SlaService $sla): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);
        [, , $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        return Inertia::render('admin/sla/index', [
            'configs'     => ReportSlaConfig::allGroupedBySeverity(),
            'stats'       => $sla->getComplianceStats($period),
            'sla_enabled' => (bool) Setting::getValue('sla_enabled'),
            'period'      => $period,
            'custom_from' => $request->get('from'),
            'custom_to'   => $request->get('to'),
            'trends'      => [
                'label'        => $trendLabel,
                'period_label' => $periodLabel,
            ],
        ]);
    }

    public function updateConfigs(Request $request): RedirectResponse
    {
        $request->validate([
            'configs'                              => 'required|array',
            'configs.*.severity'                   => 'required|in:low,moderate,high,critical',
            'configs.*.stage'                      => 'required|in:pending_to_verified,verified_to_assigned,assigned_to_resolved',
            'configs.*.threshold_minutes'          => 'required|integer|min:1|max:9999',
            'configs.*.warning_pct'                => 'required|integer|min:1|max:99',
            'configs.*.critical_pct'               => 'required|integer|min:101|max:999',
        ]);

        foreach ($request->configs as $item) {
            ReportSlaConfig::updateOrCreate(
                ['severity' => $item['severity'], 'stage' => $item['stage']],
                [
                    'threshold_minutes'      => $item['threshold_minutes'],
                    'warning_pct'            => $item['warning_pct'],
                    'critical_pct'           => $item['critical_pct'],
                ]
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'SLA thresholds updated.']);

        return back();
    }

    public function toggleEnabled(): RedirectResponse
    {
        $current = Setting::getValue('sla_enabled');
        Setting::setValue('sla_enabled', $current ? '0' : '1');

        $label = $current ? 'disabled' : 'enabled';
        Inertia::flash('toast', ['type' => 'success', 'message' => "SLA monitoring {$label}."]);

        return back();
    }
}
