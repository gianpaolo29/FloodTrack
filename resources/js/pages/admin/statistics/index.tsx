import { Head } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Clock,
    ClipboardCopy,
    FileText,
    History,
    MapPin,
    Navigation,
    PieChart,
    RefreshCw,
    Shield,
    Sparkles,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { PERIODS } from '@/lib/kpi-utils';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { useLocale } from '@/hooks/use-locale';
import { StatisticsSkeleton } from '@/components/admin/skeletons';

/* ─── Types ─── */
interface AiBottleneck {
    stage: string;
    avg_minutes: number;
    explanation: string;
    fix: string;
}
interface AiAffectedArea {
    name: string;
    risk: 'critical' | 'high' | 'moderate' | 'low';
    reason: string;
}
interface AiTeamAction {
    team: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
}
interface AiEvacAction {
    center: string;
    action: string;
    reason: string;
}
interface AiInsight {
    risk_level: 'critical' | 'high' | 'moderate' | 'low';
    confidence: 'high' | 'medium' | 'low';
    summary: string;
    key_findings: string[];
    bottleneck: AiBottleneck;
    affected_areas: AiAffectedArea[];
    team_actions: AiTeamAction[];
    evacuation_actions: AiEvacAction[];
    recommendations: string[];
    priority_action: string;
}

