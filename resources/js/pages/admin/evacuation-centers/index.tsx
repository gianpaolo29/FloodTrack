import { Head, router, useForm } from '@inertiajs/react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Building2,
    ChevronDown,
    Crosshair,
    MapPin,
    Pencil,
    Plus,
    Power,
    Save,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { EvacuationCenter, EvacuationCenterType } from '@/types/admin';
import { EVACUATION_CENTER_TYPE_LABELS } from '@/types/admin';

/* ─── Paginated wrapper ─── */

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Filters {
    search?: string;
    type?: string;
    active?: string;
}

interface Props {
    centers: Paginated<EvacuationCenter>;
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Evacuation Centers', href: '/admin/evacuation-centers' },
];

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:bg-neutral-800 dark:focus:ring-sky-500/20';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

const TYPE_OPTIONS: EvacuationCenterType[] = ['gymnasium', 'school', 'barangay_hall', 'church', 'community_center'];

const TYPE_COLORS: Record<EvacuationCenterType, string> = {
    gymnasium:        'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-500/20',
    school:           'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10 dark:bg-purple-950/40 dark:text-purple-400 dark:ring-purple-500/20',
    barangay_hall:    'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/20',
    church:           'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-500/20',
    community_center: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10 dark:bg-teal-950/40 dark:text-teal-400 dark:ring-teal-500/20',
};

/* ─── Main Component ─── */

