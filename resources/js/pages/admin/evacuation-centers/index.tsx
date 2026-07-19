import { Head, router, useForm } from '@inertiajs/react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Building2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Church,
    Crosshair,
    GraduationCap,
    Landmark,
    MapPin,
    Pencil,
    Plus,
    Power,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
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

interface CenterStats {
    total: number;
    active: number;
    total_capacity: number;
    total_occupancy: number;
}

interface Props {
    centers: Paginated<EvacuationCenter>;
    filters: Filters;
    stats: CenterStats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Evacuation Centers', href: '/admin/evacuation-centers' },
];

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20';

const modalSpring = { type: 'spring' as const, stiffness: 380, damping: 30 };

const TYPE_OPTIONS: EvacuationCenterType[] = ['gymnasium', 'school', 'barangay_hall', 'church', 'community_center'];

const TYPE_COLORS: Record<EvacuationCenterType, string> = {
    gymnasium:        'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-700/40',
    school:           'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-700/40',
    barangay_hall:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-700/40',
    church:           'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-700/40',
    community_center: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-700/40',
};

const TYPE_DOT: Record<EvacuationCenterType, string> = {
    gymnasium:        'bg-blue-500',
    school:           'bg-violet-500',
    barangay_hall:    'bg-amber-500',
    church:           'bg-rose-500',
    community_center: 'bg-teal-500',
};

const TYPE_ICON: Record<EvacuationCenterType, React.ElementType> = {
    gymnasium:        Building2,
    school:           GraduationCap,
    barangay_hall:    Landmark,
    church:           Church,
    community_center: Users,
};

/* ─── Main Component ─── */

