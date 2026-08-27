import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { ApexOptions } from 'apexcharts';
import {
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    CloudRain,
    Droplets,
    ExternalLink,
    FileText,
    Globe,
    LayoutDashboard,
    MapPin,
    ShieldCheck,
    Shield,
    TrendingUp,
    Trophy,
    Waves,
    X,
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
interface TeamStats { active: number; deployed: number; inactive: number }

interface Props {
    stats: Stats;
    trends: { reports: number; resolved: number; active: number; pending: number; alerts: number; label: string; period_label: string };
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
    team_stats: TeamStats;
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
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
    { key: 'custom', label: 'Custom' },
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

/* ─── Count-up hook ─── */
function useCountUp(target: number, active: boolean, delay = 0) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!active || !target) return;
        const timeout = setTimeout(() => {
            const duration = 900;
            let startTime: number | null = null;
            const step = (ts: number) => {
                if (!startTime) startTime = ts;
                const progress = Math.min((ts - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, delay);
        return () => clearTimeout(timeout);
    }, [active, target, delay]);
    return value;
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
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30'
                                    : inRange
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                        : isToday
                                            ? 'ring-1 ring-indigo-300 text-indigo-600 dark:ring-indigo-700 dark:text-indigo-400'
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
                    <p className={`mt-0.5 text-xs font-bold ${rangeStart ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-300 dark:text-neutral-600'}`}>
                        {formatDisplay(rangeStart)}
                    </p>
                </div>
                <ChevronRight className="size-3 text-neutral-300 dark:text-neutral-600" />
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">To</p>
                    <p className={`mt-0.5 text-xs font-bold ${rangeEnd ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-300 dark:text-neutral-600'}`}>
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
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30 hover:shadow-md hover:brightness-110'
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

        // Position below the card
        const top = rect.bottom + 8;

        // Center horizontally, clamp to screen edges
        let left = rect.left + rect.width / 2;
        left = Math.max(tooltipW / 2 + 8, Math.min(left, window.innerWidth - tooltipW / 2 - 8));

        setPos({ top, left });
    }, [visible, parentRef]);

    if (!visible) return null;

    return ReactDOM.createPortal(
        <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-none"
            style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                transform: 'translate(-50%, 0)',
                opacity: pos ? 1 : 0,
            }}
        >
            {/* Arrow pointing up */}
            <div className="flex justify-center mb-[-5px]">
                <div className="size-2.5 rotate-45 bg-white/95 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60" />
            </div>
            <div className="w-[260px] rounded-xl bg-white/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/15 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Insight rows */}
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
                {/* Divider */}
                {insights.length > 0 && (
                    <div className="mb-2 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                )}
                {/* Description */}
                <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{desc}</p>
            </div>
        </div>,
        document.body
    );
}