export default function AdminEvacuationCentersIndex({ centers, filters }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);

    const allOnPageSelected = centers.data.length > 0 && centers.data.every((c) => selected.includes(c.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !centers.data.some((c) => c.id === id)));
        } else {
            setSelected([...new Set([...selected, ...centers.data.map((c) => c.id)])]);
        }
    };
    const toggleOne = (id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const filter = useCallback(
        (key: string, value: string) => {
            router.get('/admin/evacuation-centers', { ...filters, [key]: value || undefined }, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const hasFilters = !!(filters.search || filters.type || filters.active);

    const runBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected evacuation center(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post(
            '/admin/evacuation-centers/bulk',
            { ids: selected, action },
            {
                preserveState: true,
                onFinish: () => {
                    setBulkProcessing(false);
                    setSelected([]);
                },
                onSuccess: () => swalSuccess('Done', `${selected.length} evacuation center(s) ${action}d.`),
            },
        );
    };

    const activeCount = centers.data.filter((c) => c.is_active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evacuation Centers" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Evacuation Centers</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Manage evacuation centers visible on the map for residents.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Center
                    </button>
                </div>

                {/* Stats pills */}
                <div className="flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/60 bg-white px-4 py-2 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <Building2 className="size-4 text-neutral-500" />
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{centers.total}</span>
                        <span className="text-xs text-neutral-500">total</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                        <Power className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">active</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200/60 bg-white px-5 py-3 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or address..."
                            defaultValue={filters.search ?? ''}
                            className="pl-9 rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-sm placeholder:text-muted-foreground/50 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    filter('search', (e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                    </div>
                    <select
                        value={filters.type ?? ''}
                        onChange={(e) => filter('type', e.target.value)}
                        className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                    >
                        <option value="">All types</option>
                        {TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{EVACUATION_CENTER_TYPE_LABELS[t]}</option>
                        ))}
                    </select>
                    <select
                        value={filters.active ?? ''}
                        onChange={(e) => filter('active', e.target.value)}
                        className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                    >
                        <option value="">All status</option>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                    {hasFilters && (
                        <button
                            onClick={() => router.get('/admin/evacuation-centers')}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                        >
                            <X className="size-3.5" />
                            Clear
                        </button>
                    )}
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

                {/* Center list */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center justify-between border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                <Building2 className="size-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Evacuation Centers</h2>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                    {centers.total}
                                </span>
                            </div>
                        </div>
                        {centers.data.length > 0 && (
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
                        {centers.data.map((center) => (
                            <CenterRow
                                key={center.id}
                                center={center}
                                isSelected={selected.includes(center.id)}
                                onToggle={() => toggleOne(center.id)}
                                onEdit={() => setEditingCenter(center)}
                            />
                        ))}
                        {centers.data.length === 0 && (
                            <div className="flex flex-col items-center gap-3 py-20">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <Building2 className="size-6 text-neutral-400 dark:text-neutral-500" />
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No evacuation centers found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {centers.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Page {centers.current_page} of {centers.last_page}
                        </span>
                        <div className="flex gap-1">
                            {centers.links.map((link, i) =>
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
                    <CenterFormModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingCenter && (
                    <CenterFormModal center={editingCenter} onClose={() => setEditingCenter(null)} />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Center Row ─── */

function CenterRow({
    center,
    isSelected,
    onToggle,
    onEdit,
}: {
    center: EvacuationCenter;
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[center.type]}`}>
                        <Building2 className="size-3" />
                        {EVACUATION_CENTER_TYPE_LABELS[center.type]}
                    </span>
                    {center.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-500/10 dark:bg-neutral-800 dark:text-neutral-400">
                            Inactive
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/10 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-500/20">
                        <Users className="size-3" />
                        {center.capacity} capacity
                    </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{center.name}</p>
                {center.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <MapPin className="size-3" />
                        {center.address}
                    </p>
                )}
                <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(center.created_at).toLocaleString('en-PH')}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={() =>
                        router.post(`/admin/evacuation-centers/${center.id}/toggle`, {}, { preserveState: true })
                    }
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    title={center.is_active ? 'Deactivate' : 'Activate'}
                >
                    <Power className="size-3.5" />
                </button>
                <button
                    onClick={onEdit}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    title="Edit center"
                >
                    <Pencil className="size-3.5" />
                </button>
                <button
                    onClick={async () => {
                        const confirmed = await swalDelete('this evacuation center');
                        if (confirmed)
                            deleteForm.delete(`/admin/evacuation-centers/${center.id}`, {
                                onSuccess: () => swalSuccess('Deleted', 'Evacuation center has been removed.'),
                            });
                    }}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Delete center"
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>
        </div>
    );
}

/* ─── Create / Edit Modal ─── */

function CenterFormModal({ center, onClose }: { center?: EvacuationCenter; onClose: () => void }) {
    const isEditing = !!center;

    const form = useForm({
        name: center?.name ?? '',
        address: center?.address ?? '',
        type: (center?.type ?? 'gymnasium') as EvacuationCenterType,
        capacity: center?.capacity?.toString() ?? '',
        latitude: center?.latitude?.toString() ?? '',
        longitude: center?.longitude?.toString() ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEditing) {
            form.put(`/admin/evacuation-centers/${center!.id}`, {
                onSuccess: () => {
                    onClose();
                    swalSuccess('Updated', 'Evacuation center has been updated.');
                },
            });
        } else {
            form.post('/admin/evacuation-centers', {
                onSuccess: () => {
                    form.reset();
                    onClose();
                    swalSuccess('Created', 'Evacuation center has been created.');
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
                        <Building2 className="size-4.5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            {isEditing ? 'Edit Evacuation Center' : 'Add Evacuation Center'}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEditing ? 'Update center details' : 'This center will appear on the map for residents'}
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
                    {/* Name */}
                    <FormField label="Name" error={form.errors.name}>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="e.g. Nasugbu Municipal Gymnasium"
                            className={inputClass}
                            required
                        />
                    </FormField>

                    {/* Type */}
                    <FormField label="Type" error={form.errors.type}>
                        <div className="relative">
                            <select
                                value={form.data.type}
                                onChange={(e) => form.setData('type', e.target.value as EvacuationCenterType)}
                                className={`${inputClass} appearance-none pr-10`}
                                required
                            >
                                {TYPE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                        {EVACUATION_CENTER_TYPE_LABELS[t]}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        </div>
                    </FormField>

                    {/* Capacity */}
                    <FormField label="Capacity (persons)" error={form.errors.capacity}>
                        <input
                            type="number"
                            value={form.data.capacity}
                            onChange={(e) => form.setData('capacity', e.target.value)}
                            placeholder="e.g. 500"
                            min="1"
                            className={inputClass}
                            required
                        />
                    </FormField>

                    {/* Address */}
                    <FormField label="Address" error={form.errors.address}>
                        <input
                            type="text"
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                            placeholder="e.g. Brgy. Poblacion, Nasugbu, Batangas"
                            className={inputClass}
                            required
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
                                        const confirmed = await swalDelete('this evacuation center');
                                        if (confirmed)
                                            router.delete(`/admin/evacuation-centers/${center!.id}`, {
                                                onSuccess: () => {
                                                    onClose();
                                                    swalSuccess('Deleted', 'Evacuation center has been removed.');
                                                },
                                            });
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                    <Trash2 className="size-3.5" /> Delete center
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
                                {form.processing ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Center'}
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
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Click on the map to place the evacuation center</p>
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