export default function AdminEvacuationCentersIndex({ centers, filters, stats }: Props) {
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

    const occupancyPct = stats.total_capacity > 0
        ? Math.round((stats.total_occupancy / stats.total_capacity) * 100)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evacuation Centers" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-blue-500/25">
                            <ShieldCheck className="size-6 text-white" />
                            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900">
                                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Evacuation Centers
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Manage centers visible on the resident map
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Center
                    </button>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {/* Total Centers */}
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/30">
                                <Building2 className="size-4 text-sky-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.total}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">registered centers</p>
                    </div>

                    {/* Active Centers */}
                    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-teal-950/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Active</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                                <span className="size-2.5 animate-pulse rounded-full bg-emerald-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300">{stats.active}</p>
                        <p className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-500/70">operational</p>
                    </div>

                    {/* Total Capacity */}
                    <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-sky-50/60 p-5 shadow-sm dark:border-blue-800/40 dark:from-blue-950/30 dark:to-sky-950/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-500">Capacity</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                                <Users className="size-4 text-blue-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-blue-800 dark:text-blue-300">{stats.total_capacity.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-500/70">total persons</p>
                    </div>

                    {/* Current Evacuees */}
                    <div className={`rounded-2xl border p-5 shadow-sm ${
                        occupancyPct >= 90
                            ? 'border-red-200/60 bg-gradient-to-br from-red-50 to-rose-50/60 dark:border-red-800/40 dark:from-red-950/30 dark:to-rose-950/20'
                            : occupancyPct >= 70
                            ? 'border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20'
                            : 'border-violet-200/60 bg-gradient-to-br from-violet-50 to-purple-50/60 dark:border-violet-800/40 dark:from-violet-950/30 dark:to-purple-950/20'
                    }`}>
                        <div className="flex items-center justify-between">
                            <p className={`text-xs font-semibold uppercase tracking-wider ${
                                occupancyPct >= 90 ? 'text-red-600 dark:text-red-500'
                                : occupancyPct >= 70 ? 'text-amber-600 dark:text-amber-500'
                                : 'text-violet-600 dark:text-violet-500'
                            }`}>Evacuees</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                occupancyPct >= 90 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                                : occupancyPct >= 70 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400'
                            }`}>{occupancyPct}%</span>
                        </div>
                        <p className={`mt-3 text-3xl font-bold tabular-nums ${
                            occupancyPct >= 90 ? 'text-red-800 dark:text-red-300'
                            : occupancyPct >= 70 ? 'text-amber-800 dark:text-amber-300'
                            : 'text-violet-800 dark:text-violet-300'
                        }`}>{stats.total_occupancy.toLocaleString()}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60 dark:bg-black/20">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    occupancyPct >= 90 ? 'bg-red-500'
                                    : occupancyPct >= 70 ? 'bg-amber-500'
                                    : 'bg-violet-500'
                                }`}
                                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                            />
                        </div>
                        <p className={`mt-1 text-xs ${
                            occupancyPct >= 90 ? 'text-red-600/70 dark:text-red-500/70'
                            : occupancyPct >= 70 ? 'text-amber-600/70 dark:text-amber-500/70'
                            : 'text-violet-600/70 dark:text-violet-500/70'
                        }`}>of {stats.total_capacity.toLocaleString()} capacity</p>
                    </div>
                </div>

                {/* ── Bulk Action Bar ── */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.99 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50 to-blue-50/60 px-5 py-3.5 dark:border-sky-800/40 dark:from-sky-950/30 dark:to-blue-950/20"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-4 w-px bg-sky-300/60 dark:bg-sky-700/60" />
                                <button
                                    onClick={() => runBulkAction('activate')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <Power className="size-3.5" /> Activate
                                </button>
                                <button
                                    onClick={() => runBulkAction('deactivate')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-amber-600 disabled:opacity-50"
                                >
                                    <Power className="size-3.5" /> Deactivate
                                </button>
                                <button
                                    onClick={() => runBulkAction('delete')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <button
                                    onClick={() => setSelected([])}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/40"
                                >
                                    Clear selection
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Table Card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                            <select
                                value={filters.type ?? ''}
                                onChange={(e) => filter('type', e.target.value)}
                                className="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                                <option value="">All types</option>
                                {TYPE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{EVACUATION_CENTER_TYPE_LABELS[t]}</option>
                                ))}
                            </select>
                            <select
                                value={filters.active ?? ''}
                                onChange={(e) => filter('active', e.target.value)}
                                className="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                                <option value="">All statuses</option>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search centers..."
                                    defaultValue={filters.search ?? ''}
                                    className="h-9 w-52 rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            filter('search', (e.target as HTMLInputElement).value);
                                        }
                                    }}
                                />
                            </div>
                            {hasFilters && (
                                <button
                                    onClick={() => router.get('/admin/evacuation-centers')}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-neutral-700 dark:hover:border-red-800/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    title="Clear filters"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile card view */}
                    <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                        {centers.data.map((center) => {
                            const TypeIcon = TYPE_ICON[center.type];
                            const current = center.current_occupancy ?? 0;
                            const capacity = center.capacity ?? 0;
                            return (
                                <div key={center.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                                        center.type === 'gymnasium'     ? 'bg-blue-100 dark:bg-blue-950/60' :
                                        center.type === 'school'        ? 'bg-violet-100 dark:bg-violet-950/60' :
                                        center.type === 'barangay_hall' ? 'bg-amber-100 dark:bg-amber-950/60' :
                                        center.type === 'church'        ? 'bg-rose-100 dark:bg-rose-950/60' :
                                                                          'bg-teal-100 dark:bg-teal-950/60'
                                    }`}>
                                        <TypeIcon className={`size-4 ${
                                            center.type === 'gymnasium'     ? 'text-blue-600 dark:text-blue-400' :
                                            center.type === 'school'        ? 'text-violet-600 dark:text-violet-400' :
                                            center.type === 'barangay_hall' ? 'text-amber-600 dark:text-amber-400' :
                                            center.type === 'church'        ? 'text-rose-600 dark:text-rose-400' :
                                                                              'text-teal-600 dark:text-teal-400'
                                        }`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{center.name}</p>
                                            {center.is_active ? (
                                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-700/40">
                                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Active
                                                </span>
                                            ) : (
                                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[center.type]}`}>
                                                <span className={`size-1.5 rounded-full ${TYPE_DOT[center.type]}`} />
                                                {EVACUATION_CENTER_TYPE_LABELS[center.type]}
                                            </span>
                                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{current}/{capacity}</span>
                                        </div>
                                        {center.address && (
                                            <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">{center.address}</p>
                                        )}
                                    </div>
                                    <button onClick={() => setEditingCenter(center)}
                                        className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400">
                                        <Pencil className="size-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-800/40">
                                    <th className="w-10 px-5 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
                                        />
                                    </th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Center</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Type</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Occupancy</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Location</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {centers.data.map((center) => (
                                    <CenterRow
                                        key={center.id}
                                        center={center}
                                        isSelected={selected.includes(center.id)}
                                        onToggle={() => toggleOne(center.id)}
                                        onEdit={() => setEditingCenter(center)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state */}
                    {centers.data.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20">
                                <Building2 className="size-8 text-sky-400 dark:text-sky-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No evacuation centers found</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your filters.' : 'Add your first evacuation center to get started.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {centers.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Page{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{centers.current_page}</span>
                                {' '}of{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{centers.last_page}</span>
                                <span className="ml-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="ml-2">{centers.total} total</span>
                            </span>
                            <div className="flex items-center gap-1">
                                {centers.links.map((link, i) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next') || link.label.includes('&raquo;');
                                    if (isPrev || isNext) {
                                        return link.url ? (
                                            <button
                                                key={i}
                                                onClick={() => router.get(link.url!)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-sky-700/40 dark:hover:bg-sky-950/20 dark:hover:text-sky-400"
                                            >
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                        ) : (
                                            <span key={i} className="flex size-8 items-center justify-center rounded-lg opacity-30 text-neutral-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </span>
                                        );
                                    }
                                    return link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm'
                                                    : 'border border-neutral-200 text-neutral-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-sky-700/40 dark:hover:bg-sky-950/20'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="flex size-8 items-center justify-center rounded-lg text-xs opacity-30 text-neutral-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
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
    const TypeIcon = TYPE_ICON[center.type];

    return (
        <tr className={`group transition-colors ${
            isSelected
                ? 'bg-sky-50/60 dark:bg-sky-950/20'
                : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30'
        }`}>
            {/* Checkbox */}
            <td className="w-10 px-5 py-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    className="size-3.5 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
                />
            </td>

            {/* Name */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        center.type === 'gymnasium'        ? 'bg-blue-100 dark:bg-blue-950/60' :
                        center.type === 'school'           ? 'bg-violet-100 dark:bg-violet-950/60' :
                        center.type === 'barangay_hall'    ? 'bg-amber-100 dark:bg-amber-950/60' :
                        center.type === 'church'           ? 'bg-rose-100 dark:bg-rose-950/60' :
                                                             'bg-teal-100 dark:bg-teal-950/60'
                    }`}>
                        <TypeIcon className={`size-4 ${
                            center.type === 'gymnasium'        ? 'text-blue-600 dark:text-blue-400' :
                            center.type === 'school'           ? 'text-violet-600 dark:text-violet-400' :
                            center.type === 'barangay_hall'    ? 'text-amber-600 dark:text-amber-400' :
                            center.type === 'church'           ? 'text-rose-600 dark:text-rose-400' :
                                                                 'text-teal-600 dark:text-teal-400'
                        }`} />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{center.name}</p>
                </div>
            </td>

            {/* Type badge */}
            <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLORS[center.type]}`}>
                    <span className={`size-1.5 rounded-full ${TYPE_DOT[center.type]}`} />
                    {EVACUATION_CENTER_TYPE_LABELS[center.type]}
                </span>
            </td>

            {/* Occupancy */}
            <td className="px-5 py-4">
                <OccupancyCell current={center.current_occupancy ?? 0} capacity={center.capacity ?? 0} />
            </td>

            {/* Status */}
            <td className="px-5 py-4">
                {center.is_active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-700/40">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                        <span className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                        Inactive
                    </span>
                )}
            </td>

            {/* Location */}
            <td className="max-w-[200px] px-5 py-4">
                {center.address ? (
                    <div className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={center.address}>
                            {center.address}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                )}
            </td>

            {/* Actions */}
            <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={() =>
                            router.post(`/admin/evacuation-centers/${center.id}/toggle`, {}, { preserveState: true })
                        }
                        className={`rounded-lg p-1.5 transition-colors ${
                            center.is_active
                                ? 'text-neutral-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400'
                                : 'text-neutral-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400'
                        }`}
                        title={center.is_active ? 'Deactivate' : 'Activate'}
                    >
                        <Power className="size-3.5" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
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
            </td>
        </tr>
    );
}

/* ─── Occupancy Cell ─── */

function OccupancyCell({ current, capacity }: { current: number; capacity: number }) {
    const pct = capacity > 0 ? Math.round((current / capacity) * 100) : 0;
    const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
    const textColor = pct >= 90 ? 'text-red-600 dark:text-red-400' : pct >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

    return (
        <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex items-center gap-1">
                <Users className="size-3.5 text-neutral-400 shrink-0" />
                <span className="text-sm font-bold tabular-nums text-neutral-800 dark:text-neutral-200">{current.toLocaleString()}</span>
                <span className="text-xs text-neutral-400">/ {capacity.toLocaleString()}</span>
                <span className={`ml-auto text-[10px] font-semibold ${textColor}`}>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
        </div>
    );
}

/* ─── Smart form helpers ─── */

/** Keywords that hint at a center type from its name */
const NAME_TYPE_KEYWORDS: { keywords: string[]; type: EvacuationCenterType }[] = [
    { keywords: ['gymnasium', 'gym', 'coliseum', 'arena', 'auditorium'],                                        type: 'gymnasium'        },
    { keywords: ['school', 'elementary', 'high school', 'national high', 'nhs', 'academy',
                 'central school', 'integrated school', 'institute', 'college', 'university',
                 'kindergarten', 'kinder', 'nursery', 'preschool', 'pre-school',
                 'technical', 'vocational', 'tesda', 'secondary', 'primary'],                                   type: 'school'           },
    { keywords: ['barangay hall', 'brgy hall', 'brgy. hall', 'kapitan', 'punong barangay'],                     type: 'barangay_hall'    },
    { keywords: ['church', 'chapel', 'parish', 'cathedral', 'shrine', 'basilica', 'simbahan'],                  type: 'church'           },
    { keywords: ['community center', 'multipurpose', 'multi-purpose', 'covered court',
                 'basketball court', 'volleyball court', 'plaza', 'covered gym'],                               type: 'community_center' },
];

function detectTypeFromName(name: string): EvacuationCenterType | null {
    const lower = name.toLowerCase();
    for (const { keywords, type } of NAME_TYPE_KEYWORDS) {
        if (keywords.some((k) => lower.includes(k))) return type;
    }
    return null;
}

/** Unified sub-level metadata for capacity hints and type badge */
interface SmartMeta { placeholder: string; hint: string; badge?: string }

type SubEntry = { keywords: string[]; placeholder: string; hint: string; badge: string };

function matchSub(name: string, entries: SubEntry[]): SmartMeta | null {
    const lower = name.toLowerCase();
    for (const e of entries) {
        if (e.keywords.some((k) => lower.includes(k))) {
            return { placeholder: e.placeholder, hint: e.hint, badge: e.badge };
        }
    }
    return null;
}

function getSmartMeta(type: EvacuationCenterType, name: string): SmartMeta {
    switch (type) {
        case 'school':
            return matchSub(name, [
                { keywords: ['elementary', 'central school', 'primary', 'kinder', 'kindergarten', 'nursery', 'preschool', 'pre-school'],
                  placeholder: '400',  hint: 'Typical: 200 – 600',   badge: 'Elementary School'    },
                { keywords: ['high school', 'national high', 'nhs', 'secondary', 'integrated school'],
                  placeholder: '800',  hint: 'Typical: 500 – 1,500', badge: 'High School'           },
                { keywords: ['college', 'university', 'institute', 'technical', 'vocational', 'tesda', 'academy'],
                  placeholder: '1000', hint: 'Typical: 500 – 2,000', badge: 'College / University'  },
            ]) ?? { placeholder: '500', hint: 'Typical: 300 – 1,000' };

        case 'gymnasium':
            return matchSub(name, [
                { keywords: ['sports complex', 'arena', 'coliseum', 'auditorium'],
                  placeholder: '2000', hint: 'Typical: 1,000 – 3,000', badge: 'Sports Complex / Arena' },
                { keywords: ['covered court', 'basketball court', 'badminton', 'volleyball court'],
                  placeholder: '300',  hint: 'Typical: 150 – 500',   badge: 'Covered Court'         },
                { keywords: ['barangay gym', 'brgy gym', 'brgy. gym'],
                  placeholder: '500',  hint: 'Typical: 300 – 800',   badge: 'Barangay Gymnasium'    },
            ]) ?? { placeholder: '1000', hint: 'Typical: 500 – 2,000' };

        case 'church':
            return matchSub(name, [
                { keywords: ['cathedral', 'basilica'],
                  placeholder: '1000', hint: 'Typical: 500 – 2,000', badge: 'Cathedral / Basilica' },
                { keywords: ['parish', 'parochial'],
                  placeholder: '400',  hint: 'Typical: 200 – 800',   badge: 'Parish Church'        },
                { keywords: ['chapel', 'shrine', 'oratory'],
                  placeholder: '150',  hint: 'Typical: 50 – 300',    badge: 'Chapel / Shrine'      },
            ]) ?? { placeholder: '300', hint: 'Typical: 100 – 600' };

        case 'barangay_hall':
            return matchSub(name, [
                { keywords: ['multipurpose hall', 'multi-purpose hall', 'function hall', 'event hall'],
                  placeholder: '250', hint: 'Typical: 100 – 400', badge: 'Multi-Purpose Hall' },
                { keywords: ['sitio', 'purok'],
                  placeholder: '80',  hint: 'Typical: 30 – 150',  badge: 'Sitio / Purok Hall' },
            ]) ?? { placeholder: '150', hint: 'Typical: 50 – 300' };

        case 'community_center':
            return matchSub(name, [
                { keywords: ['covered court', 'basketball court', 'volleyball court', 'badminton court'],
                  placeholder: '250', hint: 'Typical: 150 – 500',   badge: 'Covered Court'   },
                { keywords: ['multipurpose', 'multi-purpose', 'function hall', 'event hall'],
                  placeholder: '400', hint: 'Typical: 200 – 700',   badge: 'Multi-Purpose'   },
                { keywords: ['plaza', 'park', 'outdoor', 'open court'],
                  placeholder: '500', hint: 'Typical: 300 – 1,000', badge: 'Plaza / Outdoor' },
            ]) ?? { placeholder: '300', hint: 'Typical: 100 – 600' };
    }
}

/* ─── Create / Edit Modal ─── */

function CenterFormModal({ center, onClose }: { center?: EvacuationCenter; onClose: () => void }) {
    const isEditing = !!center;

    const form = useForm({
        name: center?.name ?? '',
        address: center?.address ?? '',
        type: (center?.type ?? 'gymnasium') as EvacuationCenterType,
        capacity: center?.capacity?.toString() ?? '',
        current_occupancy: center?.current_occupancy?.toString() ?? '0',
        latitude: center?.latitude?.toString() ?? '',
        longitude: center?.longitude?.toString() ?? '',
    });

    /* Auto-detect type as the user types the name */
    const [typeLocked, setTypeLocked] = useState(isEditing);
    useEffect(() => {
        if (typeLocked) return;
        const detected = detectTypeFromName(form.data.name);
        if (detected && detected !== form.data.type) {
            form.setData('type', detected);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.name]);

    /* Form completeness for the submit button */
    const hasPin   = form.data.latitude !== '' && form.data.longitude !== '';
    const isReady  = !!(form.data.name && form.data.capacity && form.data.address && hasPin);

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

    const SelectedTypeIcon = TYPE_ICON[form.data.type];
    const smartMeta        = getSmartMeta(form.data.type, form.data.name);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={modalSpring}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl shadow-black/20 dark:border-neutral-700/60 dark:bg-neutral-900"
            >
                {/* Modal Header */}
                <div className="flex items-center gap-3.5 bg-gradient-to-r from-sky-500/5 to-blue-600/5 px-6 py-4 dark:from-sky-500/10 dark:to-blue-600/10">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-blue-500/20">
                        <ShieldCheck className="size-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                            {isEditing ? 'Edit Evacuation Center' : 'Add Evacuation Center'}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEditing ? 'Update center details below' : 'Fill in the details to register a new center'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />

                {/* Body */}
                <form onSubmit={submit} className="flex flex-col">
                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr]">

                        {/* LEFT — form fields */}
                        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 lg:border-b-0 lg:border-r dark:border-neutral-800">

                            {/* 1. Address first — pin on map + auto-fills name */}
                            <FormField label="Location" error={form.errors.address}>
                                <AddressAutocomplete
                                    value={form.data.address}
                                    onAddressChange={(val) => form.setData('address', val)}
                                    onPlaceSelect={(lat, lng, addr, placeName) => {
                                        form.setData('address', addr);
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                        if (placeName) form.setData('name', placeName);
                                    }}
                                    className={`${inputClass} pl-8`}
                                    placeholder="Search places in Nasugbu…"
                                    required
                                />
                            </FormField>

                            {/* 2. Name — auto-detects type as you type */}
                            <FormField label="Center Name" error={form.errors.name}>
                                <input
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="e.g. Nasugbu Municipal Gymnasium"
                                    className={inputClass}
                                    required
                                />
                            </FormField>

                            {/* 3. Type — auto-set from name, can still override */}
                            <FormField
                                label="Type"
                                hint={smartMeta.badge ?? (!typeLocked && detectTypeFromName(form.data.name) ? 'Auto-detected' : undefined)}
                                error={form.errors.type}
                            >
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                                        <SelectedTypeIcon className="size-3.5 text-neutral-400" />
                                    </div>
                                    <select
                                        value={form.data.type}
                                        onChange={(e) => {
                                            setTypeLocked(true);
                                            form.setData('type', e.target.value as EvacuationCenterType);
                                        }}
                                        className={`${inputClass} appearance-none pl-8 pr-8`}
                                        required
                                    >
                                        {TYPE_OPTIONS.map((t) => (
                                            <option key={t} value={t}>
                                                {EVACUATION_CENTER_TYPE_LABELS[t]}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                </div>
                            </FormField>

                            {/* 4. Capacity — hint + placeholder update with type & sub-level */}
                            <FormField
                                label="Capacity (persons)"
                                hint={smartMeta.hint}
                                error={form.errors.capacity}
                            >
                                <div className="relative">
                                    <Users className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="number"
                                        value={form.data.capacity}
                                        onChange={(e) => form.setData('capacity', e.target.value)}
                                        placeholder={smartMeta.placeholder}
                                        min="1"
                                        className={`${inputClass} pl-8`}
                                        required
                                    />
                                </div>
                            </FormField>

                            {/* 5. Current Occupancy */}
                            <FormField
                                label="Current Evacuees"
                                hint={form.data.capacity
                                    ? `Max: ${Number(form.data.capacity).toLocaleString()} persons`
                                    : undefined}
                                error={form.errors.current_occupancy}
                            >
                                <div className="flex flex-col gap-1.5">
                                    <div className="relative">
                                        <Users className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-violet-400" />
                                        <input
                                            type="number"
                                            value={form.data.current_occupancy}
                                            onChange={(e) => form.setData('current_occupancy', e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            max={form.data.capacity || undefined}
                                            className={`${inputClass} pl-8 focus:border-violet-400 focus:ring-violet-500/15`}
                                        />
                                    </div>
                                    {form.data.capacity && Number(form.data.capacity) > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        (Number(form.data.current_occupancy) / Number(form.data.capacity)) >= 0.9
                                                            ? 'bg-red-500'
                                                            : (Number(form.data.current_occupancy) / Number(form.data.capacity)) >= 0.7
                                                            ? 'bg-amber-500'
                                                            : 'bg-violet-500'
                                                    }`}
                                                    style={{ width: `${Math.min(Math.round((Number(form.data.current_occupancy) / Number(form.data.capacity)) * 100), 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-semibold text-neutral-400 tabular-nums">
                                                {Math.min(Math.round((Number(form.data.current_occupancy) / Number(form.data.capacity)) * 100), 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </FormField>
                        </div>

                        {/* RIGHT — map */}
                        <div className="flex flex-col gap-2 px-4 py-4">
                            <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                Pin Location
                            </label>
                            <div className="flex-1">
                                <MapPicker
                                    latitude={form.data.latitude}
                                    longitude={form.data.longitude}
                                    address={form.data.address}
                                    onChange={(lat, lng, addr, placeName) => {
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                        if (addr) form.setData('address', addr);
                                        /* Auto-fill name + trigger type detection on map pin (create only) */
                                        if (!isEditing && placeName) form.setData('name', placeName);
                                    }}
                                />
                            </div>
                            {(form.errors.latitude || form.errors.longitude) && (
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {form.errors.latitude || form.errors.longitude}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
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
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing || (!isEditing && !isReady)}
                                title={!isReady && !isEditing ? 'Fill in all fields and pin a location first' : undefined}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isReady || isEditing
                                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-blue-500/20 hover:shadow-blue-500/30'
                                        : 'bg-neutral-400 shadow-neutral-400/20'
                                }`}
                            >
                                {isEditing ? <Save className="size-4" /> : <Plus className="size-4" />}
                                {form.processing ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Center'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Map Picker ─── */

/* Tight bounding box for Nasugbu municipality only (excludes Tuy, Calaca, etc.) */
const NASUGBU_BOUNDS = {
    north: 14.115,
    south: 14.010,
    east:  120.680,
    west:  120.565,
};

const MAP_DEFAULT = { lat: 14.0771, lng: 120.6361 };
const MAP_CONTAINER = { width: '100%', height: '100%', minHeight: '200px', borderRadius: '12px' };
const MAP_OPTIONS: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    restriction: {
        latLngBounds: {
            north: NASUGBU_BOUNDS.north,
            south: NASUGBU_BOUNDS.south,
            east:  NASUGBU_BOUNDS.east,
            west:  NASUGBU_BOUNDS.west,
        },
        strictBounds: true,
    },
    styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
};

/** Strip Google Plus Codes (e.g. "2MPW+VW, ") from the start of a formatted address. */
function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}

/** Returns true if the lat/lng falls within Nasugbu's bounding box. */
function isInNasugbu(latVal: number, lngVal: number): boolean {
    return (
        latVal >= NASUGBU_BOUNDS.south &&
        latVal <= NASUGBU_BOUNDS.north &&
        lngVal >= NASUGBU_BOUNDS.west &&
        lngVal <= NASUGBU_BOUNDS.east
    );
}

function MapPicker({
    latitude,
    longitude,
    address,
    onChange,
}: {
    latitude: string;
    longitude: string;
    address: string;
    onChange: (lat: string, lng: string, address?: string, placeName?: string) => void;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const [resolving, setResolving] = useState(false);
    const [outsideBounds, setOutsideBounds] = useState(false);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const hasPin = !isNaN(lat) && !isNaN(lng);

    /* Pan + zoom map whenever the pin coordinates change (e.g. autocomplete selection) */
    useEffect(() => {
        if (mapRef.current && hasPin) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(16);
        }
    }, [lat, lng, hasPin]);

    const reverseGeocode = useCallback(
        (latVal: number, lngVal: number) => {
            const geocoder = new google.maps.Geocoder();
            setResolving(true);
            geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
                setResolving(false);
                if (status === 'OK' && results && results.length > 0) {
                    /* Prefer a result without a Plus Code; fall back to first result stripped */
                    const best = results.find(r => !/^[0-9A-Z]{4,8}\+/i.test(r.formatted_address))
                        ?? results[0];

                    /* Extract place name only for evacuation-relevant types (not restaurants, shops, etc.) */
                    const EVAC_TYPES = [
                        'school', 'university', 'church', 'place_of_worship',
                        'gym', 'stadium', 'local_government_office', 'city_hall',
                        'community_center', 'health',
                    ];
                    const PLUS_CODE_RE = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}$/i;
                    let placeName: string | undefined;
                    for (const r of results) {
                        if (r.types?.some((t) => EVAC_TYPES.includes(t)) && r.address_components?.[0]) {
                            const candidate = r.address_components[0].long_name;
                            if (!PLUS_CODE_RE.test(candidate.trim())) {
                                placeName = candidate;
                                break;
                            }
                        }
                    }

                    onChange(latVal.toFixed(7), lngVal.toFixed(7), cleanAddress(best.formatted_address), placeName);
                } else {
                    onChange(latVal.toFixed(7), lngVal.toFixed(7));
                }
            });
        },
        [onChange],
    );

    const handleMapEvent = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const latVal = e.latLng.lat();
            const lngVal = e.latLng.lng();
            if (!isInNasugbu(latVal, lngVal)) {
                setOutsideBounds(true);
                setTimeout(() => setOutsideBounds(false), 2500);
                return;
            }
            setOutsideBounds(false);
            reverseGeocode(latVal, lngVal);
        },
        [reverseGeocode],
    );

    if (!isLoaded) {
        return (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="text-sm text-neutral-400">Loading map…</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="relative overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-700">
                <GoogleMap
                    mapContainerStyle={MAP_CONTAINER}
                    center={hasPin ? { lat, lng } : MAP_DEFAULT}
                    zoom={hasPin ? 16 : 13}
                    options={MAP_OPTIONS}
                    onLoad={(map) => { mapRef.current = map; }}
                    onUnmount={() => { mapRef.current = null; }}
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

                {/* Out-of-bounds toast */}
                <AnimatePresence>
                    {outsideBounds && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.18 }}
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                        >
                            Pin must be inside Nasugbu, Batangas
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <p className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                <Crosshair className="size-3" />
                {hasPin ? 'Drag the pin to fine-tune the location' : 'Click on the map to place the pin'}
                {resolving && <span className="ml-1 text-sky-500">· Resolving…</span>}
            </p>
        </div>
    );
}

/* ─── Address Autocomplete (Nasugbu-scoped, programmatic) ─── */

const PLUS_CODE_RE = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}$/i;

function AddressAutocomplete({
    value,
    onAddressChange,
    onPlaceSelect,
    className,
    placeholder,
    required,
}: {
    value: string;
    onAddressChange: (val: string) => void;
    onPlaceSelect: (lat: string, lng: string, address: string, placeName?: string) => void;
    className?: string;
    placeholder?: string;
    required?: boolean;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [inputVal,     setInputVal]     = useState(value);
    const [predictions,  setPredictions]  = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [open,         setOpen]         = useState(false);
    const [fetching,     setFetching]     = useState(false);

    const acServiceRef  = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef     = useRef<google.maps.places.PlacesService | null>(null);
    const placesDivRef  = useRef<HTMLDivElement | null>(null);
    const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef    = useRef<HTMLDivElement>(null);

    /* Sync external value (e.g. map pin reverse geocode) into input */
    useEffect(() => { setInputVal(value); }, [value]);

    /* Init Google Places services */
    useEffect(() => {
        if (!isLoaded) return;
        acServiceRef.current = new google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        document.body.appendChild(div);
        placesDivRef.current = div;
        placesRef.current = new google.maps.places.PlacesService(div);
        return () => { if (placesDivRef.current) document.body.removeChild(placesDivRef.current); };
    }, [isLoaded]);

    /* Close dropdown on outside click */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchPredictions = useCallback((q: string) => {
        if (!q || q.length < 2 || !acServiceRef.current) { setPredictions([]); setOpen(false); return; }
        const bounds = new google.maps.LatLngBounds(
            { lat: NASUGBU_BOUNDS.south, lng: NASUGBU_BOUNDS.west },
            { lat: NASUGBU_BOUNDS.north, lng: NASUGBU_BOUNDS.east },
        );
        setFetching(true);
        acServiceRef.current.getPlacePredictions(
            { input: q, bounds, strictBounds: true, componentRestrictions: { country: 'ph' } },
            (preds, status) => {
                setFetching(false);
                if (status === 'OK' && preds) {
                    /* Keep only predictions that mention Nasugbu */
                    const filtered = preds.filter((p) => p.description.toLowerCase().includes('nasugbu'));
                    setPredictions(filtered);
                    setOpen(filtered.length > 0);
                } else {
                    setPredictions([]); setOpen(false);
                }
            },
        );
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setInputVal(q);
        onAddressChange(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchPredictions(q), 300);
    };

    const EVAC_PLACE_TYPES = [
        'school', 'university', 'church', 'place_of_worship',
        'gym', 'stadium', 'local_government_office', 'city_hall',
        'community_center', 'health',
    ];

    const selectPrediction = (pred: google.maps.places.AutocompletePrediction) => {
        setOpen(false);
        if (!placesRef.current) return;
        placesRef.current.getDetails(
            { placeId: pred.place_id, fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'] },
            (place, status) => {
                if (status !== 'OK' || !place?.geometry?.location) return;
                const lat  = place.geometry.location.lat().toFixed(7);
                const lng  = place.geometry.location.lng().toFixed(7);
                const addr = cleanAddress(place.formatted_address ?? place.name ?? '');
                const raw  = place.name ?? '';
                /* Only use place name to fill Center Name if it's an evacuation-relevant venue */
                const isEvacType = place.types?.some((t) => EVAC_PLACE_TYPES.includes(t)) ?? false;
                const placeName  = isEvacType && !PLUS_CODE_RE.test(raw.trim()) ? (raw || undefined) : undefined;
                setInputVal(addr);
                onPlaceSelect(lat, lng, addr, placeName);
            },
        );
    };

    return (
        <div ref={wrapperRef} className="relative flex flex-col gap-1">
            <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    value={inputVal}
                    onChange={handleInput}
                    onFocus={() => predictions.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    className={className}
                    required={required}
                    autoComplete="off"
                />
                {fetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-sky-500" />
                    </div>
                )}
            </div>

            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/30"
                        >
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {pred.structured_formatting.main_text}
                            </span>
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                {pred.structured_formatting.secondary_text}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── Form Field ─── */

function FormField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{label}</label>
                {hint && <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">{hint}</span>}
            </div>
            {children}
            {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
