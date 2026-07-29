import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { swalSuccess } from '@/lib/swal';
import Heading from '@/components/heading';
import type { BreadcrumbItem } from '@/types';

interface NotificationPrefs {
    critical: boolean;
    advisory: boolean;
    my_reports: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Notification settings', href: '/settings/notifications' },
];

export default function Notifications() {
    const { auth } = usePage().props;
    const savedPrefs = (auth as any).user.notification_prefs as NotificationPrefs | null;

    const [prefs, setPrefs] = useState<NotificationPrefs>({
        critical: savedPrefs?.critical ?? true,
        advisory: savedPrefs?.advisory ?? true,
        my_reports: savedPrefs?.my_reports ?? true,
    });
    const [saving, setSaving] = useState(false);

    function toggle(key: keyof NotificationPrefs) {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);

        setSaving(true);

        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

        fetch('/api/user/notification-preferences', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            credentials: 'same-origin',
            body: JSON.stringify(updated),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed');
                swalSuccess('Preferences saved!', 'Your notification preferences have been updated.');
            })
            .catch(() => {
                setPrefs(prefs);
            })
            .finally(() => setSaving(false));
    }

    return (
        <>
            <Head title="Notification settings" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Notification settings"
                    description="Choose which push notifications you want to receive"
                />

                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                        <ToggleRow
                            title="Critical Alerts"
                            description="Receive push notifications for critical flood and emergency alerts"
                            enabled={prefs.critical}
                            onToggle={() => toggle('critical')}
                            disabled={saving}
                        />
                        <ToggleRow
                            title="Advisory Alerts"
                            description="Receive weather advisories and warning notifications"
                            enabled={prefs.advisory}
                            onToggle={() => toggle('advisory')}
                            disabled={saving}
                        />
                        <ToggleRow
                            title="My Reports"
                            description="Get notified about status updates on reports you submitted"
                            enabled={prefs.my_reports}
                            onToggle={() => toggle('my_reports')}
                            disabled={saving}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

Notifications.layout = { breadcrumbs };

function ToggleRow({
    title,
    description,
    enabled,
    onToggle,
    disabled,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
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
                disabled={disabled}
                role="switch"
                aria-checked={enabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
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
