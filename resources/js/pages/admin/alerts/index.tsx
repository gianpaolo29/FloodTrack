import { Head, Link, router, useForm } from '@inertiajs/react';
import { Bell, Megaphone, Pencil, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
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
    per_page: number;
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
    const [selected, setSelected] = useState<number[]>([]);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);

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

    const allOnPageSelected = alerts.data.length > 0 && alerts.data.every((a) => selected.includes(a.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !alerts.data.some((a) => a.id === id)));
        } else {
            setSelected([...new Set([...selected, ...alerts.data.map((a) => a.id)])]);
        }
    };
    const toggleOne = (id: number) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const runBulkDelete = () => {
        if (selected.length === 0) return;
        if (!confirmBulkDelete) { setConfirmBulkDelete(true); return; }
        setBulkProcessing(true);
        router.post('/admin/alerts/bulk', { ids: selected, action: 'delete' }, {
            preserveState: true,
            onFinish: () => { setBulkProcessing(false); setSelected([]); setConfirmBulkDelete(false); },
        });
    };

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
                                    <FormField label="Title" error={form.errors.title}>
                                        <Input
                                            value={form.data.title}
                                            onChange={(e) => form.setData('title', e.target.value)}
                                            placeholder="e.g. Flood advisory — Brgy. Reparo"
                                            className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                                            required
                                        />
                                    </FormField>

                                    <FormField label="Message" error={form.errors.body}>
                                        <textarea
                                            value={form.data.body}
                                            onChange={(e) => form.setData('body', e.target.value)}
                                            rows={4}
                                            placeholder="Alert details visible to all app users..."
                                            className="w-full rounded-lg border-transparent bg-muted/30 px-3 py-2 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                            required
                                        />
                                    </FormField>

                                    <FormField label="Type">
                                        <select
                                            value={form.data.type}
                                            onChange={(e) => form.setData('type', e.target.value as typeof form.data.type)}
                                            className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value="advisory">Advisory</option>
                                            <option value="update">Update</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </FormField>

                                    <FormField label="Expires at (optional)">
                                        <Input
                                            type="datetime-local"
                                            value={form.data.expires_at}
                                            onChange={(e) => form.setData('expires_at', e.target.value)}
                                            className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                                        />
                                    </FormField>

                                    <label className="flex items-center gap-2.5 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={form.data.is_critical}
                                            onChange={(e) => form.setData('is_critical', e.target.checked)}
                                            className="size-4 rounded border-input accent-red-600"
                                        />
                                        <span className="text-muted-foreground">Pin as critical (shown at top of app)</span>
                                    </label>

                                    <Button type="submit" disabled={form.processing} className="w-full shadow-sm">
                                        {form.processing ? 'Publishing...' : 'Publish Alert'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alert list */}
                    <div className="lg:col-span-3 flex flex-col gap-4">

                        {/* Bulk action bar */}
                        {selected.length > 0 && (
                            <Card className="border-primary/20 bg-primary/5">
                                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                                    <span className="text-sm font-medium">{selected.length} selected</span>
                                    <div className="h-5 w-px bg-border" />
                                    {confirmBulkDelete ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-destructive">Are you sure?</span>
                                            <Button variant="destructive" size="sm" className="gap-1.5" onClick={runBulkDelete} disabled={bulkProcessing}>
                                                <Trash2 className="size-3.5" /> Confirm Delete
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setConfirmBulkDelete(false)}>Cancel</Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" size="sm" className="gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={runBulkDelete} disabled={bulkProcessing}>
                                            <Trash2 className="size-3.5" /> Delete
                                        </Button>
                                    )}
                                    <div className="ml-auto">
                                        <Button variant="ghost" size="sm" onClick={() => { setSelected([]); setConfirmBulkDelete(false); }} className="text-muted-foreground">
                                            Clear selection
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                    <Bell className="size-4" />
                                    Published Alerts
                                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                        {alerts.total}
                                    </span>
                                </CardTitle>
                                {alerts.data.length > 0 && (
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="size-3.5 rounded border-border text-primary focus:ring-primary/20" />
                                        Select all
                                    </label>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/50">
                                    {alerts.data.map((alert) => (
                                        <AlertRow
                                            key={alert.id}
                                            alert={alert}
                                            isSelected={selected.includes(alert.id)}
                                            onToggle={() => toggleOne(alert.id)}
                                        />
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

                        {/* Pagination */}
                        {alerts.last_page > 1 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Page {alerts.current_page} of {alerts.last_page}
                                </span>
                                <div className="flex gap-1">
                                    {alerts.links.map((link, i) => (
                                        link.url ? (
                                            <Link
                                                key={i}
                                                href={link.url}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    link.active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span key={i} className="rounded-lg px-3 py-1.5 text-xs opacity-30" dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── Alert Row with inline edit ─── */

function AlertRow({ alert, isSelected, onToggle }: { alert: Alert; isSelected: boolean; onToggle: () => void }) {
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const deleteForm = useForm({});
    const editForm = useForm({
        title: alert.title,
        body: alert.body,
        type: alert.type as 'advisory' | 'update' | 'critical',
        is_critical: alert.is_critical,
        expires_at: alert.expires_at ? new Date(alert.expires_at).toISOString().slice(0, 16) : '',
    });

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(`/admin/alerts/${alert.id}`, {
            onSuccess: () => setEditing(false),
        });
    };

    if (editing) {
        return (
            <div className="border-l-4 border-primary bg-primary/[0.02] px-6 py-5">
                <form onSubmit={handleEditSave} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Editing Alert</span>
                        <button type="button" onClick={() => { setEditing(false); editForm.reset(); }} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>

                    <FormField label="Title" error={editForm.errors.title}>
                        <input
                            type="text"
                            value={editForm.data.title}
                            onChange={(e) => editForm.setData('title', e.target.value)}
                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </FormField>

                    <FormField label="Message" error={editForm.errors.body}>
                        <textarea
                            value={editForm.data.body}
                            onChange={(e) => editForm.setData('body', e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            required
                        />
                    </FormField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Type">
                            <select
                                value={editForm.data.type}
                                onChange={(e) => editForm.setData('type', e.target.value as typeof editForm.data.type)}
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="advisory">Advisory</option>
                                <option value="update">Update</option>
                                <option value="critical">Critical</option>
                            </select>
                        </FormField>
                        <FormField label="Expires at">
                            <input
                                type="datetime-local"
                                value={editForm.data.expires_at}
                                onChange={(e) => editForm.setData('expires_at', e.target.value)}
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </FormField>
                    </div>

                    <label className="flex items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            checked={editForm.data.is_critical}
                            onChange={(e) => editForm.setData('is_critical', e.target.checked)}
                            className="size-4 rounded border-input accent-red-600"
                        />
                        <span className="text-muted-foreground">Pin as critical</span>
                    </label>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); editForm.reset(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="gap-1.5" disabled={editForm.processing || !editForm.isDirty}>
                            <Save className="size-3.5" /> Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className={`group flex items-start gap-4 px-6 py-5 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'}`}>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="mt-1 size-4 shrink-0 rounded border-border text-primary focus:ring-primary/20"
            />
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
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setEditing(true)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Edit alert"
                >
                    <Pencil className="size-3.5" />
                </button>
                {confirmDelete ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.preventDefault(); deleteForm.delete(`/admin/alerts/${alert.id}`); }}
                            className="rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground"
                            disabled={deleteForm.processing}
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete alert"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