/* ─── Primary Stat Card (count-up + stagger entrance) ─── */
function PrimaryStatCard({ label, value, trend, trendLabel, desc, insights, icon: Icon, grad, shadow, alert, index, mounted }: {
    label: string; value: number; trend?: number; trendLabel: string; desc: string; insights: InsightRow[]; icon: React.ElementType;
    grad: string; shadow: string; alert: boolean; index: number; mounted: boolean;
}) {
    const count = useCountUp(value, mounted, index * 90);
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-lg ${shadow} sm:p-5 transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${index * 80}ms` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl transition-all duration-500 group-hover:size-32 group-hover:blur-2xl" />
            <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />
            {alert && (
                <span className="absolute right-3 top-3 flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-sm" />
                </span>
            )}
            <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white/80 sm:text-xs">{label}</p>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">
                        {count.toLocaleString()}
                    </p>
                    {trend !== undefined && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/90">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                            </span>
                        </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-white/55">{trendLabel}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/20 sm:size-11 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-5 text-white sm:size-[22px]" />
                </div>
            </div>
        </div>
    );
}

/* ─── Secondary Stat Card ─── */
function SecondaryStatCard({ icon: Icon, grad, shadow, value, label, trend, desc, insights, trendLabel, periodLabel, mounted, delay }: {
    icon: React.ElementType; grad: string; shadow: string; value: string | number; label: string;
    trend?: number; desc: string; insights: InsightRow[]; trendLabel: string; periodLabel: string; mounted: boolean; delay: number;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className={`relative flex items-start justify-between gap-4 rounded-2xl border border-white/60 bg-white p-4 shadow-sm shadow-black/[0.04] transition-all duration-700 hover:shadow-md hover:scale-[1.01] cursor-pointer sm:p-5 dark:border-neutral-700/50 dark:bg-neutral-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: `${delay}ms` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                {trend !== undefined && (
                    <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                    </span>
                )}
                <p className="text-[10px] text-neutral-400">{trendLabel}{periodLabel ? `, ${periodLabel}` : ''}</p>
            </div>
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} shadow-lg ${shadow}`}>
                <Icon className="size-5 text-white" />
            </div>
        </div>
    );
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
    affected_areas, map_reports, team_stats, period,
    custom_from, custom_to,
}: Props) {
    const [mounted, setMounted] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    // Close calendar on outside click
    useEffect(() => {
        if (!showCalendar) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (calendarRef.current?.contains(target)) return;
            // Check if click is inside the portal calendar
            const portal = document.querySelector('.calendar-portal');
            if (portal?.contains(target)) return;
            setShowCalendar(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCalendar]);

    const severityValues = [
        severity_breakdown['critical'] ?? 0,
        severity_breakdown['high'] ?? 0,
        severity_breakdown['moderate'] ?? 0,
        severity_breakdown['low'] ?? 0,
    ];
    const severityLabels = ['Critical', 'High', 'Moderate', 'Low'];
    const statusValues   = ['pending', 'verified', 'assigned', 'resolved', 'rejected'].map(s => status_breakdown[s] ?? 0);
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
                if (t === 0) return `Reports are steady ${tl} with no significant change. ${resolvedCount} have been resolved so far.`;
                const dir = t > 0 ? 'increased' : 'decreased';
                const parts = [`Reports ${dir} by ${Math.abs(t)}% ${tl}.`];
                if (t > 20) parts.push('This is a significant spike — consider allocating more responders.');
                else if (t < -20) parts.push('Activity is slowing down — a good time to clear the backlog.');
                if (stats.pending > 0 && pendingPct > 30) parts.push(`${pendingPct}% of reports are still pending — review queue needs attention.`);
                else if (resolvedCount > 0 && resolutionRate > 80) parts.push(`Strong resolution rate at ${resolutionRate}%.`);
                return parts.join(' ');
            }
            case 'active_floods': {
                const t = trends.active;
                const parts: string[] = [];
                if (stats.active === 0) return 'No active floods right now. All clear.';
                if (criticalCount > 0) parts.push(`${criticalCount} critical flood${criticalCount > 1 ? 's' : ''} requiring immediate attention.`);
                if (t > 0) parts.push(`Active floods up ${Math.abs(t)}% ${tl} — situation is escalating.`);
                else if (t < 0) parts.push(`Active floods down ${Math.abs(t)}% ${tl} — situation is improving.`);
                else parts.push(`Active floods unchanged ${tl}.`);
                if (activePct > 50) parts.push(`${activePct}% of all reports are still active — resolution may be lagging.`);
                return parts.join(' ');
            }
            case 'pending': {
                if (stats.pending === 0) return 'All caught up — no reports pending review.';
                const t = trends.pending;
                const parts: string[] = [];
                if (t > 0) parts.push(`Pending queue grew by ${Math.abs(t)}% ${tl}.`);
                else if (t < 0) parts.push(`Pending queue shrank by ${Math.abs(t)}% ${tl} — good progress.`);
                if (pendingPct > 40) parts.push(`${pendingPct}% of reports are waiting — this is a bottleneck.`);
                else if (pendingPct > 20) parts.push(`${pendingPct}% of reports still need review.`);
                else parts.push(`Only ${pendingPct}% of reports are pending — manageable.`);
                if (avg_response_time > 60) parts.push(`Avg response time is ${formatResponseTime(avg_response_time)} — try to speed up triage.`);
                return parts.join(' ');
            }
            case 'responders': {
                const parts: string[] = [];
                if (reportsPerResponder > 10) parts.push(`Each responder is handling ~${reportsPerResponder} reports — team may be stretched thin.`);
                else if (reportsPerResponder > 0) parts.push(`Workload is balanced at ~${reportsPerResponder} reports per responder.`);
                else parts.push('No reports assigned yet.');
                if (stats.resolved_today > 0) parts.push(`${stats.resolved_today} resolved today — team is active.`);
                if (team_stats.deployed > 0) parts.push(`${team_stats.deployed} team${team_stats.deployed > 1 ? 's' : ''} currently in the field.`);
                else if (stats.active > 0) parts.push('No teams deployed yet despite active floods.');
                return parts.join(' ');
            }
            case 'alerts': {
                if (active_alerts === 0) return 'No active alerts. Conditions are stable.';
                const t = trends.alerts;
                const parts: string[] = [];
                if (t > 0) parts.push(`Alerts surged by ${Math.abs(t)}% ${tl}.`);
                else if (t < 0) parts.push(`Alerts dropped by ${Math.abs(t)}% ${tl}.`);
                if (critical_alerts.length > 0) parts.push(`${critical_alerts.length} critical alert${critical_alerts.length > 1 ? 's' : ''} — immediate action required.`);
                if (affected_areas > 3) parts.push(`Spread across ${affected_areas} areas — monitor for wider impact.`);
                else if (affected_areas > 0) parts.push(`Concentrated in ${affected_areas} area${affected_areas > 1 ? 's' : ''}.`);
                return parts.join(' ');
            }
            case 'resolved_today': {
                if (stats.resolved_today === 0) return `No reports resolved yet today. ${stats.pending} pending and ${stats.active} active still need attention.`;
                const parts: string[] = [];
                const t = trends.resolved;
                if (t > 0) parts.push(`Resolutions up ${Math.abs(t)}% ${tl} — great momentum.`);
                else if (t < 0) parts.push(`Resolutions down ${Math.abs(t)}% ${tl}.`);
                if (stats.pending > stats.resolved_today) parts.push(`Still ${stats.pending} pending — more than what was resolved today.`);
                else if (stats.pending > 0) parts.push(`Almost caught up — only ${stats.pending} left pending.`);
                else parts.push('No reports left pending — fully caught up.');
                parts.push(`Overall resolution rate: ${resolutionRate}%.`);
                return parts.join(' ');
            }
            case 'avg_response': {
                const parts: string[] = [];
                if (avg_response_time <= 0) return 'No resolved reports to calculate response time from.';
                if (avg_response_time < 30) parts.push('Response time is excellent — under 30 minutes.');
                else if (avg_response_time < 60) parts.push('Response time is good — under an hour.');
                else if (avg_response_time < 180) parts.push(`Response time is ${formatResponseTime(avg_response_time)} — room for improvement.`);
                else parts.push(`Response time is ${formatResponseTime(avg_response_time)} — this needs attention.`);
                if (reportsPerResponder > 8) parts.push(`High workload (~${reportsPerResponder}/responder) may be slowing things down.`);
                if (stats.pending > 5) parts.push(`${stats.pending} reports queued — reducing backlog would help.`);
                return parts.join(' ');
            }
            case 'affected_areas': {
                if (affected_areas === 0) return 'No areas currently affected. All locations are clear.';
                const parts: string[] = [];
                if (affected_areas > 5) parts.push(`${affected_areas} areas affected — flooding is widespread.`);
                else parts.push(`Flooding is localized to ${affected_areas} area${affected_areas > 1 ? 's' : ''}.`);
                if (criticalCount > 0) parts.push(`${criticalCount} critical-severity reports across these zones.`);
                if (team_stats.deployed < affected_areas) parts.push(`Only ${team_stats.deployed} teams deployed for ${affected_areas} areas — may need reinforcement.`);
                else if (team_stats.deployed > 0) parts.push(`${team_stats.deployed} teams deployed — coverage looks adequate.`);
                return parts.join(' ');
            }
            case 'resolution_rate': {
                const parts: string[] = [];
                if (resolutionRate >= 90) parts.push(`Excellent — ${resolutionRate}% of reports are resolved.`);
                else if (resolutionRate >= 70) parts.push(`Good — ${resolutionRate}% resolved, but ${stats.pending + stats.active} still open.`);
                else if (resolutionRate >= 40) parts.push(`${resolutionRate}% resolved — needs improvement. ${stats.pending} pending, ${stats.active} active.`);
                else if (stats.total_reports > 0) parts.push(`Only ${resolutionRate}% resolved — most reports are still unresolved.`);
                else return 'No reports submitted yet.';
                if (rejectedCount > 0) parts.push(`${rejectedCount} report${rejectedCount > 1 ? 's were' : ' was'} rejected.`);
                return parts.join(' ');
            }
            case 'active_teams': {
                if (team_stats.active === 0) return 'No active teams. Responder teams need to be activated.';
                const parts: string[] = [];
                if (deploymentRate >= 80) parts.push(`${deploymentRate}% deployment rate — nearly all teams are in the field.`);
                else if (deploymentRate >= 50) parts.push(`${deploymentRate}% deployed — ${team_stats.active - team_stats.deployed} teams still available.`);
                else if (team_stats.deployed > 0) parts.push(`Only ${deploymentRate}% deployed — capacity available for more areas.`);
                else parts.push('No teams deployed yet.');
                if (team_stats.inactive > 0) parts.push(`${team_stats.inactive} inactive team${team_stats.inactive > 1 ? 's' : ''} could be reactivated if needed.`);
                if (stats.active > 0 && team_stats.deployed === 0) parts.push(`${stats.active} active floods with no teams deployed — needs immediate action.`);
                return parts.join(' ');
            }
            default: return '';
        }
    }

    const setPeriod = (p: string) => {
        if (p === 'custom') {
            setShowCalendar(true);
            return;
        }
        setShowCalendar(false);
        router.get('/admin', { period: p }, { preserveState: true, preserveScroll: true });
    };

    const applyCustomRange = (from: string, to: string) => {
        setShowCalendar(false);
        router.get('/admin', { period: 'custom', from, to }, { preserveState: true, preserveScroll: true });
    };

    const customRangeLabel = custom_from && custom_to
        ? `${new Date(custom_from + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(custom_to + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : null;

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

                {/* Header */}
                <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
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
                    <div className="relative flex items-center rounded-xl border border-neutral-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-800/60" ref={calendarRef}>
                        {PERIODS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setPeriod(key)}
                                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    period === key || (key === 'custom' && showCalendar)
                                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                }`}
                            >
                                {key === 'custom' ? (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="size-3" />
                                        {period === 'custom' && customRangeLabel ? customRangeLabel : label}
                                    </span>
                                ) : label}
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
                </div>

                {/* Primary Stats — full gradient cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                    {([
                        { label: 'Total Reports',  value: stats.total_reports,    trend: trends.reports,  trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('total_reports'), icon: FileText, grad: 'from-indigo-500 via-blue-500 to-cyan-500', shadow: 'shadow-indigo-500/40', alert: false, insights: [
                            { label: 'Resolved', value: resolvedCount, color: '#10b981' },
                            { label: 'Active', value: stats.active, color: '#3b82f6' },
                            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
                            { label: 'Rejected', value: rejectedCount, color: '#94a3b8' },
                        ] },
                        { label: 'Active Floods',  value: stats.active, trend: trends.active, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('active_floods'), icon: Waves, grad: 'from-cyan-500 via-teal-500 to-emerald-500', shadow: 'shadow-cyan-500/40', alert: false, insights: [
                            { label: 'Critical severity', value: criticalCount, color: '#ef4444' },
                            { label: 'High severity', value: highCount, color: '#f97316' },
                            { label: '% of total reports', value: `${activePct}%`, color: '#3b82f6' },
                        ] },
                        { label: 'Pending Review', value: stats.pending, trend: trends.pending, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('pending'), icon: Clock, grad: 'from-amber-400 via-orange-500 to-rose-500', shadow: 'shadow-amber-500/40', alert: stats.pending > 0, insights: [
                            { label: '% of total reports', value: `${pendingPct}%`, color: '#f59e0b' },
                            { label: 'Resolved today', value: stats.resolved_today, color: '#10b981' },
                            { label: 'Avg response time', value: formatResponseTime(avg_response_time), color: '#6366f1' },
                        ] },
                        { label: 'Responders', value: stats.total_responders, trend: undefined, trendLabel: `${stats.resolved_today} resolved today`, desc: smartDesc('responders'), icon: ShieldCheck, grad: 'from-violet-500 via-purple-500 to-indigo-600', shadow: 'shadow-violet-500/40', alert: false, insights: [
                            { label: 'Reports per responder', value: reportsPerResponder, color: '#8b5cf6' },
                            { label: 'Resolved today', value: stats.resolved_today, color: '#10b981' },
                            { label: 'Teams deployed', value: team_stats.deployed, color: '#06b6d4' },
                        ] },
                        { label: 'Active Alerts', value: active_alerts, trend: trends.alerts, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('alerts'), icon: AlertTriangle, grad: 'from-rose-500 via-red-500 to-pink-600', shadow: 'shadow-rose-500/40', alert: active_alerts > 0, insights: [
                            { label: 'Critical alerts', value: critical_alerts.length, color: '#ef4444' },
                            { label: 'Affected areas', value: affected_areas, color: '#8b5cf6' },
                            { label: 'Active floods', value: stats.active, color: '#06b6d4' },
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
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                    {([
                        { icon: CheckCircle2, grad: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', value: stats.resolved_today, label: 'Resolved Today', trend: trends.resolved, desc: smartDesc('resolved_today'), insights: [
                            { label: 'Still pending', value: stats.pending, color: '#f59e0b' },
                            { label: 'Still active', value: stats.active, color: '#3b82f6' },
                            { label: 'Resolution rate', value: `${resolutionRate}%`, color: '#10b981' },
                        ] },
                        { icon: Clock, grad: 'from-orange-400 to-amber-500', shadow: 'shadow-orange-500/20', value: formatResponseTime(avg_response_time), label: 'Avg Response', trend: undefined, desc: smartDesc('avg_response'), insights: [
                            { label: 'Pending reports', value: stats.pending, color: '#f59e0b' },
                            { label: 'Active responders', value: stats.total_responders, color: '#8b5cf6' },
                            { label: 'Reports per responder', value: reportsPerResponder, color: '#6366f1' },
                        ] },
                        { icon: Globe, grad: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', value: affected_areas, label: 'Affected Areas', trend: undefined, desc: smartDesc('affected_areas'), insights: [
                            { label: 'Active floods', value: stats.active, color: '#06b6d4' },
                            { label: 'Critical severity', value: criticalCount, color: '#ef4444' },
                            { label: 'Teams deployed', value: team_stats.deployed, color: '#14b8a6' },
                        ] },
                        { icon: TrendingUp, grad: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/20', value: `${resolutionRate}%`, label: 'Resolution Rate', trend: undefined, desc: smartDesc('resolution_rate'), insights: [
                            { label: 'Resolved', value: resolvedCount, color: '#10b981' },
                            { label: 'Total reports', value: stats.total_reports, color: '#6366f1' },
                            { label: 'Rejected', value: rejectedCount, color: '#94a3b8' },
                        ] },
                    ] as const).map(({ icon: Icon, grad, shadow, value, label, trend, desc, insights }, i) => (
                        <SecondaryStatCard key={label} icon={Icon} grad={grad} shadow={shadow} value={value} label={label} trend={trend} desc={desc} insights={[...insights]} trendLabel={trends.label} periodLabel={trends.period_label} mounted={mounted} delay={i * 80 + 480} />
                    ))}
                    {/* Active Teams card */}
                    <SecondaryStatCard icon={Shield} grad="from-teal-400 to-cyan-500" shadow="shadow-teal-500/20" value={team_stats.active} label="Active Teams" desc={smartDesc('active_teams')} insights={[
                        { label: 'Deployed', value: team_stats.deployed, color: '#14b8a6' },
                        { label: 'Inactive', value: team_stats.inactive, color: '#94a3b8' },
                        { label: 'Deployment rate', value: `${deploymentRate}%`, color: '#06b6d4' },
                    ]} trendLabel={`${team_stats.deployed} deployed${team_stats.inactive > 0 ? ` · ${team_stats.inactive} inactive` : ''}`} periodLabel="" mounted={mounted} delay={800} />
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