interface MonthlyPoint { month: string; total: number; critical: number; high: number; moderate: number; low: number; }
interface BarangayReport { area: string; count: number }
interface MonthComparisonSide { label: string; critical: number; high: number; moderate: number; low: number }
interface ResponseBreakdownOverall { avg_report_to_verified: number; avg_verified_to_assigned: number; avg_assigned_to_resolved: number; total_resolved: number }
interface ResponseBreakdownBySeverity { severity: string; avg_report_to_verified: number; avg_verified_to_assigned: number; avg_assigned_to_resolved: number; count: number }
interface ResponseBreakdown { overall: ResponseBreakdownOverall; by_severity: ResponseBreakdownBySeverity[] }
interface Props {
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    monthly_trend: MonthlyPoint[];
    peak_hours: Record<number, number>;
    peak_hours_heatmap: Record<number, Record<number, number>>;
    total_reports: number;
    resolution_rate: number;
    critical_count: number;
    trends: {
        reports: number;
        resolved: number;
        critical: number;
        label: string;
        period_label: string;
    };
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
    barangay_reports: BarangayReport[];
    month_comparison: { this_month: MonthComparisonSide; last_month: MonthComparisonSide };
    source_breakdown: Record<string, number>;
    response_breakdown: ResponseBreakdown;
    /* Props still accepted but no longer rendered */
    daily_reports?: Record<string, number>;
    evacuation_stats?: { total_centers: number; total_capacity: number; total_occupancy: number };
    evacuation_centers?: unknown[];
    evac_occupancy_timeline?: unknown[];
    alert_frequency?: unknown[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Statistics', href: '/admin/statistics' },
];

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

/* ─── Card (dashboard-consistent style) ─── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-neutral-900/[0.04] hover:border-neutral-300/70 dark:border-neutral-800/80 dark:bg-neutral-900/80 dark:hover:border-neutral-700 dark:hover:shadow-black/20 ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, title, subtitle, children }: {
    icon: React.ElementType; title: string; subtitle: string; children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-neutral-100/80 px-5 py-4 dark:border-neutral-800/80">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/60">
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

/* ─── Helpers ─── */
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

function InsightBar({ question, answers }: { question: string; answers: string[] }) {
    return (
        <div className="mx-5 mt-3 overflow-hidden rounded-xl border border-neutral-100/80 bg-gradient-to-r from-neutral-50 to-white dark:border-neutral-800/60 dark:from-neutral-800/40 dark:to-neutral-800/20">
            <div className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-neutral-900/5 dark:bg-white/5">
                    <Sparkles className="size-3 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{question}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-0 gap-y-1">
                        {answers.map((a, i) => (
                            <span key={i} className="flex items-center">
                                <span className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300 [&_strong]:font-bold [&_strong]:text-neutral-900 dark:[&_strong]:text-white" dangerouslySetInnerHTML={{ __html: a }} />
                                {i < answers.length - 1 && <span className="mx-3 h-3.5 w-px shrink-0 bg-neutral-200/80 dark:bg-neutral-700/80" />}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Urgency Logic ─── */
function getUrgency(key: string, trends: Props['trends'], critical_count: number, resolution_rate: number): 'good' | 'warning' | 'urgent' | undefined {
    switch (key) {
        case 'total_reports':
            if (trends.reports > 50) return 'urgent';
            if (trends.reports > 20) return 'warning';
            return 'good';
        case 'resolution_rate':
            if (resolution_rate >= 80) return 'good';
            if (resolution_rate >= 50) return 'warning';
            return 'urgent';
        case 'critical':
            if (critical_count > 5) return 'urgent';
            if (critical_count > 0) return 'warning';
            return 'good';
        default: return undefined;
    }
}

/* ─── Action Links ─── */
const ACTION_LINKS: Record<string, { label: string; href: string }> = {
    total_reports: { label: 'View all reports', href: '/admin/reports' },
    resolution_rate: { label: 'View reports', href: '/admin/reports' },
    critical: { label: 'View critical reports', href: '/admin/reports?severity=critical' },
};

export default function StatisticsPage({
    severity_breakdown,
    status_breakdown,
    monthly_trend,
    peak_hours,
    peak_hours_heatmap,
    total_reports,
    resolution_rate,
    critical_count,
    trends,
    period,
    custom_from,
    custom_to,
    barangay_reports,
    month_comparison,
    source_breakdown,
    response_breakdown,
}: Props) {
    const { t, locale } = useLocale();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const tm = setTimeout(() => setMounted(true), 80); return () => clearTimeout(tm); }, []);

    const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [aiData, setAiData] = useState<AiInsight | null>(null);
    const [previousAi, setPreviousAi] = useState<{ data: AiInsight; timestamp: string; period: string } | null>(null);
    const [showPrevious, setShowPrevious] = useState(false);
    const [copied, setCopied] = useState(false);
    const [typewriterReady, setTypewriterReady] = useState(false);
    const aiAutoTriggered = useRef(false);

    // Cache key for localStorage
    const AI_CACHE_KEY = 'floodtrack_ai_insights';
    const AI_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    // Load cached AI data on mount or auto-generate
    useEffect(() => {
        if (aiAutoTriggered.current) return;
        aiAutoTriggered.current = true;

        try {
            const cached = localStorage.getItem(AI_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                const age = Date.now() - parsed.timestamp;
                if (age < AI_CACHE_TTL && parsed.period === period) {
                    setAiData(parsed.data);
                    setAiState('done');
                    setTypewriterReady(true);
                    // Load previous if exists
                    if (parsed.previous) setPreviousAi(parsed.previous);
                    return;
                }
            }
        } catch { /* ignore parse errors */ }

        generateInsights();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function generateInsights() {
        setAiState('loading');
        setTypewriterReady(false);
        try {
            const res = await fetch(`/admin/statistics/ai-insights?period=${encodeURIComponent(period)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Save current as previous before replacing
            const prevEntry = aiData ? { data: aiData, timestamp: new Date().toISOString(), period } : previousAi;
            setPreviousAi(prevEntry ?? null);

            setAiData(data);
            setAiState('done');

            // Trigger typewriter after a small delay
            setTimeout(() => setTypewriterReady(true), 100);

            // Cache to localStorage
            try {
                localStorage.setItem(AI_CACHE_KEY, JSON.stringify({
                    data,
                    timestamp: Date.now(),
                    period,
                    previous: prevEntry,
                }));
            } catch { /* storage full, ignore */ }
        } catch {
            setAiState('error');
        }
    }

    // Copy AI analysis to clipboard
    function copyAnalysis() {
        if (!aiData) return;
        const lines = [
            `FLOODTRACK AI SITUATION ANALYSIS`,
            `Risk Level: ${aiData.risk_level.toUpperCase()} | Confidence: ${aiData.confidence}`,
            ``,
            `SUMMARY`,
            aiData.summary,
            ``,
            `KEY FINDINGS`,
            ...aiData.key_findings.map((f, i) => `${i + 1}. ${f}`),
            ``,
            `BOTTLENECK: ${formatStageName(aiData.bottleneck?.stage)} (avg ${aiData.bottleneck?.avg_minutes} min)`,
            aiData.bottleneck?.explanation,
            `Fix: ${aiData.bottleneck?.fix}`,
        ];
        if (aiData.affected_areas?.length) {
            lines.push(``, `AFFECTED AREAS`);
            aiData.affected_areas.forEach(a => lines.push(`- ${a.name} [${a.risk.toUpperCase()}]: ${a.reason}`));
        }
        if (aiData.team_actions?.length) {
            lines.push(``, `TEAM ACTIONS`);
            aiData.team_actions.forEach(t => lines.push(`- ${t.team} [${t.priority}]: ${t.action}`));
        }
        if (aiData.evacuation_actions?.length) {
            lines.push(``, `EVACUATION ACTIONS`);
            aiData.evacuation_actions.forEach(e => lines.push(`- ${e.center}: ${e.action} — ${e.reason}`));
        }
        lines.push(``, `RECOMMENDATIONS`);
        aiData.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
        lines.push(``, `PRIORITY ACTION`, aiData.priority_action);

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function formatStageName(stage?: string): string {
        switch (stage) {
            case 'report_to_verified': return 'Report \u2192 Verified';
            case 'verified_to_assigned': return 'Verified \u2192 Assigned';
            case 'assigned_to_resolved': return 'Assigned \u2192 Resolved';
            default: return stage ?? 'Unknown';
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

    const monthlyLabels = monthly_trend.map(m => m.month);
    const monthlySeries = [
        { name: 'Total',    data: monthly_trend.map(m => m.total) },
        { name: 'Critical', data: monthly_trend.map(m => m.critical) },
        { name: 'High',     data: monthly_trend.map(m => m.high) },
        { name: 'Moderate', data: monthly_trend.map(m => m.moderate) },
        { name: 'Low',      data: monthly_trend.map(m => m.low) },
    ];

    // Peak hours labels and series
    const peakHoursLabels = Array.from({ length: 24 }, (_, h) => {
        if (h === 0) return '12am';
        if (h < 12) return `${h}am`;
        if (h === 12) return '12pm';
        return `${h - 12}pm`;
    });
    const peakHoursSeries = [{ name: 'Reports', data: Array.from({ length: 24 }, (_, h) => peak_hours[h] ?? 0) }];

    // Derived stats for tooltips
    const resolvedCount  = status_breakdown['resolved'] ?? 0;
    const pendingCount   = status_breakdown['pending'] ?? 0;
    const activeCount    = (status_breakdown['verified'] ?? 0) + (status_breakdown['assigned'] ?? 0);
    const rejectedCount  = status_breakdown['rejected'] ?? 0;
    const highCount      = severity_breakdown['high'] ?? 0;
    const critPct        = total_reports > 0 ? Math.round((critical_count / total_reports) * 100) : 0;

    /* ── Smart descriptions ── */
    function statDesc(key: string): string {
        const isFil = locale === 'fil';
        switch (key) {
            case 'total_reports': {
                if (isFil) {
                    if (total_reports === 0) return 'Wala pang report.';
                    const parts: string[] = [];
                    parts.push(`${resolvedCount} resolved, ${activeCount} active, ${pendingCount} pending.`);
                    if (pendingCount > 0 && total_reports > 0 && (pendingCount / total_reports) > 0.3)
                        parts.push('Maraming reports ang naghihintay pa. Baka nahuhuli na.');
                    if (resolution_rate >= 80) parts.push('Maganda ang resolution rate.');
                    return parts.join(' ');
                }
                if (total_reports === 0) return 'No reports yet.';
                const parts: string[] = [];
                parts.push(`${resolvedCount} resolved, ${activeCount} active, ${pendingCount} pending.`);
                if (pendingCount > 0 && total_reports > 0 && (pendingCount / total_reports) > 0.3)
                    parts.push('Lots of reports waiting to be checked. Might be falling behind.');
                if (resolution_rate >= 80) parts.push('Resolution rate is looking solid.');
                return parts.join(' ');
            }
            case 'resolution_rate': {
                if (isFil) {
                    if (total_reports === 0) return 'Wala pang report para ma-compute.';
                    if (resolution_rate >= 90) return `${resolvedCount} sa ${total_reports} ang resolved. Ang galing!`;
                    if (resolution_rate >= 70) return `${resolvedCount} na ang resolved. ${pendingCount + activeCount} pa ang kailangan asikasuhin.`;
                    if (resolution_rate >= 40) return `${resolution_rate}% lang. May ${pendingCount} pending at ${activeCount} active pa.`;
                    return `${resolution_rate}% lang ang resolved. Karamihan open pa.`;
                }
                if (total_reports === 0) return 'No reports to calculate from yet.';
                if (resolution_rate >= 90) return `${resolvedCount} out of ${total_reports} resolved. That's excellent.`;
                if (resolution_rate >= 70) return `${resolvedCount} resolved so far. ${pendingCount + activeCount} still need attention.`;
                if (resolution_rate >= 40) return `Only ${resolution_rate}% resolved. There are still ${pendingCount} pending and ${activeCount} active.`;
                return `Just ${resolution_rate}% resolved. Most reports are still open.`;
            }
            case 'critical': {
                if (isFil) {
                    if (critical_count === 0) return 'Walang critical na report. Lahat ng severity levels okay.';
                    const parts: string[] = [];
                    parts.push(`${critical_count} critical report, ${critPct}% ng lahat.`);
                    if (highCount > 0) parts.push(`May ${highCount} pa na high-severity na kailangan din asikasuhin.`);
                    if (critical_count > 5) parts.push('Ang dami. Baka kailangan na ng emergency protocol.');
                    return parts.join(' ');
                }
                if (critical_count === 0) return 'No critical reports. All severity levels are under control.';
                const cParts: string[] = [];
                cParts.push(`${critical_count} critical report${critical_count > 1 ? 's' : ''}, making up ${critPct}% of all reports.`);
                if (highCount > 0) cParts.push(`Plus ${highCount} high-severity that also need priority attention.`);
                if (critical_count > 5) cParts.push('That\'s a lot. Emergency protocols might be needed.');
                return cParts.join(' ');
            }
            default: return '';
        }
    }

    /* ── Severity Bar Chart ── */
    const severityBarOptions: ApexOptions = {
        chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 800, easing: 'easeinout' } },
        plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '55%', distributed: true } },
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] } },
        colors: DONUT_COLORS,
        dataLabels: { enabled: true, offsetY: -18, style: { fontSize: '11px', fontWeight: 700, colors: ['#374151'] }, background: { enabled: false } },
        xaxis: { categories: severityLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', fontWeight: 500, colors: '#6b7280' } } },
        yaxis: { show: false },
        grid: { show: false },
        legend: { show: false },
        states: { hover: { filter: { type: 'darken', value: 0.15 } }, active: { filter: { type: 'none' } } },
        tooltip: {
            custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                const color = DONUT_COLORS[dataPointIndex];
                const pct = totalSeverity > 0 ? Math.round((series[seriesIndex][dataPointIndex] / totalSeverity) * 100) : 0;
                return tooltipHtml(label, [
                    { color, name: 'Count', value: series[seriesIndex][dataPointIndex] },
                    { color, name: 'Share', value: `${pct}%` },
                ]);
            },
        },
    };
    const severityBarSeries = [{ name: 'Reports', data: severityValues }];

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
        colors: ['#6366f1', '#f43f5e', '#f97316', '#eab308', '#22c55e'],
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
                    { color: '#eab308', name: 'Moderate', value: series[3][dataPointIndex] },
                    { color: '#22c55e', name: 'Low',      value: series[4][dataPointIndex] },
                ]);
            },
        },
    };

    /* ── Peak Hours Heatmap (Hour x Day-of-Week) ── */
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmapSeries = DAY_NAMES.map((day, di) => ({
        name: day,
        data: Array.from({ length: 24 }, (_, h) => ({
            x: h < 12 ? (h === 0 ? '12a' : `${h}a`) : (h === 12 ? '12p' : `${h - 12}p`),
            y: peak_hours_heatmap?.[di]?.[h] ?? 0,
        })),
    })).reverse();
    const heatmapOptions: ApexOptions = {
        chart: { type: 'heatmap', fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 600 } },
        plotOptions: { heatmap: { radius: 4, enableShades: false, colorScale: { ranges: [
            { from: 0, to: 0, color: '#f1f5f9', name: 'None' },
            { from: 1, to: 2, color: '#bfdbfe', name: 'Low' },
            { from: 3, to: 5, color: '#60a5fa', name: 'Medium' },
            { from: 6, to: 10, color: '#2563eb', name: 'High' },
            { from: 11, to: 1000, color: '#1e3a8a', name: 'Very High' },
        ] } } },
        dataLabels: { enabled: false },
        xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '9px', colors: '#9ca3af' } }, position: 'bottom' },
        yaxis: { labels: { style: { fontSize: '10px', fontWeight: 500, colors: '#6b7280' } } },
        grid: { show: false },
        legend: { show: false },
        states: { hover: { filter: { type: 'none' } } },
        tooltip: {
            custom: ({ seriesIndex, dataPointIndex }) => {
                const day = heatmapSeries[seriesIndex].name;
                const hour = heatmapSeries[seriesIndex].data[dataPointIndex].x;
                const val = heatmapSeries[seriesIndex].data[dataPointIndex].y as number;
                return tooltipHtml(`${day} ${hour}`, [{ color: '#2563eb', name: 'Reports', value: val }]);
            },
        },
    };

    /* ── Peak Hours Bar Chart (kept for summary stats) ── */
    const peakHoursOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 }, selection: { enabled: false } },
        plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', distributed: false, columnWidth: '70%' } },
        dataLabels: { enabled: false },
        colors: ['#f59e0b'],
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.75, stops: [0, 100] } },
        legend: { show: false },
        xaxis: { categories: peakHoursLabels, tickAmount: 12, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '9px', colors: '#94a3b8' }, rotate: -45 } },
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

    /* ── Barangay Reports Horizontal Bar ── */
    const sortedBarangays = [...barangay_reports].sort((a, b) => b.count - a.count);
    const barangayBarOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '60%', distributed: true } },
        colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6d28d9', '#4f46e5', '#4338ca', '#7c3aed', '#5b21b6'],
        dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 700, colors: ['#fff'] }, offsetX: -4 },
        xaxis: { categories: sortedBarangays.map(b => b.area), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#94a3b8', fontWeight: 500 }, maxWidth: 160 } },
        grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        legend: { show: false },
        tooltip: {
            custom: ({ dataPointIndex }) => {
                const b = sortedBarangays[dataPointIndex];
                return tooltipHtml(b.area, [{ color: '#6366f1', name: 'Reports', value: b.count }]);
            },
        },
    };
    const barangayBarSeries = [{ name: 'Reports', data: sortedBarangays.map(b => b.count) }];

    /* ── Month-over-Month Comparison ── */
    const sevKeys = ['critical', 'high', 'moderate', 'low'] as const;
    const monthCompOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        colors: ['#6366f1', '#a78bfa'],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: { categories: ['Critical', 'High', 'Moderate', 'Low'], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        legend: { position: 'top', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [
                    { color: '#6366f1', name: month_comparison.this_month.label, value: series[0][dataPointIndex] },
                    { color: '#a78bfa', name: month_comparison.last_month.label, value: series[1][dataPointIndex] },
                ]);
            },
        },
    };
    const monthCompSeries = [
        { name: month_comparison.this_month.label, data: sevKeys.map(k => month_comparison.this_month[k]) },
        { name: month_comparison.last_month.label, data: sevKeys.map(k => month_comparison.last_month[k]) },
    ];

    /* ── Reports by Source (bar chart) ── */
    const sourceLabels = Object.keys(source_breakdown);
    const sourceValues = Object.values(source_breakdown);
    const SOURCE_COLORS = ['#6366f1', '#10b981', '#f97316', '#ef4444', '#8b5cf6'];
    const sourceFormattedLabels = sourceLabels.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '));
    const totalSources = sourceValues.reduce((a, b) => a + b, 0);
    const sourceBarOptions: ApexOptions = {
        chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 800, easing: 'easeinout' } },
        plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '55%', distributed: true } },
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] } },
        colors: SOURCE_COLORS.slice(0, sourceLabels.length),
        dataLabels: { enabled: true, offsetY: -18, style: { fontSize: '11px', fontWeight: 700, colors: ['#374151'] }, background: { enabled: false } },
        xaxis: { categories: sourceFormattedLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', fontWeight: 500, colors: '#6b7280' } } },
        yaxis: { show: false },
        grid: { show: false },
        legend: { show: false },
        states: { hover: { filter: { type: 'darken', value: 0.15 } }, active: { filter: { type: 'none' } } },
        tooltip: {
            custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                const color = SOURCE_COLORS[dataPointIndex % SOURCE_COLORS.length];
                const pct = totalSources > 0 ? Math.round((series[seriesIndex][dataPointIndex] / totalSources) * 100) : 0;
                return tooltipHtml(label, [
                    { color, name: 'Count', value: series[seriesIndex][dataPointIndex] },
                    { color, name: 'Share', value: `${pct}%` },
                ]);
            },
        },
    };
    const sourceBarSeries = [{ name: 'Reports', data: sourceValues }];

    /* ── Response Time Breakdown (stacked bar by severity) ── */
    const STAGE_COLORS = ['#6366f1', '#f59e0b', '#10b981'];
    const STAGE_NAMES  = ['Report → Verified', 'Verified → Assigned', 'Assigned → Resolved'];
    const severityOrder = ['critical', 'high', 'moderate', 'low'];
    const breakdownBySev = severityOrder
        .map(s => response_breakdown.by_severity.find(b => b.severity === s))
        .filter((b): b is ResponseBreakdownBySeverity => !!b);
    const breakdownCategories = breakdownBySev.map(b => b.severity.charAt(0).toUpperCase() + b.severity.slice(1));

    const fmtMinutes = (m: number) => {
        if (m < 1) return '< 1 min';
        if (m < 60) return `${Math.round(m)} min`;
        const h = Math.floor(m / 60);
        const r = Math.round(m % 60);
        return r > 0 ? `${h}h ${r}m` : `${h}h`;
    };

    const breakdownSeries = [
        { name: STAGE_NAMES[0], data: breakdownBySev.map(b => b.avg_report_to_verified) },
        { name: STAGE_NAMES[1], data: breakdownBySev.map(b => b.avg_verified_to_assigned) },
        { name: STAGE_NAMES[2], data: breakdownBySev.map(b => b.avg_assigned_to_resolved) },
    ];

    const breakdownOptions: ApexOptions = {
        chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', borderRadiusWhenStacked: 'last', columnWidth: '50%' } },
        dataLabels: { enabled: false },
        colors: STAGE_COLORS,
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] } },
        xaxis: { categories: breakdownCategories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        yaxis: { title: { text: 'Minutes', style: { fontSize: '10px', color: '#94a3b8', fontWeight: 400 } }, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, formatter: (v: number) => fmtMinutes(v) } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        legend: { position: 'top', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.labels[dataPointIndex];
                const total = series.reduce((a: number, s: number[]) => a + (s[dataPointIndex] ?? 0), 0);
                return tooltipHtml(label, [
                    { color: STAGE_COLORS[0], name: STAGE_NAMES[0], value: fmtMinutes(series[0][dataPointIndex]) },
                    { color: STAGE_COLORS[1], name: STAGE_NAMES[1], value: fmtMinutes(series[1][dataPointIndex]) },
                    { color: STAGE_COLORS[2], name: STAGE_NAMES[2], value: fmtMinutes(series[2][dataPointIndex]) },
                    { color: '#111827', name: 'Total', value: fmtMinutes(total) },
                ]);
            },
        },
    };

    // Overall breakdown for the summary stats
    const overallTotal = response_breakdown.overall.avg_report_to_verified
        + response_breakdown.overall.avg_verified_to_assigned
        + response_breakdown.overall.avg_assigned_to_resolved;
    const overallStages = [
        { label: 'Report → Verified',   value: response_breakdown.overall.avg_report_to_verified,  color: STAGE_COLORS[0] },
        { label: 'Verified → Assigned',  value: response_breakdown.overall.avg_verified_to_assigned, color: STAGE_COLORS[1] },
        { label: 'Assigned → Resolved',  value: response_breakdown.overall.avg_assigned_to_resolved, color: STAGE_COLORS[2] },
    ];

    if (!mounted) return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics" />
            <StatisticsSkeleton />
        </AppLayout>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics" />

            <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
            <div className="flex flex-col gap-5 p-3 sm:gap-6 sm:p-6 lg:gap-7 lg:p-8">

                {/* ── Header ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-neutral-900 shadow-sm dark:bg-white">
                            <BarChart3 className="size-5 sm:size-6 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                                {t('stats.title')}
                            </h1>
                            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-sm dark:text-neutral-400">
                                {t('stats.subtitle')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/statistics" />
                        {/* Export button */}
                        <a
                            href="/admin/export"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-600 shadow-sm transition-all hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
                        >
                            <FileText className="size-3.5" />
                            Export
                        </a>
                    </div>
                </div>

                {/* ── 3 KPI Cards ── */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                    <PrimaryStatCard
                        label={t('stats.total_reports')}
                        value={total_reports}
                        trend={trends.reports}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={statDesc('total_reports')}
                        urgency={getUrgency('total_reports', trends, critical_count, resolution_rate)}
                        actionLink={ACTION_LINKS.total_reports}
                        accent="neutral"
                        icon={FileText}
                        alert={false}
                        mounted={mounted}
                        index={0}
                        insights={[
                            { label: 'Resolved', value: resolvedCount, color: '#10b981', max: total_reports || 1 },
                            { label: 'Active', value: activeCount, color: '#3b82f6', max: total_reports || 1 },
                            { label: 'Pending', value: pendingCount, color: '#f59e0b', max: total_reports || 1 },
                            { label: 'Rejected', value: rejectedCount, color: '#94a3b8' },
                        ]}
                    />
                    <SecondaryStatCard
                        label={t('stats.resolution_rate')}
                        value={`${resolution_rate}%`}
                        trend={trends.resolved}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        desc={statDesc('resolution_rate')}
                        urgency={getUrgency('resolution_rate', trends, critical_count, resolution_rate)}
                        actionLink={ACTION_LINKS.resolution_rate}
                        accent={resolution_rate >= 80 ? 'green' : resolution_rate >= 50 ? 'amber' : 'red'}
                        icon={CheckCircle2}
                        mounted={mounted}
                        delay={80}
                        insights={[
                            { label: 'Resolved', value: resolvedCount, color: '#10b981', max: total_reports || 1 },
                            { label: 'Total reports', value: total_reports, color: '#6366f1' },
                            { label: 'Still open', value: pendingCount + activeCount, color: '#f59e0b', max: total_reports || 1 },
                        ]}
                    />
                    <SecondaryStatCard
                        label={t('stats.critical_reports')}
                        value={critical_count}
                        trend={trends.critical}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        desc={statDesc('critical')}
                        urgency={getUrgency('critical', trends, critical_count, resolution_rate)}
                        actionLink={ACTION_LINKS.critical}
                        accent={critical_count > 5 ? 'red' : critical_count > 0 ? 'amber' : 'green'}
                        icon={AlertTriangle}
                        mounted={mounted}
                        delay={160}
                        insights={[
                            { label: 'Critical', value: critical_count, color: '#ef4444', max: total_reports || 1 },
                            { label: 'High', value: highCount, color: '#f97316', max: total_reports || 1 },
                            { label: '% of total', value: `${critPct}%`, color: '#ef4444' },
                        ]}
                    />
                </div>

                {/* ── AI Situation Analysis (hero) ── */}
                <Card>
                    <CardHeader icon={Sparkles} title={t('stats.ai_analysis')} subtitle={`Analyzing: ${PERIODS.find(p => p.key === period)?.label ?? 'All'} \u00B7 GPT-4o mini`}>
                        {aiState === 'done' && (
                            <div className="ml-auto flex items-center gap-1.5">
                                {previousAi && (
                                    <button
                                        onClick={() => setShowPrevious(!showPrevious)}
                                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${showPrevious ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' : 'border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-200'}`}
                                    >
                                        <History className="size-3" />
                                        Previous
                                    </button>
                                )}
                                <button
                                    onClick={copyAnalysis}
                                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-200"
                                >
                                    <ClipboardCopy className="size-3" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={generateInsights}
                                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-200"
                                >
                                    <RefreshCw className="size-3" />
                                    Refresh
                                </button>
                            </div>
                        )}
                    </CardHeader>
                    <div className="p-5">
                        {aiState === 'idle' && (
                            <div className="flex flex-col items-center gap-4 py-6 text-center">
                                <div className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <Sparkles className="size-7 text-neutral-500 dark:text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">AI-Powered Analysis</p>
                                    <p className="mt-1 text-xs text-neutral-400">Generate instant insights from your flood data using AI</p>
                                </div>
                                <button
                                    onClick={generateInsights}
                                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 active:scale-95"
                                >
                                    <Sparkles className="size-4" />
                                    {t('stats.generate_insights')}
                                </button>
                            </div>
                        )}

                        {aiState === 'loading' && (
                            <div className="flex flex-col items-center gap-4 py-10 text-center">
                                <div className="relative">
                                    <div className="size-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-600 dark:border-neutral-700 dark:border-t-neutral-300" />
                                    <Sparkles className="absolute inset-0 m-auto size-5 text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Analyzing flood data...</p>
                                    <p className="mt-0.5 text-xs text-neutral-400">Processing reports, teams, areas, and evacuation data</p>
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
                                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
                                >
                                    <RefreshCw className="size-3.5" />
                                    Retry
                                </button>
                            </div>
                        )}

                        {aiState === 'done' && aiData && (
                            <div className={`flex flex-col gap-5 transition-opacity duration-500 ${typewriterReady ? 'opacity-100' : 'opacity-0'}`}>
                                {/* Risk level + Confidence badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${RISK_STYLES[aiData.risk_level]}`}>
                                        <span className="size-1.5 rounded-full bg-current" />
                                        {aiData.risk_level} risk
                                    </span>
                                    {aiData.confidence && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                                            aiData.confidence === 'high' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                            : aiData.confidence === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                                            : 'bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                                        }`}>
                                            <Shield className="size-3" />
                                            {aiData.confidence} confidence
                                        </span>
                                    )}
                                    {previousAi && showPrevious && previousAi.data.risk_level !== aiData.risk_level && (
                                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                            was <span className="font-semibold">{previousAi.data.risk_level}</span>
                                        </span>
                                    )}
                                </div>

                                {/* Summary */}
                                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{aiData.summary}</p>

                                {/* Previous comparison */}
                                {showPrevious && previousAi && (
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-800 dark:bg-indigo-950/20">
                                        <div className="mb-2 flex items-center gap-1.5">
                                            <History className="size-3.5 text-indigo-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Previous Analysis</span>
                                            <span className="ml-auto text-[10px] text-indigo-400">{new Date(previousAi.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">{previousAi.data.summary}</p>
                                    </div>
                                )}

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

                                {/* Bottleneck */}
                                {aiData.bottleneck && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                                        <div className="mb-2 flex items-center gap-1.5">
                                            <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Response Bottleneck</span>
                                        </div>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                {formatStageName(aiData.bottleneck.stage)}
                                            </span>
                                            <span className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
                                                avg {aiData.bottleneck.avg_minutes} min
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">{aiData.bottleneck.explanation}</p>
                                        <div className="mt-2 flex items-start gap-1.5">
                                            <Zap className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{aiData.bottleneck.fix}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Affected Areas + Team Actions grid */}
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {/* Affected Areas */}
                                    {aiData.affected_areas?.length > 0 && (
                                        <div>
                                            <div className="mb-2 flex items-center gap-1.5">
                                                <Navigation className="size-3.5 text-neutral-400" />
                                                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Affected Areas</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {aiData.affected_areas.map((area, i) => (
                                                    <div key={i} className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                                                        <span className={`mt-0.5 inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${RISK_STYLES[area.risk]}`}>
                                                            {area.risk}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-neutral-800 dark:text-white">{area.name}</p>
                                                            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{area.reason}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Team Actions */}
                                    {aiData.team_actions?.length > 0 && (
                                        <div>
                                            <div className="mb-2 flex items-center gap-1.5">
                                                <Users className="size-3.5 text-neutral-400" />
                                                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Team Actions</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {aiData.team_actions.map((ta, i) => (
                                                    <div key={i} className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                                                        <span className={`mt-0.5 inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                                            ta.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                            : ta.priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                                                        }`}>
                                                            {ta.priority}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-neutral-800 dark:text-white">{ta.team}</p>
                                                            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{ta.action}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Evacuation Actions */}
                                {aiData.evacuation_actions?.length > 0 && (
                                    <div>
                                        <div className="mb-2 flex items-center gap-1.5">
                                            <MapPin className="size-3.5 text-neutral-400" />
                                            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Evacuation Actions</p>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {aiData.evacuation_actions.map((ea, i) => {
                                                const actionColors: Record<string, string> = {
                                                    open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                                                    close: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                                    expand: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                                    monitor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                                    relocate: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                                                };
                                                return (
                                                    <div key={i} className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                                                        <span className={`mt-0.5 inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${actionColors[ea.action] ?? 'bg-neutral-100 text-neutral-500'}`}>
                                                            {ea.action}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-neutral-800 dark:text-white">{ea.center}</p>
                                                            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{ea.reason}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Recommendations */}
                                <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Recommendations</p>
                                    <ul className="flex flex-col gap-2">
                                        {aiData.recommendations.map((rec, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                                                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
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

                {/* ── Response Time Breakdown ── */}
                <Card>
                    <CardHeader icon={Clock} title={t('stats.response_time')} subtitle={t('stats.response_sub')}>
                        <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                            {STAGE_NAMES.map((name, i) => (
                                <span key={name} className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[i] }} />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </CardHeader>
                    {overallTotal > 0 && (() => {
                        const slowest = overallStages.reduce((a, b) => b.value > a.value ? b : a, overallStages[0]);
                        const slowestPct = Math.round((slowest.value / overallTotal) * 100);
                        return (
                            <InsightBar
                                question="Where is the most time spent in our response pipeline?"
                                answers={[
                                    `Slowest stage: <strong>${slowest.label}</strong> (${fmtMinutes(slowest.value)}, ${slowestPct}% of total)`,
                                    `Total avg response: <strong>${fmtMinutes(overallTotal)}</strong>`,
                                    `<strong>${response_breakdown.overall.total_resolved.toLocaleString()}</strong> resolved reports`,
                                ]}
                            />
                        );
                    })()}
                    <div className="p-5">
                        {/* Overall summary row */}
                        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {overallStages.map(stage => {
                                const pct = overallTotal > 0 ? Math.round((stage.value / overallTotal) * 100) : 0;
                                return (
                                    <div key={stage.label} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-800/30">
                                        <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">{stage.label}</p>
                                        <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{fmtMinutes(stage.value)}</p>
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                                            </div>
                                            <span className="text-[10px] tabular-nums text-neutral-400">{pct}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-800/30">
                                <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">Total Avg Response</p>
                                <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{fmtMinutes(overallTotal)}</p>
                                <p className="mt-1.5 text-[10px] text-neutral-400">{response_breakdown.overall.total_resolved.toLocaleString()} resolved</p>
                            </div>
                        </div>
                        {/* Chart by severity */}
                        {breakdownBySev.length > 0
                            ? <ReactApexChart type="bar" series={breakdownSeries} options={breakdownOptions} height={280} />
                            : <EmptyState text="No resolved reports with stage data" />}
                    </div>
                </Card>

                {/* ── Charts Row 1: Severity Donut + Status Bar ── */}
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={AlertTriangle} title={t('stats.severity_breakdown')} subtitle={t('stats.severity_sub')} />
                        {totalSeverity > 0 && (() => {
                            const maxIdx = severityValues.indexOf(Math.max(...severityValues));
                            const maxLabel = severityLabels[maxIdx];
                            const maxPct = Math.round((severityValues[maxIdx] / totalSeverity) * 100);
                            const critHigh = (severity_breakdown['critical'] ?? 0) + (severity_breakdown['high'] ?? 0);
                            const critHighPct = Math.round((critHigh / totalSeverity) * 100);
                            return (
                                <InsightBar
                                    question="Are we dealing mostly with emergencies or minor incidents?"
                                    answers={[
                                        `Most common: <strong>${maxLabel}</strong> (${maxPct}% of reports)`,
                                        `Critical + High: <strong>${critHighPct}%</strong> of all reports`,
                                        critHighPct > 50 ? '<strong style="color:#ef4444">System under stress</strong>' : '<strong style="color:#10b981">Manageable load</strong>',
                                    ]}
                                />
                            );
                        })()}
                        <div className="flex items-center gap-4 px-5 pt-3">
                            {severityLabels.map((name, i) => (
                                <span key={name} className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
                                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: DONUT_COLORS[i] }} />{name}
                                </span>
                            ))}
                        </div>
                        <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
                            <ReactApexChart type="bar" series={severityBarSeries} options={severityBarOptions} height={280} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={BarChart3} title={t('stats.status_distribution')} subtitle={t('stats.status_sub')} />
                        {(() => {
                            const statusNames = ['Pending', 'Verified', 'Assigned', 'Resolved', 'Rejected'];
                            const totalStatus = statusValues.reduce((a, b) => a + b, 0);
                            const actionable = statusValues[0] + statusValues[1];
                            const actionablePct = totalStatus > 0 ? Math.round((actionable / totalStatus) * 100) : 0;
                            const resolvedPct = totalStatus > 0 ? Math.round((statusValues[3] / totalStatus) * 100) : 0;
                            const maxIdx = statusValues.indexOf(Math.max(...statusValues));
                            return totalStatus > 0 ? (
                                <InsightBar
                                    question="Are reports getting stuck at a particular stage?"
                                    answers={[
                                        `Most reports are: <strong>${statusNames[maxIdx]}</strong> (${statusValues[maxIdx]})`,
                                        `Needs attention: <strong>${actionable}</strong> (${actionablePct}%)`,
                                        `Resolved: <strong>${resolvedPct}%</strong>`,
                                    ]}
                                />
                            ) : null;
                        })()}
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={statusSeries} options={statusOptions} height={280} />
                        </div>
                    </Card>
                </div>

                {/* ── Charts Row 2: Monthly Trend (full width) ── */}
                <Card>
                    <CardHeader icon={TrendingUp} title={t('stats.monthly_trend')} subtitle={t('stats.monthly_sub')}>
                        <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-indigo-500" />Total</span>
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-rose-500" />Critical</span>
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-orange-500" />High</span>
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-yellow-500" />Moderate</span>
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-green-500" />Low</span>
                        </div>
                    </CardHeader>
                    {monthly_trend.length >= 2 && (() => {
                        const latest = monthly_trend[monthly_trend.length - 1];
                        const prev = monthly_trend[monthly_trend.length - 2];
                        const change = prev.total > 0 ? Math.round(((latest.total - prev.total) / prev.total) * 100) : 0;
                        const peakMonth = monthly_trend.reduce((a, b) => b.total > a.total ? b : a, monthly_trend[0]);
                        const totalAll = monthly_trend.reduce((s, m) => s + m.total, 0);
                        const avgMonthly = Math.round(totalAll / monthly_trend.length);
                        const isUp = change > 0;
                        const criticalTotal = monthly_trend.reduce((s, m) => s + m.critical, 0);
                        const critPct = totalAll > 0 ? Math.round((criticalTotal / totalAll) * 100) : 0;
                        const answers = [
                            `<strong>${isUp ? '↑' : change < 0 ? '↓' : '—'} ${Math.abs(change)}%</strong> ${isUp ? 'increasing' : change < 0 ? 'decreasing' : 'steady'} vs last month`,
                            `Peak: <strong>${peakMonth.month}</strong> (${peakMonth.total} reports)`,
                            `Avg: <strong>${avgMonthly}/mo</strong>`,
                        ];
                        if (critPct > 0) answers.push(`Critical: <strong style="color:#ef4444">${critPct}%</strong> of all`);
                        return <InsightBar question="Are flood incidents increasing or decreasing over time?" answers={answers} />;
                    })()}
                    <div className="px-2 pb-2 pt-1 sm:px-3">
                        {monthly_trend.length > 0
                            ? <ReactApexChart type="bar" series={monthlySeries} options={monthlyOptions} height={280} />
                            : <EmptyState text="No monthly data available" />}
                    </div>
                </Card>

                {/* ── Charts Row 3: Peak Hours + Month-over-Month ── */}
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={Clock} title={t('stats.peak_hours')} subtitle={t('stats.peak_hours_sub')} />
                        {(() => {
                            const hours = Array.from({ length: 24 }, (_, h) => peak_hours[h] ?? 0);
                            const maxHour = hours.indexOf(Math.max(...hours));
                            const totalReportsHours = hours.reduce((a, b) => a + b, 0);
                            const peakLabel = maxHour === 0 ? '12 AM' : maxHour < 12 ? `${maxHour} AM` : maxHour === 12 ? '12 PM' : `${maxHour - 12} PM`;
                            const peakPct = totalReportsHours > 0 ? Math.round((hours[maxHour] / totalReportsHours) * 100) : 0;
                            const morning = hours.slice(6, 12).reduce((a, b) => a + b, 0);
                            const afternoon = hours.slice(12, 18).reduce((a, b) => a + b, 0);
                            const evening = hours.slice(18, 24).reduce((a, b) => a + b, 0);
                            const night = hours.slice(0, 6).reduce((a, b) => a + b, 0);
                            const busiestPeriod = [
                                { name: 'Morning', v: morning }, { name: 'Afternoon', v: afternoon },
                                { name: 'Evening', v: evening }, { name: 'Night', v: night },
                            ].sort((a, b) => b.v - a.v)[0];

                            return totalReportsHours > 0 ? (
                                <InsightBar
                                    question="When do floods get reported most — and should we adjust shifts?"
                                    answers={[
                                        `Busiest hour: <strong>${peakLabel}</strong> (${peakPct}% of reports)`,
                                        `Most reports come in the <strong>${busiestPeriod.name}</strong>`,
                                    ]}
                                />
                            ) : null;
                        })()}
                        <div className="flex items-center gap-4 px-5 pt-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#f1f5f9]" />None</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#bfdbfe]" />Low</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#60a5fa]" />Medium</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#2563eb]" />High</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#1e3a8a]" />Very High</span>
                        </div>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="heatmap" series={heatmapSeries} options={heatmapOptions} height={220} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={BarChart3} title={t('stats.month_over_month')} subtitle={`${month_comparison.this_month.label} vs ${month_comparison.last_month.label}`}>
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-indigo-500" />{month_comparison.this_month.label}</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-violet-400" />{month_comparison.last_month.label}</span>
                            </div>
                        </CardHeader>
                        {(() => {
                            const thisTotal = month_comparison.this_month.critical + month_comparison.this_month.high + month_comparison.this_month.moderate + month_comparison.this_month.low;
                            const lastTotal = month_comparison.last_month.critical + month_comparison.last_month.high + month_comparison.last_month.moderate + month_comparison.last_month.low;
                            const change = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;
                            const critChange = month_comparison.this_month.critical - month_comparison.last_month.critical;
                            const isUp = change > 0;
                            const answers = [
                                `<strong>${isUp ? '↑' : change < 0 ? '↓' : '—'} ${Math.abs(change)}%</strong> ${isUp ? 'more reports this month' : change < 0 ? 'fewer reports this month' : 'same as last month'}`,
                            ];
                            if (critChange !== 0) answers.push(`Critical: <strong style="color:${critChange > 0 ? '#ef4444' : '#10b981'}">${critChange > 0 ? '+' : ''}${critChange}</strong> vs last month`);
                            return (thisTotal > 0 || lastTotal > 0) ? (
                                <InsightBar question="Is this month better or worse than last month?" answers={answers} />
                            ) : null;
                        })()}
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={monthCompSeries} options={monthCompOptions} height={250} />
                        </div>
                    </Card>
                </div>

                {/* ── Charts Row 4: Barangay Reports + Report Sources ── */}
                <div className="grid gap-5 lg:grid-cols-2">
                    {barangay_reports.length > 0 && (
                        <Card>
                            <CardHeader icon={MapPin} title={t('stats.reports_by_barangay')} subtitle={t('stats.barangay_sub')} />
                            {(() => {
                                const totalBrgy = sortedBarangays.reduce((a, b) => a + b.count, 0);
                                const top3Count = sortedBarangays.slice(0, 3).reduce((a, b) => a + b.count, 0);
                                const top3Pct = totalBrgy > 0 ? Math.round((top3Count / totalBrgy) * 100) : 0;
                                return (
                                    <InsightBar
                                        question="Is flooding concentrated or spread across barangays?"
                                        answers={[
                                            `Hotspot: <strong>${sortedBarangays[0]?.area}</strong> (${sortedBarangays[0]?.count} reports)`,
                                            `Top 3 account for <strong>${top3Pct}%</strong> of all reports`,
                                            top3Pct > 60 ? '<strong>Concentrated</strong> — focus resources here' : '<strong>Widespread</strong> — distributed response needed',
                                        ]}
                                    />
                                );
                            })()}
                            <div className="px-2 pb-2 pt-1 sm:px-3">
                                <ReactApexChart type="bar" series={barangayBarSeries} options={barangayBarOptions} height={Math.max(250, sortedBarangays.length * 40)} />
                            </div>
                        </Card>
                    )}

                    <Card>
                        <CardHeader icon={PieChart} title={t('stats.report_sources')} subtitle={t('stats.sources_sub')} />
                        {totalSources > 0 && (() => {
                            const maxSrcIdx = sourceValues.indexOf(Math.max(...sourceValues));
                            const maxSrcPct = Math.round((sourceValues[maxSrcIdx] / totalSources) * 100);
                            const dominates = maxSrcPct > 60;
                            return (
                                <InsightBar
                                    question="How are residents reaching us — and is our multi-channel strategy working?"
                                    answers={[
                                        `Top channel: <strong>${sourceFormattedLabels[maxSrcIdx]}</strong> (${maxSrcPct}%)`,
                                        dominates
                                            ? `<strong style="color:#d97706">Dependency risk</strong> — one channel dominates`
                                            : `<strong style="color:#10b981">Balanced</strong> — good channel diversity`,
                                        `${sourceLabels.length} active channel${sourceLabels.length !== 1 ? 's' : ''}`,
                                    ]}
                                />
                            );
                        })()}
                        <div className="flex items-center gap-4 px-5 pt-3">
                            {sourceFormattedLabels.map((name, i) => (
                                <span key={name} className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
                                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />{name}
                                </span>
                            ))}
                        </div>
                        <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
                            {sourceValues.length > 0
                                ? <ReactApexChart type="bar" series={sourceBarSeries} options={sourceBarOptions} height={280} />
                                : <EmptyState text="No data" />}
                        </div>
                    </Card>
                </div>

            </div>
            </div>
        </AppLayout>
    );
}
