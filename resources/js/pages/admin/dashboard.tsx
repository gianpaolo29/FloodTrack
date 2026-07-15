import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    CloudRain,
    Droplets,
    ExternalLink,
    FileText,
    Globe,
    MapPin,
    ShieldCheck,
    TrendingUp,
    Trophy,
    Users,
    Waves,
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
import type { BreadcrumbItem } from '@/types';
import type { Report, Alert as AlertType } from '@/types/admin';
import {
    SEVERITY_COLORS as SEV,
    STATUS_COLORS as STA,
} from '@/types/admin';

/* ─── Types ─── */

interface Stats {
    total_reports: number;
    pending: number;
    active: number;
    resolved_today: number;
    total_users: number;
    total_responders: number;
}

interface DailyReport { date: string; total: number; resolved: number }
interface MonthlyReport { month: string; total: number; critical: number; high: number }
interface TopResponder { id: number; name: string; email: string; resolved_count: number; total_assigned: number }
interface ActivityItem { id: number; status: string; notes: string | null; created_at: string; user: { id: number; name: string; role: string }; report: { id: number; reference_number: string; severity: string } }
interface MapReport { id: number; reference_number: string; severity: string; status: string; latitude: number; longitude: number; address: string | null }

interface Props {
    stats: Stats;
    trends: { reports: number; resolved: number };
    daily_reports: DailyReport[];
    monthly_reports: MonthlyReport[];
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    recent_reports: Report[];
    active_alerts: number;
    critical_alerts: AlertType[];
    top_responders: TopResponder[];
    avg_response_time: number;
    recent_activity: ActivityItem[];
    affected_areas: number;
    map_reports: MapReport[];
    period: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Dashboard', href: '/admin' },
];

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'Monthly' },
    { key: 'all', label: 'All' },
] as const;

const DONUT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];
const STATUS_BAR_COLORS: Record<string, string> = { pending: '#f59e0b', verified: '#3b82f6', assigned: '#8b5cf6', resolved: '#10b981', rejected: '#94a3b8' };

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

/* ─── Main ─── */

