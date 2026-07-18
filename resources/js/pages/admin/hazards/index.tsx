import { Head, router, useForm } from '@inertiajs/react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Car,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Crosshair,
    Droplets,
    MapPin,
    Pencil,
    Plus,
    Power,
    Save,
    Search,
    ShieldAlert,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Hazard, HazardCategory, Severity } from '@/types/admin';
import { HAZARD_CATEGORY_LABELS, HAZARD_TYPE_OPTIONS } from '@/types/admin';

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
    'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20';

const modalSpring = { type: 'spring' as const, stiffness: 380, damping: 30 };

const CATEGORY_ICON: Record<HazardCategory, typeof Droplets> = {
    flood: Droplets,
    road:  Car,
};

const CATEGORY_COLORS: Record<HazardCategory, string> = {
    flood: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-700/40',
    road:  'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-700/40',
};


function getTypeLabel(category: HazardCategory, type: string): string {
    return HAZARD_TYPE_OPTIONS[category]?.find((t) => t.value === type)?.label ?? type;
}

/* ─── Nasugbu bounds (shared) ─── */
const NASUGBU_BOUNDS = {
    north: 14.115,
    south: 14.010,
    east:  120.680,
    west:  120.565,
};

function isInNasugbu(latVal: number, lngVal: number): boolean {
    return (
        latVal >= NASUGBU_BOUNDS.south &&
        latVal <= NASUGBU_BOUNDS.north &&
        lngVal >= NASUGBU_BOUNDS.west  &&
        lngVal <= NASUGBU_BOUNDS.east
    );
}

function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}


/* ─── Smart hazard detection from geocode results ─── */

function detectHazardFromGeocode(
    results: google.maps.GeocoderResult[],
): { category: HazardCategory; type: string } | null {
    const ROAD_RESULT_TYPES = ['route', 'street_address', 'intersection'];
    const WATER_KEYWORDS    = ['river', 'creek', 'stream', 'ilog', 'bay', 'beach', 'coast', 'dagat', 'shore', 'lake', 'estero'];
    const ROAD_KEYWORDS     = ['highway', 'road', 'diversion', 'national road', 'brgy road', 'barangay road', 'daan'];

    /* Road: geocode type is route / street_address / intersection */
    for (const r of results) {
        if (r.types?.some((t) => ROAD_RESULT_TYPES.includes(t))) {
            const addr = r.formatted_address.toLowerCase();
            /* Flooded road vs generic closed road */
            const type = addr.includes('national') || addr.includes('highway') ? 'closed_road' : 'flooded_road';
            return { category: 'road', type };
        }
    }

    /* Flood: check address text for water body keywords */
    const firstAddr = (results[0]?.formatted_address ?? '').toLowerCase();
    const firstName  = (results[0]?.address_components?.[0]?.long_name ?? '').toLowerCase();
    const combined   = `${firstAddr} ${firstName}`;

    if (WATER_KEYWORDS.some((k) => combined.includes(k))) {
        const type = combined.includes('bay') || combined.includes('beach') || combined.includes('coast') || combined.includes('dagat')
            ? 'coastal_flood'
            : 'river_flood';
        return { category: 'flood', type };
    }

    /* Road keywords in address text (e.g. "National Road, Brgy. …") */
    if (ROAD_KEYWORDS.some((k) => combined.includes(k))) {
        return { category: 'road', type: 'flooded_road' };
    }

    return null;
}

/* ─── Main ─── */

