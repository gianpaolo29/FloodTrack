<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\ScheduleController;
use App\Jobs\AnalyzeReportJob;
use App\Models\EvacuationCenter;
use App\Models\OccupancyLog;
use App\Models\Report;
use App\Models\ReportSlaConfig;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\ScheduleLevelChanged;
use App\Services\AutoAssignService;
use App\Services\ExpoPushService;
use App\Services\SocketService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/settings/index', [
            'settings'    => Setting::allGrouped(),
            'sla_configs' => ReportSlaConfig::allGroupedBySeverity(),
            'sla_enabled' => (bool) Setting::getValue('sla_enabled'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:500',
        ]);

        // Capture old values before saving
        $oldScheduleLevel = Setting::getValue('schedule_level', 'white');
        $oldAiAnalysis = Setting::getValue('ai_report_analysis', true);
        $oldAutoAssign = Setting::getValue('auto_assign', false);

        foreach ($request->settings as $key => $value) {
            $setting = Setting::where('key', $key)->first();

            if (! $setting) {
                continue;
            }

            // Convert frontend values to proper storage format
            $storeValue = match ($setting->type) {
                'boolean' => in_array($value, ['1', 'true', true], true) ? '1' : '0',
                'integer' => (string) max(0, (int) $value),
                default   => (string) $value,
            };

            $setting->update(['value' => $storeValue]);
        }

        // If AI analysis was just turned ON, analyze all pending reports
        $newAiAnalysis = Setting::getValue('ai_report_analysis', true);
        if (!$oldAiAnalysis && $newAiAnalysis) {
            $this->dispatchPendingReportAnalysis();
        }

        // If auto-assign was just turned ON, assign all verified high/critical reports
        $newAutoAssign = Setting::getValue('auto_assign', false);
        if (!$oldAutoAssign && $newAutoAssign) {
            $this->autoAssignVerifiedReports($request->user());
        }

        // If schedule level changed, notify all responders
        $newScheduleLevel = $request->settings['schedule_level'] ?? null;

        if ($newScheduleLevel && $newScheduleLevel !== $oldScheduleLevel) {
            $this->handleScheduleChange($newScheduleLevel);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Settings saved.']);

        return back();
    }

    private function autoAssignVerifiedReports(?User $assignedBy): void
    {
        Report::where('status', 'verified')
            ->whereIn('severity', ['high', 'critical'])
            ->whereNull('assigned_team_id')
            ->get()
            ->each(fn (Report $report) => AutoAssignService::attemptAssign($report, $assignedBy));
    }

    private function dispatchPendingReportAnalysis(): void
    {
        Report::where('status', 'pending')
            ->whereNull('ai_image_verified')
            ->pluck('id')
            ->each(fn (int $id) => AnalyzeReportJob::dispatch($id));
    }

    public function resetOccupancy(Request $request): RedirectResponse
    {
        $centers = EvacuationCenter::where('current_occupancy', '>', 0)->get();

        foreach ($centers as $center) {
            OccupancyLog::create([
                'evacuation_center_id' => $center->id,
                'previous_occupancy'   => $center->current_occupancy,
                'new_occupancy'        => 0,
                'changed_by'           => $request->user()->id,
                'change_type'          => 'bulk_update',
                'notes'                => 'Evacuation reset — all occupancy cleared via settings.',
            ]);

            SocketService::toAll('evacuation-updated', [
                'id'                => $center->id,
                'name'              => $center->name,
                'current_occupancy' => 0,
                'capacity'          => $center->capacity,
                'occupancy_pct'     => 0,
            ]);
        }

        EvacuationCenter::where('current_occupancy', '>', 0)->update(['current_occupancy' => 0]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Occupancy reset for {$centers->count()} evacuation center(s)."]);

        return back();
    }

    private function handleScheduleChange(string $newLevel): void
    {
        // Sync duty flags immediately so map counts update in real-time
        Artisan::call('duty:sync');

        // Unassign active missions from teams that are now off-duty
        AutoAssignService::unassignOffDutyMissions();

        $currentShift = ScheduleController::currentShift();

        // 1. Notify each responder individually — not residents
        $responders = User::where('role', 'responder')->get();
        $responderIds = $responders->pluck('id')->toArray();

        // 2. Create database notification for each responder (appears in alerts tab)
        Notification::send($responders, new ScheduleLevelChanged($newLevel, $currentShift));

        // 3. Emit per-user socket events so responder app updates instantly
        foreach ($responderIds as $uid) {
            SocketService::toUser($uid, 'schedule-updated', [
                'level'         => $newLevel,
                'current_shift' => $currentShift,
            ]);
            SocketService::toUser($uid, 'new-notification', [
                'id'   => 'schedule_' . now()->timestamp,
                'type' => 'schedule_change',
            ]);
        }

        // Also notify admin dashboard
        SocketService::emit('admin:responders', 'schedule-updated', [
            'level'         => $newLevel,
            'current_shift' => $currentShift,
        ]);

        // 4. Send push notifications
        if ($newLevel === 'red') {
            ExpoPushService::sendToUsers(
                $responderIds,
                '🔴 RED ALERT — All Units Report for Duty',
                'Emergency declared. All responder teams must report for 24-hour duty immediately. Shifts are suspended until further notice.',
                [
                    'type'      => 'schedule_change',
                    'level'     => 'red',
                    'channelId' => 'floodtrack-critical',
                ],
            );
        } else {
            ExpoPushService::sendToUsers(
                $responderIds,
                'Alert Level Lowered — Normal Operations',
                "Emergency over. Resume regular shift rotation. Current active shift: Shift {$currentShift}.",
                [
                    'type'      => 'schedule_change',
                    'level'     => 'white',
                    'channelId' => 'floodtrack-updates',
                ],
            );
        }
    }
}
