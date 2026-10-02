import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    Bot,
    CheckCircle2,
    Clock,
    Globe,
    Moon,
    Save,
    Shield,
    Sun,
    Sunset,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { useLocale } from '@/hooks/use-locale';
import { swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Severity, SlaConfig, SlaStage } from '@/types/admin';
import { SLA_STAGE_LABELS } from '@/types/admin';
import { SettingsSkeleton } from '@/components/admin/skeletons';

interface SettingEntry {
    value: string | boolean | number;
    type: 'string' | 'boolean' | 'integer';
}

interface Props {
    settings: Record<string, Record<string, SettingEntry>>;
    sla_configs: Record<Severity, Record<SlaStage, SlaConfig>>;
    sla_enabled: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Settings', href: '/admin/settings' },
];

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low'];
const STAGES: SlaStage[] = ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved'];
const SEV_COLORS: Record<Severity, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high:     'text-orange-600 dark:text-orange-400',
    moderate: 'text-amber-600 dark:text-amber-400',
    low:      'text-emerald-600 dark:text-emerald-400',
};
const SEV_DOT: Record<Severity, string> = {
    critical: 'bg-red-500',
    high:     'bg-orange-500',
    moderate: 'bg-amber-500',
    low:      'bg-emerald-500',
};

export default function AdminSettings({ settings, sla_configs, sla_enabled }: Props) {
    const { t } = useLocale();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const initialData: Record<string, string> = {};
    for (const group of Object.values(settings)) {
        for (const [key, entry] of Object.entries(group)) {
            initialData[key] = String(entry.value === true ? '1' : entry.value === false ? '0' : entry.value);
        }
    }

    const form = useForm({ settings: initialData });

    const get       = (key: string)            => form.data.settings[key] ?? '';
    const set       = (key: string, v: string) => form.setData('settings', { ...form.data.settings, [key]: v });
    const getBool   = (key: string)            => get(key) === '1' || get(key) === 'true';
    const toggleBool = (key: string)           => set(key, getBool(key) ? '0' : '1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/settings', {
            preserveState: false,
            onSuccess: () => swalSuccess('Settings saved'),
        });
    };

    // SLA config form
    const buildSlaConfigs = () => {
        const items: { severity: Severity; stage: SlaStage; threshold_minutes: number; warning_pct: number; critical_pct: number }[] = [];
        for (const sev of SEVERITIES) {
            for (const stage of STAGES) {
                const c = sla_configs[sev]?.[stage];
                items.push({
                    severity: sev, stage,
                    threshold_minutes: c?.threshold_minutes ?? 60,
                    warning_pct: c?.warning_pct ?? 80,
                    critical_pct: c?.critical_pct ?? 150,
                });
            }
        }
        return items;
    };

    const slaForm = useForm({ configs: buildSlaConfigs() });

    const slaGet = (sev: Severity, stage: SlaStage) =>
        slaForm.data.configs.find(c => c.severity === sev && c.stage === stage)!;

    const slaUpdate = (sev: Severity, stage: SlaStage, value: number) => {
        slaForm.setData('configs', slaForm.data.configs.map(c =>
            c.severity === sev && c.stage === stage ? { ...c, threshold_minutes: value } : c
        ));
    };

    const handleSlaSave = (e: React.FormEvent) => {
        e.preventDefault();
        slaForm.put('/admin/sla/configs', {
            preserveState: false,
            onSuccess: () => swalSuccess('SLA thresholds saved'),
        });
    };

    const handleSlaToggle = () => {
        router.post('/admin/sla/toggle', {}, { preserveState: false });
    };

    if (!mounted) return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings" />
            <SettingsSkeleton />
        </AppLayout>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings" />

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">

                    {/* ─── Header ─── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{t('settings.title')}</h1>
                            <p className="mt-0.5 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                                System configuration and platform settings.
                            </p>
                        </div>
                        {form.isDirty && (
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.97] disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                <Save className="size-3" />
                                {form.processing ? 'Saving…' : 'Save Changes'}
                            </button>
                        )}
                    </div>

                    {/* ─── Row 1: General + Notifications ─── */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <SettingsCard icon={Globe} title="General" sub="Platform identity and map defaults">
                            <SettingInput title="System Name" description="Name displayed across the platform" value={get('system_name')} onChange={(v) => set('system_name', v)} />
                            <SettingInput title="Default Region" description="Default map center label" value={get('default_region')} onChange={(v) => set('default_region', v)} />
                            <SettingInput title="Default Latitude" description="Map center latitude" value={get('default_latitude')} onChange={(v) => set('default_latitude', v)} type="number" />
                            <SettingInput title="Default Longitude" description="Map center longitude" value={get('default_longitude')} onChange={(v) => set('default_longitude', v)} type="number" />
                        </SettingsCard>

                        <SettingsCard icon={Bell} title="Notifications" sub="Alert behaviour and push settings">
                            <SettingToggle title="Notify on Critical" description="Push notification for critical reports" enabled={getBool('notify_on_critical')} onToggle={() => toggleBool('notify_on_critical')} />
                            <SettingToggle title="SLA Breach Notifications" description="Push alerts when reports breach SLA" enabled={getBool('sla_notifications_enabled')} onToggle={() => toggleBool('sla_notifications_enabled')} />
                            <SettingToggle title="Occupancy Alerts" description="Alert when evac centers near capacity" enabled={getBool('occupancy_notifications_enabled')} onToggle={() => toggleBool('occupancy_notifications_enabled')} />
                            <SettingInput title="Occupancy Threshold" description="% to trigger occupancy alerts" value={get('occupancy_alert_threshold')} onChange={(v) => set('occupancy_alert_threshold', v)} type="number" />
                        </SettingsCard>
                    </div>

                    {/* ─── Row 2: AI + Responder Schedule ─── */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <SettingsCard icon={Bot} title="AI & Automation" sub="Control AI-powered report analysis">
                            <SettingToggle title="AI Report Analysis" description="Automatically verify reports using AI. When off, all reports go to admin." enabled={getBool('ai_report_analysis')} onToggle={() => toggleBool('ai_report_analysis')} />
                        </SettingsCard>

                        <SettingsCard icon={Shield} title="Responder Schedule" sub="Shift rotation and alert levels">
                            <div className="px-4 py-3">
                                <p className="text-[10px] font-medium text-neutral-900 dark:text-neutral-100">Alert Level</p>
                                <p className="mb-3 text-[9px] text-neutral-400">Operational status for all teams.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => set('schedule_level', 'white')}
                                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${get('schedule_level') !== 'red' ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}`}>
                                        <Clock className={`size-3.5 ${get('schedule_level') !== 'red' ? 'text-blue-500' : 'text-neutral-400'}`} />
                                        <div className="text-left">
                                            <p className={`text-[10px] font-bold ${get('schedule_level') !== 'red' ? 'text-blue-700 dark:text-blue-400' : 'text-neutral-600 dark:text-neutral-300'}`}>White</p>
                                            <p className="text-[8px] text-neutral-400">Normal</p>
                                        </div>
                                    </button>
                                    <button type="button" onClick={() => set('schedule_level', 'red')}
                                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${get('schedule_level') === 'red' ? 'border-red-500 bg-red-50/50 dark:border-red-400 dark:bg-red-950/20' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}`}>
                                        <AlertTriangle className={`size-3.5 ${get('schedule_level') === 'red' ? 'text-red-500' : 'text-neutral-400'}`} />
                                        <div className="text-left">
                                            <p className={`text-[10px] font-bold ${get('schedule_level') === 'red' ? 'text-red-700 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-300'}`}>Red</p>
                                            <p className="text-[8px] text-neutral-400">Emergency 24/7</p>
                                        </div>
                                    </button>
                                </div>
                                {get('schedule_level') === 'red' ? (
                                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/40 dark:bg-red-950/20">
                                        <AlertTriangle className="mt-0.5 size-3 shrink-0 text-red-500" />
                                        <p className="text-[9px] text-red-600/80 dark:text-red-400/70">All teams on active duty until lowered.</p>
                                    </div>
                                ) : (
                                    <div className="mt-2 flex flex-col gap-1">
                                        {[
                                            { icon: Sun, label: 'A', time: '7AM–3PM', color: 'text-amber-500' },
                                            { icon: Sunset, label: 'B', time: '3PM–11PM', color: 'text-orange-500' },
                                            { icon: Moon, label: 'C', time: '11PM–7AM', color: 'text-indigo-500' },
                                        ].map(s => (
                                            <div key={s.label} className="flex items-center gap-2 rounded-md bg-neutral-50/60 px-3 py-1.5 dark:bg-neutral-800/40">
                                                <s.icon className={`size-3 shrink-0 ${s.color}`} />
                                                <span className="text-[10px] font-semibold text-neutral-900 dark:text-neutral-100">Shift {s.label}</span>
                                                <span className="text-[9px] text-neutral-400">{s.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </SettingsCard>
                    </div>

                    {/* ─── Row 3: SLA Rules (full width) ─── */}
                    <SettingsCard icon={Clock} title="SLA Rules" sub="Response time thresholds per severity">
                        <div className="px-4 py-3">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-medium text-neutral-900 dark:text-neutral-100">SLA Monitoring</p>
                                    <p className="text-[9px] text-neutral-400">Track and enforce response time limits</p>
                                </div>
                                <button type="button" onClick={handleSlaToggle}
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold transition-all ${sla_enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                                    {sla_enabled ? <CheckCircle2 className="size-2.5" /> : <Clock className="size-2.5" />}
                                    {sla_enabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>

                            <form onSubmit={handleSlaSave}>
                                <div className="overflow-x-auto rounded-md border border-neutral-200/60 dark:border-neutral-700/60">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                                <th className="px-3 py-1.5 text-left text-[7px] font-bold uppercase tracking-[0.1em] text-neutral-400">Severity</th>
                                                {STAGES.map(s => (
                                                    <th key={s} className="px-2 py-1.5 text-center text-[7px] font-bold uppercase tracking-[0.1em] text-neutral-400">{SLA_STAGE_LABELS[s]}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                            {SEVERITIES.map(sev => (
                                                <tr key={sev}>
                                                    <td className="px-3 py-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`size-1.5 rounded-full ${SEV_DOT[sev]}`} />
                                                            <span className={`text-[9px] font-bold uppercase ${SEV_COLORS[sev]}`}>{sev}</span>
                                                        </div>
                                                    </td>
                                                    {STAGES.map(stage => (
                                                        <td key={stage} className="px-2 py-1.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <input
                                                                    type="number" min={1} max={9999}
                                                                    value={slaGet(sev, stage).threshold_minutes}
                                                                    onChange={e => slaUpdate(sev, stage, parseInt(e.target.value) || 1)}
                                                                    className="w-12 rounded border border-neutral-200 bg-neutral-50/50 px-1 py-0.5 text-center text-[9px] font-medium tabular-nums outline-none transition-all focus:border-neutral-400 focus:ring-1 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                                                />
                                                                <span className="text-[7px] text-neutral-400">min</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-[8px] text-neutral-400">Exceeding limits triggers breach notifications and auto-escalation</p>
                                    {slaForm.isDirty && (
                                        <button type="submit" disabled={slaForm.processing}
                                            className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-[9px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                                            <Save className="size-2.5" />
                                            {slaForm.processing ? 'Saving...' : 'Save Thresholds'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </SettingsCard>

                </div>
            </form>
        </AppLayout>
    );
}

/* ─── Settings Card ─── */

function SettingsCard({
    icon: Icon, grad, title, sub, children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    grad?: string;
    title: string;
    sub: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 dark:bg-white">
                    <Icon className="size-3.5 text-white dark:text-neutral-900" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
                    <p className="text-[11px] text-neutral-400">{sub}</p>
                </div>
            </div>
            <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {children}
            </div>
        </div>
    );
}

/* ─── Setting Row Components ─── */

const inputCls =
    'h-9 w-full shrink-0 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 text-sm text-right outline-none transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-500/10 sm:w-44 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-neutral-500 dark:focus:bg-neutral-800';

function SettingInput({
    title, description, value, onChange, type = 'text',
}: {
    title: string;
    description: string;
    value: string;
    onChange: (v: string) => void;
    type?: 'text' | 'number';
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="text-xs text-neutral-400">{description}</p>
            </div>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputCls}
            />
        </div>
    );
}

function SettingToggle({
    title, description, enabled, onToggle,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="text-xs text-neutral-400">{description}</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                role="switch"
                aria-checked={enabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:ring-offset-2 ${
                    enabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
            >
                <span
                    className={`inline-block size-[18px] transform rounded-full shadow ring-0 transition-transform duration-200 ${
                        enabled ? 'translate-x-[22px] bg-white dark:bg-neutral-900' : 'translate-x-[3px] bg-white'
                    }`}
                />
            </button>
        </div>
    );
}
