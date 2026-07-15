import { Head, router, useForm } from '@inertiajs/react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Car,
    ChevronDown,
    Crosshair,
    Droplets,
    MapPin,
    Pencil,
    Plus,
    Power,
    Save,
    ShieldAlert,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Hazard, HazardCategory, Severity } from '@/types/admin';
import { HAZARD_CATEGORY_LABELS, HAZARD_TYPE_OPTIONS, SEVERITY_COLORS } from '@/types/admin';

/* ─── Paginated wrapper ─── */

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    hazards: Paginated<Hazard>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Hazards', href: '/admin/hazards' },
];

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:bg-neutral-800 dark:focus:ring-sky-500/20';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

const CATEGORY_ICON: Record<HazardCategory, typeof Droplets> = {
    flood: Droplets,
    road: Car,
};

const CATEGORY_COLORS: Record<HazardCategory, string> = {
    flood: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-500/20',
    road: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10 dark:bg-orange-950/40 dark:text-orange-400 dark:ring-orange-500/20',
};

function getTypeLabel(category: HazardCategory, type: string): string {
    return HAZARD_TYPE_OPTIONS[category]?.find((t) => t.value === type)?.label ?? type;
}

/* ─── Main Component ─── */

export default function AdminHazardsIndex({ hazards }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingHazard, setEditingHazard] = useState<Hazard | null>(null);

    const allOnPageSelected = hazards.data.length > 0 && hazards.data.every((h) => selected.includes(h.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !hazards.data.some((h) => h.id === id)));
        } else {
            setSelected([...new Set([...selected, ...hazards.data.map((h) => h.id)])]);
        }
    };
    const toggleOne = (id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const runBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected hazard(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post(
            '/admin/hazards/bulk',
            { ids: selected, action },
            {
                preserveState: true,
                onFinish: () => {
                    setBulkProcessing(false);
                    setSelected([]);
                },
                onSuccess: () => swalSuccess('Done', `${selected.length} hazard(s) ${action}d.`),
            },
        );
    };

    const activeCount = hazards.data.filter((h) => h.active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hazards" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Hazard Management</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Create and manage flood & road hazards visible on the map.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Hazard
                    </button>
                </div>

                {/* Stats pills */}
                <div className="flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/60 bg-white px-4 py-2 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <ShieldAlert className="size-4 text-neutral-500" />
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{hazards.total}</span>
                        <span className="text-xs text-neutral-500">total</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                        <Power className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">active</span>
                    </div>
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
                                    onClick={() => runBulkAction('activate')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                                >
                                    <Power className="size-3.5" /> Activate
                                </button>
                                <button
                                    onClick={() => runBulkAction('deactivate')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400"
                                >
                                    <Power className="size-3.5" /> Deactivate
                                </button>
                                <button
                                    onClick={() => runBulkAction('delete')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <div className="ml-auto">
                                    <button
                                        onClick={() => setSelected([])}
                                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hazard list */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center justify-between border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                <ShieldAlert className="size-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Hazards</h2>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                    {hazards.total}
                                </span>
                            </div>
                        </div>
                        {hazards.data.length > 0 && (
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
                        {hazards.data.map((hazard) => (
                            <HazardRow
                                key={hazard.id}
                                hazard={hazard}
                                isSelected={selected.includes(hazard.id)}
                                onToggle={() => toggleOne(hazard.id)}
                                onEdit={() => setEditingHazard(hazard)}
                            />
                        ))}
                        {hazards.data.length === 0 && (
                            <div className="flex flex-col items-center gap-3 py-20">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <ShieldAlert className="size-6 text-neutral-400 dark:text-neutral-500" />
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No hazards created yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {hazards.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Page {hazards.current_page} of {hazards.last_page}
                        </span>
                        <div className="flex gap-1">
                            {hazards.links.map((link, i) =>
                                link.url ? (
                                    <a
                                        key={i}
                                        href={link.url}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.get(link.url!);
                                        }}
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
                    <HazardFormModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingHazard && (
                    <HazardFormModal hazard={editingHazard} onClose={() => setEditingHazard(null)} />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Hazard Row ─── */

function HazardRow({
    hazard,
    isSelected,
    onToggle,
    onEdit,
}: {
    hazard: Hazard;
    isSelected: boolean;
    onToggle: () => void;
    onEdit: () => void;
}) {
    const deleteForm = useForm({});
    const CatIcon = CATEGORY_ICON[hazard.category] ?? ShieldAlert;
    const typeLabel = getTypeLabel(hazard.category, hazard.type);

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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[hazard.category]}`}>
                        <CatIcon className="size-3" />
                        {HAZARD_CATEGORY_LABELS[hazard.category]}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SEVERITY_COLORS[hazard.severity]}`}>
                        {hazard.severity}
                    </span>
                    {hazard.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-500/10 dark:bg-neutral-800 dark:text-neutral-400">
                            Inactive
                        </span>
                    )}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{hazard.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{typeLabel}</p>
                {hazard.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <MapPin className="size-3" />
                        {hazard.address}
                    </p>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                    <span>{new Date(hazard.created_at).toLocaleString('en-PH')}</span>
                    {hazard.creator && <span>&middot; by {hazard.creator.name}</span>}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={() =>
                        router.post(`/admin/hazards/${hazard.id}/toggle`, {}, { preserveState: true })
                    }
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    title={hazard.active ? 'Deactivate' : 'Activate'}
                >
                    <Power className="size-3.5" />
                </button>
                <button
                    onClick={onEdit}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    title="Edit hazard"
                >
                    <Pencil className="size-3.5" />
                </button>
                <button
                    onClick={async () => {
                        const confirmed = await swalDelete('this hazard');
                        if (confirmed)
                            deleteForm.delete(`/admin/hazards/${hazard.id}`, {
                                onSuccess: () => swalSuccess('Deleted', 'Hazard has been removed.'),
                            });
                    }}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Delete hazard"
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>
        </div>
    );
}

/* ─── Create / Edit Modal ─── */

function HazardFormModal({ hazard, onClose }: { hazard?: Hazard; onClose: () => void }) {
    const isEditing = !!hazard;

    const form = useForm({
        category: (hazard?.category ?? 'flood') as HazardCategory,
        type: hazard?.type ?? '',
        severity: (hazard?.severity ?? 'moderate') as Severity,
        title: hazard?.title ?? '',
        description: hazard?.description ?? '',
        latitude: hazard?.latitude?.toString() ?? '',
        longitude: hazard?.longitude?.toString() ?? '',
        address: hazard?.address ?? '',
    });

    const currentTypes = HAZARD_TYPE_OPTIONS[form.data.category] ?? [];

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEditing) {
            form.put(`/admin/hazards/${hazard!.id}`, {
                onSuccess: () => {
                    onClose();
                    swalSuccess('Updated', 'Hazard has been updated.');
                },
            });
        } else {
            form.post('/admin/hazards', {
                onSuccess: () => {
                    form.reset();
                    onClose();
                    swalSuccess('Created', 'Hazard has been created and is now visible on the map.');
                },
            });
        }
    }

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
                        <ShieldAlert className="size-4.5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            {isEditing ? 'Edit Hazard' : 'Create New Hazard'}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEditing ? 'Update hazard details' : 'This hazard will appear on the map for all users'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-5">
                    {/* Category */}
                    <FormField label="Category" error={form.errors.category}>
                        <div className="grid grid-cols-2 gap-3">
                            {(['flood', 'road'] as const).map((cat) => {
                                const CatIcon = CATEGORY_ICON[cat];
                                const active = form.data.category === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => {
                                            form.setData('category', cat);
                                            form.setData('type', '');
                                        }}
                                        className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                                            active
                                                ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/30 dark:text-sky-300'
                                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600'
                                        }`}
                                    >
                                        <CatIcon className="size-4" />
                                        {HAZARD_CATEGORY_LABELS[cat]}
                                    </button>
                                );
                            })}
                        </div>
                    </FormField>

                    {/* Type */}
                    <FormField label="Hazard Type" error={form.errors.type}>
                        <div className="relative">
                            <select
                                value={form.data.type}
                                onChange={(e) => {
                                    form.setData('type', e.target.value);
                                    if (!isEditing && e.target.value) {
                                        const label = currentTypes.find((t) => t.value === e.target.value)?.label;
                                        if (label) form.setData('title', label);
                                    }
                                }}
                                className={`${inputClass} appearance-none pr-10`}
                                required
                            >
                                <option value="">Select type...</option>
                                {currentTypes.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        </div>
                    </FormField>

                    {/* Severity */}
                    <FormField label="Severity" error={form.errors.severity}>
                        <div className="grid grid-cols-4 gap-2">
                            {(['low', 'moderate', 'high', 'critical'] as const).map((sev) => {
                                const active = form.data.severity === sev;
                                return (
                                    <button
                                        key={sev}
                                        type="button"
                                        onClick={() => form.setData('severity', sev)}
                                        className={`rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition-all ${
                                            active
                                                ? `${SEVERITY_COLORS[sev]} border-transparent`
                                                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                                        }`}
                                    >
                                        {sev}
                                    </button>
                                );
                            })}
                        </div>
                    </FormField>

                    {/* Title */}
                    <FormField label="Title" error={form.errors.title}>
                        <input
                            type="text"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder="e.g. Flash Flood — Brgy. Pantalan"
                            className={inputClass}
                            required
                        />
                    </FormField>

                    {/* Description */}
                    <FormField label="Description" error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={3}
                            placeholder="Optional details about the hazard..."
                            className={`${inputClass} resize-none`}
                        />
                    </FormField>

                    {/* Location — Map Picker */}
                    <FormField label="Location" error={form.errors.latitude || form.errors.longitude}>
                        <MapPicker
                            latitude={form.data.latitude}
                            longitude={form.data.longitude}
                            address={form.data.address}
                            onChange={(lat, lng, addr) => {
                                form.setData('latitude', lat);
                                form.setData('longitude', lng);
                                if (addr) form.setData('address', addr);
                            }}
                        />
                    </FormField>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-neutral-200/60 pt-4 dark:border-neutral-700/60">
                        <div>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const confirmed = await swalDelete('this hazard');
                                        if (confirmed)
                                            router.delete(`/admin/hazards/${hazard!.id}`, {
                                                onSuccess: () => {
                                                    onClose();
                                                    swalSuccess('Deleted', 'Hazard has been removed.');
                                                },
                                            });
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                    <Trash2 className="size-3.5" /> Delete hazard
                                </button>
                            )}
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
                                disabled={form.processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                            >
                                {isEditing ? <Save className="size-4" /> : <Plus className="size-4" />}
                                {form.processing ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Hazard'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Map Picker ─── */

const MAP_DEFAULT = { lat: 14.0771, lng: 120.6361 };
const MAP_CONTAINER = { width: '100%', height: '240px', borderRadius: '12px' };
const MAP_OPTIONS: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
};

function MapPicker({
    latitude,
    longitude,
    address,
    onChange,
}: {
    latitude: string;
    longitude: string;
    address: string;
    onChange: (lat: string, lng: string, address?: string) => void;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [resolving, setResolving] = useState(false);
    const [displayAddress, setDisplayAddress] = useState(address || '');

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const hasPin = !isNaN(lat) && !isNaN(lng);
    const center = hasPin ? { lat, lng } : MAP_DEFAULT;

    const reverseGeocode = useCallback(
        (latVal: number, lngVal: number) => {
            const geocoder = new google.maps.Geocoder();
            setResolving(true);
            geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
                setResolving(false);
                if (status === 'OK' && results && results.length > 0) {
                    const addr = results[0].formatted_address;
                    setDisplayAddress(addr);
                    onChange(latVal.toFixed(7), lngVal.toFixed(7), addr);
                } else {
                    setDisplayAddress('');
                    onChange(latVal.toFixed(7), lngVal.toFixed(7));
                }
            });
        },
        [onChange],
    );

    const handleMapEvent = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                reverseGeocode(e.latLng.lat(), e.latLng.lng());
            }
        },
        [reverseGeocode],
    );

    if (!isLoaded) {
        return (
            <div className="flex h-[260px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="text-sm text-neutral-400">Loading map...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                <GoogleMap
                    mapContainerStyle={MAP_CONTAINER}
                    center={center}
                    zoom={hasPin ? 16 : 13}
                    options={MAP_OPTIONS}
                    onClick={handleMapEvent}
                >
                    {hasPin && (
                        <MarkerF
                            position={{ lat, lng }}
                            draggable
                            onDragEnd={handleMapEvent}
                        />
                    )}
                </GoogleMap>
            </div>

            {hasPin ? (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div className="min-w-0 flex-1">
                            {resolving ? (
                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Resolving address...</p>
                            ) : displayAddress ? (
                                <p className="text-sm font-medium leading-snug text-emerald-800 dark:text-emerald-200">{displayAddress}</p>
                            ) : (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Address not available</p>
                            )}
                        </div>
                    </div>
                    <p className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                        <Crosshair className="size-3" />
                        Click or drag the pin to change location
                    </p>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-3 py-2.5 dark:border-neutral-600 dark:bg-neutral-800/30">
                    <Crosshair className="size-4 text-sky-500" />
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Click on the map to place the hazard</p>
                </div>
            )}
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
