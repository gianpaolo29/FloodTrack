import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    Copy,
    Eye,
    FileText,
    Globe,
    ImageOff,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Report, ReportStatus, Responder, Severity } from '@/types/admin';
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

interface Props {
    reports: Paginated<Report>;
    responders: Responder[];
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Reports', href: '/admin/reports' },
];

const STATUS_OPTIONS = ['', 'pending', 'verified', 'assigned', 'resolved', 'rejected'];
const SEVERITY_OPTIONS = ['', 'critical', 'high', 'moderate', 'low'];

const STATUS_ICON: Record<ReportStatus, typeof Clock> = {
    pending: Clock,
    verified: CheckCircle2,
    assigned: ShieldCheck,
    resolved: CheckCircle2,
    rejected: XCircle,
};

export default function AdminReportsIndex({ reports, responders, filters }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/reports', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const hasFilters = !!(filters.status || filters.severity || filters.search);

    const allOnPageSelected = reports.data.length > 0 && reports.data.every((r) => selected.includes(r.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !reports.data.some((r) => r.id === id)));
        } else {
            const pageIds = reports.data.map((r) => r.id);
            setSelected([...new Set([...selected, ...pageIds])]);
        }
    };

    const toggleOne = (id: number) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const runBulkAction = async (action: string) => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected report(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post('/admin/reports/bulk', { ids: selected, action }, {
            preserveState: true,
            onFinish: () => {
                setBulkProcessing(false);
                setSelected([]);
            },
            onSuccess: () => swalSuccess('Done', `Bulk ${action} completed successfully.`),
        });
    };

    // Quick stats from current page data
    const pendingCount = reports.data.filter((r) => r.status === 'pending').length;
    const criticalCount = reports.data.filter((r) => r.severity === 'critical').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Flood Reports</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Monitor, verify, and manage incoming flood reports.
                        </p>
                    </div>
                    <Link href="/admin/reports/map">
                        <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]">
                            <Globe className="size-4" />
                            Map View
                        </button>
                    </Link>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatPill icon={FileText} label="Total" value={reports.total} color="blue" />
                    <StatPill icon={Clock} label="Pending" value={pendingCount} color="amber" />
                    <StatPill icon={AlertTriangle} label="Critical" value={criticalCount} color="red" />
                    <StatPill icon={ShieldCheck} label="Responders" value={responders.length} color="emerald" />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200/60 bg-white px-5 py-3.5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                            placeholder="Search reference or address..."
                            defaultValue={filters.search ?? ''}
                            className="pl-9 rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-sm placeholder:text-neutral-400/60 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    filter('search', (e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                    </div>
                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />
                    <FilterSelect
                        value={filters.status ?? ''}
                        onChange={(v) => filter('status', v)}
                        options={STATUS_OPTIONS}
                        placeholder="All statuses"
                    />
                    <FilterSelect
                        value={filters.severity ?? ''}
                        onChange={(v) => filter('severity', v)}
                        options={SEVERITY_OPTIONS}
                        placeholder="All severities"
                    />
                    {hasFilters && (
                        <button
                            onClick={() => router.get('/admin/reports')}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
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
                                <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-5 w-px bg-sky-200 dark:bg-sky-800" />
                                <button
                                    onClick={() => runBulkAction('verify')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                                >
                                    <CheckCircle2 className="size-3.5" /> Verify
                                </button>
                                <button
                                    onClick={() => runBulkAction('reject')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400"
                                >
                                    <XCircle className="size-3.5" /> Reject
                                </button>
                                <button
                                    onClick={() => runBulkAction('reopen')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400"
                                >
                                    <RefreshCw className="size-3.5" /> Reopen
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

                {/* Report cards list */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Table header */}
                    <div className="flex items-center justify-between border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                <FileText className="size-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Reports</h2>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                    {reports.total}
                                </span>
                            </div>
                        </div>
                        {reports.data.length > 0 && (
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

                    {/* Report rows */}
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {reports.data.map((report) => (
                            <ReportRow
                                key={report.id}
                                report={report}
                                isSelected={selected.includes(report.id)}
                                onToggle={() => toggleOne(report.id)}
                            />
                        ))}
                        {reports.data.length === 0 && (
                            <div className="flex flex-col items-center gap-3 py-20">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <FileText className="size-6 text-neutral-400 dark:text-neutral-500" />
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No reports match the current filters</p>
                                {hasFilters && (
                                    <button
                                        onClick={() => router.get('/admin/reports')}
                                        className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {reports.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{(reports.current_page - 1) * reports.per_page + 1}</span>
                            &ndash;
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{Math.min(reports.current_page * reports.per_page, reports.total)}</span>
                            {' '}of{' '}
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{reports.total}</span>
                        </span>
                        <div className="flex gap-1">
                            {reports.links.map((link, i) => (
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
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

/* ─── Report Row ─── */

function ReportRow({
    report,
    isSelected,
    onToggle,
}: {
    report: Report;
    isSelected: boolean;
    onToggle: () => void;
}) {
    const StIcon = STATUS_ICON[report.status] ?? Clock;

    return (
        <div
            className={`group flex items-start gap-4 px-6 py-4 transition-colors ${
                isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30'
            }`}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="mt-1.5 size-4 shrink-0 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
            />

            {/* Left: status icon */}
            <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                report.status === 'resolved' ? 'bg-emerald-100 dark:bg-emerald-950/40' :
                report.status === 'rejected' ? 'bg-neutral-100 dark:bg-neutral-800' :
                report.status === 'assigned' ? 'bg-indigo-100 dark:bg-indigo-950/40' :
                report.status === 'verified' ? 'bg-blue-100 dark:bg-blue-950/40' :
                'bg-amber-100 dark:bg-amber-950/40'
            }`}>
                <StIcon className={`size-4 ${
                    report.status === 'resolved' ? 'text-emerald-600 dark:text-emerald-400' :
                    report.status === 'rejected' ? 'text-neutral-500 dark:text-neutral-400' :
                    report.status === 'assigned' ? 'text-indigo-600 dark:text-indigo-400' :
                    report.status === 'verified' ? 'text-blue-600 dark:text-blue-400' :
                    'text-amber-600 dark:text-amber-400'
                }`} />
            </div>

            {/* Center: details */}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {report.reference_number}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[report.severity]}`}>
                        {report.severity}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[report.status]}`}>
                        {report.status}
                    </span>
                    {report.potential_duplicate_of != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <Sparkles className="size-2.5" />
                            Duplicate
                        </span>
                    )}
                    {report.ai_image_verified === false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <ImageOff className="size-2.5" />
                            Bad image
                        </span>
                    )}
                    {report.ai_flagged && report.potential_duplicate_of == null && report.ai_image_verified !== false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <Sparkles className="size-2.5" />
                            Suspicious
                        </span>
                    )}
                    {report.ai_image_verified === true && !report.ai_flagged && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <Sparkles className="size-2.5" />
                            AI verified
                        </span>
                    )}
                </div>

                {report.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-md">
                        <span className="shrink-0 size-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                        {report.address}
                    </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 dark:text-neutral-500">
                    <span>
                        by <span className="font-medium text-neutral-600 dark:text-neutral-300">{report.user?.name ?? 'Unknown'}</span>
                    </span>
                    {report.assigned_responder && (
                        <span className="flex items-center gap-1">
                            <ShieldCheck className="size-3" />
                            <span className="font-medium text-neutral-600 dark:text-neutral-300">{report.assigned_responder.name}</span>
                        </span>
                    )}
                    <span>
                        {new Date(report.created_at).toLocaleDateString('en-PH', {
                            month: 'short', day: 'numeric', year: 'numeric',
                        })}
                    </span>
                </div>
            </div>

            {/* Right: view link */}
            <Link
                href={`/admin/reports/${report.id}`}
                className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-600 opacity-0 transition-all hover:bg-sky-50 group-hover:opacity-100 dark:text-sky-400 dark:hover:bg-sky-950/30"
            >
                <Eye className="size-3.5" />
                View
                <ArrowUpRight className="size-3" />
            </Link>
        </div>
    );
}

/* ─── Stat Pill ─── */

const STAT_STYLES = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200/60 dark:border-blue-800/40', icon: 'text-blue-600 dark:text-blue-400', value: 'text-blue-900 dark:text-blue-100' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/60 dark:border-amber-800/40', icon: 'text-amber-600 dark:text-amber-400', value: 'text-amber-900 dark:text-amber-100' },
    red:     { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200/60 dark:border-red-800/40', icon: 'text-red-600 dark:text-red-400', value: 'text-red-900 dark:text-red-100' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/60 dark:border-emerald-800/40', icon: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-900 dark:text-emerald-100' },
} as const;

function StatPill({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: number; color: keyof typeof STAT_STYLES }) {
    const s = STAT_STYLES[color];
    return (
        <div className={`flex items-center gap-3 rounded-xl border ${s.border} ${s.bg} px-4 py-3 transition-shadow hover:shadow-sm`}>
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                <Icon className={`size-4.5 ${s.icon}`} />
            </div>
            <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.value}`}>{value}</p>
            </div>
        </div>
    );
}

/* ─── Filter Select ─── */

function FilterSelect({
    value, onChange, options, placeholder, labelMap,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder: string;
    labelMap?: Record<string, string>;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
        >
            <option value="">{placeholder}</option>
            {options.filter(Boolean).map((opt) => (
                <option key={opt} value={opt}>
                    {labelMap?.[opt] ?? opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                </option>
            ))}
        </select>
    );
}
