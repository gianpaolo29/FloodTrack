import { Head, Link, router } from '@inertiajs/react';
import { History, Search, X } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BreadcrumbItem } from '@/types';
import { SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';
import type { Severity, ReportStatus } from '@/types/admin';

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
    admin:     'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10',
    responder: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
    resident:  'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10',
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

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
                    <p className="text-sm text-muted-foreground">
                        {activities.total} recorded event{activities.total !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Filters */}
                <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by reference number..."
                                defaultValue={filters.search ?? ''}
                                className="pl-9 rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-sm placeholder:text-muted-foreground/50 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        filter('search', (e.target as HTMLInputElement).value);
                                    }
                                }}
                            />
                        </div>
                        <select
                            value={filters.status ?? ''}
                            onChange={(e) => filter('status', e.target.value)}
                            className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                        >
                            <option value="">All actions</option>
                            {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}</option>
                            ))}
                        </select>
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.get('/admin/activity')}
                                className="gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                                Clear
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {activities.data.map((a) => (
                            <div key={a.id} className="flex items-start gap-4 px-6 py-5 transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                                {/* Avatar */}
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm mt-0.5">
                                    {a.user.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="font-semibold">{a.user.name}</span>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLES[a.user.role] ?? ROLE_STYLES.resident}`}>
                                            {a.user.role}
                                        </span>
                                        <span className="text-muted-foreground">changed status to</span>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status as ReportStatus] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                            {a.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-muted-foreground">on</span>
                                        <Link
                                            href={`/admin/reports/${a.report.id}`}
                                            className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            {a.report.reference_number}
                                        </Link>
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[a.report.severity]}`}>
                                            {a.report.severity}
                                        </span>
                                    </div>
                                    {a.notes && (
                                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{a.notes}</p>
                                    )}
                                </div>

                                <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
                                    {new Date(a.created_at).toLocaleString('en-PH', {
                                        month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        ))}
                        {activities.data.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-16">
                                <History className="size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Pagination */}
                {activities.last_page > 1 && (
                    <div className="flex justify-center gap-1">
                        {activities.links.map((link, i) =>
                            link.url ? (
                                <button
                                    key={i}
                                    onClick={() => router.get(link.url!)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                        link.active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
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
                )}
            </div>
        </AppLayout>
    );
}
