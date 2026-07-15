import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Megaphone, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
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
    critical: 'bg-red-50 text-red-700 ring-1 ring-red-600/10 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/20',
    advisory: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-500/20',
    update: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/10 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-600/20',
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alerts" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Alerts</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Publish advisories and critical notifications to all users.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Alert
                    </button>
                </div>

                {/* Bulk action bar */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-2xl border border-sky-200/60 bg-sky-50/80 px-5 py-3 dark:border-sky-800/40 dark:bg-sky-950/30"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">{selected.length} selected</span>
                                <div className="h-5 w-px bg-sky-200 dark:bg-sky-800" />
                                <button
                                    onClick={runBulkDelete}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <div className="ml-auto">
                                    <button
                                        onClick={() => {
                                            setSelected([]);
                                        }}
                                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Alert list card */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center justify-between border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                <Bell className="size-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Published Alerts</h2>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                    {alerts.total}
                                </span>
                            </div>
                        </div>
                        {alerts.data.length > 0 && (
                            <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <input
                                    type="checkbox"
                                    checked={allOnPageSelected}
                                    onChange={toggleAll}
                                    className="size-3.5 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
                                />
                                Select all
                            </label>
                        )}
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {alerts.data.map((alert) => (
                            <AlertRow
                                key={alert.id}
                                alert={alert}
                                isSelected={selected.includes(alert.id)}
                                onToggle={() => toggleOne(alert.id)}
                                onEdit={() => setEditingAlert(alert)}
                            />
                        ))}
                        {alerts.data.length === 0 && (
                            <div className="flex flex-col items-center gap-3 py-20">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <Bell className="size-6 text-neutral-400 dark:text-neutral-500" />
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No alerts published yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {alerts.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Page {alerts.current_page} of {alerts.last_page}
                        </span>
                        <div className="flex gap-1">
                            {alerts.links.map((link, i) =>
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                                                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded-lg px-3 py-1.5 text-xs opacity-30"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}
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

    return (
        <div
            className={`group flex items-start gap-4 px-6 py-4 transition-colors ${
                isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
            }`}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="mt-1 size-4 shrink-0 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
            />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.update}`}
                    >
                        {alert.type}
                    </span>
                    {alert.is_critical && (
                        <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                            PINNED
                        </span>
                    )}
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {new Date(alert.created_at).toLocaleString('en-PH')}
                    </span>
                    {alert.expires_at && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            &middot; expires {new Date(alert.expires_at).toLocaleString('en-PH')}
                        </span>
                    )}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{alert.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{alert.body}</p>
                <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">by {alert.creator?.name ?? 'Admin'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={onEdit}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
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
        </div>
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
