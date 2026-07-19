import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileText,
    Filter,
    Globe,
    ImageOff,
    MapPin,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
    X,
    XCircle,
    AlertTriangle,
    Clock,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Report, ReportStatus, Severity } from '@/types/admin';
import { SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Filters {
    status?: string;
    severity?: string;
    search?: string;
}

interface Stats {
    total: number;
    pending: number;
    critical: number;
    resolved: number;
}

interface Props {
    reports: Paginated<Report>;
    filters: Filters;
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Reports', href: '/admin/reports' },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
    { value: 'critical', label: 'Critical' },
    { value: 'high',     label: 'High' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'low',      label: 'Low' },
];

const STATUS_LABEL: Record<string, string> = {
    pending:  'Pending',
    verified: 'Approved',
    assigned: 'Assigned',
    resolved: 'Resolved',
    rejected: 'Rejected',
};

export default function AdminReportsIndex({ reports, filters, stats }: Props) {
    const [selected, setSelected]             = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [searchValue, setSearchValue]       = useState(filters.search ?? '');
    const searchRef                            = useRef<HTMLInputElement>(null);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/reports', { ...filters, [key]: value || undefined, page: undefined }, {
            preserveState: false,
            replace: true,
        });
    }, [filters]);

    const clearFilters = () => {
        setSearchValue('');
        router.get('/admin/reports', { status: filters.status }, { preserveState: false, replace: true });
    };

    const hasExtraFilters = !!(filters.severity || filters.search);
    const allOnPageSelected = reports.data.length > 0 && reports.data.every((r) => selected.includes(r.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !reports.data.some((r) => r.id === id)));
        } else {
            setSelected([...new Set([...selected, ...reports.data.map((r) => r.id)])]);
        }
    };

    const toggleOne = (id: number) =>
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

    const runBulkAction = async (action: string) => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected report(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post('/admin/reports/bulk', { ids: selected, action }, {
            preserveState: true,
            onFinish: () => { setBulkProcessing(false); setSelected([]); },
            onSuccess: () => swalSuccess('Done', `Bulk ${action} completed.`),
        });
    };

    const activeStatusLabel = filters.status ? (STATUS_LABEL[filters.status] ?? filters.status) : 'All Reports';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25">
                            <FileText className="size-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                {activeStatusLabel}
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Monitor, verify, and manage incoming flood reports.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/admin/reports/map"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 transition-all hover:brightness-110 hover:shadow-md active:scale-[0.97]"
                    >
                        <Globe className="size-4" />
                        Map View
                    </Link>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-sm shadow-teal-500/20">
                            <FileText className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.total}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Reports</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">All time submissions</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm shadow-amber-500/20">
                            <Clock className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.pending}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Pending Review</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Awaiting verification</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 shadow-sm shadow-red-500/20">
                            <AlertTriangle className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.critical}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Critical Severity</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Needs urgent action</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/20">
                            <CheckCircle2 className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.resolved}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Resolved</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Successfully closed</p>
                    </div>
                </div>

                {/* Bulk action bar */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-wrap items-center gap-2 rounded-2xl border border-teal-200/70 bg-gradient-to-r from-teal-50 to-cyan-50 px-5 py-3.5 shadow-sm dark:border-teal-800/40 dark:from-teal-950/30 dark:to-cyan-950/20"
                        >
                            <div className="flex size-6 items-center justify-center rounded-full bg-teal-500 text-[11px] font-bold text-white">
                                {selected.length}
                            </div>
                            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">selected</span>
                            <div className="mx-1 h-4 w-px bg-teal-200 dark:bg-teal-800" />
                            {[
                                { action: 'verify', label: 'Verify', icon: CheckCircle2, cls: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/40 dark:bg-neutral-900 dark:text-emerald-400' },
                                { action: 'reject', label: 'Reject', icon: XCircle,     cls: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50 dark:border-amber-800/40 dark:bg-neutral-900 dark:text-amber-400' },
                                { action: 'reopen', label: 'Reopen', icon: RefreshCw,   cls: 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-800/40 dark:bg-neutral-900 dark:text-blue-400' },
                                { action: 'delete', label: 'Delete', icon: Trash2,      cls: 'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:bg-neutral-900 dark:text-red-400' },
                            ].map(({ action, label, icon: Icon, cls }) => (
                                <button
                                    key={action}
                                    onClick={() => runBulkAction(action)}
                                    disabled={bulkProcessing}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${cls}`}
                                >
                                    <Icon className="size-3.5" /> {label}
                                </button>
                            ))}
                            <button
                                onClick={() => setSelected([])}
                                className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400"
                            >
                                Deselect all
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Table card */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{activeStatusLabel}</span>
                            <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                                {reports.total}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') filter('search', searchValue); }}
                                    placeholder="Search reference or address…"
                                    className="h-9 w-56 rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-teal-500 dark:focus:bg-neutral-900"
                                />
                            </div>

                            {/* Severity filter */}
                            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50/50 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800/50">
                                <Filter className="size-3.5 shrink-0 text-neutral-400" />
                                <span className="pr-1 text-xs text-neutral-400">Severity</span>
                                {SEVERITY_OPTIONS.map((opt) => {
                                    const active = filters.severity === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => filter('severity', active ? '' : opt.value)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                                active
                                                    ? SEVERITY_COLORS[opt.value as Severity]
                                                    : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active chips */}
                            <AnimatePresence>
                                {filters.search && (
                                    <motion.span
                                        key="search-chip"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:border-teal-800/40 dark:bg-teal-950/30 dark:text-teal-400"
                                    >
                                        <Search className="size-3" />
                                        "{filters.search}"
                                        <button onClick={() => { setSearchValue(''); filter('search', ''); }} className="rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/40">
                                            <X className="size-3" />
                                        </button>
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {hasExtraFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <X className="size-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    {reports.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-24">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25">
                                <FileText className="size-7 text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No reports found</p>
                                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasExtraFilters ? 'Try adjusting your filters.' : 'No reports in this category yet.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                        {/* Mobile card view */}
                        <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                            {reports.data.map((report) => (
                                <Link key={report.id} href={`/admin/reports/${report.id}`} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs font-bold tracking-wide text-neutral-800 dark:text-neutral-200">{report.reference_number}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${SEVERITY_COLORS[report.severity as Severity]}`}>{report.severity}</span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${STATUS_COLORS[report.status as ReportStatus]}`}>{STATUS_LABEL[report.status] ?? report.status}</span>
                                        </div>
                                    </div>
                                    {report.address && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="size-3 shrink-0 text-neutral-300 dark:text-neutral-600" />
                                            <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{report.address}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
                                        <span>{report.user?.name ?? 'Unknown'}</span>
                                        <span>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full min-w-[680px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-800/40">
                                        <th className="w-12 px-5 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={allOnPageSelected}
                                                onChange={toggleAll}
                                                className="size-3.5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500/20 dark:border-neutral-600"
                                            />
                                        </th>
                                        {['Report', 'Location', 'Severity', 'Status', 'Reporter', 'Date', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                    {reports.data.map((report) => (
                                        <ReportRow
                                            key={report.id}
                                            report={report}
                                            isSelected={selected.includes(report.id)}
                                            onToggle={() => toggleOne(report.id)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}

                    {/* Pagination */}
                    {reports.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {reports.total} report{reports.total !== 1 ? 's' : ''} total
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        const prev = reports.links[0];
                                        if (prev?.url) router.get(prev.url);
                                    }}
                                    disabled={reports.current_page === 1}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {reports.links.slice(1, -1).map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm'
                                                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                                            }`}
                                        >
                                            {link.label}
                                        </button>
                                    ) : null,
                                )}
                                <button
                                    onClick={() => {
                                        const next = reports.links[reports.links.length - 1];
                                        if (next?.url) router.get(next.url);
                                    }}
                                    disabled={reports.current_page === reports.last_page}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── Report Row ─── */

function ReportRow({ report, isSelected, onToggle }: {
    report: Report;
    isSelected: boolean;
    onToggle: () => void;
}) {
    const aiFlags = [
        report.potential_duplicate_of != null && { icon: Copy,        label: 'Duplicate', cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-950/30 dark:text-amber-400' },
        report.ai_image_verified === false     && { icon: ImageOff,    label: 'Bad image', cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-950/30 dark:text-amber-400' },
        report.ai_flagged && report.potential_duplicate_of == null && report.ai_image_verified !== false
                                               && { icon: AlertCircle, label: 'Flagged',   cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-950/30 dark:text-amber-400' },
        report.ai_image_verified === true && !report.ai_flagged
                                               && { icon: Sparkles,    label: 'AI ok',     cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-400' },
    ].filter(Boolean) as { icon: React.ElementType; label: string; cls: string }[];

    return (
        <tr
            className={`group transition-colors ${
                isSelected
                    ? 'bg-teal-50/70 dark:bg-teal-950/20'
                    : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30'
            }`}
        >
            {/* Checkbox */}
            <td className="w-12 px-5 py-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    className="size-3.5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500/20 dark:border-neutral-600"
                />
            </td>

            {/* Reference + AI flags */}
            <td className="px-4 py-4">
                <span className="font-mono text-xs font-bold tracking-wide text-neutral-800 dark:text-neutral-200">
                    {report.reference_number}
                </span>
                {aiFlags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {aiFlags.map(({ icon: Icon, label, cls }) => (
                            <span key={label} className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
                                <Icon className="size-2.5" />
                                {label}
                            </span>
                        ))}
                    </div>
                )}
            </td>

            {/* Location */}
            <td className="px-4 py-4">
                <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-300 dark:text-neutral-600" />
                    <span className="max-w-[180px] truncate text-xs text-neutral-500 dark:text-neutral-400" title={report.address ?? undefined}>
                        {report.address ?? <span className="italic text-neutral-300 dark:text-neutral-600">No address</span>}
                    </span>
                </div>
            </td>

            {/* Severity */}
            <td className="px-4 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${SEVERITY_COLORS[report.severity as Severity]}`}>
                    {report.severity}
                </span>
            </td>

            {/* Status */}
            <td className="px-4 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_COLORS[report.status as ReportStatus]}`}>
                    {STATUS_LABEL[report.status] ?? report.status}
                </span>
            </td>

            {/* Reporter */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-[10px] font-bold text-white shadow-sm">
                        {(report.user?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {report.user?.name ?? 'Unknown'}
                    </span>
                </div>
            </td>

            {/* Date */}
            <td className="px-4 py-4">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </td>

            {/* View button */}
            <td className="px-4 py-4 text-right">
                <Link
                    href={`/admin/reports/${report.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-teal-800/40 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
                >
                    View
                    <ArrowUpRight className="size-3.5" />
                </Link>
            </td>
        </tr>
    );
}
