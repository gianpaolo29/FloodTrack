import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    FileText,
    Filter,
    Globe,
    ImageOff,
    MapPin,
    RefreshCw,
    Search,
    Sparkles,
    AlertTriangle,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Report, ReportStatus, Severity, SlaStatus } from '@/types/admin';
import { SEVERITY_COLORS, SLA_STATUS_COLORS, SLA_STATUS_LABELS, STATUS_COLORS } from '@/types/admin';

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
    team_id?: string;
}

interface Stats {
    total: number;
    pending: number;
    critical: number;
    resolved: number;
}

interface Trends {
    total?: number;
    pending?: number;
    critical?: number;
    resolved?: number;
    label: string;
    period_label: string;
}

interface Props {
    reports: Paginated<Report>;
    filters: Filters;
    stats: Stats;
    trends: Trends;
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
    teams: { id: number; name: string }[];
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

/* ─── Main page ─── */
export default function AdminReportsIndex({ reports, filters, stats, trends, period, custom_from, custom_to, teams }: Props) {
    const [selected, setSelected]             = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [searchValue, setSearchValue]       = useState(filters.search ?? '');
    const [mounted, setMounted]               = useState(false);
    const searchRef                            = useRef<HTMLInputElement>(null);

    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const tl = trends.label;
    const pendingPct = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
    const criticalPct = stats.total > 0 ? Math.round((stats.critical / stats.total) * 100) : 0;
    const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    const activeCases = stats.total - stats.resolved - stats.pending;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total': {
                if (stats.total === 0) return 'No reports submitted yet for this period.';
                const t = trends.total;
                const parts: string[] = [];
                if (t > 20) parts.push(`Reports surged ${Math.abs(t)}% ${tl} — consider deploying additional responders to handle the volume.`);
                else if (t > 0) parts.push(`Reports are gradually increasing (${Math.abs(t)}% ${tl}) — monitor for further escalation.`);
                else if (t === 0) parts.push(`Report volume is stable ${tl} — no unusual activity detected.`);
                else if (t > -20) parts.push(`Reports are easing slightly (${Math.abs(t)}% ${tl}) — situation is stabilizing.`);
                else parts.push(`Reports dropped significantly (${Math.abs(t)}% ${tl}) — good time to focus on clearing the backlog.`);
                if (resolutionRate >= 80) parts.push(`Strong resolution performance at ${resolutionRate}% — maintain this pace.`);
                else if (resolutionRate >= 50) parts.push(`Resolution rate at ${resolutionRate}% — push to close more cases before the queue grows.`);
                else if (resolutionRate > 0) parts.push(`Only ${resolutionRate}% resolved — prioritize closing open reports.`);
                if (pendingPct > 40) parts.push('Verification is a bottleneck — consider assigning more reviewers.');
                else if (criticalPct > 25) parts.push('High critical ratio — triage and escalate urgent cases first.');
                return parts.join(' ');
            }
            case 'pending': {
                if (stats.pending === 0) return 'All caught up — no reports pending. Verification pipeline is clear, focus on resolving active cases.';
                const t = trends.pending;
                const parts: string[] = [];
                if (t > 20) parts.push(`Pending queue surging (${Math.abs(t)}% ${tl}) — verification is falling behind, allocate more reviewers.`);
                else if (t > 0) parts.push(`Pending queue growing (${Math.abs(t)}% ${tl}) — try to verify reports faster.`);
                else if (t < -20) parts.push(`Pending queue clearing fast (${Math.abs(t)}% ${tl}) — excellent verification pace.`);
                else if (t < 0) parts.push(`Pending queue shrinking (${Math.abs(t)}% ${tl}) — good progress on reviews.`);
                else parts.push(`Pending queue unchanged ${tl}.`);
                if (pendingPct > 40) parts.push('Over 40% of reports are stuck in review — this is the primary bottleneck.');
                else if (pendingPct > 20) parts.push('Moderate pending load — stay on top of incoming reports.');
                else parts.push('Pending volume is manageable — keep the momentum going.');
                if (stats.critical > 0 && stats.pending > 0) parts.push('Check for critical reports in the pending queue — those need immediate attention.');
                return parts.join(' ');
            }
            case 'critical': {
                if (stats.critical === 0) return 'No critical reports this period — severity levels are stable. Focus on maintaining response readiness.';
                const t = trends.critical;
                const parts: string[] = [];
                if (t > 20) parts.push(`Critical reports surging (${Math.abs(t)}% ${tl}) — escalate response and brief all teams immediately.`);
                else if (t > 0) parts.push(`Critical reports rising (${Math.abs(t)}% ${tl}) — increase monitoring and prepare for escalation.`);
                else if (t < -20) parts.push(`Critical reports dropping fast (${Math.abs(t)}% ${tl}) — emergency is subsiding, shift focus to recovery.`);
                else if (t < 0) parts.push(`Critical reports declining (${Math.abs(t)}% ${tl}) — situation is improving, maintain vigilance.`);
                else parts.push(`Critical count unchanged ${tl} — sustained pressure, don't reduce response efforts.`);
                if (criticalPct > 30) parts.push('Majority of reports are high severity — prioritize these over lower-severity cases.');
                else parts.push('Critical cases are a smaller share — balance response across all severities.');
                return parts.join(' ');
            }
            case 'resolved': {
                if (stats.resolved === 0) return stats.total > 0 ? 'No reports resolved yet — focus on verifying pending cases and assigning to responders.' : 'No reports to resolve this period.';
                const t = trends.resolved;
                const parts: string[] = [];
                if (t > 20) parts.push(`Resolutions surging (${Math.abs(t)}% ${tl}) — excellent team performance, keep this momentum.`);
                else if (t > 0) parts.push(`Resolutions improving (${Math.abs(t)}% ${tl}) — response teams are making progress.`);
                else if (t < -20) parts.push(`Resolutions slowing sharply (${Math.abs(t)}% ${tl}) — investigate what's blocking closures.`);
                else if (t < 0) parts.push(`Resolutions declining (${Math.abs(t)}% ${tl}) — check if teams need support or redistribution.`);
                else parts.push(`Resolution pace is steady ${tl}.`);
                if (resolutionRate >= 80) parts.push(`${resolutionRate}% resolution rate — outstanding clearance, nearly done.`);
                else if (resolutionRate >= 50) parts.push(`${resolutionRate}% resolved — good progress but more cases need attention.`);
                else parts.push(`Only ${resolutionRate}% resolved — significant backlog remains, prioritize closures.`);
                return parts.join(' ');
            }
            default: return '';
        }
    }

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

    const filtered = reports.data.filter((r) => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return r.reference_number.toLowerCase().includes(q) || (r.address ?? '').toLowerCase().includes(q) || (r.user?.name ?? '').toLowerCase().includes(q);
    });

    const hasExtraFilters = !!(filters.severity || searchValue || filters.team_id);
    const allOnPageSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !filtered.some((r) => r.id === id)));
        } else {
            setSelected([...new Set([...selected, ...filtered.map((r) => r.id)])]);
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
            preserveState: false,
            onFinish: () => { setBulkProcessing(false); setSelected([]); },
            onSuccess: () => swalSuccess('Done', `Bulk ${action} completed.`),
        });
    };

    const activeStatusLabel = filters.status ? (STATUS_LABEL[filters.status] ?? filters.status) : 'All Reports';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-cyan-50/20 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
            <div className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-6 lg:p-8">

                {/* ── Header ── */}
                <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 shadow-xl shadow-teal-500/30">
                            <FileText className="size-4 sm:size-5 text-white" />
                            <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-lg sm:text-2xl font-extrabold tracking-tight text-transparent dark:from-white dark:to-neutral-400">
                                {activeStatusLabel}
                            </h1>
                            <p className="mt-0.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Monitor, verify, and manage incoming flood reports.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/reports" />
                        <Link
                            href="/admin/reports/map"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] hover:shadow-teal-500/40 active:scale-[0.97]"
                        >
                            <Globe className="size-4" />
                            Map View
                        </Link>
                    </div>
                </div>

                {/* ── Stats cards ── */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <PrimaryStatCard
                        label="Total Reports"
                        value={stats.total}
                        trend={trends.total}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total')}
                        insights={[
                            { label: 'Critical', value: stats.critical, color: '#ef4444' },
                            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
                        ]}
                        icon={FileText}
                        grad="from-teal-500 via-cyan-500 to-blue-500"
                        shadow="shadow-teal-500/40"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <PrimaryStatCard
                        label="Pending Review"
                        value={stats.pending}
                        trend={trends.pending}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('pending')}
                        insights={[
                            { label: '% of total', value: stats.total > 0 ? `${Math.round((stats.pending / stats.total) * 100)}%` : '0%' },
                        ]}
                        icon={Clock}
                        grad="from-amber-500 via-orange-500 to-yellow-500"
                        shadow="shadow-amber-500/40"
                        alert={stats.pending > 0}
                        index={1}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={AlertTriangle}
                        grad="from-red-500 to-rose-500"
                        shadow="shadow-red-500/25"
                        value={stats.critical}
                        label="Critical Severity"
                        trend={trends.critical}
                        desc={smartDesc('critical')}
                        insights={[
                            { label: '% critical', value: stats.total > 0 ? `${Math.round((stats.critical / stats.total) * 100)}%` : '0%', color: '#ef4444' },
                        ]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={CheckCircle2}
                        grad="from-emerald-500 to-teal-500"
                        shadow="shadow-emerald-500/25"
                        value={stats.resolved}
                        label="Resolved"
                        trend={trends.resolved}
                        desc={smartDesc('resolved')}
                        insights={[
                            { label: 'Resolution rate', value: stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '0%', color: '#10b981' },
                        ]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={500}
                    />
                </div>

                {/* ── Bulk action bar ── */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-wrap items-center gap-2 rounded-2xl border border-teal-200/70 bg-gradient-to-r from-teal-50 via-cyan-50/60 to-teal-50/30 px-5 py-3.5 shadow-sm shadow-teal-500/5 dark:border-teal-800/40 dark:from-teal-950/30 dark:to-cyan-950/20"
                        >
                            <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-[11px] font-bold text-white shadow-sm">
                                {selected.length}
                            </div>
                            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">selected</span>
                            <div className="mx-1 h-4 w-px bg-teal-200 dark:bg-teal-800" />
                            {[
                                { action: 'verify', label: 'Verify', icon: CheckCircle2, cls: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/40 dark:bg-neutral-900 dark:text-emerald-400' },
                                { action: 'reject', label: 'Reject', icon: XCircle,     cls: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800/40 dark:bg-neutral-900 dark:text-amber-400' },
                                { action: 'reopen', label: 'Reopen', icon: RefreshCw,   cls: 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800/40 dark:bg-neutral-900 dark:text-blue-400' },
                                { action: 'delete', label: 'Delete', icon: Trash2,      cls: 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800/40 dark:bg-neutral-900 dark:text-red-400' },
                            ].map(({ action, label, icon: Icon, cls }) => (
                                <button
                                    key={action}
                                    onClick={() => runBulkAction(action)}
                                    disabled={bulkProcessing}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 ${cls}`}
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

                {/* ── Table card ── */}
                <div className={`relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-all duration-700 delay-300 dark:border-neutral-700/60 dark:bg-neutral-900 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>

                    {/* Animated top border */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/25 to-transparent" />

                    {/* ── Toolbar ── */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/50 px-3 sm:px-5 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{activeStatusLabel}</span>
                            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-bold text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
                                {reports.total}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className="relative w-56">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="Search reference or address…"
                                    className="h-9 w-full rounded-xl border border-neutral-200/80 bg-white pl-9 pr-8 text-sm shadow-sm outline-none transition-all placeholder:text-neutral-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-teal-500"
                                />
                                {searchValue && (
                                    <button onClick={() => setSearchValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Severity filter */}
                            <div className="flex items-center gap-1 rounded-xl border border-neutral-200/80 bg-white px-2 py-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
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

                            {/* Team filter */}
                            {teams.length > 0 && (
                                <select
                                    value={filters.team_id ?? ''}
                                    onChange={(e) => filter('team_id', e.target.value)}
                                    className="h-9 rounded-xl border border-neutral-200/80 bg-white px-3 text-xs font-medium text-neutral-600 shadow-sm outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                >
                                    <option value="">All Teams</option>
                                    {teams.map((t) => (
                                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                                    ))}
                                </select>
                            )}

                            {/* Active filter chips */}
                            <AnimatePresence>
                                {filters.team_id && (
                                    <motion.span
                                        key="team-chip"
                                        initial={{ opacity: 0, scale: 0.88 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.88 }}
                                        transition={{ duration: 0.15 }}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400"
                                    >
                                        <Filter className="size-3" />
                                        {teams.find((t) => String(t.id) === filters.team_id)?.name ?? 'Team'}
                                        <button onClick={() => filter('team_id', '')} className="rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/40">
                                            <X className="size-3" />
                                        </button>
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            <AnimatePresence>
                                {searchValue && (
                                    <motion.span
                                        key="search-chip"
                                        initial={{ opacity: 0, scale: 0.88 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.88 }}
                                        transition={{ duration: 0.15 }}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:border-teal-800/40 dark:bg-teal-950/30 dark:text-teal-400"
                                    >
                                        <Search className="size-3" />
                                        &ldquo;{searchValue}&rdquo;
                                        <button onClick={() => setSearchValue('')} className="rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/40">
                                            <X className="size-3" />
                                        </button>
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {hasExtraFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                >
                                    <X className="size-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Content ── */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-28">
                            <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-xl shadow-teal-500/25">
                                <FileText className="size-7 text-white" />
                                <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No reports found</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasExtraFilters ? 'Try adjusting your filters.' : 'No reports in this category yet.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                        {/* Mobile card view */}
                        <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filtered.map((report) => (
                                <Link key={report.id} href={`/admin/reports/${report.id}`}
                                    className="flex flex-col gap-2.5 px-4 py-4 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                            {report.reference_number}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${SEVERITY_COLORS[report.severity as Severity]}`}>{report.severity}</span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${STATUS_COLORS[report.status as ReportStatus]}`}>{STATUS_LABEL[report.status] ?? report.status}</span>
                                            {report.sla_status && (
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${SLA_STATUS_COLORS[report.sla_status as SlaStatus]}`}>
                                                    {SLA_STATUS_LABELS[report.sla_status as SlaStatus]}
                                                </span>
                                            )}
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
                            <table className="w-full min-w-[720px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                        <th className="w-12 px-5 py-3.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={allOnPageSelected}
                                                onChange={toggleAll}
                                                className="size-3.5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500/20 dark:border-neutral-600"
                                            />
                                        </th>
                                        {['Report', 'Location', 'Severity', 'Status', 'SLA', 'Team', 'Reporter', 'Date', ''].map((h) => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-neutral-500">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                    {filtered.map((report) => (
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

                    {/* ── Pagination ── */}
                    {reports.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/40 px-3 sm:px-5 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/20">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{reports.total}</span> report{reports.total !== 1 ? 's' : ''}
                                {' '}· Page <span className="font-semibold text-neutral-900 dark:text-neutral-100">{reports.current_page}</span> of {reports.last_page}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { const prev = reports.links[0]; if (prev?.url) router.get(prev.url); }}
                                    disabled={reports.current_page === 1}
                                    className="flex size-8 items-center justify-center rounded-lg border border-neutral-200/80 bg-white text-neutral-400 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                >
                                    <ChevronLeft className="size-3.5" />
                                </button>
                                {reports.links.slice(1, -1).map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25'
                                                    : 'border border-neutral-200/80 bg-white text-neutral-500 shadow-sm hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
                                            }`}
                                        >
                                            {link.label}
                                        </button>
                                    ) : null,
                                )}
                                <button
                                    onClick={() => { const next = reports.links[reports.links.length - 1]; if (next?.url) router.get(next.url); }}
                                    disabled={reports.current_page === reports.last_page}
                                    className="flex size-8 items-center justify-center rounded-lg border border-neutral-200/80 bg-white text-neutral-400 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                >
                                    <ChevronRight className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

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

    const initials = (report.user?.name ?? 'U').charAt(0).toUpperCase();

    return (
        <tr
            className={`group relative transition-colors duration-150 ${
                isSelected
                    ? 'bg-teal-50/60 dark:bg-teal-950/20'
                    : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-800/25'
            }`}
        >
            {/* Selected left accent */}
            {isSelected && (
                <td colSpan={0} className="absolute left-0 top-0 h-full w-[3px] rounded-r-sm bg-gradient-to-b from-teal-400 to-cyan-500" />
            )}

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
                <span className="inline-block rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
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
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${SEVERITY_COLORS[report.severity as Severity]}`}>
                    <span className="size-1.5 rounded-full bg-current opacity-60" />
                    {report.severity}
                </span>
            </td>

            {/* Status */}
            <td className="px-4 py-4">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_COLORS[report.status as ReportStatus]}`}>
                    <span className="size-1.5 rounded-full bg-current opacity-60" />
                    {STATUS_LABEL[report.status] ?? report.status}
                </span>
            </td>

            {/* SLA */}
            <td className="px-4 py-4">
                {report.sla_status ? (
                    <span className={`relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${SLA_STATUS_COLORS[report.sla_status as SlaStatus]}`}>
                        {report.sla_status === 'breached' && (
                            <span className="absolute -right-0.5 -top-0.5 flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-60" />
                                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                            </span>
                        )}
                        <span className="size-1.5 rounded-full bg-current opacity-60" />
                        {SLA_STATUS_LABELS[report.sla_status as SlaStatus]}
                    </span>
                ) : (
                    <span className="text-[11px] text-neutral-300 dark:text-neutral-600">—</span>
                )}
            </td>

            {/* Team */}
            <td className="px-4 py-4">
                {report.assigned_team ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200/60 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-800/40">
                        {report.assigned_team.name}
                    </span>
                ) : (
                    <span className="text-[11px] text-neutral-300 dark:text-neutral-600">—</span>
                )}
            </td>

            {/* Reporter */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-[10px] font-bold text-white shadow-sm shadow-teal-500/20">
                        {initials}
                    </div>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {report.user?.name ?? 'Unknown'}
                    </span>
                </div>
            </td>

            {/* Date */}
            <td className="px-4 py-4">
                <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
                    {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </td>

            {/* View button */}
            <td className="px-4 py-4 text-right">
                <Link
                    href={`/admin/reports/${report.id}`}
                    className="inline-flex translate-x-1 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 opacity-0 shadow-sm transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-teal-700/60 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
                >
                    View
                    <ArrowUpRight className="size-3.5" />
                </Link>
            </td>
        </tr>
    );
}
