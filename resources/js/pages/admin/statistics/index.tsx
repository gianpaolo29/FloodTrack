import { Head } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    BarChart3,
    CheckCircle2,
    Clock,
    Droplets,
    TrendingUp,
    Trophy,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { ReportStatus, Severity } from '@/types/admin';
import { SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Props {
    daily_reports: Record<string, number>;
    avg_response_time: number;
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    top_responders: { id: number; name: string; resolved_count: number }[];
    monthly_trend: Record<string, number>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Statistics', href: '/admin/statistics' },
];

const SEV_BAR_COLORS: Record<Severity, string> = {
    critical: '#ef4444',
    high:     '#f97316',
    moderate: '#f59e0b',
    low:      '#10b981',
};
const ST_BAR_COLORS: Record<ReportStatus, string> = {
    pending:  '#f59e0b',
    verified: '#3b82f6',
    assigned: '#8b5cf6',
    resolved: '#10b981',
    rejected: '#94a3b8',
};

/* ─── Tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-neutral-200/60 bg-white px-4 py-3 shadow-xl shadow-black/5 dark:border-neutral-700/60 dark:bg-neutral-900">
            <p className="mb-1.5 text-xs font-medium text-neutral-400">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-neutral-400">{entry.name}:</span>
                    <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ─── Page ─── */
export default function AdminStatistics({
    daily_reports,
    avg_response_time,
    severity_breakdown,
    status_breakdown,
    top_responders,
    monthly_trend,
}: Props) {
    const totalReports = Object.values(status_breakdown).reduce((a, b) => a + b, 0);
    const resolvedCount = status_breakdown['resolved'] ?? 0;
    const resolutionRate = totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;

    const dailyData = Object.entries(daily_reports).map(([date, count]) => ({ date, count }));
    const monthlyData = Object.entries(monthly_trend).map(([month, count]) => ({ month, count }));

    const severityRows = (['critical', 'high', 'moderate', 'low'] as Severity[]).map((sev) => ({
        key: sev,
        label: sev.charAt(0).toUpperCase() + sev.slice(1),
        value: severity_breakdown[sev] ?? 0,
        color: SEV_BAR_COLORS[sev],
        badge: SEVERITY_COLORS[sev],
    }));

    const statusRows = (['pending', 'verified', 'assigned', 'resolved', 'rejected'] as ReportStatus[]).map((st) => ({
        key: st,
        label: st.charAt(0).toUpperCase() + st.slice(1),
        value: status_breakdown[st] ?? 0,
        color: ST_BAR_COLORS[st],
        badge: STATUS_COLORS[st],
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics" />

            <div className="flex flex-col gap-5 p-5 sm:p-6">

                {/* ─── Header ─── */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Statistics</h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Analytics and insights across all flood reports.
                    </p>
                </div>

                {/* ─── Top Metrics ─── */}
                <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                        icon={TrendingUp}
                        iconBg="bg-blue-50 dark:bg-blue-900/30"
                        iconColor="text-blue-500"
                        value={totalReports.toLocaleString()}
                        label="Total Reports"
                        sub="All time"
                    />
                    <StatCard
                        icon={Clock}
                        iconBg="bg-amber-50 dark:bg-amber-900/30"
                        iconColor="text-amber-500"
                        value={formatResponseTime(avg_response_time)}
                        label="Avg Response Time"
                        sub="Pending → assigned"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        iconBg="bg-emerald-50 dark:bg-emerald-900/30"
                        iconColor="text-emerald-500"
                        value={`${resolutionRate}%`}
                        label="Resolution Rate"
                        sub={`${resolvedCount.toLocaleString()} resolved`}
                    />
                </div>

                {/* ─── Charts: Daily + Monthly ─── */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHead title="Daily Reports" sub="Last 30 days" icon={BarChart3} grad="from-blue-500 to-indigo-600" />
                        {dailyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#a3a3a3' }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a3a3a3' }} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reports" maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty text="No data available" />
                        )}
                    </Card>

                    <Card>
                        <CardHead title="Monthly Trend" sub="Last 6 months" icon={TrendingUp} grad="from-emerald-500 to-teal-600" />
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#a3a3a3' }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a3a3a3' }} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Reports" maxBarSize={36}>
                                        {monthlyData.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={`oklch(${0.58 - i * 0.015} 0.14 ${245 + i * 5})`}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty text="No data available" />
                        )}
                    </Card>
                </div>

                {/* ─── Breakdown: Severity + Status ─── */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* By Severity */}
                    <Card>
                        <CardHead title="By Severity" sub="Report distribution" icon={BarChart3} grad="from-amber-500 to-orange-600" />
                        <div className="flex flex-col gap-4">
                            {severityRows.map(({ key, label, value, color, badge }) => {
                                const pct = totalReports > 0 ? Math.round((value / totalReports) * 100) : 0;
                                return (
                                    <div key={key}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
                                                {label}
                                            </span>
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-[11px] text-neutral-400">{pct}%</span>
                                                <span className="w-7 text-right text-sm font-bold tabular-nums text-neutral-900 dark:text-white">{value}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* By Status */}
                    <Card>
                        <CardHead title="By Status" sub="Workflow pipeline" icon={CheckCircle2} grad="from-sky-500 to-blue-600" />
                        <div className="flex flex-col gap-4">
                            {statusRows.map(({ key, label, value, color, badge }) => {
                                const pct = totalReports > 0 ? Math.round((value / totalReports) * 100) : 0;
                                return (
                                    <div key={key}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
                                                {label}
                                            </span>
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-[11px] text-neutral-400">{pct}%</span>
                                                <span className="w-7 text-right text-sm font-bold tabular-nums text-neutral-900 dark:text-white">{value}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* ─── Top Responders ─── */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                            <Trophy className="size-3.5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Top Responders</h2>
                            <p className="text-[11px] text-neutral-400">All-time leaderboard</p>
                        </div>
                    </div>
                    <div className="p-5">
                        {top_responders.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {top_responders.map((r, i) => (
                                    <div key={r.id} className="flex items-center gap-3">
                                        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                            i === 0 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-600' :
                                            i === 1 ? 'bg-neutral-100 text-neutral-600 ring-2 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-600' :
                                            i === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-600' :
                                                      'bg-neutral-50 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                                        }`}>
                                            {i + 1}
                                        </span>
                                        <p className="flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-white">{r.name}</p>
                                        <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {r.resolved_count} resolved
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty text="No responders yet" />
                        )}
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

/* ─── Helpers ─── */

function formatResponseTime(minutes: number): string {
    if (minutes <= 0) return '—';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ─── Shared Components ─── */

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
            {children}
        </div>
    );
}

function CardHead({
    title, sub, icon: Icon, grad,
}: {
    title: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    grad: string;
}) {
    return (
        <div className="mb-4 flex items-center gap-2.5">
            <div className={`flex size-8 items-center justify-center rounded-xl bg-gradient-to-br ${grad} shadow-sm`}>
                <Icon className="size-3.5 text-white" />
            </div>
            <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h2>
                <p className="text-[11px] text-neutral-400">{sub}</p>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon, iconBg, iconColor, value, label, sub,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    value: string;
    label: string;
    sub: string;
}) {
    return (
        <div className="group relative rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
                <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg} transition-transform group-hover:scale-110`}>
                    <Icon className={`size-[18px] ${iconColor}`} />
                </div>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">{value}</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
            <Droplets className="mb-1 size-6 opacity-30" />
            <p className="text-xs">{text}</p>
        </div>
    );
}
