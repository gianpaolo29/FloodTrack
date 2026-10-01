import { Head, router } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    ChevronLeft,
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
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { KpiTooltip } from '@/components/admin/kpi/KpiTooltip';
import type { InsightRow } from '@/lib/kpi-utils';
import { useLocale } from '@/hooks/use-locale';

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

interface MonthlyPoint { month: string; total: number; critical: number; high: number; }
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

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'Monthly' },
    { key: 'all',   label: 'All' },
    { key: 'custom', label: 'Custom' },
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

/* ─── Calendar Date Range Picker (portal) ─── */
function CalendarPicker({ fromDate, toDate, onApply, onClose, anchorRef }: {
    fromDate: string | null; toDate: string | null;
    onApply: (from: string, to: string) => void; onClose: () => void;
    anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
    const [viewDate, setViewDate] = useState(() => {
        if (fromDate) return new Date(fromDate + 'T00:00:00');
        return new Date();
    });
    const [rangeStart, setRangeStart] = useState<string | null>(fromDate ?? null);
    const [rangeEnd, setRangeEnd] = useState<string | null>(toDate ?? null);
    const [selecting, setSelecting] = useState<'start' | 'end'>('start');
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const calW = 320;
        let left = rect.right - calW;
        if (left < 8) left = 8;
        if (left + calW > window.innerWidth - 8) left = window.innerWidth - calW - 8;
        setPos({ top: rect.bottom + 8, left });
    }, [anchorRef]);

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const isInRange = (dateStr: string) => {
        if (!rangeStart || !rangeEnd) return false;
        return dateStr >= rangeStart && dateStr <= rangeEnd;
    };

    const handleDayClick = (d: number) => {
        const dateStr = fmt(d);
        if (selecting === 'start') {
            setRangeStart(dateStr);
            setRangeEnd(null);
            setSelecting('end');
        } else {
            if (rangeStart && dateStr < rangeStart) {
                setRangeStart(dateStr);
                setRangeEnd(rangeStart);
            } else {
                setRangeEnd(dateStr);
            }
            setSelecting('start');
        }
    };

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const formatDisplay = (d: string | null) => {
        if (!d) return '\u2014';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return ReactDOM.createPortal(
        <div
            className="calendar-portal fixed z-[9999] w-[320px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl shadow-black/15 dark:border-neutral-700 dark:bg-neutral-900 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, opacity: pos ? 1 : 0 }}
        >
            <div className="mb-3 flex items-center justify-between">
                <button onClick={prevMonth} className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                    <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-semibold text-neutral-800 dark:text-white">{monthName}</span>
                <button onClick={nextMonth} className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                    <ChevronRight className="size-4" />
                </button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <span key={d} className="py-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((d, i) => {
                    if (d === null) return <span key={`e-${i}`} />;
                    const dateStr = fmt(d);
                    const isStart = dateStr === rangeStart;
                    const isEnd = dateStr === rangeEnd;
                    const inRange = isInRange(dateStr);
                    const isToday = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;
                    return (
                        <button
                            key={d}
                            disabled={isFuture}
                            onClick={() => handleDayClick(d)}
                            className={`relative flex size-9 items-center justify-center text-xs font-medium transition-all mx-auto rounded-lg
                                ${isFuture ? 'cursor-not-allowed text-neutral-200 dark:text-neutral-700' : 'cursor-pointer'}
                                ${isStart || isEnd
                                    ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                                    : inRange
                                        ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                        : isToday
                                            ? 'ring-1 ring-neutral-300 text-neutral-600 dark:ring-neutral-600 dark:text-neutral-400'
                                            : !isFuture ? 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800' : ''
                                }
                            `}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">From</p>
                    <p className={`mt-0.5 text-xs font-bold ${rangeStart ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-600'}`}>
                        {formatDisplay(rangeStart)}
                    </p>
                </div>
                <ChevronRight className="size-3 text-neutral-300 dark:text-neutral-600" />
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">To</p>
                    <p className={`mt-0.5 text-xs font-bold ${rangeEnd ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-600'}`}>
                        {formatDisplay(rangeEnd)}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
                <button onClick={onClose} className="flex-1 rounded-xl border border-neutral-200 py-2 text-[11px] font-semibold text-neutral-500 transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800">
                    Cancel
                </button>
                <button
                    onClick={() => { if (rangeStart && rangeEnd) onApply(rangeStart, rangeEnd); }}
                    disabled={!rangeStart || !rangeEnd}
                    className={`flex-1 rounded-xl py-2 text-[11px] font-semibold transition-all ${
                        rangeStart && rangeEnd
                            ? 'bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                            : 'bg-neutral-100 text-neutral-300 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-600'
                    }`}
                >
                    Apply
                </button>
            </div>
        </div>,
        document.body
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

/* ─── Accent styles ─── */
const ACCENT_STYLES = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    neutral: 'bg-neutral-300 dark:bg-neutral-600',
} as const;

/* ─── Stat KPI Card ─── */
function StatKpiCard({ label, value, subtitle, icon: Icon, desc, insights, trend, trendLabel, urgency, actionLink, accent, alert, mounted = true, index = 0 }: {
    label: string; value: string; subtitle: string; icon: React.ElementType;
    grad?: string; shadow?: string; alert?: boolean; desc: string; insights: InsightRow[];
    trend?: number; trendLabel?: string;
    urgency?: 'good' | 'warning' | 'urgent';
    actionLink?: { label: string; href: string };
    accent?: 'green' | 'amber' | 'red' | 'neutral';
    mounted?: boolean;
    index?: number;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showTooltip) return;
        const handler = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
                setShowTooltip(false);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [showTooltip]);

    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-4 sm:p-5 transition-all duration-700 hover:shadow-lg hover:border-neutral-300/80 cursor-pointer dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${index * 80}ms` }}
            onClick={() => setShowTooltip(prev => !prev)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {accent && <div className={`absolute inset-x-0 top-0 h-[3px] ${ACCENT_STYLES[accent]}`} />}
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} urgency={urgency} actionLink={actionLink} />
            {alert && (
                <span className="absolute right-3 top-3 flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-neutral-900 opacity-20 dark:bg-white dark:opacity-30" />
                    <span className="relative inline-flex size-2 rounded-full bg-neutral-900 dark:bg-white" />
                </span>
            )}
            <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-400 sm:text-[11px] dark:text-neutral-500">{label}</p>
                    <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-neutral-900 sm:mt-2 sm:text-3xl dark:text-white">{value}</p>
                    {trend !== undefined && (
                        <p className="mt-1.5 flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                trend >= 0
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                            }`}>
                                {trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}%
                            </span>
                        </p>
                    )}
                    <p className="mt-1 truncate text-[9px] text-neutral-400 sm:text-[10px] dark:text-neutral-500">{trendLabel || subtitle}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 sm:size-11 transition-colors duration-300 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700">
                    <Icon className="size-5 text-neutral-500 dark:text-neutral-400 sm:size-[22px]" />
                </div>
            </div>
        </div>
    );
}

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
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
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

    // Close calendar on outside click
    useEffect(() => {
        if (!showCalendar) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (calendarRef.current?.contains(target)) return;
            const portal = document.querySelector('.calendar-portal');
            if (portal?.contains(target)) return;
            setShowCalendar(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCalendar]);

    const setPeriod = (p: string) => {
        setAiState('idle');
        setAiData(null);
        setTypewriterReady(false);
        aiAutoTriggered.current = false;
        if (p === 'custom') {
            setShowCalendar(true);
            return;
        }
        setShowCalendar(false);
        router.get('/admin/statistics', { period: p }, { preserveState: true, preserveScroll: true });
    };

    const applyCustomRange = (from: string, to: string) => {
        setAiState('idle');
        setAiData(null);
        setTypewriterReady(false);
        aiAutoTriggered.current = false;
        setShowCalendar(false);
        router.get('/admin/statistics', { period: 'custom', from, to }, { preserveState: true, preserveScroll: true });
    };

    const customRangeLabel = custom_from && custom_to
        ? `${new Date(custom_from + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${new Date(custom_to + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : null;

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
                        {/* Period pills */}
                        <div className="relative flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-100/80 p-1 dark:border-neutral-700 dark:bg-neutral-800/80" ref={calendarRef}>
                            {PERIODS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                        period === p.key || (p.key === 'custom' && showCalendar)
                                            ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                                            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                                    }`}
                                >
                                    {p.key === 'custom' ? (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="size-3" />
                                            {period === 'custom' && customRangeLabel ? customRangeLabel : p.label}
                                        </span>
                                    ) : p.label}
                                </button>
                            ))}
                            {period === 'custom' && customRangeLabel && !showCalendar && (
                                <button
                                    onClick={() => setPeriod('all')}
                                    className="ml-0.5 flex size-5 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                                    title="Clear custom range"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                            {showCalendar && (
                                <CalendarPicker
                                    fromDate={custom_from ?? null}
                                    toDate={custom_to ?? null}
                                    onApply={applyCustomRange}
                                    onClose={() => setShowCalendar(false)}
                                    anchorRef={calendarRef}
                                />
                            )}
                        </div>
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
                    <StatKpiCard label={t('stats.total_reports')} value={total_reports.toLocaleString()} subtitle="All time" icon={FileText} trend={trends.reports} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('total_reports')} urgency={getUrgency('total_reports', trends, critical_count, resolution_rate)} actionLink={ACTION_LINKS.total_reports} accent="neutral" mounted={mounted} index={0} insights={[
                        { label: 'Resolved', value: resolvedCount, color: '#10b981', max: total_reports || 1 },
                        { label: 'Active', value: activeCount, color: '#3b82f6', max: total_reports || 1 },
                        { label: 'Pending', value: pendingCount, color: '#f59e0b', max: total_reports || 1 },
                        { label: 'Rejected', value: rejectedCount, color: '#94a3b8' },
                    ]} />
                    <StatKpiCard label={t('stats.resolution_rate')} value={`${resolution_rate}%`} subtitle="Resolved / total" icon={CheckCircle2} trend={trends.resolved} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('resolution_rate')} urgency={getUrgency('resolution_rate', trends, critical_count, resolution_rate)} actionLink={ACTION_LINKS.resolution_rate} accent={resolution_rate >= 80 ? 'green' : resolution_rate >= 50 ? 'amber' : 'red'} mounted={mounted} index={1} insights={[
                        { label: 'Resolved', value: resolvedCount, color: '#10b981', max: total_reports || 1 },
                        { label: 'Total reports', value: total_reports, color: '#6366f1' },
                        { label: 'Still open', value: pendingCount + activeCount, color: '#f59e0b', max: total_reports || 1 },
                    ]} />
                    <StatKpiCard label={t('stats.critical_reports')} value={critical_count.toLocaleString()} subtitle="Highest severity" icon={AlertTriangle} trend={trends.critical} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('critical')} urgency={getUrgency('critical', trends, critical_count, resolution_rate)} actionLink={ACTION_LINKS.critical} accent={critical_count > 5 ? 'red' : critical_count > 0 ? 'amber' : 'green'} alert={critical_count > 0} mounted={mounted} index={2} insights={[
                        { label: 'Critical', value: critical_count, color: '#ef4444', max: total_reports || 1 },
                        { label: 'High', value: highCount, color: '#f97316', max: total_reports || 1 },
                        { label: '% of total', value: `${critPct}%`, color: '#ef4444' },
                    ]} />
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
                    <CardHeader icon={Clock} title={t('stats.response_time')} subtitle="Average time per stage (resolved reports)">
                        <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                            {STAGE_NAMES.map((name, i) => (
                                <span key={name} className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[i] }} />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </CardHeader>
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
                        <CardHeader icon={AlertTriangle} title={t('stats.severity_breakdown')} subtitle="Distribution by severity level" />
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
                        <CardHeader icon={BarChart3} title={t('stats.status_distribution')} subtitle="Reports by current status" />
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={statusSeries} options={statusOptions} height={280} />
                        </div>
                    </Card>
                </div>

                {/* ── Charts Row 2: Monthly Trend (full width) ── */}
                <Card>
                    <CardHeader icon={TrendingUp} title={t('stats.monthly_trend')} subtitle="Last 6 months">
                        <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-indigo-500" />Total</span>
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-rose-500" />Critical</span>
                            <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-orange-500" />High</span>
                        </div>
                    </CardHeader>
                    {/* Smart insight */}
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

                        return (
                            <div className="mx-5 mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-neutral-50 px-4 py-2.5 dark:bg-neutral-800/40">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isUp ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : change < 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'}`}>
                                        {isUp ? '↑' : change < 0 ? '↓' : '—'} {Math.abs(change)}%
                                    </span>
                                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                        {isUp ? 'Reports are increasing' : change < 0 ? 'Reports are decreasing' : 'Reports are steady'} vs last month
                                    </span>
                                </div>
                                <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                    Peak: <span className="font-semibold text-neutral-600 dark:text-neutral-300">{peakMonth.month}</span> ({peakMonth.total} reports)
                                </span>
                                <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                    Avg: <span className="font-semibold text-neutral-600 dark:text-neutral-300">{avgMonthly}/mo</span>
                                </span>
                                {critPct > 0 && (
                                    <>
                                        <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                            Critical: <span className="font-semibold text-red-500">{critPct}%</span> of all reports
                                        </span>
                                    </>
                                )}
                            </div>
                        );
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
                        <CardHeader icon={Clock} title={t('stats.peak_hours')} subtitle="Hour x Day-of-Week heatmap" />
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
                                <div className="mx-5 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-neutral-50 px-4 py-2.5 dark:bg-neutral-800/40">
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                        Busiest hour: <span className="font-semibold text-neutral-600 dark:text-neutral-300">{peakLabel}</span> ({peakPct}% of reports)
                                    </span>
                                    <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                        Most reports come in the <span className="font-semibold text-neutral-600 dark:text-neutral-300">{busiestPeriod.name}</span>
                                    </span>
                                </div>
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
                        {/* Smart comparison summary */}
                        {(() => {
                            const thisTotal = month_comparison.this_month.critical + month_comparison.this_month.high + month_comparison.this_month.moderate + month_comparison.this_month.low;
                            const lastTotal = month_comparison.last_month.critical + month_comparison.last_month.high + month_comparison.last_month.moderate + month_comparison.last_month.low;
                            const change = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;
                            const critChange = month_comparison.this_month.critical - month_comparison.last_month.critical;
                            const isUp = change > 0;

                            return (thisTotal > 0 || lastTotal > 0) ? (
                                <div className="mx-5 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-neutral-50 px-4 py-2.5 dark:bg-neutral-800/40">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isUp ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : change < 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'}`}>
                                            {isUp ? '↑' : change < 0 ? '↓' : '—'} {Math.abs(change)}%
                                        </span>
                                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                            {isUp ? 'More reports this month' : change < 0 ? 'Fewer reports this month' : 'Same as last month'}
                                        </span>
                                    </div>
                                    {critChange !== 0 && (
                                        <>
                                            <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                                Critical: <span className={`font-semibold ${critChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{critChange > 0 ? '+' : ''}{critChange}</span> vs last month
                                            </span>
                                        </>
                                    )}
                                </div>
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
                            <CardHeader icon={MapPin} title={t('stats.reports_by_barangay')} subtitle="Top areas by report volume" />
                            <div className="px-2 pb-2 pt-1 sm:px-3">
                                <ReactApexChart type="bar" series={barangayBarSeries} options={barangayBarOptions} height={Math.max(250, sortedBarangays.length * 40)} />
                            </div>
                        </Card>
                    )}

                    <Card>
                        <CardHeader icon={PieChart} title={t('stats.report_sources')} subtitle="Where reports come from" />
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
