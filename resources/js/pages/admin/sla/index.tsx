import { Head, router, useForm } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Save,
    Shield,
    ShieldCheck,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import type { BreadcrumbItem } from '@/types';
import type { Severity, SlaConfig, SlaStage } from '@/types/admin';
import { SLA_STAGE_LABELS } from '@/types/admin';

/* ─── Types ─── */
interface StageStats {
    avg_minutes: number;
    met: number;
    breached: number;
    total: number;
}

interface SeverityStats {
    met: number;
    breached: number;
    total: number;
    rate: number;
}

interface Stats {
    compliance_rate: number;
    met_count: number;
    breached_count: number;
    total_completed: number;
    active_breaches: number;
    stage_stats: Record<SlaStage, StageStats>;
    severity_stats: Record<Severity, SeverityStats>;
    breach_trend: Record<string, number>;
}

interface Props {
    configs: Record<Severity, Record<SlaStage, SlaConfig>>;
    stats: Stats;
    trends?: { compliance_rate?: number; active_breaches?: number; label?: string; period_label?: string };
    sla_enabled: boolean;
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'SLA Rules', href: '/admin/sla' },
];

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low'];
const STAGES: SlaStage[] = ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved'];

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'Monthly' },
    { key: 'all',   label: 'All' },
] as const;

const SEV_COLORS: Record<Severity, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high:     'text-orange-600 dark:text-orange-400',
    moderate: 'text-amber-600 dark:text-amber-400',
    low:      'text-emerald-600 dark:text-emerald-400',
};

const SEV_BG: Record<Severity, string> = {
    critical: 'bg-red-50 dark:bg-red-950/20',
    high:     'bg-orange-50 dark:bg-orange-950/20',
    moderate: 'bg-amber-50 dark:bg-amber-950/20',
    low:      'bg-emerald-50 dark:bg-emerald-950/20',
};

