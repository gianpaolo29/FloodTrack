import { Head } from '@inertiajs/react';
import { CheckCircle2, Clock, Download, FileDown, FileText, X } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Props {
    counts: {
        total: number;
        pending: number;
        resolved: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Export', href: '/admin/export' },
];

const STATUS_OPTIONS   = ['', 'pending', 'verified', 'assigned', 'resolved', 'rejected'];
const SEVERITY_OPTIONS = ['', 'critical', 'high', 'moderate', 'low'];

export default function AdminExport({ counts }: Props) {
    const [status,   setStatus]   = useState('');
    const [severity, setSeverity] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const hasFilters = !!(status || severity || dateFrom || dateTo);

    function buildUrl() {
        const params = new URLSearchParams();
        if (status)   params.set('status',    status);
        if (severity) params.set('severity',  severity);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to',   dateTo);
        const qs = params.toString();
        return `/admin/export/download${qs ? `?${qs}` : ''}`;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* ─── Header ─── */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Export Reports</h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Download report data as CSV with optional filters.
                    </p>
                </div>

                {/* ─── Summary cards ─── */}
                <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryCard icon={FileText} iconBg="bg-blue-50 dark:bg-blue-900/30" iconColor="text-blue-500" value={counts.total} label="Total Reports" />
                    <SummaryCard icon={Clock} iconBg="bg-amber-50 dark:bg-amber-900/30" iconColor="text-amber-500" value={counts.pending} label="Pending" valueColor="text-amber-600 dark:text-amber-400" />
                    <SummaryCard icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-900/30" iconColor="text-emerald-500" value={counts.resolved} label="Resolved" valueColor="text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* ─── Filter & Download ─── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Card header */}
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                            <Download className="size-3.5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Filter Before Exporting</h2>
                            <p className="text-[11px] text-neutral-400">All filters are optional</p>
                        </div>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col gap-5 p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FilterField label="Status">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">All statuses</option>
                                    {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </FilterField>

                            <FilterField label="Severity">
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">All severities</option>
                                    {SEVERITY_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </FilterField>

                            <FilterField label="From date">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className={selectCls}
                                />
                            </FilterField>

                            <FilterField label="To date">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className={selectCls}
                                />
                            </FilterField>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
                            <a href={buildUrl()}>
                                <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]">
                                    <FileDown className="size-4" />
                                    Download CSV
                                </button>
                            </a>
                            {hasFilters && (
                                <button
                                    onClick={() => {
                                        setStatus('');
                                        setSeverity('');
                                        setDateFrom('');
                                        setDateTo('');
                                    }}
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

/* ─── Shared ─── */

const selectCls =
    'h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-sky-500 dark:focus:bg-neutral-800';

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {label}
            </label>
            {children}
        </div>
    );
}

function SummaryCard({
    icon: Icon, iconBg, iconColor, value, label, valueColor,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    value: number;
    label: string;
    valueColor?: string;
}) {
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
