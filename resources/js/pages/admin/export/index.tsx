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
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import type { BreadcrumbItem } from '@/types';

interface Props {
    stats: { total: number; pending: number; verified: number; assigned: number; resolved: number; rejected: number };
    trends: { total: number; resolved: number; label: string; period_label: string };
    period: string;
    custom_from: string | null;
    custom_to: string | null;
}

interface ExportErrors {
    dateFrom?: string;
    dateTo?: string;
    general?: string;
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

const STATUS_OPTIONS   = ['', 'pending', 'verified', 'acknowledged', 'assigned', 'resolved', 'rejected'];
const SEVERITY_OPTIONS = ['', 'critical', 'high', 'moderate', 'low'];
const EXPORT_LIMIT     = 10_000;

export default function AdminExport({ stats, trends, period, custom_from, custom_to }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

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

    const tl = trends.label;
    const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    const pendingPct = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
    const rejectedPct = stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total': {
                if (stats.total === 0) return 'No reports in the export pool this period.';
                const t = trends.total;
                const parts: string[] = [];
                if (t > 20) parts.push(`Report volume surging (${Math.abs(t)}% ${tl}) — larger exports expected.`);
                else if (t > 0) parts.push(`Report volume increasing (${Math.abs(t)}% ${tl}).`);
                else if (t === 0) parts.push(`Volume is steady ${tl}.`);
                else parts.push(`Report volume decreasing (${Math.abs(t)}% ${tl}) — fewer records to export.`);
                if (resolutionRate >= 70) parts.push(`Strong resolution rate at ${resolutionRate}% — export will show mostly completed cases.`);
                else if (resolutionRate >= 40) parts.push(`${resolutionRate}% resolved — export will include a mix of open and closed cases.`);
                else if (stats.total > 0) parts.push('Most reports are still open — export reflects ongoing operations.');
                return parts.join(' ');
            }
            case 'pending': {
                if (stats.pending === 0) return 'No pending reports — all have been processed through the pipeline.';
                const parts: string[] = [];
                if (pendingPct > 40) parts.push('High pending ratio — verification is falling behind. Exported data will show many unprocessed cases.');
                else if (pendingPct > 20) parts.push('Moderate pending volume — verification is keeping up but could be faster.');
                else parts.push('Low pending ratio — verification pipeline is working efficiently.');
                return parts.join(' ');
            }
            case 'verified': {
                if (stats.verified === 0) return 'No reports in verified status — they\'ve either moved to assignment or are still pending.';
                const parts: string[] = [];
                if (stats.verified > stats.assigned) parts.push('More verified than assigned — reports are waiting for responder assignment. Speed up the handoff.');
                else parts.push('Verified reports are moving to assignment quickly — good pipeline flow.');
                if (stats.pending > stats.verified) parts.push('Pending backlog is larger — verification needs to catch up.');
                return parts.join(' ');
            }
            case 'assigned': {
                if (stats.assigned === 0) return 'No reports currently assigned — either resolved quickly or awaiting assignment.';
                const parts: string[] = [];
                if (stats.assigned > stats.resolved) parts.push('More cases in progress than resolved — responders are actively working through the queue.');
                else parts.push('Fewer active than resolved — teams are clearing cases faster than new ones come in.');
                if (stats.pending > 0) parts.push('Some reports still pending — ensure the pipeline keeps moving from verification to assignment.');
                return parts.join(' ');
            }
            case 'resolved': {
                if (stats.resolved === 0) return 'No reports resolved yet — focus on moving cases through the pipeline to completion.';
                const t = trends.resolved;
                const parts: string[] = [];
                if (t > 20) parts.push(`Resolutions surging (${Math.abs(t)}% ${tl}) — strong completion momentum.`);
                else if (t > 0) parts.push(`Resolutions improving (${Math.abs(t)}% ${tl}) — teams are making progress.`);
                else if (t < 0) parts.push(`Resolutions slowing (${Math.abs(t)}% ${tl}) — investigate potential blockers.`);
                else parts.push(`Resolution pace steady ${tl}.`);
                if (resolutionRate >= 70) parts.push('Export will primarily contain completed cases — good data for analysis.');
                else parts.push('Export includes significant open cases — useful for tracking ongoing operations.');
                return parts.join(' ');
            }
            case 'rejected': {
                if (stats.rejected === 0) return 'No rejections — all submissions passed validation. Good data quality.';
                const parts: string[] = [];
                if (rejectedPct > 20) parts.push('High rejection rate — review submission criteria or provide better guidance to reporters.');
                else if (rejectedPct > 10) parts.push('Moderate rejection rate — some submissions don\'t meet standards, consider clearer guidelines.');
                else parts.push('Low rejection rate — submissions are generally valid and well-formed.');
                if (stats.pending > stats.rejected) parts.push('Pending queue is larger than rejections — verification quality looks balanced.');
                return parts.join(' ');
            }
            default: return '';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export" />

