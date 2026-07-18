import { Head, Link, router } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock,
    CloudRain,
    Droplets,
    ExternalLink,
    FileText,
    Globe,
    LayoutDashboard,
    MapPin,
    ShieldCheck,
    TrendingUp,
    Trophy,
    Waves,
    Zap,
} from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Report, Alert as AlertType } from '@/types/admin';
import { SEVERITY_COLORS as SEV, STATUS_COLORS as STA } from '@/types/admin';

/* ─── Types ─── */
interface Stats { total_reports: number; pending: number; active: number; resolved_today: number; total_users: number; total_responders: number }
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
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'Monthly' },
    { key: 'all',   label: 'All' },
] as const;

const DONUT_COLORS  = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];
const STATUS_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#94a3b8'];

/* ─── Tooltip ─── */
function tooltipHtml(label: string, rows: { color: string; name: string; value: number | string }[]) {
    const items = rows.map(r => `
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${r.color};flex-shrink:0;box-shadow:0 0 0 2px ${r.color}22"></span>
            <span style="color:#6b7280;font-size:11px">${r.name}:</span>
            <span style="font-weight:700;font-size:12px;color:#111827">${r.value}</span>
        </div>`).join('');
    return `<div style="background:#fff;border:1px solid #f0f0f0;border-radius:14px;padding:12px 16px;box-shadow:0 24px 48px rgba(0,0,0,0.10);min-width:140px">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;margin:0 0 4px">${label}</p>
        ${items}
    </div>`;
}

