import { Head } from '@inertiajs/react';
import { Download, FileDown, X } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
interface Props {
    counts: {
        total: number;
        pending: number;
        resolved: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Export', href: '/admin/export' },
];

const STATUS_OPTIONS = ['', 'pending', 'verified', 'assigned', 'resolved', 'rejected'];
const SEVERITY_OPTIONS = ['', 'critical', 'high', 'moderate', 'low'];
export default function AdminExport({ counts }: Props) {
    const [status, setStatus] = useState('');
    const [severity, setSeverity] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const hasFilters = !!(status || severity || dateFrom || dateTo);

    function buildUrl() {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (severity) params.set('severity', severity);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        const qs = params.toString();
        return `/admin/export/download${qs ? `?${qs}` : ''}`;
    }

    function clearFilters() {
        setStatus('');
        setSeverity('');
        setDateFrom('');
        setDateTo('');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export — FloodTrack Admin" />

            <div className="flex flex-col gap-8 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Export Reports</h1>
                    <p className="text-sm text-muted-foreground">
                        Download report data as CSV with optional filters.
                    </p>
                </div>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                            <p className="text-3xl font-bold tracking-tight tabular-nums">{counts.total}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total reports</p>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                            <p className="text-3xl font-bold tracking-tight tabular-nums text-amber-600">{counts.pending}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                            <p className="text-3xl font-bold tracking-tight tabular-nums text-emerald-600">{counts.resolved}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & download */}
                <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <CardHeader className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <CardTitle className="text-sm font-semibold tracking-tight">Filter Before Exporting</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6 p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FilterField label="Status">
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50">
                                    <option value="">All statuses</option>
                                    {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </FilterField>
                            <FilterField label="Severity">
                                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50">
                                    <option value="">All severities</option>
                                    {SEVERITY_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </FilterField>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FilterField label="From date">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                                />
                            </FilterField>
                            <FilterField label="To date">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                                />
                            </FilterField>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <a href={buildUrl()}>
                                <Button className="gap-2 rounded-xl shadow-sm">
                                    <FileDown className="size-4" />
                                    Download CSV
                                </Button>
                            </a>
                            {hasFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="gap-1 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            {children}
        </div>
    );
}