            <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6 lg:p-8">

                {/* ─── Header ─── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                            Export Reports
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                            Download report data as Excel with optional filters. Export is capped at {EXPORT_LIMIT.toLocaleString()} records.
                        </p>
                    </div>
                    <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/export" />
                </div>

                {/* ─── KPI Stats ─── */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <PrimaryStatCard
                        label="Total Reports"
                        value={stats.total}
                        trend={trends.total}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total')}
                        insights={[
                            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
                            { label: 'Resolved', value: stats.resolved, color: '#10b981' },
                        ]}
                        icon={FileText}
                        grad="from-neutral-800 via-neutral-900 to-neutral-950"
                        shadow="shadow-sm"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={Clock}
                        grad="from-neutral-700 to-neutral-800"
                        shadow="shadow-sm"
                        value={stats.pending}
                        label="Pending"
                        trend={undefined}
                        desc={smartDesc('pending')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={300}
                    />
                    <SecondaryStatCard
                        icon={ShieldCheck}
                        grad="from-neutral-600 to-neutral-700"
                        shadow="shadow-sm"
                        value={stats.verified}
                        label="Verified"
                        trend={undefined}
                        desc={smartDesc('verified')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={Users}
                        grad="from-neutral-700 to-neutral-800"
                        shadow="shadow-sm"
                        value={stats.assigned}
                        label="Assigned"
                        trend={undefined}
                        desc={smartDesc('assigned')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={500}
                    />
                    <SecondaryStatCard
                        icon={CheckCircle2}
                        grad="from-neutral-600 to-neutral-700"
                        shadow="shadow-sm"
                        value={stats.resolved}
                        label="Resolved"
                        trend={trends.resolved}
                        desc={smartDesc('resolved')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={600}
                    />
                    <SecondaryStatCard
                        icon={XCircle}
                        grad="from-neutral-400 to-neutral-500"
                        shadow="shadow-sm"
                        value={stats.rejected}
                        label="Rejected"
                        trend={undefined}
                        desc={smartDesc('rejected')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={700}
                    />
                </div>

                {/* ─── PDF Export ─── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 shadow-sm dark:bg-white">
                            <Printer className="size-3.5 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Dashboard PDF Report</h2>
                            <p className="text-[11px] text-neutral-400">Download a formatted PDF summary of the dashboard</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 p-3 sm:p-6">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Includes summary stats, status &amp; severity breakdowns, top responders, and the latest 20 reports.
                            Choose a period to scope the data.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {(['all', 'month', 'week', 'today'] as const).map((p) => (
                                <a
                                    key={p}
                                    href={`/admin/export/pdf${p !== 'all' ? `?period=${p}` : ''}`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-white"
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
                        <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 shadow-sm dark:bg-white">
                            <Download className="size-3.5 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                Excel Export
                            </h2>
                            <p className="text-[11px] text-neutral-400">Filter by status, severity, or date range · All filters optional</p>
                        </div>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-6">
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
                                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.97]"
                            >
                                <FileDown className="size-4" />
                                Download Excel
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
    'h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-neutral-500 dark:focus:bg-neutral-800';

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

