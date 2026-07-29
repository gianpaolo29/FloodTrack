import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle, ArrowDownAZ, ArrowUpDown, Bell, Calendar, ChevronDown, ChevronLeft, ChevronRight,
    FileText, Filter, Info, MapPin, Megaphone, Pencil, Plus, Save, Search, Send, Trash2, X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Alert } from '@/types/admin';

/* ─── Types ─── */

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
    filters: { search?: string; type?: string; sort?: string; dir?: string };
    stats: { total: number; critical: number; advisory: number; update: number };
    barangays: string[];
}

/* ─── Constants ─── */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Alerts', href: '/admin/alerts' },
];

const TYPE_STYLES: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/20',
    advisory: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-500/20',
    update:   'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-600/20',
};

const TYPE_COLORS: Record<string, { active: string; dot: string }> = {
    advisory: { active: 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30', dot: 'bg-blue-500' },
    update:   { active: 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30', dot: 'bg-emerald-500' },
    critical: { active: 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/30', dot: 'bg-red-500' },
};

const TYPE_FILTER_OPTIONS = [
    { value: 'critical', label: 'Critical' },
    { value: 'advisory', label: 'Advisory' },
    { value: 'update',   label: 'Update'   },
];

const SORT_OPTIONS = [
    { value: 'created_at', label: 'Date Published' },
    { value: 'title',      label: 'Title'          },
    { value: 'type',       label: 'Type'           },
];

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-neutral-700 dark:bg-neutral-800/60 dark:placeholder:text-neutral-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/15';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

/* ─── Alert Template ─── */

const ALERT_TEMPLATE = {
    title: '[Alert Type] — [Area/Subject]',
    body: `[Summary of the situation — what happened, current status]

Details:
- [Detail 1, e.g., location, water level, wind speed]
- [Detail 2, e.g., affected areas or barangays]
- [Detail 3, e.g., expected duration or next update time]

Actions required:
- [Action 1, e.g., monitor FloodTrack for real-time updates]
- [Action 2, e.g., prepare for possible evacuation]
- [Action 3, e.g., report incidents via the app]

Stay safe. Follow instructions from your local DRRMO.

Source: [DOST-PAGASA / Local DRRMO / FloodTrack]`,
};

/* ─── Barangay Multi-Select ─── */

function BarangayMultiSelect({
    barangays,
    selected,
    onChange,
}: {
    barangays: string[];
    selected: string[];
    onChange: (val: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const toggle = (name: string) => {
        onChange(selected.includes(name) ? selected.filter((b) => b !== name) : [...selected, name]);
    };

    const allSelected = selected.length === barangays.length;
    const toggleAll = () => onChange(allSelected ? [] : [...barangays]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`${inputClass} flex items-center justify-between gap-2 text-left`}
            >
                <span className={selected.length === 0 ? 'text-neutral-400 dark:text-neutral-500' : ''}>
                    {selected.length === 0
                        ? 'All users (no filter)'
                        : `${selected.length} address${selected.length > 1 ? 'es' : ''} selected`}
                </span>
                <ChevronDown className={`size-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
                    >
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-amber-400 dark:hover:bg-neutral-750"
                        >
                            {allSelected ? 'Clear all' : 'Select all'}
                        </button>
                        {barangays.map((b) => (
                            <label
                                key={b}
                                className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-950/20"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(b)}
                                    onChange={() => toggle(b)}
                                    className="size-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500/20 dark:border-neutral-600"
                                />
                                <span className="text-neutral-700 dark:text-neutral-300">{b}</span>
                            </label>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.map((b) => (
                        <span
                            key={b}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-700/40"
                        >
                            <MapPin className="size-2.5" />
                            {b}
                            <button
                                type="button"
                                onClick={() => toggle(b)}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
                            >
                                <X className="size-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function AdminAlertsIndex({ alerts, filters, stats, barangays }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
    const [searchValue, setSearchValue] = useState(filters.search ?? '');
    const searchRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        title: '',
        body: '',
        type: 'advisory' as 'advisory' | 'update' | 'critical',
        target_barangays: [] as string[],
    });

    /* ── Filter helpers ── */

    const applyFilter = useCallback((key: string, value: string) => {
        router.get('/admin/alerts', { ...filters, [key]: value || undefined, page: undefined }, {
            preserveState: false,
            replace: true,
        });
    }, [filters]);

    const clearFilters = () => {
        setSearchValue('');
        router.get('/admin/alerts', {}, { preserveState: false, replace: true });
    };

    const toggleSort = (field: string) => {
        const newDir = filters.sort === field && filters.dir === 'desc' ? 'asc' : 'desc';
        router.get('/admin/alerts', { ...filters, sort: field, dir: newDir, page: undefined }, {
            preserveState: false,
            replace: true,
        });
    };

    const hasActiveFilters = !!(filters.search || filters.type);

    /* ── Form handlers ── */

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

    function applyTemplate() {
        form.setData({
            title: ALERT_TEMPLATE.title,
            body: ALERT_TEMPLATE.body,
            type: form.data.type,
            target_barangays: form.data.target_barangays,
        });
    }

    /* ── Selection ── */

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
                onFinish: () => { setBulkProcessing(false); setSelected([]); },
                onSuccess: () => swalSuccess('Deleted', 'Selected alerts have been deleted.'),
            },
        );
    };

    /* ── Sort indicator ── */

    const SortIcon = ({ field }: { field: string }) => {
        if (filters.sort !== field) return <ArrowUpDown className="size-3 text-neutral-300 dark:text-neutral-600" />;
        return <ArrowDownAZ className={`size-3 text-amber-500 ${filters.dir === 'asc' ? 'rotate-180' : ''}`} />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alerts" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                            <Bell className="size-6 text-white" />
                            {stats.critical > 0 && (
                                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-neutral-900">
                                    {stats.critical > 9 ? '9+' : stats.critical}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Alert Management
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Publish advisories and critical notifications to residents
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { form.reset(); setShowCreateModal(true); }}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:shadow-lg hover:shadow-amber-500/30 hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Publish Alert
                    </button>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    {[
                        { label: 'Total Alerts', value: stats.total, icon: Bell, color: 'amber', gradient: false },
                        { label: 'Critical',     value: stats.critical, icon: AlertTriangle, color: 'red', gradient: true },
                        { label: 'Advisory',     value: stats.advisory, icon: Info, color: 'blue', gradient: false },
                        { label: 'Updates',      value: stats.update, icon: Megaphone, color: 'emerald', gradient: false },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className={`rounded-2xl border p-4 shadow-sm transition-all sm:p-5 ${
                                s.gradient
                                    ? 'border-red-200/60 bg-gradient-to-br from-red-50 to-orange-50/60 dark:border-red-800/40 dark:from-red-950/30 dark:to-orange-950/20'
                                    : 'border-neutral-200/80 bg-white dark:border-neutral-700/60 dark:bg-neutral-900'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                                    s.gradient ? 'text-red-600 dark:text-red-500' : 'text-neutral-400 dark:text-neutral-500'
                                }`}>
                                    {s.label}
                                </p>
                                <div className={`flex size-8 items-center justify-center rounded-lg ${
                                    s.color === 'amber'   ? 'bg-amber-50 dark:bg-amber-950/30' :
                                    s.color === 'red'     ? 'bg-red-100 dark:bg-red-900/40' :
                                    s.color === 'blue'    ? 'bg-blue-50 dark:bg-blue-950/30' :
                                                            'bg-emerald-50 dark:bg-emerald-950/30'
                                }`}>
                                    <s.icon className={`size-4 ${
                                        s.color === 'amber'   ? 'text-amber-500' :
                                        s.color === 'red'     ? 'text-red-500' :
                                        s.color === 'blue'    ? 'text-blue-500' :
                                                                'text-emerald-500'
                                    }`} />
                                </div>
                            </div>
                            <p className={`mt-2 text-2xl font-bold tabular-nums sm:mt-3 sm:text-3xl ${
                                s.gradient ? 'text-red-800 dark:text-red-300' : 'text-neutral-900 dark:text-neutral-100'
                            }`}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Search / Filter / Sort Bar ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    {/* Search */}
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') applyFilter('search', searchValue); }}
                            placeholder="Search alerts..."
                            className="h-9 w-full rounded-xl border border-neutral-200/80 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition-all placeholder:text-neutral-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-amber-500 sm:w-56"
                        />
                    </div>

                    {/* Type filter */}
                    <div className="flex items-center gap-1 rounded-xl border border-neutral-200/80 bg-white px-2 py-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                        <Filter className="size-3.5 shrink-0 text-neutral-400" />
                        <span className="pr-1 text-xs text-neutral-400">Type</span>
                        {TYPE_FILTER_OPTIONS.map((opt) => {
                            const active = filters.type === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => applyFilter('type', active ? '' : opt.value)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                        active
                                            ? TYPE_STYLES[opt.value]
                                            : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1 rounded-xl border border-neutral-200/80 bg-white px-2 py-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                        <ArrowUpDown className="size-3.5 shrink-0 text-neutral-400" />
                        <span className="pr-1 text-xs text-neutral-400">Sort</span>
                        {SORT_OPTIONS.map((opt) => {
                            const active = (filters.sort ?? 'created_at') === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleSort(opt.value)}
                                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                        active
                                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/20'
                                            : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700'
                                    }`}
                                >
                                    {opt.label}
                                    {active && <SortIcon field={opt.value} />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Active filter chips */}
                    <AnimatePresence>
                        {filters.search && (
                            <motion.span
                                key="search-chip"
                                initial={{ opacity: 0, scale: 0.88 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.88 }}
                                transition={{ duration: 0.15 }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400"
                            >
                                <Search className="size-3" />
                                &ldquo;{filters.search}&rdquo;
                                <button onClick={() => { setSearchValue(''); applyFilter('search', ''); }} className="rounded-full p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                                    <X className="size-3" />
                                </button>
                            </motion.span>
                        )}
                        {filters.type && (
                            <motion.span
                                key="type-chip"
                                initial={{ opacity: 0, scale: 0.88 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.88 }}
                                transition={{ duration: 0.15 }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-orange-50 px-2.5 py-1 text-xs font-medium capitalize text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-400"
                            >
                                <Filter className="size-3" />
                                {filters.type}
                                <button onClick={() => applyFilter('type', '')} className="rounded-full p-0.5 hover:bg-orange-100 dark:hover:bg-orange-900/40">
                                    <X className="size-3" />
                                </button>
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                            <X className="size-3.5" />
                            Clear
                        </button>
                    )}
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
                    <div className="block divide-y divide-neutral-100 sm:hidden dark:divide-neutral-800">
                        {alerts.data.map((alert) => {
                            const published = new Date(alert.created_at);
                            const publishedStr = published.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                            return (
                                <div key={alert.id} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2.5">
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
                                    <p className="line-clamp-2 text-xs text-neutral-400 dark:text-neutral-500">{alert.body}</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.update}`}>{alert.type}</span>
                                            {alert.target_barangays && alert.target_barangays.length > 0 && (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-700/40">
                                                    <MapPin className="size-2" />
                                                    {alert.target_barangays.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                            <Calendar className="size-2.5" />
                                            {publishedStr}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto sm:block">
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
                                    <th className="px-5 py-3 text-left">
                                        <button onClick={() => toggleSort('title')} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                                            Alert <SortIcon field="title" />
                                        </button>
                                    </th>
                                    <th className="px-5 py-3 text-left">
                                        <button onClick={() => toggleSort('type')} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                                            Type <SortIcon field="type" />
                                        </button>
                                    </th>
                                    <th className="px-5 py-3 text-left">
                                        <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                                            Published <SortIcon field="created_at" />
                                        </button>
                                    </th>
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
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                    {hasActiveFilters ? 'No alerts match your filters' : 'No alerts published yet'}
                                </p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Publish your first alert to notify all users.'}
                                </p>
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                >
                                    <X className="size-3.5" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {alerts.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/40 px-5 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/20">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{alerts.total}</span> alert{alerts.total !== 1 ? 's' : ''}
                                {' '}&middot; Page <span className="font-semibold text-neutral-900 dark:text-neutral-100">{alerts.current_page}</span> of {alerts.last_page}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { const prev = alerts.links[0]; if (prev?.url) router.get(prev.url); }}
                                    disabled={alerts.current_page === 1}
                                    className="flex size-8 items-center justify-center rounded-lg border border-neutral-200/80 bg-white text-neutral-400 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                >
                                    <ChevronLeft className="size-3.5" />
                                </button>
                                {alerts.links.slice(1, -1).map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25'
                                                    : 'border border-neutral-200/80 bg-white text-neutral-500 shadow-sm hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : null,
                                )}
                                <button
                                    onClick={() => { const next = alerts.links[alerts.links.length - 1]; if (next?.url) router.get(next.url); }}
                                    disabled={alerts.current_page === alerts.last_page}
                                    className="flex size-8 items-center justify-center rounded-lg border border-neutral-200/80 bg-white text-neutral-400 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                >
                                    <ChevronRight className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Create Modal ═══ */}
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
                            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                            style={{ maxHeight: 'min(90vh, 760px)' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                                        <Megaphone className="size-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Publish Alert</h3>
                                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Broadcast to all or specific barangays</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    <X className="size-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
                                {/* Template button */}
                                <button
                                    type="button"
                                    onClick={applyTemplate}
                                    className="mb-4 flex items-center gap-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-2.5 text-left transition-all hover:border-amber-400 hover:bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20 dark:hover:border-amber-600/60 dark:hover:bg-amber-950/30"
                                >
                                    <FileText className="size-4 shrink-0 text-amber-500" />
                                    <div>
                                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Use Template</p>
                                        <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60">Fill form with a ready-made alert structure</p>
                                    </div>
                                </button>

                                {/* Two-column layout */}
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="flex flex-col gap-4">
                                        <FormField label="Title" error={form.errors.title}>
                                            <input
                                                type="text"
                                                value={form.data.title}
                                                onChange={(e) => form.setData('title', e.target.value)}
                                                placeholder="e.g. Flood Advisory — Brgy. Reparo"
                                                className={inputClass}
                                                required
                                            />
                                        </FormField>
                                        <FormField label="Message" error={form.errors.body}>
                                            <textarea
                                                value={form.data.body}
                                                onChange={(e) => form.setData('body', e.target.value)}
                                                rows={8}
                                                placeholder="Alert details visible to all app users..."
                                                className={`${inputClass} resize-y`}
                                                required
                                            />
                                        </FormField>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <FormField label="Type">
                                            <div className="flex gap-2">
                                                {(['advisory', 'update', 'critical'] as const).map((t) => {
                                                    const active = form.data.type === t;
                                                    const colors = TYPE_COLORS[t];
                                                    return (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => form.setData('type', t)}
                                                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold capitalize transition-all ${
                                                                active
                                                                    ? colors.active
                                                                    : 'border-neutral-200 bg-neutral-50/50 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:border-neutral-600'
                                                            }`}
                                                        >
                                                            <span className={`size-2 rounded-full ${active ? colors.dot : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                                                            {t}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </FormField>
                                        <FormField label="Target Home Address (optional)">
                                            <BarangayMultiSelect
                                                barangays={barangays}
                                                selected={form.data.target_barangays}
                                                onChange={(val) => form.setData('target_barangays', val)}
                                            />
                                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                                Leave empty to send to all users. Select specific addresses to target notifications.
                                            </p>
                                        </FormField>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-5 flex items-center justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                                    >
                                        <Send className="size-4" />
                                        {form.processing ? 'Publishing...' : 'Publish'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Edit Modal ═══ */}
            <AnimatePresence>
                {editingAlert && (
                    <EditModal
                        alert={editingAlert}
                        barangays={barangays}
                        onClose={() => setEditingAlert(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Edit Modal
   ═══════════════════════════════════════════════════════════════════════════════ */

function EditModal({ alert, barangays, onClose }: { alert: Alert; barangays: string[]; onClose: () => void }) {
    const deleteForm = useForm({});
    const editForm = useForm({
        title: alert.title,
        body: alert.body,
        type: alert.type as 'advisory' | 'update' | 'critical',
        target_barangays: (alert.target_barangays ?? []) as string[],
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
                className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                style={{ maxHeight: 'min(90vh, 720px)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                            <Pencil className="size-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Edit Alert</h3>
                            <p className="max-w-[200px] truncate text-[11px] text-neutral-400 dark:text-neutral-500">{alert.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-4">
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
                                    rows={8}
                                    className={`${inputClass} resize-y`}
                                    required
                                />
                            </FormField>
                        </div>
                        <div className="flex flex-col gap-4">
                            <FormField label="Type">
                                <div className="flex gap-2">
                                    {(['advisory', 'update', 'critical'] as const).map((t) => {
                                        const active = editForm.data.type === t;
                                        const colors = TYPE_COLORS[t];
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => editForm.setData('type', t)}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold capitalize transition-all ${
                                                    active
                                                        ? colors.active
                                                        : 'border-neutral-200 bg-neutral-50/50 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:border-neutral-600'
                                                }`}
                                            >
                                                <span className={`size-2 rounded-full ${active ? colors.dot : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FormField>
                            <FormField label="Target Home Address (optional)">
                                <BarangayMultiSelect
                                    barangays={barangays}
                                    selected={editForm.data.target_barangays}
                                    onChange={(val) => editForm.setData('target_barangays', val)}
                                />
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                    Leave empty to send to all users. Select specific addresses to target notifications.
                                </p>
                            </FormField>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
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
                            <Trash2 className="size-3.5" /> Delete
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
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

/* ═══════════════════════════════════════════════════════════════════════════════
   Alert Row
   ═══════════════════════════════════════════════════════════════════════════════ */

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

            {/* Alert */}
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

            {/* Type + barangay */}
            <td className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.update}`}>
                        {alert.type}
                    </span>
                    {alert.target_barangays && alert.target_barangays.length > 0 && (
                        <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-700/40"
                            title={alert.target_barangays.join(', ')}
                        >
                            <MapPin className="size-2.5" />
                            {alert.target_barangays.length} brgy
                        </span>
                    )}
                </div>
            </td>

            {/* Published */}
            <td className="whitespace-nowrap px-5 py-4">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{publishedDate}</p>
                <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{publishedTime}</p>
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
