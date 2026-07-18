import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, History, Search, Sparkles, X } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
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

interface Props {
    activities: Paginated<Activity>;
    filters: { status?: string; search?: string };
    stats: Stats;
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

export default function AdminActivityLog({ activities, filters, stats }: Props) {
    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/activity', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const hasFilters = !!(filters.status || filters.search);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex items-center justify-between">
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
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm shadow-blue-500/20">
                            <History className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.total.toLocaleString()}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Events</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">All recorded activity</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 shadow-sm shadow-sky-500/20">
                            <Sparkles className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.today.toLocaleString()}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Today's Events</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Since midnight</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm shadow-amber-500/20">
                            <Clock className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.pending.toLocaleString()}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Pending Actions</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Awaiting response</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/20">
                            <CheckCircle2 className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stats.resolved.toLocaleString()}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Resolved Events</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Successfully closed</p>
                    </div>
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
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search reference…"
                                    defaultValue={filters.search ?? ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') filter('search', (e.target as HTMLInputElement).value);
                                    }}
                                    className="h-9 w-48 rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-blue-500 dark:focus:bg-neutral-900"
                                />
                            </div>

                            {/* Status filter */}
                            <select
                                value={filters.status ?? ''}
                                onChange={(e) => filter('status', e.target.value)}
                                className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100"
                            >
                                <option value="">All actions</option>
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                                    </option>
                                ))}
                            </select>

                            {hasFilters && (
                                <button
                                    onClick={() => router.get('/admin/activity')}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                                    title="Clear filters"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Activity list */}
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {activities.data.length === 0 ? (
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
                            activities.data.map((a) => {
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
                            })
                        )}
                    </div>

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
