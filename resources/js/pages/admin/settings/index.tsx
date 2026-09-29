import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    Bot,
    Clock,
    Globe,
    Moon,
    Save,
    Shield,
    Sun,
    Sunset,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { useLocale } from '@/hooks/use-locale';
import { swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

interface SettingEntry {
    value: string | boolean | number;
    type: 'string' | 'boolean' | 'integer';
}

interface Props {
    settings: Record<string, Record<string, SettingEntry>>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Settings', href: '/admin/settings' },
];

export default function AdminSettings({ settings }: Props) {
    const { t } = useLocale();
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings" />

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6 lg:p-8">

                    {/* ─── Header ─── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{t('settings.title')}</h1>
                            <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                System configuration and platform information.
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing || !form.isDirty}
                            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            <Save className="size-4" />
                            {form.processing ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>

                    {/* Dirty banner */}
                    {form.isDirty && (
                        <div className="rounded-xl border border-neutral-200/60 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 dark:border-neutral-700/40 dark:bg-neutral-800/50 dark:text-neutral-200">
                            You have unsaved changes.
                        </div>
                    )}

                    {/* ─── Grid ─── */}
                    <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">

                        {/* General */}
                        <SettingsCard
                            icon={Globe}
                            grad="from-neutral-800 to-neutral-900"
                            title="General"
                            sub="Platform identity and map defaults"
                        >
                            <SettingInput
                                title="System Name"
                                description="Name displayed across the platform"
                                value={get('system_name')}
                                onChange={(v) => set('system_name', v)}
                            />
                            <SettingInput
                                title="Default Region"
                                description="Default map center label"
                                value={get('default_region')}
                                onChange={(v) => set('default_region', v)}
                            />
                            <SettingInput
                                title="Default Latitude"
                                description="Map center latitude coordinate"
                                value={get('default_latitude')}
                                onChange={(v) => set('default_latitude', v)}
                                type="number"
                            />
                            <SettingInput
                                title="Default Longitude"
                                description="Map center longitude coordinate"
                                value={get('default_longitude')}
                                onChange={(v) => set('default_longitude', v)}
                                type="number"
                            />
                        </SettingsCard>

                        {/* Notifications */}
                        <SettingsCard
                            icon={Bell}
                            grad="from-neutral-800 to-neutral-900"
                            title="Notifications"
                            sub="Alert behaviour and push notification settings"
                        >
                            <SettingToggle
                                title="Notify on Critical"
                                description="Push notification for critical reports"
                                enabled={getBool('notify_on_critical')}
                                onToggle={() => toggleBool('notify_on_critical')}
                            />
                            <SettingToggle
                                title="SLA Breach Notifications"
                                description="Push alerts when reports breach SLA thresholds"
                                enabled={getBool('sla_notifications_enabled')}
                                onToggle={() => toggleBool('sla_notifications_enabled')}
                            />
                            <SettingToggle
                                title="Occupancy Alerts"
                                description="Alert when evacuation centers approach capacity"
                                enabled={getBool('occupancy_notifications_enabled')}
                                onToggle={() => toggleBool('occupancy_notifications_enabled')}
                            />
                            <SettingInput
                                title="Occupancy Alert Threshold"
                                description="Percentage at which to trigger occupancy alerts"
                                value={get('occupancy_alert_threshold')}
                                onChange={(v) => set('occupancy_alert_threshold', v)}
                                type="number"
                            />
                        </SettingsCard>

                        {/* AI & Automation */}
                        <SettingsCard
                            icon={Bot}
                            grad="from-neutral-800 to-neutral-900"
                            title="AI & Automation"
                            sub="Control AI-powered report analysis"
                        >
                            <SettingToggle
                                title="AI Report Analysis"
                                description="Automatically verify reports using AI. When off, all reports go to admin for manual review."
                                enabled={getBool('ai_report_analysis')}
                                onToggle={() => toggleBool('ai_report_analysis')}
                            />
                        </SettingsCard>

                        {/* Responder Schedule */}
                        <SettingsCard
                            icon={Shield}
                            grad="from-neutral-800 to-neutral-900"
                            title="Responder Schedule"
                            sub="Manage shift rotation and emergency alert levels"
                        >
                            {/* Alert Level */}
                            <div className="px-6 py-5">
                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Alert Level</p>
                                <p className="mb-4 text-xs text-neutral-400">Set the current operational status for all responder teams.</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => set('schedule_level', 'white')}
                                        className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                                            get('schedule_level') !== 'red'
                                                ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20'
                                                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                                        }`}
                                    >
                                        <div className={`flex size-10 items-center justify-center rounded-xl ${
                                            get('schedule_level') !== 'red'
                                                ? 'bg-blue-500 shadow-sm shadow-blue-500/30'
                                                : 'bg-neutral-200 dark:bg-neutral-700'
                                        }`}>
                                            <Clock className={`size-5 ${get('schedule_level') !== 'red' ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`} />
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${get('schedule_level') !== 'red' ? 'text-blue-700 dark:text-blue-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                                White
                                            </p>
                                            <p className="text-[11px] text-neutral-400">Normal Operations</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => set('schedule_level', 'red')}
                                        className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                                            get('schedule_level') === 'red'
                                                ? 'border-red-500 bg-red-50/50 dark:border-red-400 dark:bg-red-950/20'
                                                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                                        }`}
                                    >
                                        <div className={`flex size-10 items-center justify-center rounded-xl ${
                                            get('schedule_level') === 'red'
                                                ? 'bg-red-500 shadow-sm shadow-red-500/30'
                                                : 'bg-neutral-200 dark:bg-neutral-700'
                                        }`}>
                                            <AlertTriangle className={`size-5 ${get('schedule_level') === 'red' ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`} />
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${get('schedule_level') === 'red' ? 'text-red-700 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                                Red
                                            </p>
                                            <p className="text-[11px] text-neutral-400">Emergency 24/7</p>
                                        </div>
                                    </button>
                                </div>

                                {/* Status info */}
                                {get('schedule_level') === 'red' ? (
                                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-950/20">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">All Units Assembled</p>
                                            <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70">
                                                24-hour deployment — all responder teams are on active duty until the alert level is lowered. Use during typhoons, floods, or declared emergencies.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Shift Rotation</p>
                                        {[
                                            { icon: Sun,    label: 'Shift A', time: '7:00 AM – 3:00 PM',  color: 'text-amber-500' },
                                            { icon: Sunset, label: 'Shift B', time: '3:00 PM – 11:00 PM', color: 'text-orange-500' },
                                            { icon: Moon,   label: 'Shift C', time: '11:00 PM – 7:00 AM', color: 'text-indigo-500' },
                                        ].map(shift => (
                                            <div key={shift.label} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                                                <shift.icon className={`size-4 shrink-0 ${shift.color}`} />
                                                <div className="flex-1">
                                                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shift.label}</span>
                                                    <span className="ml-2 text-xs text-neutral-400">{shift.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </SettingsCard>

                    </div>

                    {/* ─── Sticky save bar ─── */}
                    {form.isDirty && (
                        <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-neutral-200/60 bg-white/90 px-6 py-4 shadow-lg backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-900/90">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">Unsaved changes</span>
                            <button
                                type="button"
                                onClick={() => form.reset()}
                                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                <Save className="size-4" />
                                {form.processing ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    )}
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
        <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
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
