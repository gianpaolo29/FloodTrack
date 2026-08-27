import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, History, Search, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import type { BreadcrumbItem } from '@/types';
import type { ReportStatus, Severity } from '@/types/admin';
import { SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Activity {
    id: number;
    status: string;
    notes: string | null;
    created_at: string;
    user: { id: number; name: string; role: string } | null;
    report: { id: number; reference_number: string; severity: Severity } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Stats {
    total: number;
    today: number;
    resolved: number;
    pending: number;
}

interface Trends {
    total?: number;
    resolved?: number;
    pending?: number;
    label: string;
    period_label: string;
}

interface Props {
    activities: Paginated<Activity>;
    filters: { status?: string; search?: string; team_id?: string };
    stats: Stats;
    trends: Trends;
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
    teams: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Activity Log', href: '/admin/activity' },
];

const STATUS_OPTIONS = ['pending', 'verified', 'assigned', 'en_route', 'on_scene', 'resolved', 'rejected'];

const ROLE_STYLES: Record<string, string> = {
    admin:     'bg-purple-50 text-purple-700 ring-1 ring-purple-500/20 dark:bg-purple-950/40 dark:text-purple-400',
    responder: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-400',
    resident:  'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-400',
};

const ROLE_AVATAR: Record<string, string> = {
    admin:     'from-purple-500 to-violet-600',
    responder: 'from-indigo-500 to-blue-600',
    resident:  'from-slate-400 to-slate-500',
};

export default function AdminActivityLog({ activities, filters, stats, trends, period, custom_from, custom_to, teams }: Props) {
    const [searchValue, setSearchValue] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/activity', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const filtered = activities.data.filter((a) => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return (
            (a.report?.reference_number ?? '').toLowerCase().includes(q) ||
            (a.user?.name ?? '').toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q) ||
            (a.notes ?? '').toLowerCase().includes(q)
        );
    });

    const hasFilters = !!(filters.status || searchValue || filters.team_id);

    const tl = trends.label;
    const resolvedPct = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    const pendingPct = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total': {
                if (stats.total === 0) return 'No activity recorded this period — system is quiet.';
                const t = trends.total;
                const parts: string[] = [];
                if (t > 20) parts.push(`Activity surging (${Math.abs(t)}% ${tl}) — high volume of status changes, ensure teams are keeping up.`);
                else if (t > 0) parts.push(`Activity picking up (${Math.abs(t)}% ${tl}) — teams are engaged and processing reports.`);
                else if (t === 0) parts.push(`Activity level unchanged ${tl} — consistent workflow pace.`);
                else if (t > -20) parts.push(`Activity slowing slightly (${Math.abs(t)}% ${tl}) — could indicate fewer incoming issues.`);
                else parts.push(`Activity dropped significantly (${Math.abs(t)}% ${tl}) — either workload is lighter or teams may need a nudge.`);
                if (resolvedPct >= 60) parts.push('Most activity is leading to resolutions — productive workflow.');
                else if (stats.pending > stats.resolved) parts.push('More events are pending than resolved — follow up on stalled items.');
                return parts.join(' ');
            }
            case 'today': {
                if (stats.today === 0) return 'No activity today yet — check if teams are active and reports are being processed.';
                const todayPct = stats.total > 0 ? Math.round((stats.today / stats.total) * 100) : 0;
                const parts: string[] = [];
                if (todayPct > 40) parts.push('Unusually high activity today — teams are very active, monitor for bottlenecks.');
                else if (todayPct > 20) parts.push('Good activity pace today — teams are steadily processing reports.');
                else parts.push('Light activity today so far — expect more later or check if workflows are stalled.');
                if (stats.pending > stats.resolved) parts.push('Pending items outnumber resolutions — prioritize clearing the queue.');
                else if (stats.resolved > 0) parts.push('Resolutions outpacing pending — strong throughput today.');
                return parts.join(' ');
            }
            case 'resolved': {
                if (stats.resolved === 0) return 'No resolutions recorded yet — encourage teams to close out verified cases.';
                const t = trends.resolved;
                const parts: string[] = [];
                if (t > 20) parts.push(`Resolutions surging (${Math.abs(t)}% ${tl}) — excellent team productivity, keep it up.`);
                else if (t > 0) parts.push(`Resolutions improving (${Math.abs(t)}% ${tl}) — response teams are gaining momentum.`);
                else if (t < -20) parts.push(`Resolutions dropping sharply (${Math.abs(t)}% ${tl}) — investigate if teams are blocked or reassigned.`);
                else if (t < 0) parts.push(`Resolutions declining (${Math.abs(t)}% ${tl}) — teams may need support or resources.`);
                else parts.push(`Resolution pace is steady ${tl} — consistent output.`);
                if (resolvedPct >= 70) parts.push('High resolution ratio — workflow is efficient and effective.');
                else if (stats.pending > 0) parts.push('Pending events still need attention — keep pushing for closures.');
                return parts.join(' ');
            }
            case 'pending': {
                if (stats.pending === 0) return 'All caught up — no pending events. Great job keeping the workflow clear.';
                const t = trends.pending;
                const parts: string[] = [];
                if (t > 20) parts.push(`Pending events surging (${Math.abs(t)}% ${tl}) — backlog is growing, allocate more resources.`);
                else if (t > 0) parts.push(`Pending events increasing (${Math.abs(t)}% ${tl}) — stay ahead by processing faster.`);
                else if (t < -20) parts.push(`Pending events clearing fast (${Math.abs(t)}% ${tl}) — backlog is being eliminated.`);
                else if (t < 0) parts.push(`Pending events shrinking (${Math.abs(t)}% ${tl}) — making progress on the backlog.`);
                else parts.push(`Pending count unchanged ${tl} — consider prioritizing these to prevent buildup.`);
                if (pendingPct > 40) parts.push('High pending ratio — this is the main bottleneck in the workflow.');
                else parts.push('Pending load is manageable — maintain current processing pace.');
                return parts.join(' ');
            }
            default: return '';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
                            <History className="size-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Activity Log</h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Track every status change across all reports.
                            </p>
                        </div>
                    </div>
                    <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/activity" />
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <PrimaryStatCard
                        label="Total Updates"
                        value={stats.total}
                        trend={trends.total}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total')}
                        insights={[
                            { label: 'Resolved', value: stats.resolved, color: '#10b981' },
                            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
                        ]}
                        icon={History}
                        grad="from-indigo-500 via-blue-500 to-cyan-500"
                        shadow="shadow-indigo-500/40"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <PrimaryStatCard
                        label="Today's Activity"
                        value={stats.today}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('today')}
                        insights={[]}
                        icon={Sparkles}
                        grad="from-cyan-500 via-sky-500 to-blue-500"
                        shadow="shadow-cyan-500/40"
                        alert={false}
                        index={1}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={CheckCircle2}
                        grad="from-emerald-500 to-teal-500"
                        shadow="shadow-emerald-500/25"
                        value={stats.resolved}
                        label="Resolved Actions"
                        trend={trends.resolved}
                        desc={smartDesc('resolved')}
                        insights={[
                            { label: 'Resolution rate', value: stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '0%', color: '#10b981' },
                        ]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={Clock}
                        grad="from-amber-500 to-orange-500"
                        shadow="shadow-amber-500/25"
                        value={stats.pending}
                        label="Pending Actions"
                        trend={trends.pending}
                        desc={smartDesc('pending')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={500}
                    />
                </div>

                {/* Timeline card */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Event Timeline</span>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                {activities.total.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Search */}
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search reference…"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-8 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-blue-500 dark:focus:bg-neutral-900"
                                />
                                {searchValue && (
                                    <button onClick={() => setSearchValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Status filter */}
                            <div className="relative">
                                <select
                                    value={filters.status ?? ''}
                                    onChange={(e) => filter('status', e.target.value)}
                                    className="h-9 appearance-none rounded-xl border border-neutral-200 bg-neutral-50/50 pl-3 pr-8 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100"
                                >
                                    <option value="">All actions</option>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                            </div>

                            {/* Team filter */}
                            {teams.length > 0 && (
                                <select
                                    value={filters.team_id ?? ''}
                                    onChange={(e) => filter('team_id', e.target.value)}
                                    className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100"
                                >
                                    <option value="">All Teams</option>
                                    {teams.map((t) => (
                                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                                    ))}
                                </select>
                            )}

                            {hasFilters && (
                                <button
                                    onClick={() => { setSearchValue(''); router.get('/admin/activity'); }}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                                    title="Clear filters"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Activity list */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
                                <History className="size-7 text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No activity found</p>
                                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your filters.' : 'No events have been recorded yet.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                        {/* Mobile card view */}
                        <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filtered.map((a) => {
                                const userName = a.user?.name ?? 'Deleted User';
                                const userRole = a.user?.role ?? 'resident';
                                const reportId = a.report?.id;
                                const refNumber = a.report?.reference_number ?? '—';
                                const severity = a.report?.severity;

                                return (
                                    <div key={a.id} className="flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${ROLE_AVATAR[userRole] ?? ROLE_AVATAR.resident} text-[10px] font-bold text-white shadow-sm`}>
                                                    {userName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{userName}</span>
                                                <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${ROLE_STYLES[userRole] ?? ROLE_STYLES.resident}`}>
                                                    {userRole}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-[10px] text-neutral-400 dark:text-neutral-500">
                                                {new Date(a.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 pl-9 text-xs text-neutral-400 dark:text-neutral-500">
                                            <span>changed to</span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status as ReportStatus] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                {a.status.replace('_', ' ')}
                                            </span>
                                            <span>on</span>
                                            {reportId ? (
                                                <Link href={`/admin/reports/${reportId}`} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                    {refNumber}
                                                </Link>
                                            ) : (
                                                <span className="font-mono text-xs font-semibold text-neutral-400">Deleted Report</span>
                                            )}
                                            {severity && (
                                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[severity]}`}>
                                                    {severity}
                                                </span>
                                            )}
                                        </div>
                                        {a.notes && (
                                            <p className="pl-9 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">{a.notes}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop list view */}
                        <div className="hidden sm:block divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filtered.map((a) => {
                                const userName = a.user?.name ?? 'Deleted User';
                                const userRole = a.user?.role ?? 'resident';
                                const reportId = a.report?.id;
                                const refNumber = a.report?.reference_number ?? '—';
                                const severity = a.report?.severity;

                                return (
                                <div
                                    key={a.id}
                                    className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                                >
                                    {/* Avatar */}
                                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${ROLE_AVATAR[userRole] ?? ROLE_AVATAR.resident} text-xs font-bold text-white shadow-sm`}>
                                        {userName.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{userName}</span>
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLES[userRole] ?? ROLE_STYLES.resident}`}>
                                                {userRole}
                                            </span>
                                            <span className="text-neutral-400 dark:text-neutral-500">changed status to</span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status as ReportStatus] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                {a.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-neutral-400 dark:text-neutral-500">on</span>
                                            {reportId ? (
                                            <Link
                                                href={`/admin/reports/${reportId}`}
                                                className="font-mono text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                {refNumber}
                                            </Link>
                                            ) : (
                                            <span className="font-mono text-xs font-semibold text-neutral-400">Deleted Report</span>
                                            )}
                                            {severity && (
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[severity]}`}>
                                                {severity}
                                            </span>
                                            )}
                                        </div>
                                        {a.notes && (
                                            <p className="mt-1 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
                                                {a.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                                        {new Date(a.created_at).toLocaleString('en-PH', {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                );
                            })}
                        </div>
                        </>
                    )}

                    {/* Pagination */}
                    {activities.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {activities.total.toLocaleString()} event{activities.total !== 1 ? 's' : ''} total
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        const prev = activities.links[0];
                                        if (prev?.url) router.get(prev.url);
                                    }}
                                    disabled={activities.current_page === 1}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {activities.links.slice(1, -1).map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm'
                                                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                                            }`}
                                        >
                                            {link.label}
                                        </button>
                                    ) : null,
                                )}
                                <button
                                    onClick={() => {
                                        const next = activities.links[activities.links.length - 1];
                                        if (next?.url) router.get(next.url);
                                    }}
                                    disabled={activities.current_page === activities.last_page}
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
