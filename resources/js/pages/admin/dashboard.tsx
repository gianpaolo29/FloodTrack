import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    MapPin,
    ShieldAlert,
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
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard — FloodTrack" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Flood monitoring overview and system metrics.
                        </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                        <span className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                            Last 30 days
                        </span>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={MapPin}
                        label="Total Reports"
                        value={stats.total_reports}
                        trend={trends.reports}
                        color="blue"
                    />
                    <StatCard
                        icon={Clock}
                        label="Pending Review"
                        value={stats.pending}
                        color="amber"
                        alert={stats.pending > 0}
                    />
                    <StatCard
                        icon={Zap}
                        label="Active Incidents"
                        value={stats.active}
                        color="indigo"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Resolved Today"
                        value={stats.resolved_today}
                        trend={trends.resolved}
                        color="emerald"
                    />
                </div>

                {/* Charts row */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Area chart - Reports over time */}
                    <Card className="lg:col-span-2 overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
                            <div>
                                <CardTitle className="text-sm font-semibold">Reports Overview</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Daily reports vs resolved (30 days)</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full bg-blue-500" />
                                    Reports
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full bg-emerald-500" />
                                    Resolved
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 pb-4 pt-0">
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={daily_reports} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradientReports" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradientResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        width={30}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="url(#gradientReports)"
                                        name="Reports"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="resolved"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#gradientResolved)"
                                        name="Resolved"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Bar chart - Monthly breakdown */}
                    <Card className="overflow-hidden">
                        <CardHeader className="px-6 py-4">
                            <CardTitle className="text-sm font-semibold">Monthly Trend</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
                        </CardHeader>
                        <CardContent className="px-2 pb-4 pt-0">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={monthly_reports} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        width={30}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total" />
                                    <Bar dataKey="critical" fill="#ef4444" radius={[4, 4, 0, 0]} name="Critical" />
                                    <Bar dataKey="high" fill="#f97316" radius={[4, 4, 0, 0]} name="High" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Secondary stats + breakdowns */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={Users}
                        label="Registered Users"
                        value={stats.total_users}
                        color="violet"
                    />
                    <StatCard
                        icon={ShieldAlert}
                        label="Responders"
                        value={stats.total_responders}
                        color="sky"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Active Alerts"
                        value={active_alerts}
                        color="rose"
                        alert={active_alerts > 0}
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Resolution Rate"
                        value={stats.total_reports > 0
                            ? Math.round(((status_breakdown['resolved'] ?? 0) / stats.total_reports) * 100)
                            : 0}
                        suffix="%"
                        color="teal"
                    />
                </div>

                {/* Breakdowns row */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">
                                Reports by Severity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                {(['critical', 'high', 'moderate', 'low'] as const).map((sev) => {
                                    const count = severity_breakdown[sev] ?? 0;
                                    const total = stats.total_reports || 1;
                                    const pct = Math.round((count / total) * 100);
                                    const barColors: Record<string, string> = {
                                        critical: 'bg-red-500',
                                        high: 'bg-orange-500',
                                        moderate: 'bg-amber-500',
                                        low: 'bg-emerald-500',
                                    };
                                    return (
                                        <div key={sev} className="flex items-center gap-3">
                                            <span className="w-20 text-xs font-medium capitalize text-muted-foreground">
                                                {sev}
                                            </span>
                                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${barColors[sev]} transition-all`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right text-xs font-semibold tabular-nums">
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">
                                Reports by Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                {(['pending', 'verified', 'assigned', 'resolved', 'rejected'] as const).map((st) => {
                                    const count = status_breakdown[st] ?? 0;
                                    const total = stats.total_reports || 1;
                                    const pct = Math.round((count / total) * 100);
                                    const barColors: Record<string, string> = {
                                        pending: 'bg-amber-500',
                                        verified: 'bg-blue-500',
                                        assigned: 'bg-indigo-500',
                                        resolved: 'bg-emerald-500',
                                        rejected: 'bg-zinc-400',
                                    };
                                    return (
                                        <div key={st} className="flex items-center gap-3">
                                            <span className="w-20 text-xs font-medium capitalize text-muted-foreground">
                                                {st}
                                            </span>
                                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${barColors[st]} transition-all`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right text-xs font-semibold tabular-nums">
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent reports table */}
                <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                            Recent Reports
                        </CardTitle>
                        <Link
                            href="/admin/reports"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            View all
                            <ArrowUpRight className="size-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/20 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        <th className="px-6 py-3">Reference</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Severity</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Reporter</th>
                                        <th className="px-6 py-3">Location</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {recent_reports.map((report) => (
                                        <tr
                                            key={report.id}
                                            className="group transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-6 py-3.5">
                                                <Link
                                                    href={`/admin/reports/${report.id}`}
                                                    className="inline-flex items-center gap-1 font-mono text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                                >
                                                    {report.reference_number}
                                                    <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground">
                                                {HAZ[report.hazard_type]}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEV[report.severity]}`}>
                                                    {report.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STA[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 font-medium">{report.user?.name ?? '—'}</td>
                                            <td className="px-6 py-3.5 max-w-[180px] truncate text-muted-foreground">
                                                {report.address ?? '—'}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                                                {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                    {recent_reports.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <MapPin className="size-8 text-muted-foreground/40" />
                                                    <p className="text-sm text-muted-foreground">No reports yet</p>
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

/* ─── Stat Card Component ─── */

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-600',    ring: 'ring-blue-500/20' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600',   ring: 'ring-amber-500/20' },
    indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-600',  ring: 'ring-indigo-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-600',  ring: 'ring-violet-500/20' },
    sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-600',     ring: 'ring-sky-500/20' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-600',    ring: 'ring-rose-500/20' },
    teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-600',    ring: 'ring-teal-500/20' },
};

function StatCard({
    icon: Icon,
    label,
    value,
    trend,
    color,
    alert,
    suffix = '',
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    trend?: number;
    color: string;
    alert?: boolean;
    suffix?: string;
}) {
    const colors = COLOR_MAP[color] ?? COLOR_MAP.blue;

    return (
        <Card className={`relative overflow-hidden transition-all hover:shadow-md ${alert ? 'border-l-4 border-l-' + color + '-500' : ''}`}>
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${colors.bg} ${colors.ring}`}>
                    <Icon className={`size-5 ${colors.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold tracking-tight tabular-nums">
                            {value.toLocaleString()}{suffix}
                        </p>
                        {trend !== undefined && trend !== 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {trend > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                                {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
