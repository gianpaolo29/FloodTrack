import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    ExternalLink,
    MapPin,
    MoreHorizontal,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import type { Report } from '@/types/admin';
import {
    SEVERITY_COLORS as SEV,
    STATUS_COLORS as STA,
    HAZARD_LABELS as HAZ,
} from '@/types/admin';

interface Stats {
    total_reports: number;
    pending: number;
    active: number;
    resolved_today: number;
    total_users: number;
    total_responders: number;
}

interface DailyReport {
    date: string;
    total: number;
    resolved: number;
}

interface MonthlyReport {
    month: string;
    total: number;
    critical: number;
    high: number;
}

interface Props {
    stats: Stats;
    trends: { reports: number; resolved: number };
    daily_reports: DailyReport[];
    monthly_reports: MonthlyReport[];
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    recent_reports: Report[];
    active_alerts: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Dashboard', href: '/admin' },
];

/* ─── Custom Tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border/50 bg-card px-4 py-3 shadow-xl shadow-black/5">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-semibold tabular-nums">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

export default function AdminDashboard({
    stats,
    trends,
    daily_reports,
    monthly_reports,
    severity_breakdown,
    status_breakdown,
    recent_reports,
    active_alerts,
}: Props) {
    const severityDonutData = (['critical', 'high', 'moderate', 'low'] as const).map((sev) => ({
        name: sev,
        value: severity_breakdown[sev] ?? 0,
    }));
    const DONUT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];

    const statusBarData = (['pending', 'verified', 'assigned', 'resolved', 'rejected'] as const).map((st) => ({
        name: st,
        value: status_breakdown[st] ?? 0,
    }));
    const STATUS_BAR_COLORS: Record<string, string> = {
        pending: '#f59e0b',
        verified: '#3b82f6',
        assigned: '#818cf8',
        resolved: '#10b981',
        rejected: '#94a3b8',
    };

    const totalSeverity = severityDonutData.reduce((sum, d) => sum + d.value, 0);
    const resolutionRate = stats.total_reports > 0
        ? Math.round(((status_breakdown['resolved'] ?? 0) / stats.total_reports) * 100)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard — FloodTrack" />

            <div className="flex flex-col gap-6 p-6 lg:px-8 lg:py-7">

                {/* ─── Welcome + Header ─── */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="size-4 text-amber-500" />
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overview</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                        <span className="rounded-xl bg-primary/5 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/10">
                            Last 30 days
                        </span>
                    </div>
                </div>

                {/* ─── Stat Cards ─── */}
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <PremiumStatCard
                        label="Total Reports"
                        value={stats.total_reports}
                        trend={trends.reports}
                        gradient="from-indigo-500 to-indigo-600"
                        iconBg="bg-indigo-500/10"
                        iconColor="text-indigo-500"
                        icon={MapPin}
                    />
                    <PremiumStatCard
                        label="Pending Review"
                        value={stats.pending}
                        gradient="from-amber-500 to-orange-500"
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-500"
                        icon={Clock}
                        alert={stats.pending > 0}
                    />
                    <PremiumStatCard
                        label="Active Incidents"
                        value={stats.active}
                        gradient="from-blue-500 to-cyan-500"
                        iconBg="bg-blue-500/10"
                        iconColor="text-blue-500"
                        icon={Zap}
                    />
                    <PremiumStatCard
                        label="Resolved Today"
                        value={stats.resolved_today}
                        trend={trends.resolved}
                        gradient="from-emerald-500 to-teal-500"
                        iconBg="bg-emerald-500/10"
                        iconColor="text-emerald-500"
                        icon={CheckCircle2}
                    />
                </div>

                {/* ─── Area Chart — Reports Over Time ─── */}
                <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-sm ring-1 ring-border/30 transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                        <div>
                            <CardTitle className="text-base font-semibold">Reports Overview</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">Daily reports vs resolved — 30 days</p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl bg-muted/50 p-1">
                            <TabPill active>Reports</TabPill>
                            <TabPill>Resolved</TabPill>
                            <TabPill>Severity</TabPill>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-4 pt-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={daily_reports} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradReports2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradResolved2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} width={35} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={2.5} fill="url(#gradReports2)" name="Reports" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#818cf8' }} />
                                <Area type="monotone" dataKey="resolved" stroke="#34d399" strokeWidth={2.5} fill="url(#gradResolved2)" name="Resolved" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#34d399' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-indigo-400" />Reports</span>
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-400" />Resolved</span>
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Severity Donut + Status Breakdown ─── */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Severity Donut */}
                    <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-sm ring-1 ring-border/30 transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">Severity Breakdown</CardTitle>
                                <p className="mt-0.5 text-xs text-muted-foreground">Report distribution by severity level</p>
                            </div>
                            <button className="rounded-xl p-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                                <MoreHorizontal className="size-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center gap-8 px-6 pb-6 pt-2">
                            <div className="relative">
                                <ResponsiveContainer width={190} height={190}>
                                    <PieChart>
                                        <Pie
                                            data={severityDonutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={62}
                                            outerRadius={88}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={6}
                                        >
                                            {severityDonutData.map((_, index) => (
                                                <Cell key={index} fill={DONUT_COLORS[index]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold tracking-tight">{totalSeverity}</span>
                                    <span className="text-[11px] font-medium text-muted-foreground">Total</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3.5">
                                {severityDonutData.map((entry, i) => (
                                    <div key={entry.name} className="flex items-center gap-3">
                                        <span className="size-3 rounded-sm" style={{ backgroundColor: DONUT_COLORS[i] }} />
                                        <span className="w-20 text-sm capitalize text-muted-foreground">{entry.name}</span>
                                        <span className="text-sm font-bold tabular-nums">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status Breakdown — Bar */}
                    <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-sm ring-1 ring-border/30 transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
                                <p className="mt-0.5 text-xs text-muted-foreground">Current report status distribution</p>
                            </div>
                            <button className="rounded-xl p-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                                <MoreHorizontal className="size-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="px-2 pb-6 pt-2">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={statusBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} width={30} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count" barSize={36}>
                                        {statusBarData.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_BAR_COLORS[entry.name] ?? '#94a3b8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Monthly Trend — Full Width Bar ─── */}
                <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-sm ring-1 ring-border/30 transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                        <div>
                            <CardTitle className="text-base font-semibold">Monthly Trend</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">Last 6 months breakdown</p>
                        </div>
                        <div className="flex items-center gap-5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-indigo-400" />Total</span>
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-400" />Critical</span>
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-orange-400" />High</span>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-4 pt-2">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={monthly_reports} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} width={35} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="total" fill="#818cf8" radius={[6, 6, 0, 0]} name="Total" barSize={20} />
                                <Bar dataKey="critical" fill="#f87171" radius={[6, 6, 0, 0]} name="Critical" barSize={20} />
                                <Bar dataKey="high" fill="#fb923c" radius={[6, 6, 0, 0]} name="High" barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* ─── Secondary Stat Cards ─── */}
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <PremiumStatCard
                        label="Registered Users"
                        value={stats.total_users}
                        gradient="from-violet-500 to-purple-600"
                        iconBg="bg-violet-500/10"
                        iconColor="text-violet-500"
                        icon={Users}
                    />
                    <PremiumStatCard
                        label="Responders"
                        value={stats.total_responders}
                        gradient="from-sky-500 to-blue-500"
                        iconBg="bg-sky-500/10"
                        iconColor="text-sky-500"
                        icon={ShieldAlert}
                    />
                    <PremiumStatCard
                        label="Active Alerts"
                        value={active_alerts}
                        gradient="from-rose-500 to-pink-500"
                        iconBg="bg-rose-500/10"
                        iconColor="text-rose-500"
                        icon={AlertTriangle}
                        alert={active_alerts > 0}
                    />
                    <PremiumStatCard
                        label="Resolution Rate"
                        value={resolutionRate}
                        suffix="%"
                        gradient="from-teal-500 to-emerald-500"
                        iconBg="bg-teal-500/10"
                        iconColor="text-teal-500"
                        icon={TrendingUp}
                    />
                </div>

                {/* ─── Recent Reports Table ─── */}
                <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-sm ring-1 ring-border/30 transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
                        <div>
                            <CardTitle className="text-base font-semibold">Recent Reports</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">Latest flood reports across all areas</p>
                        </div>
                        <Link
                            href="/admin/reports"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary ring-1 ring-primary/10 hover:bg-primary/10 transition-colors"
                        >
                            View all
                            <ExternalLink className="size-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y border-border/30 bg-muted/20 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        <th className="px-6 py-3">Reference</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Reporter</th>
                                        <th className="px-6 py-3 text-right">Severity</th>
                                        <th className="px-6 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {recent_reports.map((report) => (
                                        <tr key={report.id} className="group transition-colors hover:bg-muted/20">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
                                                        <MapPin className="size-4 text-primary" />
                                                    </div>
                                                    <Link
                                                        href={`/admin/reports/${report.id}`}
                                                        className="font-semibold text-foreground hover:text-primary transition-colors"
                                                    >
                                                        {report.reference_number}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground">
                                                {HAZ[report.hazard_type]}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                                                {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground">
                                                {report.user?.name ?? '—'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${SEV[report.severity]}`}>
                                                    {report.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${STA[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {recent_reports.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
                                                        <MapPin className="size-7 text-muted-foreground/40" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">No reports yet</p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground/60">Reports will appear here once submitted</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

/* ─── Premium Stat Card ─── */

function PremiumStatCard({
    label,
    value,
    trend,
    gradient,
    iconBg,
    iconColor,
    icon: Icon,
    suffix = '',
    alert,
}: {
    label: string;
    value: number;
    trend?: number;
    gradient: string;
    iconBg: string;
    iconColor: string;
    icon: React.ComponentType<{ className?: string }>;
    suffix?: string;
    alert?: boolean;
}) {
    return (
        <Card className="group relative overflow-hidden rounded-2xl border-0 bg-card shadow-sm ring-1 ring-border/30 transition-all hover:shadow-md hover:ring-border/50">
            {/* Gradient top accent */}
            <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

            {/* Subtle background glow */}
            <div className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.04] blur-2xl transition-opacity group-hover:opacity-[0.08]`} />

            <CardContent className="flex items-center gap-4 px-5 py-5">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${iconBg} ring-1 ring-black/[0.04] transition-transform group-hover:scale-105`}>
                    <Icon className={`size-5 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                        <p className="text-2xl font-bold tracking-tight tabular-nums">
                            {value.toLocaleString()}{suffix}
                        </p>
                        {trend !== undefined && trend !== 0 && (
                            <span
                                className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold ${
                                    trend > 0
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-red-500/10 text-red-500'
                                }`}
                            >
                                {trend > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                                {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Alert pulse */}
                {alert && (
                    <span className="absolute right-4 top-5 flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
                    </span>
                )}
            </CardContent>
        </Card>
    );
}

/* ─── Tab Pill ─── */

function TabPill({ active, children }: { active?: boolean; children: React.ReactNode }) {
    return (
        <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
        >
            {children}
        </button>
    );
}
