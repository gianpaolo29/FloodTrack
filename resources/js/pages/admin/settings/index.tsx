import { Head, useForm } from '@inertiajs/react';
import {
    Bell,
    Check,
    Database,
    Globe,
    Info,
    Save,
    Settings as SettingsIcon,
    X,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { swalSuccess } from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    // Flatten all settings into a single key-value map for the form
    const initialData: Record<string, string> = {};
    for (const group of Object.values(settings)) {
        for (const [key, entry] of Object.entries(group)) {
            initialData[key] = String(entry.value === true ? '1' : entry.value === false ? '0' : entry.value);
        }
    }

    const form = useForm({ settings: initialData });

    const get = (key: string) => form.data.settings[key] ?? '';
    const set = (key: string, value: string) => {
        form.setData('settings', { ...form.data.settings, [key]: value });
    };
    const getBool = (key: string) => get(key) === '1' || get(key) === 'true';
    const toggleBool = (key: string) => set(key, getBool(key) ? '0' : '1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/settings', {
            onSuccess: () => swalSuccess('Settings saved'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings — FloodTrack Admin" />

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6 p-6 lg:p-8">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                            <p className="text-sm text-muted-foreground">
                                System configuration and platform information.
                            </p>
                        </div>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.isDirty}
                            className="gap-1.5"
                        >
                            <Save className="size-4" />
                            {form.processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>

                    {form.isDirty && (
                        <div className="rounded-2xl border border-amber-200/60 bg-amber-50 shadow-sm px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
                            You have unsaved changes.
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">

                        {/* General */}
                        <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
                            <CardHeader className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Globe className="size-4" />
                                    General
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 p-0">
                                <SettingInput
                                    title="System Name"
                                    description="The name displayed across the platform"
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
                                    description="Map center latitude"
                                    value={get('default_latitude')}
                                    onChange={(v) => set('default_latitude', v)}
                                    type="number"
                                />
                                <SettingInput
                                    title="Default Longitude"
                                    description="Map center longitude"
                                    value={get('default_longitude')}
                                    onChange={(v) => set('default_longitude', v)}
                                    type="number"
                                />
                            </CardContent>
                        </Card>

                        {/* Notifications */}
                        <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
                            <CardHeader className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Bell className="size-4" />
                                    Notifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 p-0">
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
                                    description="Push notification for critical severity reports"
                                    enabled={getBool('notify_on_critical')}
                                    onToggle={() => toggleBool('notify_on_critical')}
                                />
                            </CardContent>
                        </Card>

                        {/* Data Retention */}
                        <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
                            <CardHeader className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Database className="size-4" />
                                    Data & Storage
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 p-0">
                                <SettingInput
                                    title="Report Retention (days)"
                                    description="0 = keep forever, or number of days to retain resolved reports"
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
                                        { value: 's3', label: 'Amazon S3' },
                                        { value: 'gcs', label: 'Google Cloud Storage' },
                                    ]}
                                />
                                <SettingInput
                                    title="Max Upload Size (MB)"
                                    description="Maximum file size for evidence uploads"
                                    value={get('max_upload_size_mb')}
                                    onChange={(v) => set('max_upload_size_mb', v)}
                                    type="number"
                                />
                            </CardContent>
                        </Card>

                        {/* About (read-only) */}
                        <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
                            <CardHeader className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Info className="size-3.5" />
                                    About
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 p-0">
                                <AboutRow label="Version" value="1.0.0" />
                                <AboutRow label="Framework" value="Laravel 13" />
                                <AboutRow label="Frontend" value="React 19 + Inertia.js" />
                                <AboutRow label="Database" value="MySQL / SQLite" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bottom save bar */}
                    {form.isDirty && (
                        <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-neutral-200/60 bg-white px-6 py-4 shadow-lg dark:border-neutral-700/60 dark:bg-neutral-900">
                            <span className="text-sm text-muted-foreground">Unsaved changes</span>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.reset()}
                            >
                                Discard
                            </Button>
                            <Button type="submit" disabled={form.processing} className="gap-1.5">
                                <Save className="size-4" />
                                Save Changes
                            </Button>
                        </div>
                    )}
                </div>
            </form>
        </AppLayout>
    );
}

/* ─── Setting Components ─── */

function SettingInput({
    title,
    description,
    value,
    onChange,
    type = 'text',
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
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-48 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 text-sm text-right outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
            />
        </div>
    );
}

function SettingSelect({
    title,
    description,
    value,
    onChange,
    options,
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
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-48 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 text-sm text-right outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

function SettingToggle({
    title,
    description,
    enabled,
    onToggle,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 ${
                    enabled ? 'bg-sky-500' : 'bg-muted-foreground/20'
                }`}
            >
                <span
                    className={`inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );
}

function AboutRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between px-6 py-3.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold">{value}</span>
        </div>
    );
}
