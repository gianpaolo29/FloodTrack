import { Head, useForm } from '@inertiajs/react';
import { Bell, Megaphone, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BreadcrumbItem } from '@/types';
import type { Alert } from '@/types/admin';

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    alerts: Paginated<Alert>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Alerts', href: '/admin/alerts' },
];

const TYPE_STYLES: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
    advisory: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    update:   'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10',
};

export default function AdminAlertsIndex({ alerts }: Props) {
    const form = useForm({
        title:       '',
        body:        '',
        type:        'advisory' as 'advisory' | 'update' | 'critical',
        is_critical: false,
        expires_at:  '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/admin/alerts', {
            onSuccess: () => form.reset(),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alerts — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
                    <p className="text-sm text-muted-foreground">
                        Publish advisories and critical notifications to all users.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-5">

                    {/* Create form */}
                    <div className="lg:col-span-2">
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Megaphone className="size-4" />
                                    Publish New Alert
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={submit} className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
                                        <Input
                                            id="title"
                                            value={form.data.title}
                                            onChange={(e) => form.setData('title', e.target.value)}
                                            placeholder="e.g. Flood advisory — Brgy. Reparo"
                                            className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                                            required
                                        />
                                        {form.errors.title && (
                                            <p className="text-xs text-destructive">{form.errors.title}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="body" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</Label>
                                        <textarea
                                            id="body"
                                            value={form.data.body}
                                            onChange={(e) => form.setData('body', e.target.value)}
                                            rows={4}
                                            placeholder="Alert details visible to all app users..."
                                            className="w-full rounded-lg border-transparent bg-muted/30 px-3 py-2 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                            required
                                        />
                                        {form.errors.body && (
                                            <p className="text-xs text-destructive">{form.errors.body}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                                        <select
                                            id="type"
                                            value={form.data.type}
                                            onChange={(e) => form.setData('type', e.target.value as typeof form.data.type)}
                                            className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value="advisory">Advisory</option>
                                            <option value="update">Update</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="expires_at" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expires at (optional)</Label>
                                        <Input
                                            id="expires_at"
                                            type="datetime-local"
                                            value={form.data.expires_at}
                                            onChange={(e) => form.setData('expires_at', e.target.value)}
                                            className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2.5 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={form.data.is_critical}
                                            onChange={(e) => form.setData('is_critical', e.target.checked)}
                                            className="size-4 rounded border-input accent-red-600"
                                        />
                                        <span className="text-muted-foreground">Pin as critical (shown at top of app)</span>
                                    </label>

                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="w-full shadow-sm"
                                    >
                                        {form.processing ? 'Publishing...' : 'Publish Alert'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alert list */}
                    <div className="lg:col-span-3">
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Bell className="size-4" />
                                    Published Alerts
                                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                        {alerts.total}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/50">
                                    {alerts.data.map((alert) => (
                                        <AlertRow key={alert.id} alert={alert} />
                                    ))}
                                    {alerts.data.length === 0 && (
                                        <div className="flex flex-col items-center gap-2 py-16">
                                            <Bell className="size-8 text-muted-foreground/40" />
                                            <p className="text-sm text-muted-foreground">No alerts published yet</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function AlertRow({ alert }: { alert: Alert }) {
    const deleteForm = useForm({});

    return (
        <div className="flex items-start gap-4 px-6 py-5 transition-colors hover:bg-muted/20">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.update}`}>
                        {alert.type}
                    </span>
                    {alert.is_critical && (
                        <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                            PINNED
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('en-PH')}
                    </span>
                    {alert.expires_at && (
                        <span className="text-xs text-muted-foreground">
                            · expires {new Date(alert.expires_at).toLocaleString('en-PH')}
                        </span>
                    )}
                </div>
                <p className="mt-1.5 text-sm font-semibold">{alert.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{alert.body}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">by {alert.creator?.name ?? 'Admin'}</p>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (confirm('Delete this alert?')) {
                        deleteForm.delete(`/admin/alerts/${alert.id}`);
                    }
                }}
            >
                <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-red-50 shrink-0 transition-colors"
                    disabled={deleteForm.processing}
                >
                    <Trash2 className="size-4" />
                </Button>
            </form>
        </div>
    );
}
