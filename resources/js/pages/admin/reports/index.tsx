import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Globe,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';
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
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/reports', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const hasFilters = !!(filters.status || filters.severity || filters.hazard_type || filters.search);

    const allOnPageSelected = reports.data.length > 0 && reports.data.every((r) => selected.includes(r.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !reports.data.some((r) => r.id === id)));
        } else {
            const pageIds = reports.data.map((r) => r.id);
            setSelected([...new Set([...selected, ...pageIds])]);
        }
    };

    const toggleOne = (id: number) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const runBulkAction = (action: string) => {
        if (selected.length === 0) return;

        if (action === 'delete' && !confirmDelete) {
            setConfirmDelete(true);
            return;
        }

        setBulkProcessing(true);
        router.post('/admin/reports/bulk', { ids: selected, action }, {
            preserveState: true,
            onFinish: () => {
                setBulkProcessing(false);
                setSelected([]);
                setConfirmDelete(false);
            },
        });
    };

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
                <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search reference or address..."
                                defaultValue={filters.search ?? ''}
                                className="pl-9 rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-sm placeholder:text-muted-foreground/50 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
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

                {/* Bulk action bar */}
                {selected.length > 0 && (
                    <Card className="overflow-hidden rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
                        <CardContent className="flex flex-wrap items-center gap-3 p-3">
                            <span className="text-sm font-medium">
                                {selected.length} selected
                            </span>
                            <div className="h-5 w-px bg-border" />
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                onClick={() => runBulkAction('verify')}
                                disabled={bulkProcessing}
                            >
                                <CheckCircle2 className="size-3.5" />
                                Verify
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                onClick={() => runBulkAction('reject')}
                                disabled={bulkProcessing}
                            >
                                <XCircle className="size-3.5" />
                                Reject
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                onClick={() => runBulkAction('reopen')}
                                disabled={bulkProcessing}
                            >
                                <RefreshCw className="size-3.5" />
                                Reopen
                            </Button>
                            {confirmDelete ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-destructive">Are you sure?</span>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => runBulkAction('delete')}
                                        disabled={bulkProcessing}
                                    >
                                        <Trash2 className="size-3.5" />
                                        Confirm Delete
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    onClick={() => runBulkAction('delete')}
                                    disabled={bulkProcessing}
                                >
                                    <Trash2 className="size-3.5" />
                                    Delete
                                </Button>
                            )}
                            <div className="ml-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelected([]); setConfirmDelete(false); }}
                                    className="text-muted-foreground"
                                >
                                    Clear selection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Table */}
                <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                <SlidersHorizontal className="size-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold tracking-tight">All Reports</h2>
                                <p className="text-xs text-muted-foreground">{reports.total} total</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:border-neutral-800">
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="size-4 rounded border-border text-primary focus:ring-primary/20"
                                        />
                                    </th>
                                    <th className="px-4 py-3">Reference</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Severity</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Reporter</th>
                                    <th className="px-4 py-3">Assigned to</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.data.map((report) => (
                                    <tr
                                        key={report.id}
                                        className={`group border-t border-neutral-100 transition-colors dark:border-neutral-800/50 ${selected.includes(report.id) ? 'bg-primary/5' : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'}`}
                                    >
                                        <td className="px-4 py-3.5">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(report.id)}
                                                onChange={() => toggleOne(report.id)}
                                                className="size-4 rounded border-border text-primary focus:ring-primary/20"
                                            />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="font-mono text-xs font-medium">{report.reference_number}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground">
                                            {HAZARD_LABELS[report.hazard_type]}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[report.severity]}`}>
                                                {report.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 font-medium">{report.user?.name ?? '—'}</td>
                                        <td className="px-4 py-3.5 text-muted-foreground">
                                            {report.assigned_responder?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3.5 max-w-[160px] truncate text-muted-foreground">
                                            {report.address ?? '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                month: 'short', day: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-4 py-3.5">
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
                                        <td colSpan={10} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="rounded-2xl"><SlidersHorizontal className="size-8 text-muted-foreground/40" /></div>
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
                                                ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20'
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
            className="h-9 rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
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