/* ─── Helpers ─── */
function formatTime(minutes: number): string {
    if (minutes <= 0) return '—';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ─── Main page ─── */
export default function SlaIndex({ configs, stats, trends, sla_enabled, period, custom_from, custom_to }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    // Build flat config array for the form
    const buildConfigArray = useCallback(() => {
        const items: {
            severity: Severity;
            stage: SlaStage;
            threshold_minutes: number;
            warning_pct: number;
            critical_pct: number;
        }[] = [];

        for (const sev of SEVERITIES) {
            for (const stage of STAGES) {
                const c = configs[sev]?.[stage];
                items.push({
                    severity: sev,
                    stage,
                    threshold_minutes: c?.threshold_minutes ?? 60,
                    warning_pct: c?.warning_pct ?? 80,
                    critical_pct: c?.critical_pct ?? 150,
                });
            }
        }
        return items;
    }, [configs]);

    const form = useForm({ configs: buildConfigArray() });

    const updateField = (sev: Severity, stage: SlaStage, field: string, value: number | boolean) => {
        const updated = form.data.configs.map((c) =>
            c.severity === sev && c.stage === stage ? { ...c, [field]: value } : c,
        );
        form.setData('configs', updated);
    };

    const getConfig = (sev: Severity, stage: SlaStage) =>
        form.data.configs.find((c) => c.severity === sev && c.stage === stage)!;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/sla/configs', { preserveState: false });
    };

    const handleToggle = () => {
        router.post('/admin/sla/toggle', {}, { preserveState: false });
    };

    const changePeriod = (key: string) => {
        router.get('/admin/sla', { period: key }, { preserveState: false, replace: true });
    };

    // Smart descriptions
    const tl = trends?.label ?? '';
    const breachRate = stats.total_completed > 0 ? Math.round((stats.breached_count / stats.total_completed) * 100) : 0;
    const verifyAvg = stats.stage_stats.pending_to_verified.avg_minutes;
    const assignAvg = stats.stage_stats.verified_to_assigned.avg_minutes;
    const resolveAvg = stats.stage_stats.assigned_to_resolved.avg_minutes;

    const totalTime = verifyAvg + assignAvg + resolveAvg;
    const slowestStage = verifyAvg >= assignAvg && verifyAvg >= resolveAvg ? 'verification'
        : assignAvg >= resolveAvg ? 'assignment' : 'resolution';

    function smartDesc(key: string): string {
        switch (key) {
            case 'compliance': {
                if (stats.total_completed === 0) return 'No completed SLA cycles yet — start tracking once reports move through the pipeline.';
                const parts: string[] = [];
                if (stats.compliance_rate >= 95) parts.push(`Outstanding — ${stats.compliance_rate}% SLA compliance. Teams are consistently meeting targets.`);
                else if (stats.compliance_rate >= 80) parts.push(`Good — ${stats.compliance_rate}% compliance. Minor improvements in ${slowestStage} could push this higher.`);
                else if (stats.compliance_rate >= 60) parts.push(`${stats.compliance_rate}% compliance — focus on the ${slowestStage} stage to reduce breaches.`);
                else parts.push(`Only ${stats.compliance_rate}% compliance — urgent process improvement needed, especially in ${slowestStage}.`);
                if (stats.active_breaches > 0) parts.push('Active breaches need immediate attention to prevent further SLA violations.');
                if (breachRate > 20) parts.push('High breach rate suggests a systemic bottleneck — review staffing and processes.');
                return parts.join(' ');
            }
            case 'breaches': {
                if (stats.active_breaches === 0) return 'No active breaches — all cases are within SLA thresholds. Maintain current response pace.';
                const t = trends?.active_breaches;
                const parts: string[] = [];
                if (t !== undefined && t > 20) parts.push(`Breaches surging (${Math.abs(t)}% ${tl}) — escalate response and review the ${slowestStage} stage for delays.`);
                else if (t !== undefined && t > 0) parts.push(`Breaches increasing (${Math.abs(t)}% ${tl}) — tighten response times before more cases go overdue.`);
                else if (t !== undefined && t < -20) parts.push(`Breaches dropping fast (${Math.abs(t)}% ${tl}) — process improvements are working, keep it up.`);
                else if (t !== undefined && t < 0) parts.push(`Breaches declining (${Math.abs(t)}% ${tl}) — trending in the right direction.`);
                else parts.push(`Breach count unchanged ${tl} — sustained issue that needs attention.`);
                if (breachRate > 20) parts.push(`The ${slowestStage} stage is the primary bottleneck — streamline this to reduce breaches.`);
                else parts.push('Focus on resolving overdue cases to bring breach count down.');
                return parts.join(' ');
            }
            case 'verify': {
                if (verifyAvg <= 0) return 'No verification timing data yet — metrics will appear as reports are verified.';
                const parts: string[] = [];
                if (verifyAvg < 30) parts.push('Verification is fast — reports are being reviewed promptly.');
                else if (verifyAvg < 60) parts.push('Verification pace is acceptable — within a reasonable timeframe.');
                else if (verifyAvg < 180) parts.push('Verification is slow — consider adding more reviewers to speed up the pipeline.');
                else parts.push('Verification is critically slow — this is likely causing SLA breaches. Add reviewers urgently.');
                if (slowestStage === 'verification') parts.push('This is the slowest stage — improving verification will have the biggest impact on overall SLA compliance.');
                else parts.push(`Verification is faster than ${slowestStage} — focus improvement efforts there instead.`);
                return parts.join(' ');
            }
            case 'assign': {
                if (assignAvg <= 0) return 'No assignment timing data yet — metrics will appear as reports are assigned.';
                const parts: string[] = [];
                if (assignAvg < 30) parts.push('Assignment is quick — reports move to responders efficiently.');
                else if (assignAvg < 60) parts.push('Assignment pace is reasonable — handoff to responders is working.');
                else if (assignAvg < 180) parts.push('Assignment is slow — streamline the handoff process from verification to responders.');
                else parts.push('Assignment is critically slow — major delays between verification and response. Review the dispatch process.');
                if (slowestStage === 'assignment') parts.push('This is the bottleneck stage — speeding up assignment will most improve compliance.');
                else parts.push(`Assignment is performing better than ${slowestStage} — focus optimization efforts there.`);
                return parts.join(' ');
            }
            case 'resolve': {
                if (resolveAvg <= 0) return 'No resolution timing data yet — metrics will appear as cases are resolved.';
                const parts: string[] = [];
                if (resolveAvg < 60) parts.push('Resolution is fast — responders are closing cases efficiently.');
                else if (resolveAvg < 180) parts.push('Resolution pace is moderate — could be improved with better resource allocation.');
                else if (resolveAvg < 480) parts.push('Resolution is slow — responders may need additional support or the workload is too heavy.');
                else parts.push('Resolution is critically slow — investigate if responders are blocked, understaffed, or overloaded.');
                if (slowestStage === 'resolution') parts.push('This is the bottleneck — focus on empowering responders to close cases faster.');
                else parts.push(`Resolution is faster than ${slowestStage} — direct improvement efforts to that stage.`);
                return parts.join(' ');
            }
            default: return '';
        }
    }

    // Charts
    const trendDates = Object.keys(stats.breach_trend).sort();
    const trendValues = trendDates.map((d) => stats.breach_trend[d] ?? 0);

    const breachTrendOptions: ApexOptions = {
        chart: { type: 'area', height: 220, toolbar: { show: false }, sparkline: { enabled: false } },
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
        colors: ['#ef4444'],
        xaxis: {
            categories: trendDates.map((d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            labels: { style: { fontSize: '10px', colors: '#9ca3af' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '10px', colors: '#9ca3af' } }, min: 0 },
        grid: { borderColor: '#f0f0f0', strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: {
            custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
                const d = trendDates[dataPointIndex];
                const v = trendValues[dataPointIndex];
                return `<div style="background:#fff;border:1px solid #f0f0f0;border-radius:14px;padding:12px 16px;box-shadow:0 24px 48px rgba(0,0,0,0.10)">
                    <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;margin:0 0 4px">${new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                        <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></span>
                        <span style="color:#6b7280;font-size:11px">Breaches:</span>
                        <span style="font-weight:700;font-size:12px;color:#111827">${v}</span>
                    </div>
                </div>`;
            },
        },
    };

    const complianceDonutOptions: ApexOptions = {
        chart: { type: 'donut', height: 200 },
        labels: ['Met', 'Breached'],
        colors: ['#10b981', '#ef4444'],
        legend: { position: 'bottom', fontSize: '11px' },
        dataLabels: { enabled: false },
        plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Compliance', fontSize: '11px', formatter: () => `${stats.compliance_rate}%` } } } } },
        stroke: { width: 0 },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="SLA Rules" />

            <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-cyan-50/20 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
            <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-6 lg:p-8">

                {/* Header */}
                <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 shadow-xl shadow-teal-500/30">
                            <Clock className="size-5 text-white" />
                            <div className="absolute inset-[1px] rounded-[11px] sm:rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-lg sm:text-2xl font-extrabold tracking-tight text-transparent dark:from-white dark:to-neutral-400">
                                SLA Rules
                            </h1>
                            <p className="mt-0.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Configure response time thresholds and monitor compliance.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PeriodToggle period={period} customFrom={custom_from ?? null} customTo={custom_to ?? null} baseUrl="/admin/sla" />
                        <button
                            onClick={handleToggle}
                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.97] ${
                                sla_enabled
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40'
                                    : 'bg-gradient-to-r from-neutral-400 to-neutral-500 text-white shadow-neutral-500/25'
                            }`}
                        >
                            {sla_enabled ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                            {sla_enabled ? 'SLA Enabled' : 'SLA Disabled'}
                        </button>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                    <PrimaryStatCard
                        label="Compliance Rate"
                        value={stats.compliance_rate}
                        trend={trends?.compliance_rate}
                        trendLabel={`${trends?.label ?? ''}, ${trends?.period_label ?? ''}`}
                        desc={smartDesc('compliance')}
                        insights={[{ label: 'Met', value: stats.met_count, color: '#10b981' }, { label: 'Breached', value: stats.breached_count, color: '#ef4444' }]}
                        icon={ShieldCheck}
                        grad="from-emerald-500 to-teal-600"
                        shadow="shadow-emerald-500/40"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <PrimaryStatCard
                        label="Active Breaches"
                        value={stats.active_breaches}
                        trend={trends?.active_breaches}
                        trendLabel={`${trends?.label ?? ''}, ${trends?.period_label ?? ''}`}
                        desc={smartDesc('breaches')}
                        insights={[]}
                        icon={AlertTriangle}
                        grad="from-red-500 to-rose-600"
                        shadow="shadow-red-500/40"
                        alert={stats.active_breaches > 0}
                        index={1}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={Clock}
                        grad="from-blue-500 to-indigo-600"
                        shadow="shadow-blue-500/25"
                        value={formatTime(stats.stage_stats.pending_to_verified.avg_minutes)}
                        label="Avg. Verify Time"
                        trend={undefined}
                        desc={smartDesc('verify')}
                        insights={[]}
                        trendLabel={trends?.label ?? ''}
                        periodLabel={trends?.period_label ?? ''}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={Zap}
                        grad="from-violet-500 to-purple-600"
                        shadow="shadow-violet-500/25"
                        value={formatTime(stats.stage_stats.verified_to_assigned.avg_minutes)}
                        label="Avg. Assign Time"
                        trend={undefined}
                        desc={smartDesc('assign')}
                        insights={[]}
                        trendLabel={trends?.label ?? ''}
                        periodLabel={trends?.period_label ?? ''}
                        mounted={mounted}
                        delay={500}
                    />
                    <SecondaryStatCard
                        icon={TrendingUp}
                        grad="from-amber-500 to-orange-600"
                        shadow="shadow-amber-500/25"
                        value={formatTime(stats.stage_stats.assigned_to_resolved.avg_minutes)}
                        label="Avg. Resolve Time"
                        trend={undefined}
                        desc={smartDesc('resolve')}
                        insights={[]}
                        trendLabel={trends?.label ?? ''}
                        periodLabel={trends?.period_label ?? ''}
                        mounted={mounted}
                        delay={600}
                    />
                </div>

                {/* Period filter + Charts */}
                <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">

                    {/* Compliance donut */}
                    <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                                <ShieldCheck className="size-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">SLA Compliance</p>
                                <p className="text-[11px] text-neutral-400">Met vs breached SLAs</p>
                            </div>
                            <div className="flex items-center gap-1 rounded-xl bg-neutral-100/80 p-1 dark:bg-neutral-800">
                                {PERIODS.map((p) => (
                                    <button
                                        key={p.key}
                                        onClick={() => changePeriod(p.key)}
                                        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                            period === p.key
                                                ? 'bg-white text-teal-700 shadow-sm dark:bg-neutral-700 dark:text-teal-400'
                                                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-5">
                            {stats.total_completed > 0 ? (
                                <ReactApexChart
                                    type="donut"
                                    height={200}
                                    options={complianceDonutOptions}
                                    series={[stats.met_count, stats.breached_count]}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-neutral-300">
                                    <ShieldCheck className="size-6" />
                                    <p className="text-xs text-neutral-400">No completed SLA data yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Breach trend chart */}
                    <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg">
                                <AlertTriangle className="size-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Breach Trend</p>
                                <p className="text-[11px] text-neutral-400">Daily SLA breaches (last 30 days)</p>
                            </div>
                        </div>
                        <div className="p-5">
                            {trendDates.length > 0 ? (
                                <ReactApexChart
                                    type="area"
                                    height={220}
                                    options={breachTrendOptions}
                                    series={[{ name: 'Breaches', data: trendValues }]}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-neutral-300">
                                    <TrendingUp className="size-6" />
                                    <p className="text-xs text-neutral-400">No breach data yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Severity compliance breakdown */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                            <Shield className="size-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Compliance by Severity</p>
                            <p className="text-[11px] text-neutral-400">SLA performance per severity level</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
                        {SEVERITIES.map((sev) => {
                            const s = stats.severity_stats[sev];
                            return (
                                <div key={sev} className={`rounded-xl p-4 ${SEV_BG[sev]}`}>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${SEV_COLORS[sev]}`}>{sev}</p>
                                    <p className="mt-2 text-2xl font-extrabold tabular-nums text-neutral-900 dark:text-neutral-100">
                                        {s.rate}%
                                    </p>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60 dark:bg-black/20">
                                        <div
                                            className={`h-full rounded-full transition-all ${s.rate >= 80 ? 'bg-emerald-500' : s.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${s.rate}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
                                        <span>{s.met} met</span>
                                        <span>{s.breached} breached</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SLA Configuration table */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                            <Clock className="size-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">SLA Thresholds</p>
                            <p className="text-[11px] text-neutral-400">Configure max response time per severity and stage</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Severity</th>
                                        {STAGES.map((s) => (
                                            <th key={s} className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                                                {SLA_STAGE_LABELS[s]}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Warning %</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Critical %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                    {SEVERITIES.map((sev) => (
                                        <tr key={sev} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                                            <td className="px-5 py-3.5">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${SEV_COLORS[sev]}`}>{sev}</span>
                                            </td>
                                            {STAGES.map((stage) => {
                                                const c = getConfig(sev, stage);
                                                return (
                                                    <td key={stage} className="px-4 py-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={9999}
                                                                value={c.threshold_minutes}
                                                                onChange={(e) => updateField(sev, stage, 'threshold_minutes', parseInt(e.target.value) || 1)}
                                                                className="w-20 rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-center text-xs font-medium tabular-nums outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                                            />
                                                            <span className="text-[10px] text-neutral-400">min</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3.5 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={99}
                                                    value={getConfig(sev, STAGES[0]).warning_pct}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 80;
                                                        STAGES.forEach((stage) => updateField(sev, stage, 'warning_pct', val));
                                                    }}
                                                    className="w-16 rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-center text-xs font-medium tabular-nums outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <input
                                                    type="number"
                                                    min={101}
                                                    max={999}
                                                    value={getConfig(sev, STAGES[0]).critical_pct}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 150;
                                                        STAGES.forEach((stage) => updateField(sev, stage, 'critical_pct', val));
                                                    }}
                                                    className="w-16 rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-center text-xs font-medium tabular-nums outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                Warning % triggers an at-risk alert. Critical % triggers a critical escalation notification.
                            </p>
                            <button
                                type="submit"
                                disabled={form.processing || !form.isDirty}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] hover:shadow-teal-500/40 active:scale-[0.97] disabled:opacity-50"
                            >
                                <Save className="size-4" />
                                {form.processing ? 'Saving...' : 'Save Thresholds'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Stage performance table */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                            <TrendingUp className="size-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Stage Performance</p>
                            <p className="text-[11px] text-neutral-400">Average response time and compliance per stage</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                    {['Stage', 'Avg. Time', 'Met', 'Breached', 'Total', 'Rate'].map((h) => (
                                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                {STAGES.map((stage) => {
                                    const s = stats.stage_stats[stage];
                                    const rate = s.total > 0 ? Math.round((s.met / s.total) * 100) : 100;
                                    return (
                                        <tr key={stage} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                                            <td className="px-5 py-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{SLA_STAGE_LABELS[stage]}</td>
                                            <td className="px-5 py-3.5 text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{formatTime(s.avg_minutes)}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950/30 dark:text-emerald-400">{s.met}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-600/10 dark:bg-red-950/30 dark:text-red-400">{s.breached}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{s.total}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                        <div
                                                            className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold tabular-nums text-neutral-700 dark:text-neutral-300">{rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            </div>
        </AppLayout>
    );
}
