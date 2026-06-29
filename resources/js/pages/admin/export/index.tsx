import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6">

                <div className="flex items-center gap-2">
                    <Download className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">Export Reports</h1>
                </div>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="p-5 text-center">
                            <p className="text-2xl font-bold">{counts.total}</p>
                            <p className="text-xs text-muted-foreground">Total reports</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5 text-center">
                            <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5 text-center">
                            <p className="text-2xl font-bold text-green-600">{counts.resolved}</p>
                            <p className="text-xs text-muted-foreground">Resolved</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & download */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Filter before exporting</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="">All statuses</option>
                                    {STATUS_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Severity</label>
                                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="">All severities</option>
                                    {SEVERITY_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Hazard type</label>
                                <select value={hazardType} onChange={(e) => setHazardType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="">All types</option>
                                    {HAZARD_OPTIONS.filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{HAZARD_LABELS[opt as keyof typeof HAZARD_LABELS] ?? opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">From date</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">To date</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <a href={buildUrl()}>
                                <Button className="gap-2">
                                    <Download className="size-4" />
                                    Download CSV
                                </Button>
                            </a>
                            {(status || severity || hazardType || dateFrom || dateTo) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStatus('');
                                        setSeverity('');
                                        setHazardType('');
                                        setDateFrom('');
                                        setDateTo('');
                                    }}
                                >
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
