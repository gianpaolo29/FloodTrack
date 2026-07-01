import { Head } from '@inertiajs/react';
import { Check, Info, X } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Settings', href: '/admin/settings' },
];

export default function AdminSettings() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings — FloodTrack Admin" />

            <div className="flex flex-col gap-8 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        System configuration and platform information.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">General</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col divide-y divide-border/50 p-0">
                            <SettingRow
                                title="System name"
                                description="The name displayed across the platform"
                                value="FloodTrack"
                            />
                            <SettingRow
                                title="Default region"
                                description="Default map center for new sessions"
                                value="Philippines"
                            />
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">Notifications</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col divide-y divide-border/50 p-0">
                            <SettingRow
                                title="Email notifications"
                                description="Send email on critical reports"
                            >
                                <StatusBadge enabled />
                            </SettingRow>
                            <SettingRow
                                title="Auto-assign responders"
                                description="Automatically assign nearest responder"
                            >
                                <StatusBadge enabled={false} />
                            </SettingRow>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">Data Retention</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col divide-y divide-border/50 p-0">
                            <SettingRow
                                title="Report retention"
                                description="How long resolved reports are kept"
                                value="Indefinite"
                            />
                            <SettingRow
                                title="Media storage"
                                description="Where uploaded evidence is stored"
                                value="Local disk"
                            />
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                <Info className="size-3.5" />
                                About
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col divide-y divide-border/50 p-0">
                            <AboutRow label="Version" value="1.0.0" />
                            <AboutRow label="Framework" value="Laravel 13" />
                            <AboutRow label="Frontend" value="React 19 + Inertia.js" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function SettingRow({
    title,
    description,
    value,
    children,
}: {
    title: string;
    description: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {children ?? (
                <span className="text-sm font-medium text-muted-foreground shrink-0 ml-4">{value}</span>
            )}
        </div>
    );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
    return enabled ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
            <Check className="size-3" />
            Enabled
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-500/10">
            <X className="size-3" />
            Disabled
        </span>
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