/* ─── Card ─── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-white/60 bg-white shadow-sm shadow-black/[0.04] transition-shadow hover:shadow-md hover:shadow-black/[0.07] dark:border-neutral-700/50 dark:bg-neutral-900 ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, gradient, title, subtitle, children }: {
    icon: React.ElementType; gradient: string; title: string; subtitle: string; children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <div className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                <Icon className="size-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
                <p className="text-[11px] text-neutral-400">{subtitle}</p>
            </div>
            {children}
        </div>
    );
}

export default function AdminDashboard({
    stats, trends, daily_reports, monthly_reports,
    severity_breakdown, status_breakdown,
    recent_reports, active_alerts, critical_alerts,
    top_responders, avg_response_time, recent_activity,
    affected_areas, map_reports, period,
}: Props) {
    const severityValues = [
        severity_breakdown['critical'] ?? 0,
        severity_breakdown['high'] ?? 0,
        severity_breakdown['moderate'] ?? 0,
        severity_breakdown['low'] ?? 0,
    ];
    const severityLabels = ['Critical', 'High', 'Moderate', 'Low'];
    const statusValues   = ['pending', 'verified', 'assigned', 'resolved', 'rejected'].map(s => status_breakdown[s] ?? 0);
    const totalSeverity  = severityValues.reduce((a, b) => a + b, 0);
    const resolutionRate = stats.total_reports > 0
        ? Math.round(((status_breakdown['resolved'] ?? 0) / stats.total_reports) * 100) : 0;

    const setPeriod = (p: string) =>
        router.get('/admin', { period: p }, { preserveState: true, preserveScroll: true });

    /* ── Area Chart ── */
    const areaOptions: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600, easing: 'easeinout' }, selection: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: [2.5, 2.5] },
        fill: {
            type: 'gradient',
            gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 90, 100] },
        },
        colors: ['#6366f1', '#10b981'],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 0, right: 4 } },
        xaxis: { categories: daily_reports.map(d => d.date), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: 0 }, tooltip: { enabled: false } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        legend: { show: false },
        markers: { size: 0, hover: { size: 5, sizeOffset: 1 } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.categoryLabels[dataPointIndex] ?? w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [
                    { color: '#6366f1', name: 'Reports',  value: series[0][dataPointIndex] },
                    { color: '#10b981', name: 'Resolved', value: series[1][dataPointIndex] },
                ]);
            },
        },
    };
    const areaSeries = [
        { name: 'Reports',  data: daily_reports.map(d => d.total) },
        { name: 'Resolved', data: daily_reports.map(d => d.resolved) },
    ];

    /* ── Donut Chart ── */
    const donutOptions: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        labels: severityLabels,
        colors: DONUT_COLORS,
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: { width: 2, colors: ['#ffffff'] },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '10px', fontWeight: '500', color: '#94a3b8', offsetY: 8 },
                        value: { show: true, fontSize: '30px', fontWeight: '800', color: '#111827', offsetY: -14, formatter: v => v },
                        total: { show: true, showAlways: true, label: 'total', fontSize: '11px', fontWeight: '500', color: '#94a3b8', formatter: () => String(totalSeverity) },
                    },
                },
                expandOnClick: false,
            },
        },
        states: { hover: { filter: { type: 'darken', value: 0.88 } }, active: { filter: { type: 'none' } } },
        tooltip: {
            custom: ({ series, seriesIndex, w }) => {
                const label = w.globals.labels[seriesIndex];
                const color = DONUT_COLORS[seriesIndex];
                const total = series.reduce((a: number, b: number) => a + b, 0);
                const pct   = total > 0 ? Math.round((series[seriesIndex] / total) * 100) : 0;
                return tooltipHtml(label, [
                    { color, name: 'Count', value: series[seriesIndex] },
                    { color, name: 'Share', value: `${pct}%` },
                ]);
            },
        },
    };

    /* ── Status Bar ── */
    const statusOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 }, selection: { enabled: false } },
        plotOptions: { bar: { borderRadius: 8, borderRadiusApplication: 'end', distributed: true, columnWidth: '52%' } },
        dataLabels: { enabled: false },
        legend: { show: false },
        colors: STATUS_COLORS,
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.75, stops: [0, 100] } },
        xaxis: { categories: ['Pending', 'Verified', 'Assigned', 'Resolved', 'Rejected'], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        states: { hover: { filter: { type: 'darken', value: 0.88 } }, active: { filter: { type: 'none' } } },
        tooltip: {
            custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                const color = STATUS_COLORS[dataPointIndex];
                return tooltipHtml(label, [{ color, name: 'Count', value: series[seriesIndex][dataPointIndex] }]);
            },
        },
    };
    const statusSeries = [{ name: 'Count', data: statusValues }];

    /* ── Monthly Bar ── */
    const monthlyOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 }, selection: { enabled: false } },
        plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '60%' } },
        dataLabels: { enabled: false },
        colors: ['#6366f1', '#f43f5e', '#f97316'],
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.75, stops: [0, 100] } },
        legend: { show: false },
        xaxis: { categories: monthly_reports.map(m => m.month), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        states: { hover: { filter: { type: 'darken', value: 0.88 } }, active: { filter: { type: 'none' } } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [
                    { color: '#6366f1', name: 'Total',    value: series[0][dataPointIndex] },
                    { color: '#f43f5e', name: 'Critical', value: series[1][dataPointIndex] },
                    { color: '#f97316', name: 'High',     value: series[2][dataPointIndex] },
                ]);
            },
        },
    };
    const monthlySeries = [
        { name: 'Total',    data: monthly_reports.map(m => m.total) },
        { name: 'Critical', data: monthly_reports.map(m => m.critical) },
        { name: 'High',     data: monthly_reports.map(m => m.high) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            {/* Page background */}
            <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
            <div className="flex flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-8">

                {/* Critical Alerts */}
                {critical_alerts.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {critical_alerts.map((alert) => (
                            <div key={alert.id} className="flex items-center gap-3 rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50 via-rose-50 to-red-50/30 px-4 py-3 shadow-sm shadow-red-500/5 dark:border-red-900/40 dark:from-red-950/40 dark:to-rose-950/20">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                                    <AlertTriangle className="size-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">{alert.title}</p>
                                    <p className="text-xs text-red-600/70 line-clamp-1 dark:text-red-400/60">{alert.body}</p>
                                </div>
                                <span className="shrink-0 rounded-lg bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                    {new Date(alert.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-xl shadow-indigo-500/30">
                            <LayoutDashboard className="size-6 text-white" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl dark:from-white dark:to-neutral-400">
                                Dashboard
                            </h1>
                            <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">Overview of your flood tracking system</p>
                        </div>
                    </div>
                    <div className="flex items-center rounded-xl border border-neutral-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-800/60">
                        {PERIODS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setPeriod(key)}
                                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    period === key
                                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Stats — full gradient cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                    {([
                        { label: 'Total Reports',  value: stats.total_reports,   sub: `${trends.reports >= 0 ? '+' : ''}${trends.reports}% this week`, icon: FileText,      grad: 'from-indigo-500 via-blue-500 to-cyan-500',      shadow: 'shadow-indigo-500/40', alert: false },
                        { label: 'Active Floods',  value: stats.active,          sub: `${severity_breakdown['critical'] ?? 0} critical`,                icon: Waves,         grad: 'from-cyan-500 via-teal-500 to-emerald-500',     shadow: 'shadow-cyan-500/40',   alert: false },
                        { label: 'Pending Review', value: stats.pending,         sub: 'awaiting action',                                                icon: Clock,         grad: 'from-amber-400 via-orange-500 to-rose-500',     shadow: 'shadow-amber-500/40',  alert: stats.pending > 0 },
                        { label: 'Responders',     value: stats.total_responders,sub: `${stats.resolved_today} resolved today`,                        icon: ShieldCheck,   grad: 'from-violet-500 via-purple-500 to-indigo-600',  shadow: 'shadow-violet-500/40', alert: false },
                        { label: 'Active Alerts',  value: active_alerts,         sub: `${critical_alerts.length} critical`,                            icon: AlertTriangle, grad: 'from-rose-500 via-red-500 to-pink-600',         shadow: 'shadow-rose-500/40',   alert: active_alerts > 0 },
                    ] as const).map(({ label, value, sub, icon: Icon, grad, shadow, alert }) => (
                        <div key={label} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-lg ${shadow} sm:p-5`}>
                            {/* Decorative blob */}
                            <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl" />
                            <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />

                            {alert && (
                                <span className="absolute right-3 top-3 flex size-2.5">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                                    <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-sm" />
                                </span>
                            )}
                            <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:size-11">
                                <Icon className="size-5 text-white sm:size-[22px]" />
                            </div>
                            <p className="relative mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">{value.toLocaleString()}</p>
                            <p className="relative mt-0.5 text-[11px] font-semibold text-white/80 sm:text-xs">{label}</p>
                            <p className="relative mt-0.5 text-[10px] text-white/60">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {([
                        { icon: CheckCircle2, grad: 'from-emerald-500 to-teal-600',   shadow: 'shadow-emerald-500/20', value: stats.resolved_today,              label: 'Resolved Today', sub: 'Closed reports',  accent: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
                        { icon: Clock,        grad: 'from-orange-400 to-amber-500',   shadow: 'shadow-orange-500/20',  value: formatResponseTime(avg_response_time), label: 'Avg Response',   sub: 'Time to action',  accent: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
                        { icon: Globe,        grad: 'from-violet-500 to-purple-600',  shadow: 'shadow-violet-500/20',  value: affected_areas,                    label: 'Affected Areas', sub: 'Active zones',    accent: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400' },
                        { icon: TrendingUp,   grad: 'from-teal-500 to-cyan-600',      shadow: 'shadow-teal-500/20',    value: `${resolutionRate}%`,              label: 'Resolution Rate', sub: 'All time',       accent: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400' },
                    ] as const).map(({ icon: Icon, grad, shadow, value, label, sub, accent }) => (
                        <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white p-4 shadow-sm shadow-black/[0.04] transition-all hover:shadow-md sm:p-5 dark:border-neutral-700/50 dark:bg-neutral-900">
                            <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} shadow-lg ${shadow}`}>
                                <Icon className="size-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-extrabold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</p>
                                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent}`}>{sub}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts: Area + Donut */}
                <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                    <Card>
                        <CardHeader icon={TrendingUp} gradient="from-indigo-500 to-violet-600" title="Flood Reports Trend" subtitle="Last 30 days">
                            <div className="ml-auto hidden items-center gap-4 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />Reports</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />Resolved</span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {daily_reports.length > 0
                                ? <ReactApexChart type="area" series={areaSeries} options={areaOptions} height={270} />
                                : <Empty text="No data available" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={AlertTriangle} gradient="from-rose-500 to-pink-600" title="Severity Breakdown" subtitle="By category" />
                        <div className="flex flex-col items-center px-5 pb-5 pt-4">
                            <ReactApexChart type="donut" series={severityValues} options={donutOptions} height={200} width={200} />
                            <div className="mt-3 flex w-full flex-col gap-2.5">
                                {severityLabels.map((name, i) => {
                                    const val = severityValues[i];
                                    const pct = totalSeverity > 0 ? Math.round((val / totalSeverity) * 100) : 0;
                                    return (
                                        <div key={name} className="flex items-center gap-2.5">
                                            <span className="size-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: DONUT_COLORS[i], boxShadow: `0 0 0 3px ${DONUT_COLORS[i]}22` }} />
                                            <span className="flex-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">{name}</span>
                                            <div className="flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" style={{ height: 4 }}>
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DONUT_COLORS[i] }} />
                                            </div>
                                            <span className="w-6 text-right text-[10px] tabular-nums text-neutral-400">{pct}%</span>
                                            <span className="w-5 text-right text-xs font-bold tabular-nums text-neutral-900 dark:text-white">{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Charts: Status + Monthly */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={BarChart3} gradient="from-violet-500 to-purple-600" title="Status Overview" subtitle="Current distribution" />
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={statusSeries} options={statusOptions} height={225} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={CloudRain} gradient="from-sky-500 to-blue-600" title="Monthly Comparison" subtitle="Last 6 months">
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-indigo-500" />Total</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-rose-500" />Critical</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-orange-400" />High</span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={monthlySeries} options={monthlyOptions} height={225} />
                        </div>
                    </Card>
                </div>

                {/* Top Responders + Recent Activity */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={Trophy} gradient="from-amber-400 to-orange-500" title="Top Responders" subtitle="By resolved reports" />
                        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                            {top_responders.length > 0 ? top_responders.map((r, i) => (
                                <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ${
                                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-400/30' :
                                        i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-300/30 dark:from-slate-500 dark:to-slate-600' :
                                        i === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-orange-400/30' :
                                                  'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                                    }`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-500/25">
                                        {r.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{r.name}</p>
                                        <p className="text-[10px] text-neutral-400">{r.total_assigned} assigned</p>
                                    </div>
                                    <div className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-1 dark:from-emerald-900/20 dark:to-teal-900/20">
                                        <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{r.resolved_count} done</span>
                                    </div>
                                </div>
                            )) : <div className="px-5 py-10"><Empty text="No responders yet" /></div>}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={Zap} gradient="from-sky-500 to-indigo-600" title="Recent Activity" subtitle="Latest status changes">
                            <Link href="/admin/activity" className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-neutral-700 dark:hover:border-indigo-700 dark:hover:text-indigo-400">
                                View all
                            </Link>
                        </CardHeader>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {recent_activity.length > 0 ? recent_activity.map((a) => (
                                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-[10px] font-bold text-white shadow-sm shadow-sky-500/25">
                                        {a.user?.name?.charAt(0) ?? '?'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                                            <span className="font-semibold text-neutral-900 dark:text-white">{a.user?.name ?? 'System'}</span>
                                            <span className="text-neutral-400"> changed to </span>
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STA[a.status as keyof typeof STA] ?? 'bg-neutral-100 text-neutral-500'}`}>
                                                {a.status.replace('_', ' ')}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-neutral-400">
                                            {a.report.reference_number} · {new Date(a.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )) : <div className="px-5 py-10"><Empty text="No recent activity" /></div>}
                        </div>
                    </Card>
                </div>

                {/* Live Incident Map */}
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                                <MapPin className="size-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Live Incident Map</p>
                                <p className="text-[11px] text-neutral-400">{map_reports.length} active incident{map_reports.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <Link href="/admin/reports/map" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            <Globe className="size-3.5" />
                            Full Map
                        </Link>
                    </div>
                    <div className="p-3 sm:p-4">
                        {map_reports.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {map_reports.slice(0, 8).map((r) => (
                                    <Link key={r.id} href={`/admin/reports/${r.id}`}
                                        className="group flex flex-col justify-between rounded-xl border border-neutral-100 bg-gradient-to-br from-neutral-50 to-white p-3 transition-all hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 dark:border-neutral-800 dark:from-neutral-800/60 dark:to-neutral-800/30 dark:hover:border-indigo-800">
                                        <div>
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="truncate text-xs font-bold text-neutral-900 dark:text-white">{r.reference_number}</span>
                                                <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${SEV[r.severity as keyof typeof SEV] ?? ''}`}>{r.severity}</span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{r.address ?? 'No address'}</p>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400">
                                            <MapPin className="size-3 shrink-0" />
                                            <span className="truncate tabular-nums">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center"><Empty text="No active incidents" /></div>
                        )}
                    </div>
                </Card>

                {/* Recent Reports Table */}
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25">
                                <FileText className="size-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Recent Reports</p>
                                <p className="text-[11px] text-neutral-400">Latest flood reports</p>
                            </div>
                        </div>
                        <Link href="/admin/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            View all <ExternalLink className="size-3" />
                        </Link>
                    </div>

                    {/* Mobile */}
                    <div className="block sm:hidden">
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {recent_reports.map((report) => (
                                <Link key={report.id} href={`/admin/reports/${report.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">{report.reference_number}</p>
                                        <p className="mt-0.5 text-[10px] text-neutral-400">{report.user?.name ?? '—'} · {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${SEV[report.severity]}`}>{report.severity}</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${STA[report.status]}`}>{report.status}</span>
                                    </div>
                                </Link>
                            ))}
                            {recent_reports.length === 0 && <div className="px-5 py-16 text-center"><Empty text="No reports yet" /></div>}
                        </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-gradient-to-r from-neutral-50/80 to-white dark:border-neutral-800 dark:from-neutral-800/40 dark:to-neutral-900">
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Reference</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Date</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Reporter</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Severity</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {recent_reports.map((report) => (
                                    <tr key={report.id} className="group transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10">
                                        <td className="px-5 py-3.5">
                                            <Link href={`/admin/reports/${report.id}`} className="font-mono text-xs font-bold text-neutral-800 transition-colors group-hover:text-indigo-600 dark:text-neutral-200 dark:group-hover:text-indigo-400">
                                                {report.reference_number}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs whitespace-nowrap text-neutral-400">
                                            {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-neutral-500 dark:text-neutral-400">{report.user?.name ?? '—'}</td>
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
                </Card>

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

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-neutral-300">
            <Droplets className="size-6" />
            <p className="text-xs font-medium text-neutral-400">{text}</p>
        </div>
    );
}