export default function AdminHazardsIndex({ hazards }: Props) {
    const [selected,        setSelected]        = useState<number[]>([]);
    const [bulkProcessing,  setBulkProcessing]  = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingHazard,   setEditingHazard]   = useState<Hazard | null>(null);
    const [search,          setSearch]          = useState('');
    const [categoryFilter,  setCategoryFilter]  = useState('');
    const [statusFilter,    setStatusFilter]    = useState('');

    const allOnPageSelected = hazards.data.length > 0 && hazards.data.every((h) => selected.includes(h.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !hazards.data.some((h) => h.id === id)));
        } else {
            setSelected([...new Set([...selected, ...hazards.data.map((h) => h.id)])]);
        }
    };
    const toggleOne = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

    const runBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected hazard(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post('/admin/hazards/bulk', { ids: selected, action }, {
            preserveState: true,
            onFinish:  () => { setBulkProcessing(false); setSelected([]); },
            onSuccess: () => swalSuccess('Done', `${selected.length} hazard(s) ${action}d.`),
        });
    };

    const activeCount   = hazards.data.filter((h) =>  h.active).length;
    const inactiveCount = hazards.data.filter((h) => !h.active).length;
    const hasFilters    = !!(search || categoryFilter || statusFilter);
    const clearFilters  = () => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); };

    const filtered = hazards.data.filter((h) => {
        if (categoryFilter && h.category !== categoryFilter) return false;
        if (statusFilter === 'active'   &&  !h.active) return false;
        if (statusFilter === 'inactive' &&   h.active) return false;
        if (search) {
            const q = search.toLowerCase();
            return h.title.toLowerCase().includes(q) || (h.address ?? '').toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hazards" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-red-500/25">
                            <ShieldAlert className="size-6 text-white" />
                            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-900">
                                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Hazard Management
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Manage flood &amp; road hazards visible on the resident map
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition-all hover:shadow-lg hover:shadow-red-500/30 hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Hazard
                    </button>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
                                <ShieldAlert className="size-4 text-orange-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{hazards.total}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">registered hazards</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-teal-950/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Active</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                                <span className="size-2.5 animate-pulse rounded-full bg-emerald-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300">{activeCount}</p>
                        <p className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-500/70">visible on map</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Inactive</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <Power className="size-4 text-neutral-400" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-700 dark:text-neutral-300">{inactiveCount}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">hidden from map</p>
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
                            className="overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-50 to-red-50/60 px-5 py-3.5 dark:border-orange-800/40 dark:from-orange-950/30 dark:to-red-950/20"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-4 w-px bg-orange-300/60 dark:bg-orange-700/60" />
                                <button onClick={() => runBulkAction('activate')} disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50">
                                    <Power className="size-3.5" /> Activate
                                </button>
                                <button onClick={() => runBulkAction('deactivate')} disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-amber-600 disabled:opacity-50">
                                    <Power className="size-3.5" /> Deactivate
                                </button>
                                <button onClick={() => runBulkAction('delete')} disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50">
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <button onClick={() => setSelected([])}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/40">
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
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                <option value="">All categories</option>
                                <option value="flood">Flood</option>
                                <option value="road">Road</option>
                            </select>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                <option value="">All statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search hazards..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 w-52 rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none transition-all placeholder:text-neutral-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                                />
                            </div>
                            {hasFilters && (
                                <button onClick={clearFilters}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-neutral-700 dark:hover:border-red-800/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    title="Clear filters">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-800/40">
                                    <th className="w-10 px-5 py-3 text-center">
                                        <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-orange-500 focus:ring-orange-500/20 dark:border-neutral-600" />
                                    </th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Hazard</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Type</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Location</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Created</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {filtered.map((hazard) => (
                                    <HazardRow
                                        key={hazard.id}
                                        hazard={hazard}
                                        isSelected={selected.includes(hazard.id)}
                                        onToggle={() => toggleOne(hazard.id)}
                                        onEdit={() => setEditingHazard(hazard)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/20">
                                <ShieldAlert className="size-8 text-orange-400 dark:text-orange-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No hazards found</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your filters.' : 'Add your first hazard to get started.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {hazards.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Page{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{hazards.current_page}</span>
                                {' '}of{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{hazards.last_page}</span>
                                <span className="ml-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="ml-2">{hazards.total} total</span>
                            </span>
                            <div className="flex items-center gap-1">
                                {hazards.links.map((link, i) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next')     || link.label.includes('&raquo;');
                                    if (isPrev || isNext) {
                                        return link.url ? (
                                            <button key={i} onClick={() => router.get(link.url!)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-orange-700/40 dark:hover:bg-orange-950/20 dark:hover:text-orange-400">
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
                                                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-sm'
                                                    : 'border border-neutral-200 text-neutral-500 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-orange-700/40 dark:hover:bg-orange-950/20 dark:hover:text-orange-400'
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

            <AnimatePresence>
                {showCreateModal && <HazardFormModal onClose={() => setShowCreateModal(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {editingHazard && <HazardFormModal hazard={editingHazard} onClose={() => setEditingHazard(null)} />}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Hazard Table Row ─── */

function HazardRow({ hazard, isSelected, onToggle, onEdit }: {
    hazard: Hazard; isSelected: boolean; onToggle: () => void; onEdit: () => void;
}) {
    const deleteForm = useForm({});
    const CatIcon    = CATEGORY_ICON[hazard.category] ?? ShieldAlert;
    const isFlood    = hazard.category === 'flood';

    return (
        <tr className={`group transition-colors ${
            isSelected ? 'bg-orange-50/60 dark:bg-orange-950/20' : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30'
        }`}>
            <td className="w-10 px-5 py-4 text-center">
                <input type="checkbox" checked={isSelected} onChange={onToggle}
                    className="size-3.5 rounded border-neutral-300 text-orange-500 focus:ring-orange-500/20 dark:border-neutral-600" />
            </td>

            {/* Hazard (icon + title + category badge) */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        isFlood
                            ? 'bg-blue-100 dark:bg-blue-950/50'
                            : 'bg-orange-100 dark:bg-orange-950/50'
                    }`}>
                        <CatIcon className={`size-4 ${isFlood ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {hazard.title}
                        </p>
                        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[hazard.category]}`}>
                            {HAZARD_CATEGORY_LABELS[hazard.category]}
                        </span>
                    </div>
                </div>
            </td>

            {/* Type */}
            <td className="px-5 py-4">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {getTypeLabel(hazard.category, hazard.type)}
                </span>
            </td>

            {/* Status */}
            <td className="px-5 py-4">
                {hazard.active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-700/40">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                        <span className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" /> Inactive
                    </span>
                )}
            </td>

            {/* Location */}
            <td className="max-w-[200px] px-5 py-4">
                {hazard.address ? (
                    <div className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={hazard.address}>
                            {hazard.address}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                )}
            </td>

            {/* Created */}
            <td className="whitespace-nowrap px-5 py-4">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {new Date(hazard.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
            </td>

            {/* Actions */}
            <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={() => router.post(`/admin/hazards/${hazard.id}/toggle`, {}, { preserveState: true })}
                        className={`rounded-lg p-1.5 transition-colors ${
                            hazard.active
                                ? 'text-neutral-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400'
                                : 'text-neutral-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400'
                        }`}
                        title={hazard.active ? 'Deactivate' : 'Activate'}>
                        <Power className="size-3.5" />
                    </button>
                    <button onClick={onEdit}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                        title="Edit hazard">
                        <Pencil className="size-3.5" />
                    </button>
                    <button
                        onClick={async () => {
                            const confirmed = await swalDelete('this hazard');
                            if (confirmed) deleteForm.delete(`/admin/hazards/${hazard.id}`, {
                                onSuccess: () => swalSuccess('Deleted', 'Hazard has been removed.'),
                            });
                        }}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Delete hazard">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ─── Create / Edit Modal ─── */

function HazardFormModal({ hazard, onClose }: { hazard?: Hazard; onClose: () => void }) {
    const isEditing = !!hazard;

    const form = useForm({
        category:  (hazard?.category  ?? 'flood')    as HazardCategory,
        type:       hazard?.type      ?? '',
        severity:  (hazard?.severity  ?? 'moderate') as Severity,
        title:      hazard?.title     ?? '',
        latitude:   hazard?.latitude?.toString()  ?? '',
        longitude:  hazard?.longitude?.toString() ?? '',
        address:    hazard?.address   ?? '',
    });

    const currentTypes = HAZARD_TYPE_OPTIONS[form.data.category] ?? [];

    /* Lock prevents map pin from overriding a manual category/type selection */
    const [catLocked, setCatLocked] = useState(isEditing);

    /* Auto-fill title from type label */
    const handleTypeChange = (val: string) => {
        const label = (HAZARD_TYPE_OPTIONS[form.data.category] ?? []).find((t) => t.value === val)?.label ?? val;
        form.setData('type', val);
        if (val) form.setData('title', label);
    };

    /* Called by MapPicker after a reverse geocode completes */
    const handleGeocode = useCallback((results: google.maps.GeocoderResult[]) => {
        if (catLocked || isEditing) return;
        const hint = detectHazardFromGeocode(results);
        if (!hint) return;
        /* Only auto-set if category or type hasn't been manually picked */
        if (hint.category !== form.data.category) {
            form.setData('category', hint.category);
        }
        const label = (HAZARD_TYPE_OPTIONS[hint.category] ?? []).find((t) => t.value === hint.type)?.label ?? hint.type;
        form.setData('type', hint.type);
        form.setData('title', label);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [catLocked, isEditing, form.data.category]);

    /* Readiness check */
    const hasPin  = form.data.latitude !== '' && form.data.longitude !== '';
    const isReady = !!(form.data.type && form.data.address && hasPin);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEditing) {
            form.put(`/admin/hazards/${hazard!.id}`, {
                onSuccess: () => { onClose(); swalSuccess('Updated', 'Hazard has been updated.'); },
            });
        } else {
            form.post('/admin/hazards', {
                onSuccess: () => { form.reset(); onClose(); swalSuccess('Created', 'Hazard is now visible on the map.'); },
            });
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <div className="flex items-center gap-3.5 bg-gradient-to-r from-orange-500/5 to-red-600/5 px-6 py-4 dark:from-orange-500/10 dark:to-red-600/10">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md shadow-red-500/20">
                        <ShieldAlert className="size-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                                {isEditing ? 'Edit Hazard' : 'Create New Hazard'}
                            </h3>
                            {isEditing && hazard?.type && (
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_COLORS[hazard.category]}`}>
                                    {getTypeLabel(hazard.category, hazard.type)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEditing ? 'Update hazard details below' : 'This hazard will appear on the map for all users'}
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />

                {/* Body — two-column */}
                <form onSubmit={submit} className="flex flex-col">
                    <div className="grid grid-cols-[1fr_1.15fr]">

                        {/* LEFT — form fields */}
                        <div className="flex flex-col gap-3 border-r border-neutral-100 px-5 py-4 dark:border-neutral-800">

                            {/* 1. Location (address autocomplete) */}
                            <FormField label="Location" error={form.errors.address}>
                                <AddressAutocomplete
                                    value={form.data.address}
                                    onAddressChange={(val) => form.setData('address', val)}
                                    onPlaceSelect={(lat, lng, addr) => {
                                        form.setData('address', addr);
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                    }}
                                    className={`${inputClass} pl-8`}
                                    placeholder="Search places in Nasugbu…"
                                />
                            </FormField>

                            {/* 2. Category toggle */}
                            <FormField label="Category" error={form.errors.category}>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['flood', 'road'] as const).map((cat) => {
                                        const CatIcon = CATEGORY_ICON[cat];
                                        const active  = form.data.category === cat;
                                        return (
                                            <button key={cat} type="button"
                                                onClick={() => { setCatLocked(true); form.setData('category', cat); form.setData('type', ''); }}
                                                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
                                                    active
                                                        ? cat === 'flood'
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-300'
                                                            : 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-400 dark:bg-orange-950/30 dark:text-orange-300'
                                                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                                                }`}
                                            >
                                                <CatIcon className="size-4" />
                                                {HAZARD_CATEGORY_LABELS[cat]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FormField>

                            {/* 3. Hazard type */}
                            <FormField label="Hazard Type" error={form.errors.type}>
                                <div className="relative">
                                    <select value={form.data.type} onChange={(e) => handleTypeChange(e.target.value)}
                                        className={`${inputClass} appearance-none pr-8`} required>
                                        <option value="">Select type…</option>
                                        {currentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
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
                                    onChange={(lat, lng, addr) => {
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                        if (addr) form.setData('address', addr);
                                    }}
                                    onGeocode={handleGeocode}
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
                                <button type="button"
                                    onClick={async () => {
                                        const confirmed = await swalDelete('this hazard');
                                        if (confirmed) router.delete(`/admin/hazards/${hazard!.id}`, {
                                            onSuccess: () => { onClose(); swalSuccess('Deleted', 'Hazard has been removed.'); },
                                        });
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button type="button" onClick={onClose}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800">
                                Cancel
                            </button>
                            <button type="submit"
                                disabled={form.processing || (!isEditing && !isReady)}
                                title={!isReady && !isEditing ? 'Fill in all fields and pin a location first' : undefined}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isReady || isEditing
                                        ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-red-500/20 hover:shadow-red-500/30'
                                        : 'bg-neutral-400 shadow-neutral-400/20'
                                }`}
                            >
                                {isEditing ? <Save className="size-4" /> : <Plus className="size-4" />}
                                {form.processing ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Hazard'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Map Picker ─── */

const MAP_DEFAULT   = { lat: 14.0771, lng: 120.6361 };
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
        { featureType: 'poi',     elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',                        stylers: [{ visibility: 'off' }] },
    ],
};

function MapPicker({ latitude, longitude, address, onChange, onGeocode }: {
    latitude: string; longitude: string; address: string;
    onChange: (lat: string, lng: string, address?: string) => void;
    onGeocode?: (results: google.maps.GeocoderResult[]) => void;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const [resolving,     setResolving]     = useState(false);
    const [outsideBounds, setOutsideBounds] = useState(false);

    const lat    = parseFloat(latitude);
    const lng    = parseFloat(longitude);
    const hasPin = !isNaN(lat) && !isNaN(lng);

    useEffect(() => {
        if (mapRef.current && hasPin) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(16);
        }
    }, [lat, lng, hasPin]);

    const reverseGeocode = useCallback((latVal: number, lngVal: number) => {
        const geocoder = new google.maps.Geocoder();
        setResolving(true);
        geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
            setResolving(false);
            if (status === 'OK' && results?.length) {
                const best = results.find(r => !/^[0-9A-Z]{4,8}\+/i.test(r.formatted_address)) ?? results[0];
                onChange(latVal.toFixed(7), lngVal.toFixed(7), cleanAddress(best.formatted_address));
                onGeocode?.(results);
            } else {
                onChange(latVal.toFixed(7), lngVal.toFixed(7));
            }
        });
    }, [onChange, onGeocode]);

    const handleMapEvent = useCallback((e: google.maps.MapMouseEvent) => {
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
    }, [reverseGeocode]);

    if (!isLoaded) {
        return (
            <div className="flex h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
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
                    {hasPin && <MarkerF position={{ lat, lng }} draggable onDragEnd={handleMapEvent} />}
                </GoogleMap>

                <AnimatePresence>
                    {outsideBounds && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}
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

function AddressAutocomplete({ value, onAddressChange, onPlaceSelect, className, placeholder }: {
    value: string;
    onAddressChange: (val: string) => void;
    onPlaceSelect: (lat: string, lng: string, address: string) => void;
    className?: string;
    placeholder?: string;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [inputVal,    setInputVal]    = useState(value);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [open,        setOpen]        = useState(false);
    const [fetching,    setFetching]    = useState(false);

    const acServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef    = useRef<google.maps.places.PlacesService | null>(null);
    const placesDivRef = useRef<HTMLDivElement | null>(null);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef   = useRef<HTMLDivElement>(null);

    /* Sync external value (map pin reverse geocode) into input */
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

    /* Close on outside click */
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

    const selectPrediction = (pred: google.maps.places.AutocompletePrediction) => {
        setOpen(false);
        if (!placesRef.current) return;
        placesRef.current.getDetails(
            { placeId: pred.place_id, fields: ['formatted_address', 'geometry', 'name', 'address_components'] },
            (place, status) => {
                if (status !== 'OK' || !place?.geometry?.location) return;
                const lat  = place.geometry.location.lat().toFixed(7);
                const lng  = place.geometry.location.lng().toFixed(7);
                const addr = cleanAddress(place.formatted_address ?? place.name ?? '');
                setInputVal(addr);
                onPlaceSelect(lat, lng, addr);
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
                    autoComplete="off"
                />
                {fetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-orange-500" />
                    </div>
                )}
            </div>

            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-orange-50 dark:hover:bg-orange-950/30"
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

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/* suppress unused import warning — Zap and AlertTriangle used as potential future icons */
void Zap; void AlertTriangle;
