import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Clock,
    Download,
    FileDown,
    FileText,
    Printer,
    ShieldCheck,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface ReportCounts {
    total: number;
    pending: number;
    verified: number;
    assigned: number;
    resolved: number;
    rejected: number;
}

interface Props {
    counts: ReportCounts;
}

interface ExportErrors {
    dateFrom?: string;
    dateTo?: string;
    general?: string;
}

interface SummaryCardProps {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    value: number;
    label: string;
    valueColor?: string;
}

interface FilterFieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Export', href: '/admin/export' },
];

const STATUS_OPTIONS   = ['', 'pending', 'verified', 'assigned', 'resolved', 'rejected'];
const SEVERITY_OPTIONS = ['', 'critical', 'high', 'moderate', 'low'];
const EXPORT_LIMIT     = 10_000;

export default function AdminExport({ counts }: Props) {
    const [status,   setStatus]   = useState('');
    const [severity, setSeverity] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');
    const [errors,   setErrors]   = useState<ExportErrors>({});

    const hasFilters = !!(status || severity || dateFrom || dateTo);
    const today = new Date().toISOString().split('T')[0];

    function validate(): boolean {
        const errs: ExportErrors = {};

        if (dateFrom && dateTo && dateFrom > dateTo) {
            errs.dateFrom = '"From" date cannot be after "To" date.';
            errs.dateTo   = '"To" date cannot be before "From" date.';
        }

        if (dateFrom && dateFrom > today) {
            errs.dateFrom = '"From" date cannot be in the future.';
        }

        if (dateTo && dateTo > today) {
            errs.dateTo = '"To" date cannot be in the future.';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function buildUrl(): string {
        const params = new URLSearchParams();
        if (status)   params.set('status',    status);
        if (severity) params.set('severity',  severity);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to',   dateTo);
        const qs = params.toString();
        return `/admin/export/download${qs ? `?${qs}` : ''}`;
    }

    function handleDownload(e: React.MouseEvent<HTMLAnchorElement>) {
        if (!validate()) e.preventDefault();
    }

    function clearFilters() {
        setStatus('');
        setSeverity('');
        setDateFrom('');
        setDateTo('');
        setErrors({});
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* ─── Header ─── */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        Export Reports
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Download report data as CSV with optional filters. Export is capped at {EXPORT_LIMIT.toLocaleString()} records.
                    </p>
                </div>

                {/* ─── Summary cards ─── */}
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <SummaryCard
                        icon={FileText}
                        iconBg="bg-blue-50 dark:bg-blue-900/30"
                        iconColor="text-blue-500"
                        value={counts.total}
                        label="Total"
                    />
                    <SummaryCard
                        icon={Clock}
                        iconBg="bg-amber-50 dark:bg-amber-900/30"
                        iconColor="text-amber-500"
                        value={counts.pending}
                        label="Pending"
                        valueColor="text-amber-600 dark:text-amber-400"
                    />
                    <SummaryCard
                        icon={ShieldCheck}
                        iconBg="bg-sky-50 dark:bg-sky-900/30"
                        iconColor="text-sky-500"
                        value={counts.verified}
                        label="Verified"
                        valueColor="text-sky-600 dark:text-sky-400"
                    />
                    <SummaryCard
                        icon={Users}
                        iconBg="bg-violet-50 dark:bg-violet-900/30"
                        iconColor="text-violet-500"
                        value={counts.assigned}
                        label="Assigned"
                        valueColor="text-violet-600 dark:text-violet-400"
                    />
                    <SummaryCard
                        icon={CheckCircle2}
                        iconBg="bg-emerald-50 dark:bg-emerald-900/30"
                        iconColor="text-emerald-500"
                        value={counts.resolved}
                        label="Resolved"
                        valueColor="text-emerald-600 dark:text-emerald-400"
                    />
                    <SummaryCard
                        icon={XCircle}
                        iconBg="bg-red-50 dark:bg-red-900/30"
                        iconColor="text-red-400"
                        value={counts.rejected}
                        label="Rejected"
                        valueColor="text-red-500 dark:text-red-400"
                    />
                </div>

                {/* ─── PDF Export ─── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-sm">
                            <Printer className="size-3.5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Dashboard PDF Report</h2>
                            <p className="text-[11px] text-neutral-400">Download a formatted PDF summary of the dashboard</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 p-6">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Includes summary stats, status &amp; severity breakdowns, top responders, and the latest 20 reports.
                            Choose a period to scope the data.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {(['all', 'month', 'week', 'today'] as const).map((p) => (
                                <a
                                    key={p}
                                    href={`/admin/export/pdf${p !== 'all' ? `?period=${p}` : ''}`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                >
                                    <Printer className="size-3.5" />
                                    {{ all: 'All Time', month: 'This Month', week: 'This Week', today: 'Today' }[p]}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Filter & Download ─── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Card header */}
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                            <Download className="size-3.5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                CSV Export
                            </h2>
                            <p className="text-[11px] text-neutral-400">Filter by status, severity, or date range · All filters optional</p>
                        </div>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col gap-5 p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FilterField label="Status">
                                <div className="relative">
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className={`${selectCls} appearance-none pr-8`}
                                    >
                                        <option value="">All statuses</option>
                                        {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                                </div>
                            </FilterField>

                            <FilterField label="Severity">
                                <div className="relative">
                                    <select
                                        value={severity}
                                        onChange={(e) => setSeverity(e.target.value)}
                                        className={`${selectCls} appearance-none pr-8`}
                                    >
                                        <option value="">All severities</option>
                                        {SEVERITY_OPTIONS.filter(Boolean).map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                                </div>
                            </FilterField>

                            <FilterField label="From date" error={errors.dateFrom}>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    max={dateTo || today}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setErrors(({ dateFrom: _, general: __, ...rest }) => rest);
                                    }}
                                    className={`${selectCls} ${errors.dateFrom ? '!border-red-400 !ring-red-500/10' : ''}`}
                                />
                            </FilterField>

                            <FilterField label="To date" error={errors.dateTo}>
                                <input
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    max={today}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setErrors(({ dateTo: _, general: __, ...rest }) => rest);
                                    }}
                                    className={`${selectCls} ${errors.dateTo ? '!border-red-400 !ring-red-500/10' : ''}`}
                                />
                            </FilterField>
                        </div>

                        {/* General validation error */}
                        {errors.general && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
                                <AlertCircle className="size-4 shrink-0" />
                                {errors.general}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
                            <a
                                href={buildUrl()}
                                onClick={handleDownload}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                            >
                                <FileDown className="size-4" />
                                Download CSV
                            </a>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <X className="size-3.5" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── Shared styles ─── */

const selectCls =
    'h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-sky-500 dark:focus:bg-neutral-800';

/* ─── Sub-components ─── */

function FilterField({ label, error, children }: FilterFieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {label}
            </label>
            {children}
            {error && <p className="text-[11px] text-red-500 dark:text-red-400">{error}</p>}
        </div>
    );
}

function SummaryCard({ icon: Icon, iconBg, iconColor, value, label, valueColor }: SummaryCardProps) {
    return (
        <div className="group relative rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
                <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg} transition-transform group-hover:scale-110`}>
                    <Icon className={`size-[18px] ${iconColor}`} />
                </div>
            </div>
            <p className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${valueColor ?? 'text-neutral-900 dark:text-white'}`}>
                {value.toLocaleString()}
            </p>
        </div>
    );
}
