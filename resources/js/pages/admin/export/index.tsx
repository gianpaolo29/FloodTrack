import { Head } from '@inertiajs/react';
import { Download, FileDown, X } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import { HAZARD_LABELS } from '@/types/admin';

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
const HAZARD_OPTIONS = ['', 'flood', 'road_damage', 'debris', 'drainage', 'other'];

export default function AdminExport({ counts }: Props) {
    const [status, setStatus] = useState('');
    const [severity, setSeverity] = useState('');
    const [hazardType, setHazardType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const hasFilters = !!(status || severity || hazardType || dateFrom || dateTo);

    function buildUrl() {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (severity) params.set('severity', severity);
        if (hazardType) params.set('hazard_type', hazardType);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        const qs = params.toString();
        return `/admin/export/download${qs ? `?${qs}` : ''}`;
    }

    function clearFilters() {
        setStatus('');
        setSeverity('');
        setHazardType('');
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
                    <Card className="overflow-hidden">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                            <p className="text-3xl font-bold tracking-tight tabular-nums">{counts.total}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total reports</p>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-l-4 border-l-amber-500">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                            <p className="text-3xl font-bold tracking-tight tabular-nums text-amber-600">{counts.pending}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-l-4 border-l-emerald-500">
                        <CardContent className="flex flex-col items-center justify-center p-6">
                            <p className="text-3xl font-bold tracking-tight tabular-nums text-emerald-600">{counts.resolved}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & download */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">Filter Before Exporting</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6 p-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FilterField label="Status">
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="">All statuses</option>
                                    {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </FilterField>
                            <FilterField label="Severity">
                                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="">All severities</option>
                                    {SEVERITY_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </FilterField>
                            <FilterField label="Hazard type">
                                <select value={hazardType} onChange={(e) => setHazardType(e.target.value)} className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="">All types</option>
                                    {HAZARD_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{HAZARD_LABELS[opt as keyof typeof HAZARD_LABELS] ?? opt}</option>
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
                                    className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </FilterField>
                            <FilterField label="To date">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-9 w-full rounded-lg border-transparent bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </FilterField>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <a href={buildUrl()}>
                                <Button className="gap-2 shadow-sm">
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
