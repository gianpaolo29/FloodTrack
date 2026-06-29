import { Head, Link, router, useForm } from '@inertiajs/react';
import { Globe, Search } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BreadcrumbItem } from '@/types';
import type { Report, Responder } from '@/types/admin';
import { HAZARD_LABELS, SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

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
    hazard_type?: string;
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
const HAZARD_OPTIONS = ['', 'flood', 'road_damage', 'debris', 'drainage', 'other'];

export default function AdminReportsIndex({ reports, responders, filters }: Props) {
    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/reports', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6">

                {/* Filters */}
                <Card>
                    <CardContent className="flex flex-wrap gap-3 p-4">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search reference or address…"
                                defaultValue={filters.search ?? ''}
                                className="pl-9"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        filter('search', (e.target as HTMLInputElement).value);
                                    }
                                }}
                            />
                        </div>
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
                        <FilterSelect
                            value={filters.hazard_type ?? ''}
                            onChange={(v) => filter('hazard_type', v)}
                            options={HAZARD_OPTIONS}
                            placeholder="All hazard types"
                            labelMap={HAZARD_LABELS}
                        />
                        {(filters.status || filters.severity || filters.hazard_type || filters.search) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get('/admin/reports')}
                            >
                                Clear filters
                            </Button>
                        )}
                        <Link href="/admin/reports/map">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Globe className="size-3.5" />
                                Map view
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Reference</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Severity</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Reporter</th>
                                        <th className="px-4 py-3 font-medium">Assigned to</th>
                                        <th className="px-4 py-3 font-medium">Location</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {reports.data.map((report) => (
                                        <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs">{report.reference_number}</span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {HAZARD_LABELS[report.hazard_type]}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[report.severity]}`}>
                                                    {report.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{report.user?.name ?? '—'}</td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {report.assigned_responder?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground">
                                                {report.address ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short', day: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/admin/reports/${report.id}`}
                                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                                                >
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {reports.data.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                                                No reports match the current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {reports.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            Showing {(reports.current_page - 1) * reports.per_page + 1}–
                            {Math.min(reports.current_page * reports.per_page, reports.total)} of {reports.total}
                        </span>
                        <div className="flex gap-1">
                            {reports.links.map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`rounded px-3 py-1.5 text-xs ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded px-3 py-1.5 text-xs opacity-40"
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
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
