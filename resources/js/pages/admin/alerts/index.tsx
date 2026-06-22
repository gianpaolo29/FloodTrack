import { Head, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
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

const TYPE_COLORS: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    advisory: 'bg-blue-100 text-blue-800',
    update:   'bg-gray-100 text-gray-700',
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

            <div className="flex flex-col gap-6 p-6">
                <div className="grid gap-6 lg:grid-cols-5">

                    {/* Create form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Publish new alert</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submit} className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            value={form.data.title}
                                            onChange={(e) => form.setData('title', e.target.value)}
                                            placeholder="e.g. Flood advisory — Brgy. Reparo"
                                            required
                                        />
                                        {form.errors.title && (
                                            <p className="text-xs text-destructive">{form.errors.title}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="body">Message</Label>
                                        <textarea
                                            id="body"
                                            value={form.data.body}
                                            onChange={(e) => form.setData('body', e.target.value)}
                                            rows={4}
                                            placeholder="Alert details visible to all app users…"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                            required
                                        />
                                        {form.errors.body && (
                                            <p className="text-xs text-destructive">{form.errors.body}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="type">Type</Label>
                                        <select
                                            id="type"
                                            value={form.data.type}
                                            onChange={(e) => form.setData('type', e.target.value as typeof form.data.type)}
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value="advisory">Advisory</option>
                                            <option value="update">Update</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="expires_at">Expires at (optional)</Label>
                                        <Input
                                            id="expires_at"
                                            type="datetime-local"
                                            value={form.data.expires_at}
                                            onChange={(e) => form.setData('expires_at', e.target.value)}
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={form.data.is_critical}
                                            onChange={(e) => form.setData('is_critical', e.target.checked)}
                                            className="rounded border-input"
                                        />
                                        Pin as critical (shown at top of app)
                                    </label>

                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="w-full"
                                    >
                                        {form.processing ? 'Publishing…' : 'Publish alert'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alert list */}
                    <div className="lg:col-span-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Published alerts
                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                        ({alerts.total})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {alerts.data.map((alert) => (
                                        <AlertRow key={alert.id} alert={alert} />
                                    ))}
                                    {alerts.data.length === 0 && (
                                        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                                            No alerts published yet.
                                        </p>
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
        <div className="flex items-start gap-3 px-5 py-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[alert.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {alert.type}
                    </span>
                    {alert.is_critical && (
                        <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-red-600 text-white">
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
                <p className="mt-1 text-sm font-medium">{alert.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{alert.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">by {alert.creator?.name ?? 'Admin'}</p>
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
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={deleteForm.processing}
                >
                    <Trash2 className="size-4" />
                </Button>
            </form>
        </div>
    );
}
