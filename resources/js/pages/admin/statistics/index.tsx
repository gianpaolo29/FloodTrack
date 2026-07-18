import { Head, router } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Building2,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileText,
    RefreshCw,
    Sparkles,
    TrendingUp,
    Trophy,
    Users,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

/* ─── Types ─── */
interface AiInsight {
    risk_level: 'critical' | 'high' | 'moderate' | 'low';
    summary: string;
    key_findings: string[];
    recommendations: string[];
    priority_action: string;
}

interface MonthlyPoint { month: string; total: number; critical: number; high: number; }
interface BacklogPoint { date: string; new_reports: number; resolved: number; }
interface TopArea { address: string; count: number; }
interface TopResponder { id: number; name: string; resolved_count: number; total_assigned: number; efficiency: number; avg_response: number; }
interface Props {
    daily_reports: Record<string, number>;
    avg_response_time: number;
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    top_responders: TopResponder[];
    monthly_trend: MonthlyPoint[];
    peak_hours: Record<number, number>;
    top_areas: TopArea[];
    backlog_trend: BacklogPoint[];
    total_reports: number;
    resolution_rate: number;
    critical_count: number;
    evacuation_stats: { total_centers: number; total_capacity: number; total_occupancy: number };
    period: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Statistics', href: '/admin/statistics' },
];

const DONUT_COLORS  = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];
const STATUS_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#94a3b8'];

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'Monthly' },
    { key: 'all',   label: 'All' },
] as const;

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

/* ─── Helpers ─── */
function formatResponseTime(minutes: number): string {
    if (minutes <= 0) return '—';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const RISK_STYLES: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    high:     'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    moderate: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    low:      'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

const RISK_BOX_STYLES: Record<string, string> = {
    critical: 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800',
    high:     'bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    moderate: 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    low:      'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800',
};

const RISK_TEXT_STYLES: Record<string, string> = {
    critical: 'text-red-800 dark:text-red-300',
    high:     'text-orange-800 dark:text-orange-300',
    moderate: 'text-amber-800 dark:text-amber-300',
    low:      'text-green-800 dark:text-green-300',
};

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-neutral-300">
            <BarChart3 className="size-6" />
            <p className="text-xs font-medium text-neutral-400">{text}</p>
        </div>
    );
}

