import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight, Globe, Search, SlidersHorizontal, X } from 'lucide-react';
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

    const hasFilters = !!(filters.status || filters.severity || filters.hazard_type || filters.search);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
                        <p className="text-sm text-muted-foreground">
                            {reports.total} total report{reports.total !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Link href="/admin/reports/map">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <Globe className="size-3.5" />
                            Map view
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card className="overflow-hidden">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search reference or address..."
                                defaultValue={filters.search ?? ''}
                                className="pl-9 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
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
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.get('/admin/reports')}
                                className="gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                                Clear
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    <th className="px-6 py-3">Reference</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Severity</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Reporter</th>
                                    <th className="px-6 py-3">Assigned to</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {reports.data.map((report) => (
                                    <tr key={report.id} className="group transition-colors hover:bg-muted/30">
                                        <td className="px-6 py-3.5">
                                            <span className="font-mono text-xs font-medium">{report.reference_number}</span>
                                        </td>
                                        <td className="px-6 py-3.5 text-muted-foreground">
                                            {HAZARD_LABELS[report.hazard_type]}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[report.severity]}`}>
                                                {report.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 font-medium">{report.user?.name ?? '—'}</td>
                                        <td className="px-6 py-3.5 text-muted-foreground">
                                            {report.assigned_responder?.name ?? '—'}
                                        </td>
                                        <td className="px-6 py-3.5 max-w-[160px] truncate text-muted-foreground">
                                            {report.address ?? '—'}
                                        </td>
                                        <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                month: 'short', day: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <Link
                                                href={`/admin/reports/${report.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                View
                                                <ArrowUpRight className="size-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {reports.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <SlidersHorizontal className="size-8 text-muted-foreground/40" />
                                                <p className="text-sm text-muted-foreground">No reports match the current filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Pagination */}
                {reports.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{(reports.current_page - 1) * reports.per_page + 1}</span>–<span className="font-medium text-foreground">{Math.min(reports.current_page * reports.per_page, reports.total)}</span> of{' '}
                            <span className="font-medium text-foreground">{reports.total}</span>
                        </span>
                        <div className="flex gap-1">
                            {reports.links.map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded-lg px-3 py-1.5 text-xs opacity-30"
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
            className="h-9 rounded-lg border border-input bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
