import { Head, router } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Bell,
    Building2,
    Calendar,
    ChartScatter,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Church,
    Clock,
    FileText,
    GraduationCap,
    Landmark,
    MapPin,
    PieChart,
    RefreshCw,
    Shield,
    ShieldCheck,
    Sparkles,
    Timer,
    TrendingUp,
    Trophy,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactApexChart from 'react-apexcharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { EvacuationCenter, EvacuationCenterType } from '@/types/admin';
import { EVACUATION_CENTER_TYPE_LABELS } from '@/types/admin';

/* ─── Types ─── */
interface AiInsight {
    risk_level: 'critical' | 'high' | 'moderate' | 'low';
    summary: string;
    key_findings: string[];
    recommendations: string[];
    priority_action: string;
}

interface MonthlyPoint { month: string; total: number; critical: number; high: number; }
interface TopResponder { id: number; name: string; resolved_count: number; total_assigned: number; efficiency: number; avg_response: number; }
interface TeamPerformance { id: number; name: string; is_active: boolean; total_assigned: number; resolved_count: number; efficiency: number; avg_response: number; }
interface ResponseTimeTrendItem { date: string; avg_minutes: number }
interface EvacOccupancySeries { name: string; data: { date: string; occupancy: number }[] }
interface AlertFrequencyItem { date: string; critical: number; advisory: number; info: number }
interface SeverityVsResponseItem { severity: string; minutes: number }
interface BarangayReport { area: string; count: number }
interface MonthComparisonSide { label: string; critical: number; high: number; moderate: number; low: number }
interface Props {
    daily_reports: Record<string, number>;
    avg_response_time: number;
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    top_responders: TopResponder[];
    team_performance: TeamPerformance[];
    monthly_trend: MonthlyPoint[];
    peak_hours: Record<number, number>;
    total_reports: number;
    resolution_rate: number;
    critical_count: number;
    evacuation_stats: { total_centers: number; total_capacity: number; total_occupancy: number };
    evacuation_centers: Pick<EvacuationCenter, 'id' | 'name' | 'address' | 'type' | 'capacity' | 'current_occupancy' | 'is_active'>[];
    trends: {
        reports: number;
        resolved: number;
        avg_response: number;
        critical: number;
        label: string;
        period_label: string;
    };
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
    response_time_trend: ResponseTimeTrendItem[];
    evac_occupancy_timeline: EvacOccupancySeries[];
    alert_frequency: AlertFrequencyItem[];
    severity_vs_response: SeverityVsResponseItem[];
    barangay_reports: BarangayReport[];
    month_comparison: { this_month: MonthComparisonSide; last_month: MonthComparisonSide };
    source_breakdown: Record<string, number>;
    evac_by_type: Record<string, number>;
    user_roles: Record<string, number>;
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

/* ─── Card ─── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm shadow-black/[0.04] transition-shadow hover:shadow-md hover:shadow-black/[0.07] dark:border-neutral-700/50 dark:bg-neutral-900 ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, gradient, title, subtitle, children }: {
    icon: React.ElementType; gradient: string; title: string; subtitle: string; children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-900 shadow-sm dark:bg-white">
                <Icon className="size-4 text-white dark:text-neutral-900" />
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

const EVAC_TYPE_ICONS: Record<EvacuationCenterType, React.ElementType> = {
    gymnasium:        Building2,
    school:           GraduationCap,
    barangay_hall:    Landmark,
    church:           Church,
    community_center: Users,
};

const EVAC_TYPE_COLORS: Record<EvacuationCenterType, string> = {
    gymnasium:        'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-700/40',
    school:           'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-700/40',
    barangay_hall:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-700/40',
    church:           'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-700/40',
    community_center: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-700/40',
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
        if (!d) return '—';
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

/* ─── KPI Tooltip ─── */
interface InsightRow { label: string; value: string | number; color?: string }

function KpiTooltip({ desc, insights, visible, parentRef }: {
    desc: string; insights: InsightRow[];
    visible: boolean; parentRef: React.RefObject<HTMLDivElement | null>;
}) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!visible || !parentRef.current) { setPos(null); return; }
        const rect = parentRef.current.getBoundingClientRect();
        const tooltipW = 260;
        const top = rect.bottom + 8;
        let left = rect.left + rect.width / 2;
        left = Math.max(tooltipW / 2 + 8, Math.min(left, window.innerWidth - tooltipW / 2 - 8));
        setPos({ top, left });
    }, [visible, parentRef]);

    if (!visible) return null;

    return ReactDOM.createPortal(
        <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-none"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, transform: 'translate(-50%, 0)', opacity: pos ? 1 : 0 }}
        >
            <div className="flex justify-center mb-[-5px]">
                <div className="size-2.5 rotate-45 bg-white/95 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60" />
            </div>
            <div className="w-[260px] rounded-xl bg-white/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/15 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
                {insights.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-2">
                        {insights.map((row, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color ?? '#94a3b8' }} />
                                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{row.label}</span>
                                </div>
                                <span className="text-[11px] font-bold tabular-nums text-neutral-800 dark:text-neutral-200">{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}
                {insights.length > 0 && (
                    <div className="mb-2 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                )}
                <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{desc}</p>
            </div>
        </div>,
        document.body
    );
}

/* ─── Stat KPI Card ─── */
function StatKpiCard({ label, value, subtitle, icon: Icon, grad, shadow, alert, desc, insights, trend, trendLabel }: {
    label: string; value: string; subtitle: string; icon: React.ElementType;
    grad: string; shadow: string; alert?: boolean; desc: string; insights: InsightRow[];
    trend?: number; trendLabel?: string;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm sm:p-5 transition-all hover:shadow-lg hover:border-neutral-300/80 cursor-pointer dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            {alert && (
                <span className="absolute right-3 top-3 flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-neutral-900 opacity-20 dark:bg-white dark:opacity-30" />
                    <span className="relative inline-flex size-2 rounded-full bg-neutral-900 dark:bg-white" />
                </span>
            )}
            <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-neutral-900 sm:text-3xl dark:text-white">{value}</p>
                    {trend !== undefined && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                trend >= 0
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                            }`}>
                                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                            {trendLabel && (
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{trendLabel}</span>
                            )}
                        </div>
                    )}
                    {trend === undefined && <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 sm:size-11 transition-colors duration-300 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700">
                    <Icon className="size-5 text-neutral-500 dark:text-neutral-400 sm:size-[22px]" />
                </div>
            </div>
        </div>
    );
}

/* ─── Secondary Stat Card ─── */
function SecStatCard({ icon: Icon, label, value, subtitle, grad, shadow, desc, insights }: {
    icon: React.ElementType; label: string; value: string; subtitle: string;
    grad: string; shadow: string; desc: string; insights: InsightRow[];
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className="relative flex items-start justify-between gap-4 rounded-2xl border border-white/60 bg-white p-4 shadow-sm shadow-black/[0.04] transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer sm:p-5 dark:border-neutral-700/50 dark:bg-neutral-900"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">{value}</p>
                <p className="mt-0.5 text-[10px] text-neutral-400">{subtitle}</p>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 transition-colors">
                <Icon className="size-5 text-neutral-500 dark:text-neutral-400" />
            </div>
        </div>
    );
}

export default function StatisticsPage({
    daily_reports,
    avg_response_time,
    severity_breakdown,
    status_breakdown,
    top_responders,
    team_performance,
    monthly_trend,
    peak_hours,
    total_reports,
    resolution_rate,
    critical_count,
    evacuation_stats,
    evacuation_centers,
    trends,
    period,
    custom_from,
    custom_to,
    response_time_trend,
    evac_occupancy_timeline,
    alert_frequency,
    severity_vs_response,
    barangay_reports,
    month_comparison,
    source_breakdown,
    evac_by_type,
    user_roles,
}: Props) {
    const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [aiData, setAiData] = useState<AiInsight | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

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
        setShowCalendar(false);
        router.get('/admin/statistics', { period: 'custom', from, to }, { preserveState: true, preserveScroll: true });
    };

    const customRangeLabel = custom_from && custom_to
        ? `${new Date(custom_from + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(custom_to + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : null;

    async function generateInsights() {
        setAiState('loading');
        try {
            const res = await fetch(`/admin/statistics/ai-insights?period=${encodeURIComponent(period)}`);
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
    const statusValues  = ['pending', 'verified', 'acknowledged', 'assigned', 'resolved', 'rejected'].map(s => status_breakdown[s] ?? 0);

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

    // Derived stats for tooltips
    const resolvedCount  = status_breakdown['resolved'] ?? 0;
    const pendingCount   = status_breakdown['pending'] ?? 0;
    const activeCount    = (status_breakdown['verified'] ?? 0) + (status_breakdown['assigned'] ?? 0);
    const rejectedCount  = status_breakdown['rejected'] ?? 0;
    const highCount      = severity_breakdown['high'] ?? 0;
    const critPct        = total_reports > 0 ? Math.round((critical_count / total_reports) * 100) : 0;
    const availableCapacity = evacuation_stats.total_capacity - evacuation_stats.total_occupancy;

    /* ── Smart descriptions ── */
    function statDesc(key: string): string {
        switch (key) {
            case 'total_reports': {
                const parts: string[] = [];
                if (total_reports === 0) return 'No reports submitted yet.';
                parts.push(`${resolvedCount} resolved, ${activeCount} active, ${pendingCount} pending.`);
                if (pendingCount > 0 && total_reports > 0 && (pendingCount / total_reports) > 0.3)
                    parts.push('Pending queue is high — review may be falling behind.');
                if (resolution_rate >= 80) parts.push('Strong resolution rate.');
                return parts.join(' ');
            }
            case 'resolution_rate': {
                if (total_reports === 0) return 'No reports to calculate rate from.';
                if (resolution_rate >= 90) return `Excellent — ${resolvedCount} of ${total_reports} reports resolved. Team is highly effective.`;
                if (resolution_rate >= 70) return `Good progress — ${resolvedCount} resolved, but ${pendingCount + activeCount} still open.`;
                if (resolution_rate >= 40) return `Needs improvement — ${pendingCount} pending and ${activeCount} active reports need attention.`;
                return `Only ${resolution_rate}% resolved — most reports remain open. Consider allocating more resources.`;
            }
            case 'avg_response': {
                if (avg_response_time <= 0) return 'No resolved reports to measure response time.';
                if (avg_response_time < 30) return 'Excellent response time — under 30 minutes. Team is reacting quickly.';
                if (avg_response_time < 60) return 'Good response time — under an hour. Reports are being handled promptly.';
                if (avg_response_time < 180) return `Response time of ${formatResponseTime(avg_response_time)} — consider prioritizing critical reports to bring this down.`;
                return `Response time of ${formatResponseTime(avg_response_time)} is slow — backlog or staffing may need review.`;
            }
            case 'critical': {
                if (critical_count === 0) return 'No critical reports — all severity levels are manageable.';
                const parts: string[] = [];
                parts.push(`${critical_count} critical report${critical_count > 1 ? 's' : ''} — ${critPct}% of all reports.`);
                if (highCount > 0) parts.push(`Combined with ${highCount} high-severity, these need priority response.`);
                if (critical_count > 5) parts.push('High critical count — consider emergency protocols.');
                return parts.join(' ');
            }
            case 'evac_centers':
                if (evacuation_stats.total_centers === 0) return 'No evacuation centers registered yet.';
                return `${evacuation_stats.total_centers} centers available with total capacity for ${evacuation_stats.total_capacity.toLocaleString()} people.`;
            case 'evac_capacity':
                if (evacuation_stats.total_capacity === 0) return 'No capacity registered.';
                return `${availableCapacity.toLocaleString()} spots still available. ${occupancyPct}% of total capacity is currently occupied.`;
            case 'evac_occupancy': {
                if (evacuation_stats.total_occupancy === 0) return 'No evacuees currently sheltered.';
                if (occupancyPct >= 90) return `${evacuation_stats.total_occupancy.toLocaleString()} evacuees — capacity is nearly full at ${occupancyPct}%. Prepare overflow facilities.`;
                if (occupancyPct >= 70) return `${evacuation_stats.total_occupancy.toLocaleString()} evacuees — ${occupancyPct}% capacity used. Monitor closely.`;
                return `${evacuation_stats.total_occupancy.toLocaleString()} people sheltered. Capacity is well within limits at ${occupancyPct}%.`;
            }
            case 'evac_rate': {
                if (evacuation_stats.total_capacity === 0) return 'No capacity data available.';
                if (occupancyPct >= 90) return `Critical — ${occupancyPct}% full. Only ${availableCapacity.toLocaleString()} spots remain. Activate additional centers.`;
                if (occupancyPct >= 70) return `Getting crowded at ${occupancyPct}%. Keep overflow centers on standby.`;
                if (occupancyPct >= 30) return `Moderate usage at ${occupancyPct}%. Sufficient capacity available.`;
                return `Low occupancy at ${occupancyPct}%. Plenty of room for additional evacuees if needed.`;
            }
            default: return '';
        }
    }

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
            tickAmount: 8,
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

    /* ── TREND: Response Time Trend ── */
    const responseTimeOptions: ApexOptions = {
        chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: ['#f97316'],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 0, right: 4 } },
        xaxis: { categories: response_time_trend.map(d => d.date), tickAmount: 8, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: 0 } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, formatter: v => `${Math.round(v)}m` } },
        legend: { show: false },
        markers: { size: 0, hover: { size: 5 } },
        tooltip: {
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.categoryLabels[dataPointIndex] ?? w.globals.labels[dataPointIndex];
                const mins = series[0][dataPointIndex];
                const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m` : `${Math.round(mins)}m`;
                return tooltipHtml(label, [{ color: '#f97316', name: 'Avg Response', value: display }]);
            },
        },
    };
    const responseTimeSeries = [{ name: 'Avg Response (min)', data: response_time_trend.map(d => d.avg_minutes) }];

    /* ── TREND: Evacuation Occupancy Over Time ── */
    const EVAC_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
    const allEvacDates = [...new Set(evac_occupancy_timeline.flatMap(s => s.data.map(d => d.date)))].sort();
    const evacOccupancyOptions: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', stacked: true, animations: { enabled: true, speed: 600 } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: EVAC_COLORS.slice(0, evac_occupancy_timeline.length),
        fill: { type: 'gradient', gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: { categories: allEvacDates, tickAmount: 8, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: 0 } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        legend: { position: 'top', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        tooltip: { shared: true, intersect: false },
    };
    const evacOccupancySeries = evac_occupancy_timeline.map(s => {
        const dateMap = Object.fromEntries(s.data.map(d => [d.date, d.occupancy]));
        return { name: s.name, data: allEvacDates.map(d => dateMap[d] ?? 0) };
    });

    /* ── TREND: Alert Frequency Timeline ── */
    const alertFreqOptions: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', stacked: true, animations: { enabled: true, speed: 600 } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        dataLabels: { enabled: false },
        colors: ['#ef4444', '#f97316', '#3b82f6'],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: { categories: alert_frequency.map(d => d.date), tickAmount: 8, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: 0 } },
        yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        legend: { position: 'top', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        tooltip: {
            shared: true, intersect: false,
            custom: ({ series, dataPointIndex, w }) => {
                const label = w.globals.categoryLabels[dataPointIndex] ?? w.globals.labels[dataPointIndex];
                return tooltipHtml(label, [
                    { color: '#ef4444', name: 'Critical', value: series[0][dataPointIndex] },
                    { color: '#f97316', name: 'Advisory', value: series[1][dataPointIndex] },
                    { color: '#3b82f6', name: 'Info', value: series[2][dataPointIndex] },
                ]);
            },
        },
    };
    const alertFreqSeries = [
        { name: 'Critical', data: alert_frequency.map(d => d.critical) },
        { name: 'Advisory', data: alert_frequency.map(d => d.advisory) },
        { name: 'Info', data: alert_frequency.map(d => d.info) },
    ];

    /* ── RELATIONSHIP: Severity vs Response Time (scatter) ── */
    const SEVERITY_MAP: Record<string, { x: number; color: string }> = {
        low: { x: 1, color: '#10b981' }, moderate: { x: 2, color: '#f59e0b' },
        high: { x: 3, color: '#f97316' }, critical: { x: 4, color: '#ef4444' },
    };
    const scatterGroups = ['critical', 'high', 'moderate', 'low'];
    const severityScatterOptions: ApexOptions = {
        chart: { type: 'scatter', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 }, zoom: { enabled: false } },
        colors: ['#ef4444', '#f97316', '#f59e0b', '#10b981'],
        xaxis: { type: 'numeric', min: 0.5, max: 4.5, tickAmount: 4, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, formatter: (v: number) => ['', 'Low', 'Moderate', 'High', 'Critical'][Math.round(v)] || '' }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { title: { text: 'Response Time (min)', style: { fontSize: '10px', color: '#94a3b8', fontWeight: 500 } }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, formatter: (v: number) => v >= 60 ? `${Math.floor(v / 60)}h` : `${Math.round(v)}m` }, axisBorder: { show: false }, axisTicks: { show: false } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        legend: { position: 'top', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        markers: { size: 6, strokeWidth: 0, hover: { size: 8 } },
        tooltip: {
            custom: ({ seriesIndex, dataPointIndex, w }) => {
                const point = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
                const mins = point[1];
                const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m` : `${Math.round(mins)}m`;
                return tooltipHtml(w.globals.seriesNames[seriesIndex], [{ color: w.globals.colors[seriesIndex], name: 'Response', value: display }]);
            },
        },
    };
    const severityScatterSeries = scatterGroups.map(sev => ({
        name: sev.charAt(0).toUpperCase() + sev.slice(1),
        data: severity_vs_response.filter(d => d.severity === sev).map(d => [SEVERITY_MAP[sev]?.x ?? 0, d.minutes]),
    }));

    /* ── COMPARISON: Barangay Report Treemap ── */
    const treemapOptions: ApexOptions = {
        chart: { type: 'treemap', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6d28d9', '#4f46e5', '#4338ca', '#7c3aed', '#5b21b6'],
        dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 700 }, formatter: (_: any, opt: any) => { const d = opt.w.globals.initialSeries[0].data[opt.dataPointIndex]; return d ? `${d.x}` : ''; } },
        plotOptions: { treemap: { distributed: true, enableShades: false } },
        legend: { show: false },
        tooltip: {
            custom: ({ seriesIndex, dataPointIndex, w }) => {
                const d = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
                return tooltipHtml(d.x, [{ color: '#6366f1', name: 'Reports', value: d.y }]);
            },
        },
    };
    const treemapSeries = [{ data: barangay_reports.map(b => ({ x: b.area, y: b.count })) }];

    /* ── COMPARISON: This Month vs Last Month ── */
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

    /* ── COMPOSITION: Reports by Source (donut) ── */
    const sourceLabels = Object.keys(source_breakdown);
    const sourceValues = Object.values(source_breakdown);
    const SOURCE_COLORS = ['#6366f1', '#10b981', '#f97316', '#ef4444', '#8b5cf6'];
    const sourceDonutOptions: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        labels: sourceLabels.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')),
        colors: SOURCE_COLORS.slice(0, sourceLabels.length),
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        stroke: { width: 2, colors: ['#ffffff'] },
        plotOptions: { pie: { donut: { size: '68%', labels: { show: true, name: { show: true, fontSize: '10px', fontWeight: '500', color: '#94a3b8', offsetY: 8 }, value: { show: true, fontSize: '24px', fontWeight: '800', color: '#111827', offsetY: -10, formatter: v => v }, total: { show: true, showAlways: true, label: 'total', fontSize: '10px', fontWeight: '500', color: '#94a3b8', formatter: () => String(sourceValues.reduce((a, b) => a + b, 0)) } } } } },
        tooltip: {
            custom: ({ series, seriesIndex, w }) => {
                const label = w.globals.labels[seriesIndex];
                const color = SOURCE_COLORS[seriesIndex % SOURCE_COLORS.length];
                const total = series.reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round((series[seriesIndex] / total) * 100) : 0;
                return tooltipHtml(label, [{ color, name: 'Count', value: series[seriesIndex] }, { color, name: 'Share', value: `${pct}%` }]);
            },
        },
    };

    /* ── COMPOSITION: Evacuation Centers by Type (pie) ── */
    const evacTypeLabels = Object.keys(evac_by_type).map(t => t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
    const evacTypeValues = Object.values(evac_by_type);
    const EVAC_TYPE_PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const evacTypeOptions: ApexOptions = {
        chart: { type: 'pie', fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        labels: evacTypeLabels,
        colors: EVAC_TYPE_PIE_COLORS.slice(0, evacTypeLabels.length),
        dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 600 }, dropShadow: { enabled: false } },
        legend: { position: 'bottom', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        stroke: { width: 2, colors: ['#ffffff'] },
        tooltip: {
            custom: ({ series, seriesIndex, w }) => {
                const label = w.globals.labels[seriesIndex];
                const color = EVAC_TYPE_PIE_COLORS[seriesIndex % EVAC_TYPE_PIE_COLORS.length];
                const total = series.reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round((series[seriesIndex] / total) * 100) : 0;
                return tooltipHtml(label, [{ color, name: 'Count', value: series[seriesIndex] }, { color, name: 'Share', value: `${pct}%` }]);
            },
        },
    };

    /* ── COMPOSITION: User Role Distribution (donut) ── */
    const roleLabels = Object.keys(user_roles).map(r => r.charAt(0).toUpperCase() + r.slice(1));
    const roleValues = Object.values(user_roles);
    const ROLE_COLORS = ['#ef4444', '#6366f1', '#10b981', '#f59e0b'];
    const roleDonutOptions: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
        labels: roleLabels,
        colors: ROLE_COLORS.slice(0, roleLabels.length),
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontSize: '11px', fontWeight: 500, labels: { colors: '#6b7280' }, markers: { size: 4, offsetX: -2 } },
        stroke: { width: 2, colors: ['#ffffff'] },
        plotOptions: { pie: { donut: { size: '68%', labels: { show: true, name: { show: true, fontSize: '10px', fontWeight: '500', color: '#94a3b8', offsetY: 8 }, value: { show: true, fontSize: '24px', fontWeight: '800', color: '#111827', offsetY: -10, formatter: v => v }, total: { show: true, showAlways: true, label: 'users', fontSize: '10px', fontWeight: '500', color: '#94a3b8', formatter: () => String(roleValues.reduce((a, b) => a + b, 0)) } } } } },
        tooltip: {
            custom: ({ series, seriesIndex, w }) => {
                const label = w.globals.labels[seriesIndex];
                const color = ROLE_COLORS[seriesIndex % ROLE_COLORS.length];
                const total = series.reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round((series[seriesIndex] / total) * 100) : 0;
                return tooltipHtml(label, [{ color, name: 'Count', value: series[seriesIndex] }, { color, name: 'Share', value: `${pct}%` }]);
            },
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics" />

            <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
            <div className="flex flex-col gap-5 p-3 sm:gap-6 sm:p-6 lg:gap-7 lg:p-8">

                {/* Page Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-neutral-900 shadow-sm dark:bg-white">
                            <BarChart3 className="size-5 sm:size-6 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                                Statistics
                            </h1>
                            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-sm dark:text-neutral-400">
                                Flood incident analytics &amp; AI insights
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

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <StatKpiCard label="Total Reports" value={total_reports.toLocaleString()} subtitle="All time" icon={FileText} grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" trend={trends.reports} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('total_reports')} insights={[
                        { label: 'Resolved', value: resolvedCount, color: '#10b981' },
                        { label: 'Active', value: activeCount, color: '#3b82f6' },
                        { label: 'Pending', value: pendingCount, color: '#f59e0b' },
                        { label: 'Rejected', value: rejectedCount, color: '#94a3b8' },
                    ]} />
                    <StatKpiCard label="Resolution Rate" value={`${resolution_rate}%`} subtitle="Resolved / total" icon={CheckCircle2} grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" trend={trends.resolved} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('resolution_rate')} insights={[
                        { label: 'Resolved', value: resolvedCount, color: '#10b981' },
                        { label: 'Total reports', value: total_reports, color: '#6366f1' },
                        { label: 'Still open', value: pendingCount + activeCount, color: '#f59e0b' },
                    ]} />
                    <StatKpiCard label="Avg Response Time" value={formatResponseTime(avg_response_time)} subtitle="Time to resolve" icon={Clock} grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" trend={trends.avg_response} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('avg_response')} insights={[
                        { label: 'Pending queue', value: pendingCount, color: '#f59e0b' },
                        { label: 'Active reports', value: activeCount, color: '#3b82f6' },
                        { label: 'Resolution rate', value: `${resolution_rate}%`, color: '#10b981' },
                    ]} />
                    <StatKpiCard label="Critical Reports" value={critical_count.toLocaleString()} subtitle="Highest severity" icon={AlertTriangle} grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" alert={critical_count > 0} trend={trends.critical} trendLabel={`${trends.label}, ${trends.period_label}`} desc={statDesc('critical')} insights={[
                        { label: 'Critical', value: critical_count, color: '#ef4444' },
                        { label: 'High', value: highCount, color: '#f97316' },
                        { label: '% of total', value: `${critPct}%`, color: '#ef4444' },
                    ]} />
                </div>

                {/* Evacuation Centers Quick Stats — 4 cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <SecStatCard icon={Building2} label="Total Centers" value={evacuation_stats.total_centers.toLocaleString()} subtitle="Active centers" grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" desc={statDesc('evac_centers')} insights={[
                        { label: 'Total capacity', value: evacuation_stats.total_capacity.toLocaleString(), color: '#8b5cf6' },
                        { label: 'Currently sheltered', value: evacuation_stats.total_occupancy.toLocaleString(), color: '#10b981' },
                        { label: 'Occupancy', value: `${occupancyPct}%`, color: '#06b6d4' },
                    ]} />
                    <SecStatCard icon={Users} label="Total Capacity" value={evacuation_stats.total_capacity.toLocaleString()} subtitle="Maximum capacity" grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" desc={statDesc('evac_capacity')} insights={[
                        { label: 'Currently used', value: evacuation_stats.total_occupancy.toLocaleString(), color: '#10b981' },
                        { label: 'Available spots', value: availableCapacity.toLocaleString(), color: '#3b82f6' },
                        { label: 'Occupancy rate', value: `${occupancyPct}%`, color: '#06b6d4' },
                    ]} />
                    <SecStatCard icon={TrendingUp} label="Current Evacuees" value={evacuation_stats.total_occupancy.toLocaleString()} subtitle="People sheltered" grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" desc={statDesc('evac_occupancy')} insights={[
                        { label: 'Total capacity', value: evacuation_stats.total_capacity.toLocaleString(), color: '#8b5cf6' },
                        { label: 'Available spots', value: availableCapacity.toLocaleString(), color: '#3b82f6' },
                        { label: 'Centers', value: evacuation_stats.total_centers, color: '#0ea5e9' },
                    ]} />
                    <SecStatCard icon={AlertCircle} label="Occupancy Rate" value={`${occupancyPct}%`} subtitle="Of total capacity" grad="from-neutral-800 to-neutral-900" shadow="shadow-sm" desc={statDesc('evac_rate')} insights={[
                        { label: 'Sheltered', value: evacuation_stats.total_occupancy.toLocaleString(), color: '#10b981' },
                        { label: 'Capacity', value: evacuation_stats.total_capacity.toLocaleString(), color: '#8b5cf6' },
                        { label: 'Available', value: availableCapacity.toLocaleString(), color: '#3b82f6' },
                    ]} />
                </div>

                {/* Charts Row 1: Area + Donut */}
                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                    <Card>
                        <CardHeader icon={TrendingUp} gradient="from-indigo-500 to-violet-600" title="Daily Reports (Last 30 Days)" subtitle="Flood report submissions">
                            <div className="ml-auto hidden items-center gap-4 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                    <span className="size-2 rounded-full bg-indigo-500" />
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
                <div className="grid gap-5 lg:grid-cols-2">
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

                {/* Peak Report Hours */}
                <Card>
                    <CardHeader icon={Clock} gradient="from-amber-400 to-orange-500" title="Peak Report Hours" subtitle="By hour of day (all time)" />
                    <div className="px-2 pb-2 pt-1 sm:px-3">
                        <ReactApexChart type="bar" series={peakHoursSeries} options={peakHoursOptions} height={220} />
                    </div>
                </Card>

                {/* Bottom: Top Responders + AI Insights */}
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Top Responders */}
                    <Card>
                        <CardHeader icon={Trophy} gradient="from-amber-400 to-orange-500" title="Top Responders" subtitle="By resolved reports" />
                        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                            {top_responders.length > 0 ? top_responders.map((r, i) => (
                                <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ${
                                        i === 0 ? 'bg-neutral-900 text-white' :
                                        i === 1 ? 'bg-neutral-600 text-white' :
                                        i === 2 ? 'bg-neutral-400 text-white' :
                                                  'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                                    }`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-500 text-xs font-bold text-white shadow-sm">
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
                                    <div className="shrink-0 rounded-lg bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
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
                        <CardHeader icon={Sparkles} gradient="from-violet-500 to-fuchsia-600" title="AI Situation Analysis" subtitle={`Analyzing: ${PERIODS.find(p => p.key === period)?.label ?? 'All'} · GPT-4o mini`} />
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
                                        Generate Insights
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
                                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
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
                                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-200"
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
                </div>

                {/* Evacuation Centers List */}
                <Card>
                    <CardHeader icon={ShieldCheck} gradient="from-sky-500 to-blue-600" title="Evacuation Centers" subtitle="All centers with status &amp; occupancy" />
                    {evacuation_centers.length === 0 ? (
                        <div className="px-5 py-10"><EmptyState text="No evacuation centers registered" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                        {['Center', 'Type', 'Status', 'Occupancy', 'Capacity', ''].map((h) => (
                                            <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                    {evacuation_centers.map((ec) => {
                                        const occ = ec.current_occupancy ?? 0;
                                        const cap = ec.capacity ?? 0;
                                        const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
                                        const TypeIcon = EVAC_TYPE_ICONS[ec.type];
                                        return (
                                            <tr key={ec.id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{ec.name}</span>
                                                        {ec.address && (
                                                            <span className="truncate text-[11px] text-neutral-400 dark:text-neutral-500 max-w-[220px]">{ec.address}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${EVAC_TYPE_COLORS[ec.type]}`}>
                                                        <TypeIcon className="size-3" />
                                                        {EVACUATION_CENTER_TYPE_LABELS[ec.type]}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {ec.is_active ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800/40">
                                                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                                                            <span className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col gap-1 min-w-[110px]">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs font-bold tabular-nums text-neutral-800 dark:text-neutral-200">{occ.toLocaleString()}</span>
                                                            <span className="text-[10px] text-neutral-400">/ {cap.toLocaleString()}</span>
                                                            <span className={`ml-auto text-[10px] font-semibold ${
                                                                pct >= 90 ? 'text-red-600 dark:text-red-400'
                                                                : pct >= 70 ? 'text-amber-600 dark:text-amber-400'
                                                                : 'text-emerald-600 dark:text-emerald-400'
                                                            }`}>{pct}%</span>
                                                        </div>
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    pct >= 90 ? 'bg-red-500'
                                                                    : pct >= 70 ? 'bg-amber-500'
                                                                    : 'bg-emerald-500'
                                                                }`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-300">
                                                    {cap.toLocaleString()}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {!ec.is_active && occ > 0 && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800/40">
                                                            <AlertTriangle className="size-3" />
                                                            Inactive with evacuees
                                                        </span>
                                                    )}
                                                    {pct >= 90 && ec.is_active && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800/40">
                                                            <AlertCircle className="size-3" />
                                                            Near capacity
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Team Performance */}
                <Card>
                    <CardHeader icon={Shield} gradient="from-teal-500 to-cyan-600" title="Team Performance" subtitle="All-time by resolved reports" />
                    {team_performance.length === 0 ? (
                        <div className="px-5 py-10"><EmptyState text="No teams yet" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                        {['Team', 'Status', 'Assigned', 'Resolved', 'Rate', 'Avg Time'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                    {team_performance.map((t) => (
                                        <tr key={t.id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t.name}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {t.is_active ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800/40">
                                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-300">{t.total_assigned}</td>
                                            <td className="px-5 py-3.5 text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{t.resolved_count}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums ${
                                                    t.efficiency >= 70
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                        : t.efficiency >= 40
                                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                                            : t.total_assigned === 0
                                                                ? 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                                                                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                                }`}>
                                                    {t.total_assigned === 0 ? '—' : `${t.efficiency}%`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
                                                {t.total_assigned === 0 ? '—' : formatResponseTime(t.avg_response)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* ═══ ADVANCED TRENDS ═══ */}
                <SectionDivider title="Trends" subtitle="How metrics change over time" />

                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={Timer} gradient="from-orange-400 to-amber-500" title="Response Time Trend" subtitle="Avg resolution time — last 30 days" />
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {response_time_trend.length > 0
                                ? <ReactApexChart type="line" series={responseTimeSeries} options={responseTimeOptions} height={250} />
                                : <EmptyState text="No resolved reports data" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={Bell} gradient="from-red-500 to-rose-600" title="Alert Frequency" subtitle="Alerts issued — last 30 days">
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-red-500" />Critical</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-orange-400" />Advisory</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-blue-500" />Info</span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {alert_frequency.length > 0
                                ? <ReactApexChart type="bar" series={alertFreqSeries} options={alertFreqOptions} height={250} />
                                : <EmptyState text="No alert data" />}
                        </div>
                    </Card>
                </div>

                <Card>
                    <CardHeader icon={Building2} gradient="from-teal-500 to-cyan-600" title="Evacuation Occupancy" subtitle="Center occupancy — last 30 days" />
                    <div className="px-2 pb-2 pt-1 sm:px-3">
                        {evacOccupancySeries.length > 0
                            ? <ReactApexChart type="area" series={evacOccupancySeries} options={evacOccupancyOptions} height={250} />
                            : <EmptyState text="No occupancy data" />}
                    </div>
                </Card>

                {/* ═══ ANALYSIS ═══ */}
                <SectionDivider title="Analysis" subtitle="Patterns and comparisons" />

                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader icon={ChartScatter} gradient="from-rose-500 to-red-600" title="Severity vs Response Time" subtitle="Are critical reports resolved faster?">
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                {[['Critical', '#ef4444'], ['High', '#f97316'], ['Moderate', '#f59e0b'], ['Low', '#10b981']].map(([n, c]) => (
                                    <span key={n} className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full" style={{ background: c }} />{n}</span>
                                ))}
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            {severity_vs_response.length > 0
                                ? <ReactApexChart type="scatter" series={severityScatterSeries} options={severityScatterOptions} height={280} />
                                : <EmptyState text="No resolved reports data" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={BarChart3} gradient="from-indigo-500 to-blue-600" title="Month-over-Month" subtitle={`${month_comparison.this_month.label} vs ${month_comparison.last_month.label}`}>
                            <div className="ml-auto hidden items-center gap-3 text-[10px] sm:flex">
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-indigo-500" />{month_comparison.this_month.label}</span>
                                <span className="flex items-center gap-1.5 text-neutral-400"><span className="size-2 rounded-full bg-violet-400" />{month_comparison.last_month.label}</span>
                            </div>
                        </CardHeader>
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="bar" series={monthCompSeries} options={monthCompOptions} height={280} />
                        </div>
                    </Card>
                </div>

                {barangay_reports.length > 0 && (
                    <Card>
                        <CardHeader icon={MapPin} gradient="from-violet-500 to-purple-600" title="Reports by Barangay" subtitle="Top areas by report volume" />
                        <div className="px-2 pb-2 pt-1 sm:px-3">
                            <ReactApexChart type="treemap" series={treemapSeries} options={treemapOptions} height={320} />
                        </div>
                    </Card>
                )}

                {/* ═══ COMPOSITION ═══ */}
                <SectionDivider title="Composition" subtitle="Parts of the whole" />

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader icon={PieChart} gradient="from-indigo-500 to-violet-600" title="Report Sources" subtitle="Where reports come from" />
                        <div className="flex items-center justify-center px-4 pb-6 pt-4">
                            {sourceValues.length > 0
                                ? <ReactApexChart type="donut" series={sourceValues} options={sourceDonutOptions} height={220} width={220} />
                                : <EmptyState text="No data" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={Building2} gradient="from-amber-400 to-orange-500" title="Center Types" subtitle="Evacuation facilities" />
                        <div className="flex items-center justify-center px-4 pb-6 pt-4">
                            {evacTypeValues.length > 0
                                ? <ReactApexChart type="pie" series={evacTypeValues} options={evacTypeOptions} height={220} width={220} />
                                : <EmptyState text="No data" />}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={Users} gradient="from-sky-500 to-blue-600" title="User Roles" subtitle="Role distribution" />
                        <div className="flex items-center justify-center px-4 pb-6 pt-4">
                            {roleValues.length > 0
                                ? <ReactApexChart type="donut" series={roleValues} options={roleDonutOptions} height={220} width={220} />
                                : <EmptyState text="No users" />}
                        </div>
                    </Card>
                </div>

            </div>
            </div>
        </AppLayout>
    );
}

function SectionDivider({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="flex items-center gap-4 pt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
            <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{title}</p>
                <p className="text-[10px] text-neutral-300 dark:text-neutral-600">{subtitle}</p>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
        </div>
    );
}
