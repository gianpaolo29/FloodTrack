import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Droplets,
    ExternalLink,
    FileText,
    Globe,
    LayoutDashboard,
    MapPin,
    ShieldCheck,
    Shield,
    TrendingUp,
    Waves,
    Zap,
} from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Report, Alert as AlertType } from '@/types/admin';
import { SEVERITY_COLORS as SEV, STATUS_COLORS as STA } from '@/types/admin';
import { formatResponseTime } from '@/lib/kpi-utils';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';

/* ─── Types ─── */
interface Stats { total_reports: number; pending: number; active: number; resolved_today: number; total_users: number; total_responders: number }
interface DailyReport { date: string; total: number; resolved: number }
interface ActivityItem { id: number; status: string; notes: string | null; created_at: string; user: { id: number; name: string; role: string }; report: { id: number; reference_number: string; severity: string } }
interface MapReport { id: number; reference_number: string; severity: string; status: string; latitude: number; longitude: number; address: string | null }
interface TeamStats { active: number; deployed: number; inactive: number }

interface Props {
    stats: Stats;
    trends: { reports: number; resolved: number; active: number; pending: number; alerts: number; label: string; period_label: string };
    daily_reports: DailyReport[];
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    recent_reports: Report[];
    active_alerts: number;
    critical_alerts: AlertType[];
    avg_response_time: number;
    recent_activity: ActivityItem[];
    affected_areas: number;
    map_reports: MapReport[];
    team_stats: TeamStats;
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Dashboard', href: '/admin' },
];

const DONUT_COLORS  = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];

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

/* CalendarPicker, KpiTooltip, PrimaryStatCard, SecondaryStatCard, PeriodToggle — imported from shared kpi modules */

