import { Head, Link, router } from '@inertiajs/react';
import { History, Search } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BreadcrumbItem } from '@/types';
import { SEVERITY_COLORS, STATUS_COLORS, HAZARD_LABELS } from '@/types/admin';
import type { HazardType, Severity, ReportStatus } from '@/types/admin';

interface Activity {
    id: number;
    status: string;
    notes: string | null;
    created_at: string;
    user: { id: number; name: string; role: string };
    report: { id: number; reference_number: string; hazard_type: HazardType; severity: Severity };
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

const ROLE_BADGE: Record<string, string> = {
    admin:     'bg-purple-100 text-purple-800',
    responder: 'bg-indigo-100 text-indigo-800',
    resident:  'bg-gray-100 text-gray-600',
};

export default function AdminActivityLog({ activities, filters }: Props) {
    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/activity', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6">

                <div className="flex items-center gap-2">
                    <History className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">Activity Log</h1>
                    <span className="text-sm text-muted-foreground">({activities.total} entries)</span>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="flex flex-wrap gap-3 p-4">
                        <div className="relative flex-1 min-w-[180px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by reference number…"
                                defaultValue={filters.search ?? ''}
                                className="pl-9"
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
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="">All actions</option>
                            {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}</option>
                            ))}
                        </select>
                        {(filters.status || filters.search) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get('/admin/activity')}
                            >
                                Clear
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {activities.data.map((a) => (
                                <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                                    {/* Status dot */}
                                    <div className="mt-1.5 flex size-3 shrink-0 rounded-full bg-muted-foreground/30" />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="font-medium">{a.user.name}</span>
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_BADGE[a.user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {a.user.role}
                                            </span>
                                            <span className="text-muted-foreground">changed status to</span>
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[a.status as ReportStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {a.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-muted-foreground">on</span>
                                            <Link
                                                href={`/admin/reports/${a.report.id}`}
                                                className="font-mono text-xs text-blue-600 hover:underline"
                                            >
                                                {a.report.reference_number}
                                            </Link>
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[a.report.severity]}`}>
                                                {a.report.severity}
                                            </span>
                                        </div>
                                        {a.notes && (
                                            <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>
                                        )}
                                    </div>

                                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                                        {new Date(a.created_at).toLocaleString('en-PH', {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                            {activities.data.length === 0 && (
                                <div className="px-5 py-12 text-center text-muted-foreground">
                                    No activity recorded yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {activities.last_page > 1 && (
                    <div className="flex justify-center gap-1">
                        {activities.links.map((link, i) =>
                            link.url ? (
                                <button
                                    key={i}
                                    onClick={() => router.get(link.url!)}
                                    className={`rounded px-3 py-1.5 text-xs ${
                                        link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="rounded px-3 py-1.5 text-xs opacity-40"
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
