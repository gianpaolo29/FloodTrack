import { Head } from '@inertiajs/react';
import { BarChart3, Clock, TrendingUp, Trophy } from 'lucide-react';
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
    other: 'bg-zinc-400',
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

            <div className="flex flex-col gap-8 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
                    <p className="text-sm text-muted-foreground">
                        Analytics and insights across all flood reports.
                    </p>
                </div>

                {/* Top metrics */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                                <TrendingUp className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
                                <p className="text-2xl font-bold tracking-tight tabular-nums">{totalReports}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                                <Clock className="size-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Avg Response Time</p>
                                <p className="text-2xl font-bold tracking-tight tabular-nums">
                                    {avg_response_time > 0 ? `${avg_response_time}h` : '—'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                                <BarChart3 className="size-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Last 30 Days</p>
                                <p className="text-2xl font-bold tracking-tight tabular-nums">
                                    {Object.values(daily_reports).reduce((a, b) => a + b, 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily chart */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">Daily Reports (last 30 days)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {dailyEntries.length > 0 ? (
                            <div className="flex items-end gap-[2px] h-36">
                                {dailyEntries.map(([date, count]) => (
                                    <div
                                        key={date}
                                        className="flex-1 rounded-t bg-blue-500/80 hover:bg-blue-600 transition-colors group relative cursor-default"
                                        style={{ height: `${(count / maxDaily) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                                        title={`${date}: ${count} reports`}
                                    >
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-lg whitespace-nowrap">
                                            {count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-12">
                                <BarChart3 className="size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No data available</p>
                            </div>
                        )}
                        {dailyEntries.length > 0 && (
                            <div className="flex justify-between mt-3 text-[10px] font-medium text-muted-foreground">
                                <span>{dailyEntries[0]?.[0]}</span>
                                <span>{dailyEntries[dailyEntries.length - 1]?.[0]}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly trend */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">Monthly Trend (last 6 months)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {monthlyEntries.length > 0 ? (
                            <div className="flex items-end gap-4 h-32">
                                {monthlyEntries.map(([month, count]) => (
                                    <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                                        <span className="text-xs font-bold tabular-nums">{count}</span>
                                        <div
                                            className="w-full rounded-t bg-indigo-500/80 hover:bg-indigo-600 transition-colors"
                                            style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                                        />
                                        <span className="text-[10px] font-medium text-muted-foreground">{month}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-12">
                                <BarChart3 className="size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No data available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Breakdowns grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">By Hazard Type</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 p-6">
                            {Object.entries(hazard_breakdown).map(([type, count]) => {
                                const pct = totalReports > 0 ? (count / totalReports) * 100 : 0;
                                return (
                                    <div key={type} className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-medium">{HAZARD_LABELS[type as HazardType] ?? type}</span>
                                            <span className="font-bold tabular-nums">{count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${HAZARD_COLORS[type] ?? 'bg-zinc-400'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(hazard_breakdown).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">By Severity</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 p-6">
                            {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((sev) => (
                                <div key={sev} className="flex items-center justify-between">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_COLORS[sev]}`}>
                                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                    </span>
                                    <span className="text-sm font-bold tabular-nums">{severity_breakdown[sev] ?? 0}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">By Status</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 p-6">
                            {(['pending', 'verified', 'assigned', 'resolved', 'rejected'] as ReportStatus[]).map((st) => (
                                <div key={st} className="flex items-center justify-between">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[st]}`}>
                                        {st.charAt(0).toUpperCase() + st.slice(1)}
                                    </span>
                                    <span className="text-sm font-bold tabular-nums">{status_breakdown[st] ?? 0}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Top responders */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                            <Trophy className="size-4" />
                            Top Responders
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {top_responders.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {top_responders.map((r, i) => (
                                    <div key={r.id} className="flex items-center gap-4">
                                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                            i === 0 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' :
                                            i === 1 ? 'bg-zinc-100 text-zinc-700 ring-2 ring-zinc-300' :
                                            i === 2 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-300' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 text-sm font-semibold">{r.name}</span>
                                        <span className="text-sm font-bold text-emerald-600 tabular-nums">{r.resolved_count} resolved</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-8">
                                <Trophy className="size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No responders yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