export default function AdminDashboard({
    stats, trends, daily_reports, monthly_reports,
    severity_breakdown, status_breakdown,
    recent_reports, active_alerts, critical_alerts,
    top_responders, avg_response_time, recent_activity,
    affected_areas, map_reports, period,
}: Props) {
    const severityDonutData = (['critical', 'high', 'moderate', 'low'] as const).map((sev) => ({
        name: sev, value: severity_breakdown[sev] ?? 0,
    }));
    const statusBarData = (['pending', 'verified', 'assigned', 'resolved', 'rejected'] as const).map((st) => ({
        name: st, value: status_breakdown[st] ?? 0,
    }));
    const totalSeverity = severityDonutData.reduce((sum, d) => sum + d.value, 0);
    const resolutionRate = stats.total_reports > 0
        ? Math.round(((status_breakdown['resolved'] ?? 0) / stats.total_reports) * 100) : 0;

    const setPeriod = (p: string) => {
        router.get('/admin', { period: p }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="space-y-4 p-4 sm:p-5">

                {/* ─── Critical Alerts Banner ─── */}
                {critical_alerts.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {critical_alerts.map((alert) => (
                            <div key={alert.id} className="flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-950/30">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                                    <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">{alert.title}</p>
                                    <p className="text-xs text-red-600/70 line-clamp-1 dark:text-red-400/70">{alert.body}</p>
                                </div>
                                <span className="shrink-0 text-[10px] font-medium text-red-500/60">
                                    {new Date(alert.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── Header + Period Filter ─── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Dashboard</h1>
                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Overview of your flood tracking system</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800/50">
                            {PERIODS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setPeriod(key)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                        period === key
                                            ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                                            : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <Link
                            href="/admin/export"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                        >
                            <ExternalLink className="size-3.5" />
                            Export
                        </Link>
                    </div>
                </div>

                {/* ─── Primary Stats (5 cols) ─── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <StatCard label="Total Reports" value={stats.total_reports} sub={`${trends.reports >= 0 ? '+' : ''}${trends.reports}% this week`} icon={FileText} iconColor="text-blue-500" iconBg="bg-blue-50 dark:bg-blue-900/30" />
                    <StatCard label="Active Floods" value={stats.active} sub={`${severity_breakdown['critical'] ?? 0} critical`} icon={Waves} iconColor="text-sky-500" iconBg="bg-sky-50 dark:bg-sky-900/30" />
                    <StatCard label="Pending Review" value={stats.pending} sub="awaiting action" icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-50 dark:bg-amber-900/30" alert={stats.pending > 0} />
                    <StatCard label="Active Responders" value={stats.total_responders} sub={`${stats.resolved_today} resolved today`} icon={ShieldCheck} iconColor="text-indigo-500" iconBg="bg-indigo-50 dark:bg-indigo-900/30" />
                    <StatCard label="Active Alerts" value={active_alerts} sub={`${critical_alerts.length} critical`} icon={AlertTriangle} iconColor="text-rose-500" iconBg="bg-rose-50 dark:bg-rose-900/30" alert={active_alerts > 0} />
                </div>

                {/* ─── Secondary Stats (4 cols) ─── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MiniStatCard icon={CheckCircle2} iconColor="text-emerald-500" iconBg="bg-emerald-50 dark:bg-emerald-900/30" value={stats.resolved_today} label="Resolved Today" />
                    <MiniStatCard icon={Clock} iconColor="text-orange-500" iconBg="bg-orange-50 dark:bg-orange-900/30" value={formatResponseTime(avg_response_time)} label="Avg Response Time" />
                    <MiniStatCard icon={Globe} iconColor="text-violet-500" iconBg="bg-violet-50 dark:bg-violet-900/30" value={affected_areas} label="Affected Areas" />
                    <MiniStatCard icon={TrendingUp} iconColor="text-teal-500" iconBg="bg-teal-50 dark:bg-teal-900/30" value={`${resolutionRate}%`} label="Resolution Rate" />
                </div>

                {/* ─── Charts: Area + Severity Donut ─── */}
                <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                    <Card>
                        <CardHead title="Flood Reports Trend" sub="Last 30 days" />
                        {daily_reports.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={daily_reports} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} interval="preserveStartEnd" />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#gR)" name="Reports" dot={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                    <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#gS)" name="Resolved" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty text="No data available" />
                        )}
                    </Card>

                    <Card>
                        <CardHead title="Severity Breakdown" sub="By category" />
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <ResponsiveContainer width={200} height={200}>
                                    <PieChart>
                                        <Pie data={severityDonutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={6}>
                                            {severityDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">{totalSeverity}</span>
                                    <span className="text-[10px] text-neutral-400">total</span>
                                </div>
                            </div>
                            <div className="mt-2 flex w-full flex-col gap-2.5">
                                {severityDonutData.map((entry, i) => (
                                    <div key={entry.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
                                            <span className="text-xs capitalize text-neutral-500 dark:text-neutral-400">{entry.name}</span>
                                        </div>
                                        <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-white">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ─── Chart: Status Overview ─── */}
                <Card>
                    <CardHead title="Status Overview" sub="Current distribution" />
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={statusBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count" barSize={32}>
                                {statusBarData.map((e) => <Cell key={e.name} fill={STATUS_BAR_COLORS[e.name] ?? '#94a3b8'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* ─── Monthly Trend (full width) ─── */}
                <Card>
                    <div className="flex items-center justify-between">
                        <CardHead title="Monthly Comparison" sub="Last 6 months" />
                        <div className="flex items-center gap-4 text-[10px] text-neutral-400">
                            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-blue-500" />Total</span>
                            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400" />Critical</span>
                            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-orange-400" />High</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthly_reports} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" barSize={14} />
                            <Bar dataKey="critical" fill="#f87171" radius={[4, 4, 0, 0]} name="Critical" barSize={14} />
                            <Bar dataKey="high" fill="#fb923c" radius={[4, 4, 0, 0]} name="High" barSize={14} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* ─── Top Responders + Recent Activity ─── */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Top Responders */}
                    <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                                <Trophy className="size-3.5 text-white" />
                            </div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Top Responders</h2>
                        </div>
                        <div className="p-4">
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
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{r.name}</p>
                                                <p className="text-[10px] text-neutral-400">{r.total_assigned} assigned</p>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-600 tabular-nums dark:text-emerald-400">{r.resolved_count} resolved</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty text="No responders yet" />
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                    <Zap className="size-3.5 text-white" />
                                </div>
                                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Recent Activity</h2>
                            </div>
                            <Link href="/admin/activity" className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 transition-colors dark:hover:text-neutral-300">
                                View all
                            </Link>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {recent_activity.length > 0 ? recent_activity.map((a) => (
                                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-[10px] font-bold text-white mt-0.5">
                                        {a.user.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                                            <span className="font-semibold">{a.user.name}</span>
                                            <span className="text-neutral-400"> changed status to </span>
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STA[a.status as keyof typeof STA] ?? 'bg-neutral-100 text-neutral-500'}`}>
                                                {a.status.replace('_', ' ')}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-neutral-400">
                                            {a.report.reference_number} · {new Date(a.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-5 py-8">
                                    <Empty text="No recent activity" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Live Map Preview ─── */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                                <MapPin className="size-3.5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Live Incident Map</h2>
                                <p className="text-[11px] text-neutral-400">{map_reports.length} active incident{map_reports.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <Link
                            href="/admin/reports/map"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        >
                            <Globe className="size-3" />
                            Full Map
                        </Link>
                    </div>
                    <div className="relative h-[300px] overflow-hidden rounded-b-2xl">
                        {map_reports.length > 0 ? (
                            <div className="grid h-full grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                                {map_reports.slice(0, 8).map((r) => (
                                    <Link
                                        key={r.id}
                                        href={`/admin/reports/${r.id}`}
                                        className="flex flex-col justify-between rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 transition-all hover:bg-white hover:shadow-sm dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-neutral-900 dark:text-white">{r.reference_number}</span>
                                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${SEV[r.severity as keyof typeof SEV] ?? ''}`}>
                                                    {r.severity}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{r.address ?? 'No address'}</p>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400">
                                            <MapPin className="size-3" />
                                            <span className="tabular-nums">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <Empty text="No active incidents" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Recent Reports Table ─── */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                <FileText className="size-3.5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Recent Reports</h2>
                                <p className="text-[11px] text-neutral-400">Latest flood reports</p>
                            </div>
                        </div>
                        <Link href="/admin/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            View all <ExternalLink className="size-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-50 text-left dark:border-neutral-800">
                                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Reference</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Date</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Reporter</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 text-right">Severity</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent_reports.map((report) => (
                                    <tr key={report.id} className="border-t border-neutral-100 transition-colors hover:bg-neutral-50/50 dark:border-neutral-800/50 dark:hover:bg-neutral-800/30">
                                        <td className="px-5 py-3.5">
                                            <Link href={`/admin/reports/${report.id}`} className="font-semibold text-neutral-900 hover:text-sky-600 transition-colors dark:text-white dark:hover:text-sky-400">
                                                {report.reference_number}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3.5 text-neutral-500 whitespace-nowrap dark:text-neutral-400">
                                            {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400">{report.user?.name ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEV[report.severity]}`}>{report.severity}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STA[report.status]}`}>{report.status}</span>
                                        </td>
                                    </tr>
                                ))}
                                {recent_reports.length === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-16 text-center"><Empty text="No reports yet" /></td></tr>
                                )}
                            </tbody>
                        </table>
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

/* ─── Reusable Components ─── */

function Card({ children }: { children: React.ReactNode }) {
    return <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">{children}</div>;
}

function CardHead({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h2>
            <p className="text-[11px] text-neutral-400">{sub}</p>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
            <Droplets className="size-6 mb-1 opacity-30" />
            <p className="text-xs">{text}</p>
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, iconColor, iconBg, alert }: {
    label: string; value: number; sub: string;
    icon: React.ComponentType<{ className?: string }>; iconColor: string; iconBg: string; alert?: boolean;
}) {
    return (
        <div className="group relative rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
                <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg} transition-transform group-hover:scale-110`}>
                    <Icon className={`size-[18px] ${iconColor}`} />
                </div>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">{value.toLocaleString()}</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
            {alert && (
                <span className="absolute right-3 top-3 flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                </span>
            )}
        </div>
    );
}

function MiniStatCard({ icon: Icon, iconColor, iconBg, value, label }: {
    icon: React.ComponentType<{ className?: string }>; iconColor: string; iconBg: string; value: number | string; label: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/60 bg-white px-4 py-3.5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`size-[18px] ${iconColor}`} />
            </div>
            <div>
                <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="text-[11px] text-neutral-400">{label}</p>
            </div>
        </div>
    );
}