export default function StatisticsPage({
    daily_reports,
    avg_response_time,
    severity_breakdown,
    status_breakdown,
    top_responders,
    monthly_trend,
    peak_hours,
    top_areas,
    backlog_trend,
    total_reports,
    resolution_rate,
    critical_count,
    evacuation_stats,
    period,
}: Props) {
    const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [aiData, setAiData] = useState<AiInsight | null>(null);

    const setPeriod = (p: string) => router.get('/admin/statistics', { period: p }, { preserveState: true, preserveScroll: true });

    async function generateInsights() {
        setAiState('loading');
        try {
            const res = await fetch('/admin/statistics/ai-insights');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAiData(data);
            setAiState('done');
        } catch {
            setAiState('error');
        }
    }

    /* ── Derived values ── */
    const severityLabels = ['Critical', 'High', 'Moderate', 'Low'];
    const severityValues = [
        severity_breakdown['critical'] ?? 0,
        severity_breakdown['high']     ?? 0,
        severity_breakdown['moderate'] ?? 0,
        severity_breakdown['low']      ?? 0,
    ];
    const totalSeverity = severityValues.reduce((a, b) => a + b, 0);
    const statusValues  = ['pending', 'verified', 'assigned', 'resolved', 'rejected'].map(s => status_breakdown[s] ?? 0);

    const dailyDates  = Object.keys(daily_reports);
    const dailyCounts = Object.values(daily_reports);

    const monthlyLabels = monthly_trend.map(m => m.month);
    const monthlySeries = [
        { name: 'Total',    data: monthly_trend.map(m => m.total) },
        { name: 'Critical', data: monthly_trend.map(m => m.critical) },
        { name: 'High',     data: monthly_trend.map(m => m.high) },
    ];

    const occupancyPct = evacuation_stats.total_capacity > 0
        ? Math.round((evacuation_stats.total_occupancy / evacuation_stats.total_capacity) * 100)
        : 0;

    // Peak hours labels and series
    const peakHoursLabels = Array.from({ length: 24 }, (_, h) => {
        if (h === 0) return '12am';
        if (h < 12) return `${h}am`;
        if (h === 12) return '12pm';
        return `${h - 12}pm`;
    });
    const peakHoursSeries = [{ name: 'Reports', data: Array.from({ length: 24 }, (_, h) => peak_hours[h] ?? 0) }];

    // Backlog trend series
    const backlogSeries = [
        { name: 'New Reports', data: backlog_trend.map(b => b.new_reports) },
        { name: 'Resolved',    data: backlog_trend.map(b => b.resolved) },
    ];
    const backlogLabels = backlog_trend.map(b => b.date);

    // Top areas max
    const maxAreaCount = Math.max(...top_areas.map(a => a.count), 1);

    /* ── Area Chart (Daily Reports) ── */
    const areaOptions: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600, easing: 'easeinout' }, selection: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 90, 100] },
        },
        colors: ['#6366f1'],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 0, right: 4 } },
        xaxis: {
            categories: dailyDates,
            axisBorder: { show: false }, axisTicks: { show: false },
            labels: {
                style: { fontSize: '10px', colors: '#94a3b8' },
                rotate: 0,
                formatter: (val: string) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                },
            },
            tooltip: { enabled: false },
        },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        legend: { show: false },
        markers: { size: 0, hover: { size: 5, sizeOffset: 1 } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.categoryLabels[dataPointIndex] ?? w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [
                    { color: '#6366f1', name: 'Reports', value: series[0][dataPointIndex] },
                ]);
            },
        },
    };
    const areaSeries = [{ name: 'Reports', data: dailyCounts }];

    /* ── Donut Chart (Severity) ── */
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

    /* ── Status Bar Chart ── */
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

    /* ── Monthly Trend Multi-Series Bar Chart ── */
    const monthlyOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 }, selection: { enabled: false } },
        plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', columnWidth: '60%' } },
        dataLabels: { enabled: false },
        colors: ['#6366f1', '#f43f5e', '#f97316'],
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.75, stops: [0, 100] } },
        legend: { show: false },
        xaxis: { categories: monthlyLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
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

    /* ── Peak Hours Bar Chart ── */
    const peakHoursOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 }, selection: { enabled: false } },
        plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', distributed: false, columnWidth: '70%' } },
        dataLabels: { enabled: false },
        colors: ['#f59e0b'],
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.75, stops: [0, 100] } },
        legend: { show: false },
        xaxis: { categories: peakHoursLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '9px', colors: '#94a3b8' }, rotate: -45 } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        states: { hover: { filter: { type: 'darken', value: 0.88 } }, active: { filter: { type: 'none' } } },
        tooltip: {
            custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [{ color: '#f59e0b', name: 'Reports', value: series[seriesIndex][dataPointIndex] }]);
            },
        },
    };

    /* ── Backlog Trend Area Chart ── */
    const backlogOptions: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600, easing: 'easeinout' }, selection: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.02, stops: [0, 90, 100] },
        },
        colors: ['#6366f1', '#10b981'],
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 0, right: 4 } },
        xaxis: {
            categories: backlogLabels,
            axisBorder: { show: false }, axisTicks: { show: false },
            labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: -45 },
            tooltip: { enabled: false },
        },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        markers: { size: 0, hover: { size: 4 } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.categoryLabels[dataPointIndex] ?? w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [
                    { color: '#6366f1', name: 'New Reports', value: series[0][dataPointIndex] },
                    { color: '#10b981', name: 'Resolved',    value: series[1][dataPointIndex] },
                ]);
            },
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics" />

            <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
            <div className="flex flex-col gap-5 p-4 sm:p-6 lg:gap-6 lg:p-8">

                {/* Page Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-xl shadow-indigo-500/30">
                            <BarChart3 className="size-6 text-white" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl dark:from-white dark:to-neutral-400">
                                Statistics
                            </h1>
                            <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                                Flood incident analytics &amp; AI insights
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Period pills */}
                        <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-100/80 p-1 dark:border-neutral-700 dark:bg-neutral-800/80">
                            {PERIODS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                        period === p.key
                                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30'
                                            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        {/* Export button */}
                        <a
                            href="/admin/export"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-600 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                        >
                            <FileText className="size-3.5" />
                            Export
                        </a>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {/* Total Reports */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 p-4 shadow-lg shadow-indigo-500/40 sm:p-5">
                        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl" />
                        <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />
                        <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:size-11">
                            <FileText className="size-5 text-white sm:size-[22px]" />
                        </div>
                        <p className="relative mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">
                            {total_reports.toLocaleString()}
                        </p>
                        <p className="relative mt-0.5 text-[11px] font-semibold text-white/80 sm:text-xs">Total Reports</p>
                        <p className="relative mt-0.5 text-[10px] text-white/60">All time</p>
                    </div>

                    {/* Resolution Rate */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-4 shadow-lg shadow-emerald-500/40 sm:p-5">
                        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl" />
                        <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />
                        <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:size-11">
                            <CheckCircle2 className="size-5 text-white sm:size-[22px]" />
                        </div>
                        <p className="relative mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">
                            {resolution_rate}%
                        </p>
                        <p className="relative mt-0.5 text-[11px] font-semibold text-white/80 sm:text-xs">Resolution Rate</p>
                        <p className="relative mt-0.5 text-[10px] text-white/60">Resolved / total</p>
                    </div>

                    {/* Avg Response Time */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 shadow-lg shadow-amber-500/40 sm:p-5">
                        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl" />
                        <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />
                        <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:size-11">
                            <Clock className="size-5 text-white sm:size-[22px]" />
                        </div>
                        <p className="relative mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">
                            {formatResponseTime(avg_response_time)}
                        </p>
                        <p className="relative mt-0.5 text-[11px] font-semibold text-white/80 sm:text-xs">Avg Response Time</p>
                        <p className="relative mt-0.5 text-[10px] text-white/60">Time to resolve</p>
                    </div>

                    {/* Critical Reports */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-pink-600 p-4 shadow-lg shadow-rose-500/40 sm:p-5">
                        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl" />
                        <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />
                        {critical_count > 0 && (
                            <span className="absolute right-3 top-3 flex size-2.5">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                                <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-sm" />
                            </span>
                        )}
                        <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:size-11">
                            <AlertTriangle className="size-5 text-white sm:size-[22px]" />
                        </div>
                        <p className="relative mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">
                            {critical_count.toLocaleString()}
                        </p>
                        <p className="relative mt-0.5 text-[11px] font-semibold text-white/80 sm:text-xs">Critical Reports</p>
                        <p className="relative mt-0.5 text-[10px] text-white/60">Highest severity</p>
                    </div>
                </div>

                {/* Evacuation Centers Quick Stats — 4 cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {([
                        {
                            icon: Building2,
                            label: 'Total Centers',
                            value: evacuation_stats.total_centers.toLocaleString(),
                            subtitle: 'Active centers',
                            grad: 'from-sky-500 to-blue-600',
                            shadow: 'shadow-sky-500/20',
                            accent: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400',
                        },
                        {
                            icon: Users,
                            label: 'Total Capacity',
                            value: evacuation_stats.total_capacity.toLocaleString(),
                            subtitle: 'Maximum capacity',
                            grad: 'from-violet-500 to-purple-600',
                            shadow: 'shadow-violet-500/20',
                            accent: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400',
                        },
                        {
                            icon: TrendingUp,
                            label: 'Current Evacuees',
                            value: evacuation_stats.total_occupancy.toLocaleString(),
                            subtitle: 'People sheltered',
                            grad: 'from-emerald-500 to-teal-600',
                            shadow: 'shadow-emerald-500/20',
                            accent: occupancyPct >= 90
                                ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400'
                                : occupancyPct >= 70
                                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400'
                                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
                        },
                        {
                            icon: AlertCircle,
                            label: 'Occupancy Rate',
                            value: `${occupancyPct}%`,
                            subtitle: 'Of total capacity',
                            grad: 'from-teal-500 to-cyan-600',
                            shadow: 'shadow-teal-500/20',
                            accent: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400',
                        },
                    ] as const).map(({ icon: Icon, label, value, subtitle, grad, shadow, accent }) => (
                        <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white p-4 shadow-sm shadow-black/[0.04] transition-all hover:shadow-md sm:p-5 dark:border-neutral-700/50 dark:bg-neutral-900">
                            <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} shadow-lg ${shadow}`}>
                                <Icon className="size-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-extrabold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                                    {value}
                                </p>
                                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</p>
                                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent}`}>
                                    {subtitle}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row 1: Area + Donut */}
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <Card>
                        <CardHeader icon={TrendingUp} gradient="from-indigo-500 to-violet-600" title="Daily Reports (Last 30 Days)" subtitle="Flood report submissions">
                            <div className="ml-auto hidden items-center gap-4 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                                    Reports
                                </span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {dailyCounts.length > 0
                                ? <ReactApexChart type="area" series={areaSeries} options={areaOptions} height={270} />
                                : <EmptyState text="No data for last 30 days" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={AlertTriangle} gradient="from-rose-500 to-pink-600" title="Severity Breakdown" subtitle="All-time distribution" />
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

                {/* Charts Row 2: Status + Monthly Trend */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={BarChart3} gradient="from-violet-500 to-purple-600" title="Status Distribution" subtitle="All-time by status" />
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={statusSeries} options={statusOptions} height={225} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={TrendingUp} gradient="from-violet-500 to-fuchsia-600" title="Monthly Trend" subtitle="Last 6 months">
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-indigo-500" />
                                    Total
                                </span>
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-rose-500" />
                                    Critical
                                </span>
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-orange-500" />
                                    High
                                </span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {monthly_trend.length > 0
                                ? <ReactApexChart type="bar" series={monthlySeries} options={monthlyOptions} height={225} />
                                : <EmptyState text="No monthly data available" />}
                        </div>
                    </Card>
                </div>

                {/* Top Affected Areas — full width */}
                <Card>
                    <CardHeader icon={BarChart3} gradient="from-rose-500 to-pink-600" title="Top Affected Areas" subtitle="Locations with highest report count" />
                    <div className="flex flex-col divide-y divide-neutral-100 py-1 dark:divide-neutral-800">
                        {top_areas.length > 0 ? top_areas.map(a => (
                            <div key={a.address} className="flex items-center gap-3 px-5 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300" title={a.address}>{a.address}</p>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500"
                                            style={{ width: `${Math.round((a.count / maxAreaCount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold tabular-nums text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">{a.count}</span>
                            </div>
                        )) : (
                            <div className="px-5 py-8"><EmptyState text="No location data available" /></div>
                        )}
                    </div>
                </Card>

                {/* Peak Hours + Backlog Trend */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Peak Hours */}
                    <Card>
                        <CardHeader icon={Clock} gradient="from-amber-400 to-orange-500" title="Peak Report Hours" subtitle="By hour of day (all time)" />
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={peakHoursSeries} options={peakHoursOptions} height={200} />
                        </div>
                    </Card>

                    {/* Backlog Trend */}
                    <Card>
                        <CardHeader icon={TrendingUp} gradient="from-sky-500 to-blue-600" title="New vs Resolved (Last 30 Days)" subtitle="Daily report flow">
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-indigo-500" />
                                    New Reports
                                </span>
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    Resolved
                                </span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {backlog_trend.length > 0
                                ? <ReactApexChart type="area" series={backlogSeries} options={backlogOptions} height={200} />
                                : <EmptyState text="No backlog data available" />}
                        </div>
                    </Card>
                </div>

                {/* Bottom: Top Responders + AI Insights */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Top Responders */}
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
                                    <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold tabular-nums ${
                                        r.efficiency >= 70
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : r.efficiency >= 40
                                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                    }`}>
                                        {r.efficiency}% eff.
                                    </span>
                                    <span className="shrink-0 rounded-lg bg-neutral-100 px-2 py-1 text-[10px] font-medium tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                        {formatResponseTime(r.avg_response)}
                                    </span>
                                    <div className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-1 dark:from-emerald-900/20 dark:to-teal-900/20">
                                        <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{r.resolved_count} done</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-5 py-10"><EmptyState text="No responders yet" /></div>
                            )}
                        </div>
                    </Card>

                    {/* AI Insights */}
                    <Card>
                        <CardHeader icon={Sparkles} gradient="from-violet-500 to-fuchsia-600" title="AI Situation Analysis" subtitle="Powered by GPT-4o mini" />
                        <div className="p-5">
                            {aiState === 'idle' && (
                                <div className="flex flex-col items-center gap-4 py-6 text-center">
                                    <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30">
                                        <Sparkles className="size-7 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-800 dark:text-white">AI-Powered Analysis</p>
                                        <p className="mt-1 text-xs text-neutral-400">Generate instant insights from your flood data using AI</p>
                                    </div>
                                    <button
                                        onClick={generateInsights}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/40 hover:brightness-110 active:scale-95"
                                    >
                                        <Sparkles className="size-4" />
                                        Generate Insights
                                    </button>
                                </div>
                            )}

                            {aiState === 'loading' && (
                                <div className="flex flex-col items-center gap-4 py-10 text-center">
                                    <div className="relative">
                                        <div className="size-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-500" />
                                        <Sparkles className="absolute inset-0 m-auto size-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Analyzing flood data...</p>
                                        <p className="mt-0.5 text-xs text-neutral-400">This may take a few seconds</p>
                                    </div>
                                </div>
                            )}

                            {aiState === 'error' && (
                                <div className="flex flex-col items-center gap-4 py-8 text-center">
                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
                                        <AlertCircle className="size-7 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-800 dark:text-white">Analysis failed</p>
                                        <p className="mt-1 text-xs text-neutral-400">Could not connect to AI service. Please try again.</p>
                                    </div>
                                    <button
                                        onClick={generateInsights}
                                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:border-violet-300 hover:text-violet-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                    >
                                        <RefreshCw className="size-3.5" />
                                        Retry
                                    </button>
                                </div>
                            )}

                            {aiState === 'done' && aiData && (
                                <div className="flex flex-col gap-4">
                                    {/* Risk level + refresh */}
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${RISK_STYLES[aiData.risk_level]}`}>
                                            <span className="size-1.5 rounded-full bg-current" />
                                            {aiData.risk_level} risk
                                        </span>
                                        <button
                                            onClick={generateInsights}
                                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-violet-300 hover:text-violet-600 dark:border-neutral-700 dark:hover:border-violet-700 dark:hover:text-violet-400"
                                        >
                                            <RefreshCw className="size-3" />
                                            Refresh
                                        </button>
                                    </div>

                                    {/* Summary */}
                                    <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{aiData.summary}</p>

                                    {/* Key Findings */}
                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Key Findings</p>
                                        <ul className="flex flex-col gap-2">
                                            {aiData.key_findings.map((finding, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                                                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                                                    {finding}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Recommendations */}
                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Recommendations</p>
                                        <ul className="flex flex-col gap-2">
                                            {aiData.recommendations.map((rec, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                                                        {i + 1}
                                                    </span>
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Priority Action */}
                                    <div className={`rounded-xl p-3.5 ${RISK_BOX_STYLES[aiData.risk_level]}`}>
                                        <div className="mb-1.5 flex items-center gap-1.5">
                                            <Zap className={`size-3.5 ${RISK_TEXT_STYLES[aiData.risk_level]}`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${RISK_TEXT_STYLES[aiData.risk_level]}`}>
                                                Priority Action
                                            </span>
                                        </div>
                                        <p className={`text-xs font-medium leading-relaxed ${RISK_TEXT_STYLES[aiData.risk_level]}`}>
                                            {aiData.priority_action}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 dark:text-neutral-600">
                                        <ChevronRight className="size-3" />
                                        AI-generated analysis. Always verify with on-ground information.
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

            </div>
            </div>
        </AppLayout>
    );
}
