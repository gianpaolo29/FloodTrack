import { Head, Link, router } from '@inertiajs/react';
import { History, Search, X } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import type { BreadcrumbItem } from '@/types';
import type { ReportStatus, Severity } from '@/types/admin';
import { SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Activity {
    id: number;
    status: string;
    notes: string | null;
    created_at: string;
    user: { id: number; name: string; role: string };
    report: { id: number; reference_number: string; severity: Severity };
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    activities: Paginated<Activity>;
    filters: { status?: string; search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Activity Log', href: '/admin/activity' },
];

const STATUS_OPTIONS = ['', 'pending', 'verified', 'assigned', 'en_route', 'on_scene', 'resolved', 'rejected'];

const ROLE_STYLES: Record<string, string> = {
    admin:     'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10 dark:bg-purple-950/40 dark:text-purple-400',
    responder: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10 dark:bg-indigo-950/40 dark:text-indigo-400',
    resident:  'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function AdminActivityLog({ activities, filters }: Props) {
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

                {/* ─── Header ─── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Activity Log</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            {activities.total.toLocaleString()} recorded event{activities.total !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* ─── Filters ─── */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200/60 bg-white px-5 py-3.5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="relative min-w-[200px] flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                            placeholder="Search by reference number…"
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
                    <select
                        value={filters.status ?? ''}
                        onChange={(e) => filter('status', e.target.value)}
                        className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                    >
                        <option value="">All actions</option>
                        {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                            <option key={opt} value={opt}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                    {hasFilters && (
                        <button
                            onClick={() => router.get('/admin/activity')}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        >
                            <X className="size-3.5" />
                            Clear
                        </button>
                    )}
                </div>

                {/* ─── Timeline ─── */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                            <History className="size-3.5 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Event Timeline</h2>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                {activities.total}
                            </span>
                        </div>
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {activities.data.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                            >
                                {/* Avatar */}
                                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                                    {a.user.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{a.user.name}</span>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLES[a.user.role] ?? ROLE_STYLES.resident}`}>
                                            {a.user.role}
                                        </span>
                                        <span className="text-neutral-400 dark:text-neutral-500">changed status to</span>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status as ReportStatus] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                            {a.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-neutral-400 dark:text-neutral-500">on</span>
                                        <Link
                                            href={`/admin/reports/${a.report.id}`}
                                            className="font-mono text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                                        >
                                            {a.report.reference_number}
                                        </Link>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[a.report.severity]}`}>
                                            {a.report.severity}
                                        </span>
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
                        ))}

                        {activities.data.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-20">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <History className="size-6 text-neutral-400 dark:text-neutral-500" />
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No activity recorded yet</p>
                                {hasFilters && (
                                    <button
                                        onClick={() => router.get('/admin/activity')}
                                        className="text-xs font-medium text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-400"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Pagination ─── */}
                {activities.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Page{' '}
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{activities.current_page}</span>
                            {' '}of{' '}
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{activities.last_page}</span>
                        </span>
                        <div className="flex gap-1">
                            {activities.links.map((link, i) =>
                                link.url ? (
                                    <button
                                        key={i}
                                        onClick={() => router.get(link.url!)}
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
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