/* ─── Card ─── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-neutral-200/70 bg-white transition-shadow hover:shadow-lg hover:border-neutral-300/80 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, title, subtitle, children }: {
    icon: React.ElementType; title: string; subtitle: string; children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <Icon className="size-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
                <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{subtitle}</p>
            </div>
            {children}
        </div>
    );
}

export default function AdminDashboard({
    stats, trends, daily_reports,
    severity_breakdown, status_breakdown,
    recent_reports, active_alerts, critical_alerts,
    avg_response_time, recent_activity,
    affected_areas, map_reports, team_stats, period,
    custom_from, custom_to,
}: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const severityValues = [
        severity_breakdown['critical'] ?? 0,
        severity_breakdown['high'] ?? 0,
        severity_breakdown['moderate'] ?? 0,
        severity_breakdown['low'] ?? 0,
    ];
    const severityLabels = ['Critical', 'High', 'Moderate', 'Low'];
    const totalSeverity  = severityValues.reduce((a, b) => a + b, 0);
    const resolvedCount  = status_breakdown['resolved'] ?? 0;
    const rejectedCount  = status_breakdown['rejected'] ?? 0;
    const resolutionRate = stats.total_reports > 0
        ? Math.round((resolvedCount / stats.total_reports) * 100) : 0;
    const pendingPct     = stats.total_reports > 0
        ? Math.round((stats.pending / stats.total_reports) * 100) : 0;
    const activePct      = stats.total_reports > 0
        ? Math.round((stats.active / stats.total_reports) * 100) : 0;
    const reportsPerResponder = stats.total_responders > 0
        ? Math.round(stats.total_reports / stats.total_responders) : 0;
    const criticalCount  = severity_breakdown['critical'] ?? 0;
    const highCount      = severity_breakdown['high'] ?? 0;
    const deploymentRate = team_stats.active > 0
        ? Math.round((team_stats.deployed / team_stats.active) * 100) : 0;

    /* ── Smart insight generator ── */
    const tl = trends.label; // e.g. "vs last month"

    function smartDesc(key: string): string {
        switch (key) {
            case 'total_reports': {
                const t = trends.reports;
                const parts: string[] = [];
                if (t === 0) parts.push(`Flood reports are steady ${tl} — no unusual activity.`);
                else if (t > 20) parts.push(`Flood reports surged ${Math.abs(t)}% ${tl} — consider deploying more rescue personnel to handle the spike.`);
                else if (t > 0) parts.push(`Flood reports are gradually rising (${Math.abs(t)}% ${tl}) — keep monitoring the situation.`);
                else if (t < -20) parts.push(`Flood reports dropped ${Math.abs(t)}% ${tl} — good time to clear the remaining backlog.`);
                else parts.push(`Flood reports are easing slightly (${Math.abs(t)}% ${tl}) — situation is stabilizing.`);
                if (resolutionRate >= 80) parts.push(`Strong performance with ${resolutionRate}% resolution rate.`);
                else if (resolutionRate >= 50) parts.push(`Resolution rate at ${resolutionRate}% — push to close more open cases.`);
                else if (stats.total_reports > 0) parts.push(`Only ${resolutionRate}% resolved — prioritize clearing the queue.`);
                if (pendingPct > 30) parts.push('Verification queue is building up — speed up the review process.');
                if (reportsPerResponder > 8) parts.push('High workload per rescue personnel — consider adding more team members.');
                return parts.join(' ');
            }
            case 'active_floods': {
                const t = trends.active;
                const parts: string[] = [];
                if (stats.active === 0) return 'No flooded areas reported — all situations have been resolved. Great job by the response teams.';
                if (t > 20) parts.push(`Flooded areas surging (${Math.abs(t)}% ${tl}) — escalate response and deploy additional teams.`);
                else if (t > 0) parts.push(`Flooded areas rising (${Math.abs(t)}% ${tl}) — situation is getting worse, stay alert.`);
                else if (t < -20) parts.push(`Flooded areas dropping fast (${Math.abs(t)}% ${tl}) — response effort is paying off.`);
                else if (t < 0) parts.push(`Flooded areas declining (${Math.abs(t)}% ${tl}) — situation is gradually improving.`);
                else parts.push(`Flooded areas holding steady ${tl} — no improvement yet.`);
                if (activePct > 60) parts.push('Majority of reports remain unresolved — response teams need to accelerate.');
                else if (activePct > 30) parts.push('Moderate flood activity — maintain current response pace.');
                if (team_stats.deployed < Math.ceil(stats.active / 3) && stats.active > 0) parts.push('More response teams should be deployed to cover the flooded areas.');
                else if (team_stats.deployed > 0) parts.push('Team deployment looks adequate for current demand.');
                if (stats.pending > 3) parts.push('Several flood reports still awaiting verification — speed up triage.');
                return parts.join(' ');
            }
            case 'pending': {
                if (stats.pending === 0) return 'All caught up — no flood reports awaiting verification.';
                const t = trends.pending;
                const parts: string[] = [];
                if (t > 0) parts.push(`Verification queue grew by ${Math.abs(t)}% ${tl}.`);
                else if (t < 0) parts.push(`Verification queue shrank by ${Math.abs(t)}% ${tl} — good progress.`);
                if (pendingPct > 40) parts.push(`${pendingPct}% of flood reports are waiting for verification — this is a bottleneck.`);
                else if (pendingPct > 20) parts.push(`${pendingPct}% of flood reports still need verification.`);
                else parts.push(`Only ${pendingPct}% of reports are awaiting verification — manageable.`);
                if (avg_response_time > 60) parts.push(`Avg response time is ${formatResponseTime(avg_response_time)} — try to speed up the verification process.`);
                return parts.join(' ');
            }
            case 'responders': {
                const parts: string[] = [];
                if (reportsPerResponder > 10) parts.push(`Each rescue personnel is handling ~${reportsPerResponder} flood reports — team may be stretched thin.`);
                else if (reportsPerResponder > 0) parts.push(`Workload is balanced at ~${reportsPerResponder} flood reports per rescue personnel.`);
                else parts.push('No flood reports assigned to rescue personnel yet.');
                if (stats.resolved_today > 0) parts.push(`${stats.resolved_today} cases resolved today — team is active.`);
                if (team_stats.deployed > 0) parts.push(`${team_stats.deployed} response team${team_stats.deployed > 1 ? 's' : ''} currently deployed in the field.`);
                else if (stats.active > 0) parts.push('No response teams deployed yet despite active flooded areas.');
                return parts.join(' ');
            }
            case 'alerts': {
                if (active_alerts === 0) return 'No active announcements. Conditions are stable.';
                const t = trends.alerts;
                const parts: string[] = [];
                if (t > 0) parts.push(`Announcements surged by ${Math.abs(t)}% ${tl}.`);
                else if (t < 0) parts.push(`Announcements dropped by ${Math.abs(t)}% ${tl}.`);
                if (critical_alerts.length > 0) parts.push(`${critical_alerts.length} critical announcement${critical_alerts.length > 1 ? 's' : ''} — immediate action required.`);
                if (affected_areas > 3) parts.push(`Spread across ${affected_areas} areas — monitor for wider impact.`);
                else if (affected_areas > 0) parts.push(`Concentrated in ${affected_areas} area${affected_areas > 1 ? 's' : ''}.`);
                return parts.join(' ');
            }
            case 'resolved_today': {
                if (stats.resolved_today === 0) return `No flood reports resolved yet today. ${stats.pending} awaiting verification and ${stats.active} flooded areas still need attention.`;
                const parts: string[] = [];
                const t = trends.resolved;
                if (t > 0) parts.push(`Resolutions up ${Math.abs(t)}% ${tl} — great momentum.`);
                else if (t < 0) parts.push(`Resolutions down ${Math.abs(t)}% ${tl}.`);
                if (stats.pending > stats.resolved_today) parts.push(`Still ${stats.pending} awaiting verification — more than what was resolved today.`);
                else if (stats.pending > 0) parts.push(`Almost caught up — only ${stats.pending} left awaiting verification.`);
                else parts.push('No flood reports left pending — fully caught up.');
                parts.push(`Overall resolution rate: ${resolutionRate}%.`);
                return parts.join(' ');
            }
            case 'avg_response': {
                const parts: string[] = [];
                if (avg_response_time <= 0) return 'No resolved flood reports to calculate response time from.';
                if (avg_response_time < 30) parts.push('Response time is excellent — under 30 minutes.');
                else if (avg_response_time < 60) parts.push('Response time is good — under an hour.');
                else if (avg_response_time < 180) parts.push(`Response time is ${formatResponseTime(avg_response_time)} — room for improvement.`);
                else parts.push(`Response time is ${formatResponseTime(avg_response_time)} — this needs urgent attention.`);
                if (reportsPerResponder > 8) parts.push(`High workload (~${reportsPerResponder} reports/personnel) may be slowing things down.`);
                if (stats.pending > 5) parts.push(`${stats.pending} flood reports queued for verification — reducing backlog would help.`);
                return parts.join(' ');
            }
            case 'resolution_rate': {
                const parts: string[] = [];
                if (resolutionRate >= 90) parts.push(`Excellent — ${resolutionRate}% of flood reports are resolved.`);
                else if (resolutionRate >= 70) parts.push(`Good — ${resolutionRate}% resolved, but ${stats.pending + stats.active} flood reports still open.`);
                else if (resolutionRate >= 40) parts.push(`${resolutionRate}% resolved — needs improvement. ${stats.pending} awaiting verification, ${stats.active} flooded areas active.`);
                else if (stats.total_reports > 0) parts.push(`Only ${resolutionRate}% resolved — most flood reports are still unresolved.`);
                else return 'No flood reports submitted yet.';
                if (rejectedCount > 0) parts.push(`${rejectedCount} report${rejectedCount > 1 ? 's were' : ' was'} rejected.`);
                return parts.join(' ');
            }
            case 'active_teams': {
                if (team_stats.active === 0) return 'No active response teams. Teams need to be activated for deployment.';
                const parts: string[] = [];
                if (deploymentRate >= 80) parts.push(`${deploymentRate}% deployment rate — nearly all response teams are in the field.`);
                else if (deploymentRate >= 50) parts.push(`${deploymentRate}% deployed — ${team_stats.active - team_stats.deployed} response teams still available.`);
                else if (team_stats.deployed > 0) parts.push(`Only ${deploymentRate}% deployed — capacity available for more flooded areas.`);
                else parts.push('No response teams deployed yet.');
                if (team_stats.inactive > 0) parts.push(`${team_stats.inactive} inactive team${team_stats.inactive > 1 ? 's' : ''} could be reactivated if needed.`);
                if (stats.active > 0 && team_stats.deployed === 0) parts.push(`${stats.active} flooded areas with no teams deployed — needs immediate action.`);
                return parts.join(' ');
            }
            default: return '';
        }
    }

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            {/* Page background */}
            <div className="min-h-full bg-neutral-50/50 dark:bg-neutral-950">
            <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8">

                {/* Header */}
                <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-neutral-900 dark:bg-white">
                            <LayoutDashboard className="size-5 sm:size-6 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                                Dashboard
                            </h1>
                            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-sm dark:text-neutral-400">Real-time overview of flood incidents, response teams, and system performance</p>
                        </div>
                    </div>
                    <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin" />
                </div>

                {/* Primary Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
                    {([
                        { label: 'Total Flood Reports',  value: stats.total_reports,    trend: trends.reports,  trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('total_reports'), icon: FileText, grad: 'from-indigo-500 via-blue-500 to-cyan-500', shadow: 'shadow-indigo-500/40', alert: false, insights: [
                            { label: 'Resolved cases', value: resolvedCount, color: '#10b981' },
                            { label: 'Flooded areas', value: stats.active, color: '#3b82f6' },
                            { label: 'Awaiting verification', value: stats.pending, color: '#f59e0b' },
                            { label: 'Rejected reports', value: rejectedCount, color: '#94a3b8' },
                        ] },
                        { label: 'Flooded Areas',  value: stats.active, trend: trends.active, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('active_floods'), icon: Waves, grad: 'from-cyan-500 via-teal-500 to-emerald-500', shadow: 'shadow-cyan-500/40', alert: false, insights: [
                            { label: 'Critical flood incidents', value: criticalCount, color: '#ef4444' },
                            { label: 'High severity floods', value: highCount, color: '#f97316' },
                            { label: '% of total flood reports', value: `${activePct}%`, color: '#3b82f6' },
                        ] },
                        { label: 'Awaiting Verification', value: stats.pending, trend: trends.pending, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('pending'), icon: Clock, grad: 'from-amber-400 via-orange-500 to-rose-500', shadow: 'shadow-amber-500/40', alert: stats.pending > 0, insights: [
                            { label: '% of total flood reports', value: `${pendingPct}%`, color: '#f59e0b' },
                            { label: 'Resolved today', value: stats.resolved_today, color: '#10b981' },
                            { label: 'Avg response time', value: formatResponseTime(avg_response_time), color: '#6366f1' },
                        ] },
                        { label: 'Rescue Personnel', value: stats.total_responders, trend: undefined, trendLabel: `${stats.resolved_today} cases resolved today`, desc: smartDesc('responders'), icon: ShieldCheck, grad: 'from-violet-500 via-purple-500 to-indigo-600', shadow: 'shadow-violet-500/40', alert: false, insights: [
                            { label: 'Reports per personnel', value: reportsPerResponder, color: '#8b5cf6' },
                            { label: 'Cases resolved today', value: stats.resolved_today, color: '#10b981' },
                            { label: 'Response teams deployed', value: team_stats.deployed, color: '#06b6d4' },
                        ] },
                        { label: 'Announcements', value: active_alerts, trend: trends.alerts, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('alerts'), icon: AlertTriangle, grad: 'from-rose-500 via-red-500 to-pink-600', shadow: 'shadow-rose-500/40', alert: active_alerts > 0, insights: [
                            { label: 'Critical announcements', value: critical_alerts.length, color: '#ef4444' },
                            { label: 'Affected areas', value: affected_areas, color: '#8b5cf6' },
                            { label: 'Flooded areas', value: stats.active, color: '#06b6d4' },
                        ] },
                    ] as const).map(({ label, value, trend, trendLabel, desc, insights, icon: Icon, grad, shadow, alert }, i) => (
                        <PrimaryStatCard
                            key={label}
                            label={label} value={value} trend={trend} trendLabel={trendLabel} desc={desc} insights={[...insights]}
                            icon={Icon} grad={grad} shadow={shadow} alert={alert}
                            index={i} mounted={mounted}
                        />
                    ))}
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                    {([
                        { icon: CheckCircle2, grad: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', value: stats.resolved_today, label: 'Resolved Today', trend: trends.resolved, desc: smartDesc('resolved_today'), insights: [
                            { label: 'Awaiting verification', value: stats.pending, color: '#f59e0b' },
                            { label: 'Flooded areas active', value: stats.active, color: '#3b82f6' },
                            { label: 'Resolution rate', value: `${resolutionRate}%`, color: '#10b981' },
                        ] },
                        { icon: Clock, grad: 'from-orange-400 to-amber-500', shadow: 'shadow-orange-500/20', value: formatResponseTime(avg_response_time), label: 'Avg. Response Time', trend: undefined, desc: smartDesc('avg_response'), insights: [
                            { label: 'Awaiting verification', value: stats.pending, color: '#f59e0b' },
                            { label: 'Rescue personnel', value: stats.total_responders, color: '#8b5cf6' },
                            { label: 'Reports per personnel', value: reportsPerResponder, color: '#6366f1' },
                        ] },
                        { icon: TrendingUp, grad: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/20', value: `${resolutionRate}%`, label: 'Resolution Rate', trend: undefined, desc: smartDesc('resolution_rate'), insights: [
                            { label: 'Resolved cases', value: resolvedCount, color: '#10b981' },
                            { label: 'Total flood reports', value: stats.total_reports, color: '#6366f1' },
                            { label: 'Rejected reports', value: rejectedCount, color: '#94a3b8' },
                        ] },
                    ] as const).map(({ icon: Icon, grad, shadow, value, label, trend, desc, insights }, i) => (
                        <SecondaryStatCard key={label} icon={Icon} grad={grad} shadow={shadow} value={value} label={label} trend={trend} desc={desc} insights={[...insights]} trendLabel={trends.label} periodLabel={trends.period_label} mounted={mounted} delay={i * 80 + 480} />
                    ))}
                    {/* Active Teams card */}
                    <SecondaryStatCard icon={Shield} grad="from-teal-400 to-cyan-500" shadow="shadow-teal-500/20" value={team_stats.active} label="Response Teams" desc={smartDesc('active_teams')} insights={[
                        { label: 'Teams deployed', value: team_stats.deployed, color: '#14b8a6' },
                        { label: 'Inactive teams', value: team_stats.inactive, color: '#94a3b8' },
                        { label: 'Deployment rate', value: `${deploymentRate}%`, color: '#06b6d4' },
                    ]} trendLabel={`${team_stats.deployed} deployed${team_stats.inactive > 0 ? ` · ${team_stats.inactive} inactive` : ''}`} periodLabel="" mounted={mounted} delay={800} />
                </div>

                {/* Charts: Area + Donut */}
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]">
                    <Card>
                        <CardHeader icon={TrendingUp} title="Flood Incident Trend" subtitle="Daily reports over the last 30 days">
                            <div className="ml-auto hidden items-center gap-4 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full" style={{ background: '#6366f1' }} />Reports</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full" style={{ background: '#10b981' }} />Resolved</span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {daily_reports.length > 0
                                ? <ReactApexChart type="area" series={areaSeries} options={areaOptions} height={270} />
                                : <Empty text="No flood report data available" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={AlertTriangle} title="Severity Breakdown" subtitle="Report distribution by severity level" />
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

                {/* Recent Activity */}
                    <Card>
                        <CardHeader icon={Zap} title="Recent Activity" subtitle="Latest flood report status changes and team actions">
                            <Link href="/admin/activity" className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-300">
                                View all
                            </Link>
                        </CardHeader>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {recent_activity.length > 0 ? recent_activity.map((a) => (
                                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white dark:bg-neutral-200 dark:text-neutral-900">
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
                            )) : <div className="px-5 py-10"><Empty text="No recent flood report activity" /></div>}
                        </div>
                    </Card>

                {/* Live Incident Map */}
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                <MapPin className="size-4 text-neutral-500 dark:text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Flood Incident Map</p>
                                <p className="text-[11px] text-neutral-400">{map_reports.length} active flooded area{map_reports.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <Link href="/admin/reports/map" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-500 transition-all hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white">
                            <Globe className="size-3.5" />
                            Full Map
                        </Link>
                    </div>
                    <div className="p-3 sm:p-4">
                        {map_reports.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {map_reports.slice(0, 8).map((r) => (
                                    <Link key={r.id} href={`/admin/reports/${r.id}`}
                                        className="group flex flex-col justify-between rounded-xl border border-neutral-100 bg-neutral-50/50 p-3.5 transition-all hover:border-neutral-300 hover:bg-white hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-800">
                                        <div className="min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate font-mono text-xs font-bold text-neutral-900 dark:text-white">{r.reference_number}</span>
                                                <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${SEV[r.severity as keyof typeof SEV] ?? ''}`}>{r.severity}</span>
                                            </div>
                                            <p className="mt-1.5 truncate text-[10px] text-neutral-400">{r.address ?? 'No address'}</p>
                                        </div>
                                        <div className="mt-2.5 flex items-center gap-1 text-[10px] text-neutral-400">
                                            <MapPin className="size-3 shrink-0" />
                                            <span className="truncate tabular-nums">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center"><Empty text="No active flooded areas" /></div>
                        )}
                    </div>
                </Card>

                {/* Recent Reports Table */}
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                <FileText className="size-4 text-neutral-500 dark:text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Recent Flood Reports</p>
                                <p className="text-[11px] text-neutral-400">Latest submitted flood incident reports</p>
                            </div>
                        </div>
                        <Link href="/admin/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-500 transition-all hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white">
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
                                        <p className="mt-0.5 text-[10px] text-neutral-400">{report.user?.name ?? '—'} · {new Date(report.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${SEV[report.severity]}`}>{report.severity}</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${STA[report.status]}`}>{report.status}</span>
                                    </div>
                                </Link>
                            ))}
                            {recent_reports.length === 0 && <div className="px-5 py-16 text-center"><Empty text="No flood reports yet" /></div>}
                        </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30">
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Reference</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Date</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Reporter</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Severity</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {recent_reports.map((report) => (
                                    <tr key={report.id} className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                        <td className="px-5 py-3.5">
                                            <Link href={`/admin/reports/${report.id}`} className="font-mono text-xs font-bold text-neutral-800 transition-colors group-hover:text-neutral-950 dark:text-neutral-200 dark:group-hover:text-white">
                                                {report.reference_number}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs whitespace-nowrap text-neutral-400">
                                            {new Date(report.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                                    <tr><td colSpan={5} className="px-5 py-16 text-center"><Empty text="No flood reports yet" /></td></tr>
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

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-neutral-300">
            <Droplets className="size-6" />
            <p className="text-xs font-medium text-neutral-400">{text}</p>
        </div>
    );
}
