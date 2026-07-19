import { Head, useForm } from '@inertiajs/react';
import {
    Bell,
    Database,
    Globe,
    Info,
    Save,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
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
            onSuccess: () => swalSuccess('Settings saved'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings" />

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                    {/* ─── Header ─── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Settings</h1>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                System configuration and platform information.
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing || !form.isDirty}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save className="size-4" />
                            {form.processing ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>

                    {/* Dirty banner */}
                    {form.isDirty && (
                        <div className="rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
                            You have unsaved changes.
                        </div>
                    )}

                    {/* ─── Grid ─── */}
                    <div className="grid gap-5 lg:grid-cols-2">

                        {/* General */}
                        <SettingsCard
                            icon={Globe}
                            grad="from-sky-500 to-blue-600"
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
                            grad="from-amber-500 to-orange-600"
                            title="Notifications"
                            sub="Alert and dispatch behaviour"
                        >
                            <SettingToggle
                                title="Email Notifications"
                                description="Send email on critical reports"
                                enabled={getBool('email_notifications')}
                                onToggle={() => toggleBool('email_notifications')}
                            />
                            <SettingToggle
                                title="Auto-assign Responders"
                                description="Automatically assign nearest responder"
                                enabled={getBool('auto_assign')}
                                onToggle={() => toggleBool('auto_assign')}
                            />
                            <SettingToggle
                                title="Notify on Critical"
                                description="Push notification for critical reports"
                                enabled={getBool('notify_on_critical')}
                                onToggle={() => toggleBool('notify_on_critical')}
                            />
                        </SettingsCard>

                        {/* Data & Storage */}
                        <SettingsCard
                            icon={Database}
                            grad="from-violet-500 to-indigo-600"
                            title="Data & Storage"
                            sub="Retention policies and file storage"
                        >
                            <SettingInput
                                title="Report Retention (days)"
                                description="0 = keep forever"
                                value={get('report_retention_days')}
                                onChange={(v) => set('report_retention_days', v)}
                                type="number"
                            />
                            <SettingSelect
                                title="Media Storage"
                                description="Where uploaded evidence is stored"
                                value={get('media_storage')}
                                onChange={(v) => set('media_storage', v)}
                                options={[
                                    { value: 'local', label: 'Local Disk' },
                                    { value: 's3',    label: 'Amazon S3' },
                                    { value: 'gcs',   label: 'Google Cloud Storage' },
                                ]}
                            />
                            <SettingInput
                                title="Max Upload Size (MB)"
                                description="Maximum file size for evidence"
                                value={get('max_upload_size_mb')}
                                onChange={(v) => set('max_upload_size_mb', v)}
                                type="number"
                            />
                        </SettingsCard>

                        {/* About */}
                        <SettingsCard
                            icon={Info}
                            grad="from-neutral-400 to-neutral-600"
                            title="About"
                            sub="Platform build information"
                        >
                            <AboutRow label="Version"   value="1.0.0" />
                            <AboutRow label="Framework" value="Laravel 13" />
                            <AboutRow label="Frontend"  value="React 19 + Inertia.js" />
                            <AboutRow label="Database"  value="MySQL / SQLite" />
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
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
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
    grad: string;
    title: string;
    sub: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                <div className={`flex size-8 items-center justify-center rounded-xl bg-gradient-to-br ${grad} shadow-sm`}>
                    <Icon className="size-3.5 text-white" />
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
    'h-9 w-full shrink-0 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 text-sm text-right outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 sm:w-44 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-sky-500 dark:focus:bg-neutral-800';

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

function SettingSelect({
    title, description, value, onChange, options,
}: {
    title: string;
    description: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="text-xs text-neutral-400">{description}</p>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputCls}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:ring-offset-2 ${
                    enabled ? 'bg-sky-500' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
            >
                <span
                    className={`inline-block size-[18px] transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                        enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
                    }`}
                />
            </button>
        </div>
    );
}

function AboutRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between px-6 py-3.5">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{value}</span>
        </div>
    );
}
