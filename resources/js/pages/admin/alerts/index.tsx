import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, ChevronLeft, ChevronRight, Megaphone, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { swalDelete, swalSuccess } from '@/lib/swal';
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
    critical: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/20',
    advisory: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-500/20',
    update:   'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-600/20',
};

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:bg-neutral-800 dark:focus:ring-sky-500/20';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

export default function AdminAlertsIndex({ alerts }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

    const form = useForm({
        title: '',
        body: '',
        type: 'advisory' as 'advisory' | 'update' | 'critical',
        is_critical: false,
        expires_at: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/admin/alerts', {
            onSuccess: () => {
                form.reset();
                setShowCreateModal(false);
                swalSuccess('Alert Published', 'The alert has been published successfully.');
            },
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
        setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const runBulkDelete = async () => {
        if (selected.length === 0) return;
        const confirmed = await swalDelete(`${selected.length} selected alert(s)`);
        if (!confirmed) return;
        setBulkProcessing(true);
        router.post(
            '/admin/alerts/bulk',
            { ids: selected, action: 'delete' },
            {
                preserveState: true,
                onFinish: () => {
                    setBulkProcessing(false);
                    setSelected([]);
                },
                onSuccess: () => swalSuccess('Deleted', 'Selected alerts have been deleted.'),
            },
        );
    };

    const criticalCount = alerts.data.filter((a) => a.type === 'critical' || a.is_critical).length;
    const pinnedCount   = alerts.data.filter((a) => a.is_critical).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alerts" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                            <Bell className="size-6 text-white" />
                            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-900">
                                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Alerts
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Publish advisories and critical notifications to all users
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:shadow-lg hover:shadow-amber-500/30 hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Publish Alert
                    </button>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                                <Bell className="size-4 text-amber-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{alerts.total}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">published alerts</p>
                    </div>
                    <div className="rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50 to-orange-50/60 p-5 shadow-sm dark:border-red-800/40 dark:from-red-950/30 dark:to-orange-950/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-500">Critical</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                                <AlertTriangle className="size-4 text-red-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-red-800 dark:text-red-300">{criticalCount}</p>
                        <p className="mt-1 text-xs text-red-600/70 dark:text-red-500/70">critical alerts</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Pinned</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <Megaphone className="size-4 text-neutral-400" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-700 dark:text-neutral-300">{pinnedCount}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">pinned at top</p>
                    </div>
                </div>

                {/* ── Bulk action bar ── */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.99 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/60 px-5 py-3.5 dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-4 w-px bg-amber-300/60 dark:bg-amber-700/60" />
                                <button
                                    onClick={runBulkDelete}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <button
                                    onClick={() => setSelected([])}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
                                >
                                    Clear selection
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Table Card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Mobile card view */}
                    <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                        {alerts.data.map((alert) => {
                            const published = new Date(alert.created_at);
                            const publishedStr = published.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const expires = alert.expires_at ? new Date(alert.expires_at) : null;
                            const expiresStr = expires ? expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

                            return (
                                <div key={alert.id} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                                alert.type === 'critical' ? 'bg-red-100 dark:bg-red-950/50' :
                                                alert.type === 'advisory' ? 'bg-blue-100 dark:bg-blue-950/50' :
                                                                            'bg-neutral-100 dark:bg-neutral-800'
                                            }`}>
                                                <Bell className={`size-3.5 ${
                                                    alert.type === 'critical' ? 'text-red-500' :
                                                    alert.type === 'advisory' ? 'text-blue-500' :
                                                                                'text-neutral-400'
                                                }`} />
                                            </div>
                                            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{alert.title}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                onClick={() => setEditingAlert(alert)}
                                                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                                            >
                                                <Pencil className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-400 line-clamp-2 dark:text-neutral-500">{alert.body}</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.update}`}>{alert.type}</span>
                                            {alert.is_critical && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Pinned</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                            <span>{publishedStr}</span>
                                            {expiresStr && <span> · exp {expiresStr}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-800/40">
                                    <th className="w-12 px-5 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500/20 dark:border-neutral-600"
                                        />
                                    </th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Alert</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Type</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Published</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Expires</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {alerts.data.map((alert) => (
                                    <AlertRow
                                        key={alert.id}
                                        alert={alert}
                                        isSelected={selected.includes(alert.id)}
                                        onToggle={() => toggleOne(alert.id)}
                                        onEdit={() => setEditingAlert(alert)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state */}
                    {alerts.data.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
                                <Bell className="size-8 text-amber-400 dark:text-amber-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No alerts published yet</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Publish your first alert to notify all users.</p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {alerts.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Page{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{alerts.current_page}</span>
                                {' '}of{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{alerts.last_page}</span>
                                <span className="ml-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="ml-2">{alerts.total} total</span>
                            </span>
                            <div className="flex items-center gap-1">
                                {alerts.links.map((link, i) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next')     || link.label.includes('&raquo;');
                                    if (isPrev || isNext) {
                                        return link.url ? (
                                            <button key={i} onClick={() => router.get(link.url!)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-amber-700/40 dark:hover:bg-amber-950/20 dark:hover:text-amber-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                        ) : (
                                            <span key={i} className="flex size-8 items-center justify-center rounded-lg opacity-30 text-neutral-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </span>
                                        );
                                    }
                                    return link.url ? (
                                        <button key={i} onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm'
                                                    : 'border border-neutral-200 text-neutral-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-amber-700/40 dark:hover:bg-amber-950/20'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span key={i} className="flex size-8 items-center justify-center rounded-lg text-xs opacity-30 text-neutral-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }} />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={modalSpring}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                        >
                            {/* Modal header */}
                            <div className="flex items-center gap-3 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                    <Megaphone className="size-4.5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Publish New Alert</h3>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Visible to all FloodTrack users</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="ml-auto rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            {/* Modal body */}
                            <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
                                <FormField label="Title" error={form.errors.title}>
                                    <input
                                        type="text"
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                        placeholder="e.g. Flood advisory — Brgy. Reparo"
                                        className={inputClass}
                                        required
                                    />
                                </FormField>

                                <FormField label="Message" error={form.errors.body}>
                                    <textarea
                                        value={form.data.body}
                                        onChange={(e) => form.setData('body', e.target.value)}
                                        rows={4}
                                        placeholder="Alert details visible to all app users..."
                                        className={`${inputClass} resize-none`}
                                        required
                                    />
                                </FormField>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField label="Type">
                                        <select
                                            value={form.data.type}
                                            onChange={(e) => form.setData('type', e.target.value as typeof form.data.type)}
                                            className={inputClass}
                                        >
                                            <option value="advisory">Advisory</option>
                                            <option value="update">Update</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </FormField>

                                    <FormField label="Expires at (optional)">
                                        <input
                                            type="datetime-local"
                                            value={form.data.expires_at}
                                            onChange={(e) => form.setData('expires_at', e.target.value)}
                                            className={inputClass}
                                        />
                                    </FormField>
                                </div>

                                <label className="flex items-center gap-2.5 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.data.is_critical}
                                        onChange={(e) => form.setData('is_critical', e.target.checked)}
                                        className="size-4 rounded border-neutral-300 accent-red-600 dark:border-neutral-600"
                                    />
                                    <span className="text-neutral-600 dark:text-neutral-400">Pin as critical (shown at top of app)</span>
                                </label>

                                {/* Modal footer */}
                                <div className="flex items-center justify-end gap-3 border-t border-neutral-200/60 pt-4 dark:border-neutral-700/60">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                                    >
                                        <Megaphone className="size-4" />
                                        {form.processing ? 'Publishing...' : 'Publish Alert'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingAlert && (
                    <EditModal
                        alert={editingAlert}
                        onClose={() => setEditingAlert(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Edit Modal ─── */

function EditModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
    const deleteForm = useForm({});
    const editForm = useForm({
        title: alert.title,
        body: alert.body,
        type: alert.type as 'advisory' | 'update' | 'critical',
        is_critical: alert.is_critical,
        expires_at: alert.expires_at ? new Date(alert.expires_at).toISOString().slice(0, 16) : '',
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(`/admin/alerts/${alert.id}`, {
            onSuccess: () => {
                onClose();
                swalSuccess('Alert Updated', 'Changes have been saved.');
            },
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={modalSpring}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                        <Pencil className="size-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Edit Alert</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Update alert details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="flex flex-col gap-4 px-6 py-5">
                    <FormField label="Title" error={editForm.errors.title}>
                        <input
                            type="text"
                            value={editForm.data.title}
                            onChange={(e) => editForm.setData('title', e.target.value)}
                            className={inputClass}
                            required
                        />
                    </FormField>

                    <FormField label="Message" error={editForm.errors.body}>
                        <textarea
                            value={editForm.data.body}
                            onChange={(e) => editForm.setData('body', e.target.value)}
                            rows={4}
                            className={`${inputClass} resize-none`}
                            required
                        />
                    </FormField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Type">
                            <select
                                value={editForm.data.type}
                                onChange={(e) => editForm.setData('type', e.target.value as typeof editForm.data.type)}
                                className={inputClass}
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
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    <label className="flex items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            checked={editForm.data.is_critical}
                            onChange={(e) => editForm.setData('is_critical', e.target.checked)}
                            className="size-4 rounded border-neutral-300 accent-red-600 dark:border-neutral-600"
                        />
                        <span className="text-neutral-600 dark:text-neutral-400">Pin as critical</span>
                    </label>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-neutral-200/60 pt-4 dark:border-neutral-700/60">
                        <div>
                            <button
                                type="button"
                                onClick={async () => {
                                    const confirmed = await swalDelete('this alert');
                                    if (confirmed) deleteForm.delete(`/admin/alerts/${alert.id}`, {
                                        onSuccess: () => swalSuccess('Deleted', 'Alert has been deleted.'),
                                    });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                                <Trash2 className="size-3.5" /> Delete alert
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editForm.processing || !editForm.isDirty}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                            >
                                <Save className="size-4" />
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Alert Row ─── */

function AlertRow({
    alert,
    isSelected,
    onToggle,
    onEdit,
}: {
    alert: Alert;
    isSelected: boolean;
    onToggle: () => void;
    onEdit: () => void;
}) {
    const deleteForm = useForm({});

    const published = new Date(alert.created_at);
    const publishedDate = published.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const publishedTime = published.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

    const expires = alert.expires_at ? new Date(alert.expires_at) : null;
    const expiresDate = expires
        ? expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <tr className={`group transition-colors ${
            isSelected
                ? 'bg-amber-50/60 dark:bg-amber-950/20'
                : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30'
        }`}>
            {/* Checkbox */}
            <td className="w-12 px-5 py-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    className="size-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500/20 dark:border-neutral-600"
                />
            </td>

            {/* Alert title + body preview */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        alert.type === 'critical' ? 'bg-red-100 dark:bg-red-950/50' :
                        alert.type === 'advisory' ? 'bg-blue-100 dark:bg-blue-950/50' :
                                                    'bg-neutral-100 dark:bg-neutral-800'
                    }`}>
                        <Bell className={`size-4 ${
                            alert.type === 'critical' ? 'text-red-500' :
                            alert.type === 'advisory' ? 'text-blue-500' :
                                                        'text-neutral-400'
                        }`} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{alert.title}</p>
                        <p className="mt-0.5 max-w-xs truncate text-xs text-neutral-400 dark:text-neutral-500">{alert.body}</p>
                    </div>
                </div>
            </td>

            {/* Type badge + optional PINNED pill */}
            <td className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.update}`}>
                        {alert.type}
                    </span>
                    {alert.is_critical && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                            Pinned
                        </span>
                    )}
                </div>
            </td>

            {/* Published */}
            <td className="whitespace-nowrap px-5 py-4">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{publishedDate}</p>
                <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{publishedTime}</p>
            </td>

            {/* Expires */}
            <td className="whitespace-nowrap px-5 py-4">
                {expiresDate ? (
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{expiresDate}</p>
                ) : (
                    <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                )}
            </td>

            {/* Actions */}
            <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={onEdit}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                        title="Edit alert"
                    >
                        <Pencil className="size-3.5" />
                    </button>
                    <button
                        onClick={async () => {
                            const confirmed = await swalDelete('this alert');
                            if (confirmed) deleteForm.delete(`/admin/alerts/${alert.id}`, {
                                onSuccess: () => swalSuccess('Deleted', 'Alert has been deleted.'),
                            });
                        }}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Delete alert"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ─── Form Field ─── */

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
