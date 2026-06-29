import { Head } from '@inertiajs/react';
import { BarChart3, Clock, TrendingUp } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import { HAZARD_LABELS, SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';
import type { HazardType, Severity, ReportStatus } from '@/types/admin';

interface Props {
    daily_reports: Record<string, number>;
    avg_response_time: number;
    hazard_breakdown: Record<string, number>;
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    top_responders: { id: number; name: string; resolved_count: number }[];
    monthly_trend: Record<string, number>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Statistics', href: '/admin/statistics' },
];

const HAZARD_COLORS: Record<string, string> = {
    flood: 'bg-blue-500',
    road_damage: 'bg-orange-500',
    debris: 'bg-amber-500',
    drainage: 'bg-cyan-500',
    other: 'bg-gray-400',
};

export default function AdminStatistics({
    daily_reports,
    avg_response_time,
    hazard_breakdown,
    severity_breakdown,
    status_breakdown,
    top_responders,
    monthly_trend,
}: Props) {
    const totalReports = Object.values(status_breakdown).reduce((a, b) => a + b, 0);
    const dailyEntries = Object.entries(daily_reports);
    const maxDaily = Math.max(...Object.values(daily_reports), 1);
    const monthlyEntries = Object.entries(monthly_trend);
    const maxMonthly = Math.max(...Object.values(monthly_trend), 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">Statistics</h1>
                </div>

                {/* Top stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50">
                                <TrendingUp className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total reports</p>
                                <p className="text-2xl font-bold">{totalReports}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
                                <Clock className="size-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Avg response time</p>
                                <p className="text-2xl font-bold">
                                    {avg_response_time > 0 ? `${avg_response_time}h` : '—'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                                <BarChart3 className="size-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Last 30 days</p>
                                <p className="text-2xl font-bold">
                                    {Object.values(daily_reports).reduce((a, b) => a + b, 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily reports chart (bar chart via CSS) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Daily reports (last 30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dailyEntries.length > 0 ? (
                            <div className="flex items-end gap-[2px] h-32">
                                {dailyEntries.map(([date, count]) => (
                                    <div
                                        key={date}
                                        className="flex-1 bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors group relative"
                                        style={{ height: `${(count / maxDaily) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                                        title={`${date}: ${count} reports`}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                                            {count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
                        )}
                        {dailyEntries.length > 0 && (
                            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                                <span>{dailyEntries[0]?.[0]}</span>
                                <span>{dailyEntries[dailyEntries.length - 1]?.[0]}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Monthly trend (last 6 months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monthlyEntries.length > 0 ? (
                            <div className="flex items-end gap-3 h-28">
                                {monthlyEntries.map(([month, count]) => (
                                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-xs font-medium">{count}</span>
                                        <div
                                            className="w-full bg-teal-500 rounded-t-sm"
                                            style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                                        />
                                        <span className="text-[10px] text-muted-foreground">{month}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Hazard type breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">By hazard type</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {Object.entries(hazard_breakdown).map(([type, count]) => {
                                const pct = totalReports > 0 ? (count / totalReports) * 100 : 0;
                                return (
                                    <div key={type} className="flex flex-col gap-1">
                                        <div className="flex justify-between text-xs">
                                            <span>{HAZARD_LABELS[type as HazardType] ?? type}</span>
                                            <span className="font-medium">{count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${HAZARD_COLORS[type] ?? 'bg-gray-400'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(hazard_breakdown).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No data.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Severity breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">By severity</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((sev) => (
                                <div key={sev} className="flex items-center justify-between">
                                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[sev]}`}>
                                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                    </span>
                                    <span className="text-sm font-semibold">{severity_breakdown[sev] ?? 0}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Status breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">By status</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {(['pending', 'verified', 'assigned', 'resolved', 'rejected'] as ReportStatus[]).map((st) => (
                                <div key={st} className="flex items-center justify-between">
                                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[st]}`}>
                                        {st.charAt(0).toUpperCase() + st.slice(1)}
                                    </span>
                                    <span className="text-sm font-semibold">{status_breakdown[st] ?? 0}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Top responders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Top responders (by resolved reports)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {top_responders.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {top_responders.map((r, i) => (
                                    <div key={r.id} className="flex items-center gap-3">
                                        <span className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                                            i === 0 ? 'bg-yellow-100 text-yellow-800' :
                                            i === 1 ? 'bg-gray-100 text-gray-700' :
                                            i === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 text-sm font-medium">{r.name}</span>
                                        <span className="text-sm font-bold text-green-600">{r.resolved_count} resolved</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No responders yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
