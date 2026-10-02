import { Head, Link, router } from '@inertiajs/react';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ApexOptions } from 'apexcharts';
import {
    AlertTriangle,
    ArrowUpRight,
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
    BarChart3,
    Target,
    Activity,
    CircleHelp,
    Filter,
    ChevronDown,
    X,
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
import { useLocale } from '@/hooks/use-locale';
import { useKpiTooltip } from '@/hooks/use-kpi-tooltip';
import { KpiTooltip } from '@/components/admin/kpi/KpiTooltip';
import { DashboardSkeleton } from '@/components/admin/skeletons';

/* ─── Types ─── */
interface Stats { total_reports: number; pending: number; active: number; resolved_today: number; total_users: number; total_responders: number }
interface DailyReport { date: string; total: number; resolved: number }
interface ActivityItem { id: number; status: string; notes: string | null; created_at: string; user: { id: number; name: string; role: string }; report: { id: number; reference_number: string; severity: string } }
interface MapReport { id: number; reference_number: string; severity: string; status: string; latitude: number; longitude: number; address: string | null }
interface TeamStats { active: number; deployed: number; inactive: number }
interface BarangayCount { barangay: string; count: number }
interface FloodRisk { barangay: string; score: number; level: string; incidents: number }

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
    verification_rate: number;
    barangay_breakdown: BarangayCount[];
    flood_risk_scores: FloodRisk[];
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
    filters: { severity?: string | null; status?: string | null; barangay?: string | null };
    barangay_list: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Dashboard', href: '/admin' },
];


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
        <div className={`rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-neutral-900/[0.04] hover:border-neutral-300/70 dark:border-neutral-800/80 dark:bg-neutral-900/80 dark:hover:border-neutral-700 dark:hover:shadow-black/20 ${className}`}>
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

/* ─── Section Header ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">{children}</p>
    );
}

export default function AdminDashboard({
    stats, trends, daily_reports,
    severity_breakdown, status_breakdown,
    recent_reports, active_alerts, critical_alerts,
    avg_response_time, recent_activity,
    affected_areas, map_reports, team_stats,
    verification_rate, barangay_breakdown, flood_risk_scores,
    period, custom_from, custom_to,
    filters, barangay_list,
}: Props) {
    const { t, locale } = useLocale();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const tm = setTimeout(() => setMounted(true), 80); return () => clearTimeout(tm); }, []);

    // Real-time: reload dashboard when reports/statuses change
    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/\/$/, '');
        let socket: Socket | null = null;

        fetch('/admin/socket-token', {
            headers: {
                'Accept': 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(
                    document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
                ),
            },
        })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (!data?.token) return;

                socket = io(socketUrl, {
                    auth: { token: data.token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 3000,
                });

                const reload = () => {
                    router.reload({ preserveState: true, preserveScroll: true });
                };

                socket.on('new-report', reload);
                socket.on('report-status', reload);
                socket.on('member-status-updated', reload);
                socket.on('new-notification', reload);
            })
            .catch(() => {});

        return () => { socket?.disconnect(); };
    }, []);

    /* ── Trend chart state ── */
    const [chartRange, setChartRange] = useState<7 | 14 | 30 | 90>(30);
    const [visibleSeries, setVisibleSeries] = useState<Set<string>>(() => new Set(['Reports', 'Resolved']));
    const [cumulative, setCumulative] = useState(false);

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

    /* ── Urgency logic ── */
    function getUrgency(key: string): 'good' | 'warning' | 'urgent' {
        switch (key) {
            case 'total_reports':
                if (trends.reports > 30) return 'urgent';
                if (trends.reports > 10) return 'warning';
                return 'good';
            case 'active_floods':
                if (activePct > 60) return 'urgent';
                if (activePct > 30) return 'warning';
                return 'good';
            case 'pending':
                if (pendingPct > 40) return 'urgent';
                if (pendingPct > 20) return 'warning';
                return 'good';
            case 'responders':
                if (reportsPerResponder > 10) return 'urgent';
                if (reportsPerResponder > 5) return 'warning';
                return 'good';
            case 'alerts':
                if (critical_alerts.length > 0) return 'urgent';
                if (active_alerts > 3) return 'warning';
                return 'good';
            case 'resolved_today':
                if (stats.resolved_today === 0) return 'warning';
                if (trends.resolved > 0) return 'good';
                return 'good';
            case 'avg_response':
                if (avg_response_time > 180) return 'urgent';
                if (avg_response_time > 60) return 'warning';
                return 'good';
            case 'resolution_rate':
                if (resolutionRate < 50) return 'urgent';
                if (resolutionRate < 80) return 'warning';
                return 'good';
            case 'active_teams':
                if (team_stats.deployed === 0 && stats.active > 0) return 'warning';
                return 'good';
            default: return 'good';
        }
    }

    /* ── Action links ── */
    const actionLinks: Record<string, { label: string; href: string }> = {
        total_reports: { label: 'View all reports', href: '/admin/reports' },
        active_floods: { label: 'View active floods', href: '/admin/reports?status=active' },
        pending: { label: 'View pending reports', href: '/admin/reports?status=pending' },
        responders: { label: 'View responders', href: '/admin/responders' },
        alerts: { label: 'View alerts', href: '/admin/alerts' },
        resolved_today: { label: 'View resolved reports', href: '/admin/reports?status=resolved' },
        avg_response: { label: 'View reports', href: '/admin/reports' },
        resolution_rate: { label: 'View reports', href: '/admin/reports' },
        active_teams: { label: 'View teams', href: '/admin/teams' },
    };

    /* ── Smart insight generator ── */
    const tl = trends.label;

    function smartDesc(key: string): string {
        const isFil = locale === 'fil';
        switch (key) {
            case 'total_reports': {
                const t = trends.reports;
                const parts: string[] = [];
                if (isFil) {
                    if (t === 0) parts.push(`Steady ang reports ${tl}. Walang unusual.`);
                    else if (t > 20) parts.push(`Tumaas ng ${Math.abs(t)}% ang reports ${tl}. Baka kailangan ng mas maraming tao.`);
                    else if (t > 0) parts.push(`Unti-unting tumataas ang reports (${Math.abs(t)}% ${tl}). Bantayan.`);
                    else if (t < -20) parts.push(`Bumaba ng ${Math.abs(t)}% ang reports ${tl}. Good time para i-clear ang backlog.`);
                    else parts.push(`Bumababa nang konti ang reports (${Math.abs(t)}% ${tl}). Kumakalma na.`);
                    if (resolutionRate >= 80) parts.push(`${resolutionRate}% na ang resolved — maganda.`);
                    else if (resolutionRate >= 50) parts.push(`${resolutionRate}% pa lang ang resolved. Pwede pa.`);
                    else if (stats.total_reports > 0) parts.push(`${resolutionRate}% lang ang resolved. Kailangan pang i-trabaho.`);
                    if (pendingPct > 30) parts.push('Maraming reports ang naghihintay pa ng verification.');
                    if (reportsPerResponder > 8) parts.push('Mabigat ang load ng bawat responder ngayon.');
                } else {
                    if (t === 0) parts.push(`Reports are steady ${tl}. Nothing unusual.`);
                    else if (t > 20) parts.push(`Reports went up ${Math.abs(t)}% ${tl}. You might need more people out there.`);
                    else if (t > 0) parts.push(`Reports are slowly climbing (${Math.abs(t)}% ${tl}). Worth keeping an eye on.`);
                    else if (t < -20) parts.push(`Reports dropped ${Math.abs(t)}% ${tl}. Good time to catch up on the backlog.`);
                    else parts.push(`Reports are easing a bit (${Math.abs(t)}% ${tl}). Things are calming down.`);
                    if (resolutionRate >= 80) parts.push(`${resolutionRate}% of reports are resolved — that's great.`);
                    else if (resolutionRate >= 50) parts.push(`${resolutionRate}% resolved so far. Could be better.`);
                    else if (stats.total_reports > 0) parts.push(`Only ${resolutionRate}% resolved. The queue needs attention.`);
                    if (pendingPct > 30) parts.push('A lot of reports are stuck waiting for verification.');
                    if (reportsPerResponder > 8) parts.push('Each responder has a heavy load right now.');
                }
                return parts.join(' ');
            }
            case 'active_floods': {
                const t = trends.active;
                const parts: string[] = [];
                if (isFil) {
                    if (stats.active === 0) return 'Walang baha ngayon. Na-handle na lahat.';
                    if (t > 20) parts.push(`Tumataas ang baha (${Math.abs(t)}% ${tl}). Kailangan ng mas maraming team.`);
                    else if (t > 0) parts.push(`Dumadami ang baha (${Math.abs(t)}% ${tl}). Lumalala.`);
                    else if (t < -20) parts.push(`Bumababa na ang baha (${Math.abs(t)}% ${tl}). Gumagana ang response.`);
                    else if (t < 0) parts.push(`Unti-unting bumababa ang baha (${Math.abs(t)}% ${tl}). Papunta sa tamang direksyon.`);
                    else parts.push(`Steady ang baha ${tl}. Walang pagbabago.`);
                    if (activePct > 60) parts.push('Karamihan ng reports hindi pa resolved. Kailangan bilisan.');
                    else if (activePct > 30) parts.push('Katamtaman ang flood activity. Ituloy ang pace.');
                    if (team_stats.deployed < Math.ceil(stats.active / 3) && stats.active > 0) parts.push('Kailangan ng mas maraming team sa field.');
                    else if (team_stats.deployed > 0) parts.push('Sapat ang team coverage ngayon.');
                    if (stats.pending > 3) parts.push('May mga report pa na hindi pa na-verify.');
                } else {
                    if (stats.active === 0) return 'No active floods right now. Everything\'s been handled.';
                    if (t > 20) parts.push(`Floods are spiking (${Math.abs(t)}% ${tl}). More teams should get out there.`);
                    else if (t > 0) parts.push(`Floods are increasing (${Math.abs(t)}% ${tl}). Things are getting worse.`);
                    else if (t < -20) parts.push(`Floods are dropping fast (${Math.abs(t)}% ${tl}). The response is working.`);
                    else if (t < 0) parts.push(`Floods are slowly going down (${Math.abs(t)}% ${tl}). Heading in the right direction.`);
                    else parts.push(`Floods are holding steady ${tl}. No change yet.`);
                    if (activePct > 60) parts.push('Most reports are still unresolved. Teams need to pick up the pace.');
                    else if (activePct > 30) parts.push('Moderate flood activity. Keep the current pace going.');
                    if (team_stats.deployed < Math.ceil(stats.active / 3) && stats.active > 0) parts.push('Could use more teams deployed to cover all the areas.');
                    else if (team_stats.deployed > 0) parts.push('Team coverage looks good for now.');
                    if (stats.pending > 3) parts.push('Some reports are still waiting to be verified.');
                }
                return parts.join(' ');
            }
            case 'pending': {
                const t = trends.pending;
                const parts: string[] = [];
                if (isFil) {
                    if (stats.pending === 0) return 'Wala nang pending. Lahat na-check na.';
                    if (t > 0) parts.push(`${Math.abs(t)}% mas maraming reports ang naghihintay ${tl}.`);
                    else if (t < 0) parts.push(`Bumaba ng ${Math.abs(t)}% ang pending ${tl}. Nice.`);
                    if (pendingPct > 40) parts.push(`${pendingPct}% ng reports pending pa. Bottleneck na yan.`);
                    else if (pendingPct > 20) parts.push(`${pendingPct}% kailangan pa i-verify.`);
                    else parts.push(`${pendingPct}% lang ang pending. Kaya pa.`);
                    if (avg_response_time > 60) parts.push(`Response time ay ${formatResponseTime(avg_response_time)}. Pabilisin ang verification.`);
                } else {
                    if (stats.pending === 0) return 'All caught up. Nothing waiting for verification.';
                    if (t > 0) parts.push(`${Math.abs(t)}% more reports are waiting to be checked ${tl}.`);
                    else if (t < 0) parts.push(`The queue shrank by ${Math.abs(t)}% ${tl}. Nice progress.`);
                    if (pendingPct > 40) parts.push(`${pendingPct}% of reports are still pending. That's a bottleneck.`);
                    else if (pendingPct > 20) parts.push(`${pendingPct}% still need verification.`);
                    else parts.push(`Only ${pendingPct}% pending. That's manageable.`);
                    if (avg_response_time > 60) parts.push(`Response time is at ${formatResponseTime(avg_response_time)}. Speeding up verification would help.`);
                }
                return parts.join(' ');
            }
            case 'responders': {
                const parts: string[] = [];
                if (isFil) {
                    if (reportsPerResponder > 10) parts.push(`Mga ${reportsPerResponder} reports per responder. Ang dami — baka kailangan ng tulong.`);
                    else if (reportsPerResponder > 0) parts.push(`Mga ${reportsPerResponder} reports per responder. Balanced naman.`);
                    else parts.push('Wala pang reports na naka-assign sa responders.');
                    if (stats.resolved_today > 0) parts.push(`${stats.resolved_today} ang naayos ngayon. Active ang team.`);
                    if (team_stats.deployed > 0) parts.push(`${team_stats.deployed} team ang nasa field.`);
                    else if (stats.active > 0) parts.push('Wala pang team na naka-deploy pero may active na baha.');
                } else {
                    if (reportsPerResponder > 10) parts.push(`Each responder has about ${reportsPerResponder} reports. That's a lot — you might need more help.`);
                    else if (reportsPerResponder > 0) parts.push(`About ${reportsPerResponder} reports per responder. Workload is balanced.`);
                    else parts.push('No reports assigned to responders yet.');
                    if (stats.resolved_today > 0) parts.push(`${stats.resolved_today} resolved today. Team is active.`);
                    if (team_stats.deployed > 0) parts.push(`${team_stats.deployed} team${team_stats.deployed > 1 ? 's' : ''} out in the field.`);
                    else if (stats.active > 0) parts.push('No teams deployed yet, but there are active floods.');
                }
                return parts.join(' ');
            }
            case 'alerts': {
                const t = trends.alerts;
                const parts: string[] = [];
                if (isFil) {
                    if (active_alerts === 0) return 'Walang active na anunsyo. Tahimik.';
                    if (t > 0) parts.push(`Tumaas ng ${Math.abs(t)}% ang anunsyo ${tl}.`);
                    else if (t < 0) parts.push(`Bumaba ng ${Math.abs(t)}% ang anunsyo ${tl}.`);
                    if (critical_alerts.length > 0) parts.push(`${critical_alerts.length} kritikal — kailangan agad.`);
                    if (affected_areas > 3) parts.push(`Apektado ang ${affected_areas} na lugar.`);
                    else if (affected_areas > 0) parts.push(`Nasa ${affected_areas} lugar lang.`);
                } else {
                    if (active_alerts === 0) return 'No active announcements. All calm.';
                    if (t > 0) parts.push(`Announcements went up ${Math.abs(t)}% ${tl}.`);
                    else if (t < 0) parts.push(`Announcements dropped ${Math.abs(t)}% ${tl}.`);
                    if (critical_alerts.length > 0) parts.push(`${critical_alerts.length} critical — needs immediate attention.`);
                    if (affected_areas > 3) parts.push(`Affecting ${affected_areas} areas. Keep an eye on the spread.`);
                    else if (affected_areas > 0) parts.push(`Concentrated in ${affected_areas} area${affected_areas > 1 ? 's' : ''}.`);
                }
                return parts.join(' ');
            }
            case 'resolved_today': {
                const parts: string[] = [];
                const t = trends.resolved;
                if (isFil) {
                    if (stats.resolved_today === 0) return `Wala pang naayos ngayon. ${stats.pending} pending at ${stats.active} active pa.`;
                    if (t > 0) parts.push(`Tumaas ng ${Math.abs(t)}% ang resolutions ${tl}. Good pace.`);
                    else if (t < 0) parts.push(`Bumaba ng ${Math.abs(t)}% ang resolutions ${tl}.`);
                    if (stats.pending > stats.resolved_today) parts.push(`May ${stats.pending} pa — mas marami pa sa na-resolve ngayon.`);
                    else if (stats.pending > 0) parts.push(`Halos tapos na. ${stats.pending} na lang ang pending.`);
                    else parts.push('Wala nang pending. Tapos na lahat.');
                    parts.push(`Overall resolution rate: ${resolutionRate}%.`);
                } else {
                    if (stats.resolved_today === 0) return `Nothing resolved yet today. ${stats.pending} pending and ${stats.active} active floods still need work.`;
                    if (t > 0) parts.push(`Resolutions are up ${Math.abs(t)}% ${tl}. Good momentum.`);
                    else if (t < 0) parts.push(`Resolutions are down ${Math.abs(t)}% ${tl}.`);
                    if (stats.pending > stats.resolved_today) parts.push(`Still ${stats.pending} waiting — more than today's resolved count.`);
                    else if (stats.pending > 0) parts.push(`Almost caught up. Only ${stats.pending} left to verify.`);
                    else parts.push('No reports left pending. Fully caught up.');
                    parts.push(`Overall resolution rate is ${resolutionRate}%.`);
                }
                return parts.join(' ');
            }
            case 'avg_response': {
                const parts: string[] = [];
                if (isFil) {
                    if (avg_response_time <= 0) return 'Wala pang resolved na report para makuha ang response time.';
                    if (avg_response_time < 30) parts.push('Mabilis ang response — wala pang 30 minuto.');
                    else if (avg_response_time < 60) parts.push('Wala pang isang oras ang response time. Okay yan.');
                    else if (avg_response_time < 180) parts.push(`${formatResponseTime(avg_response_time)} ang response time. Pwede pang pabilisin.`);
                    else parts.push(`${formatResponseTime(avg_response_time)} ang response time. Sobrang tagal, kailangan ayusin.`);
                    if (reportsPerResponder > 8) parts.push(`Mabigat ang workload (~${reportsPerResponder} reports each). Baka yan ang dahilan.`);
                    if (stats.pending > 5) parts.push(`${stats.pending} reports sa queue. Pag na-clear, babilis din.`);
                } else {
                    if (avg_response_time <= 0) return 'No resolved reports to measure response time from.';
                    if (avg_response_time < 30) parts.push('Responses are fast — under 30 minutes on average.');
                    else if (avg_response_time < 60) parts.push('Response time is under an hour. That\'s solid.');
                    else if (avg_response_time < 180) parts.push(`Response time is ${formatResponseTime(avg_response_time)}. There\'s room to improve.`);
                    else parts.push(`Response time is ${formatResponseTime(avg_response_time)}. That\'s too slow and needs fixing.`);
                    if (reportsPerResponder > 8) parts.push(`Heavy workload (~${reportsPerResponder} reports each) is probably slowing things down.`);
                    if (stats.pending > 5) parts.push(`${stats.pending} reports in the queue. Clearing those would help.`);
                }
                return parts.join(' ');
            }
            case 'resolution_rate': {
                const parts: string[] = [];
                if (isFil) {
                    if (resolutionRate >= 90) parts.push(`${resolutionRate}% na ang resolved. Ang galing!`);
                    else if (resolutionRate >= 70) parts.push(`${resolutionRate}% resolved, pero ${stats.pending + stats.active} ang open pa.`);
                    else if (resolutionRate >= 40) parts.push(`${resolutionRate}% lang. ${stats.pending} pending, ${stats.active} active. Kailangan pang i-improve.`);
                    else if (stats.total_reports > 0) parts.push(`${resolutionRate}% lang ang resolved. Karamihan open pa.`);
                    else return 'Wala pang report na na-submit.';
                    if (rejectedCount > 0) parts.push(`${rejectedCount} report ang na-reject.`);
                } else {
                    if (resolutionRate >= 90) parts.push(`${resolutionRate}% resolved. Excellent work.`);
                    else if (resolutionRate >= 70) parts.push(`${resolutionRate}% resolved, but ${stats.pending + stats.active} reports are still open.`);
                    else if (resolutionRate >= 40) parts.push(`${resolutionRate}% resolved. ${stats.pending} pending, ${stats.active} active. Needs improvement.`);
                    else if (stats.total_reports > 0) parts.push(`Only ${resolutionRate}% resolved. Most reports are still open.`);
                    else return 'No reports submitted yet.';
                    if (rejectedCount > 0) parts.push(`${rejectedCount} report${rejectedCount > 1 ? 's' : ''} rejected.`);
                }
                return parts.join(' ');
            }
            case 'active_teams': {
                const parts: string[] = [];
                if (isFil) {
                    if (team_stats.active === 0) return 'Walang active na team ngayon. Kailangan mag-activate para ma-deploy.';
                    if (deploymentRate >= 80) parts.push(`${deploymentRate}% deployment rate. Halos lahat nasa field na.`);
                    else if (deploymentRate >= 50) parts.push(`${deploymentRate}% ang naka-deploy. ${team_stats.active - team_stats.deployed} team pa ang available.`);
                    else if (team_stats.deployed > 0) parts.push(`${deploymentRate}% lang ang naka-deploy. May pwede pang i-send.`);
                    else parts.push('Walang team na naka-deploy.');
                    if (team_stats.inactive > 0) parts.push(`${team_stats.inactive} inactive team ang pwedeng i-activate.`);
                    if (stats.active > 0 && team_stats.deployed === 0) parts.push(`${stats.active} active na baha pero walang team sa field. Kailangan ng aksyon agad.`);
                } else {
                    if (team_stats.active === 0) return 'No active teams right now. You\'ll need to activate some for deployment.';
                    if (deploymentRate >= 80) parts.push(`${deploymentRate}% deployment rate. Almost everyone is in the field.`);
                    else if (deploymentRate >= 50) parts.push(`${deploymentRate}% deployed. ${team_stats.active - team_stats.deployed} teams still available.`);
                    else if (team_stats.deployed > 0) parts.push(`Only ${deploymentRate}% deployed. There's capacity for more.`);
                    else parts.push('No teams deployed yet.');
                    if (team_stats.inactive > 0) parts.push(`${team_stats.inactive} inactive team${team_stats.inactive > 1 ? 's' : ''} could be brought back if needed.`);
                    if (stats.active > 0 && team_stats.deployed === 0) parts.push(`${stats.active} active floods with no teams out there. This needs action now.`);
                }
                return parts.join(' ');
            }
            default: return '';
        }
    }

    /* ── Trend helper for insight rows ── */
    function trendDir(val: number): 'up' | 'down' | 'flat' {
        if (val > 0) return 'up';
        if (val < 0) return 'down';
        return 'flat';
    }

    /* ── KPI Threshold Colors ── */
    function kpiAccent(key: string): 'green' | 'amber' | 'red' | 'neutral' {
        switch (key) {
            case 'active':   return stats.active === 0 ? 'green' : stats.active <= 5 ? 'amber' : 'red';
            case 'pending':  return stats.pending === 0 ? 'green' : stats.pending <= 5 ? 'amber' : 'red';
            case 'alerts':   return active_alerts === 0 ? 'green' : active_alerts <= 3 ? 'amber' : 'red';
            case 'resolved': return stats.resolved_today >= 5 ? 'green' : stats.resolved_today >= 1 ? 'amber' : 'red';
            case 'response': return avg_response_time <= 0 ? 'neutral' : avg_response_time < 30 ? 'green' : avg_response_time < 120 ? 'amber' : 'red';
            case 'resolution': return resolutionRate >= 80 ? 'green' : resolutionRate >= 50 ? 'amber' : 'red';
            default: return 'neutral';
        }
    }

    /* ── Verification Rate color ── */
    const vrColor = verification_rate >= 90 ? '#10b981' : verification_rate >= 70 ? '#3b82f6' : verification_rate >= 50 ? '#f59e0b' : '#ef4444';
    const vrLabel = verification_rate >= 90 ? 'Excellent' : verification_rate >= 70 ? 'Good' : verification_rate >= 50 ? t('dashboard.needs_attention') : t('dashboard.critical');
    const vrBg    = verification_rate >= 90 ? 'bg-emerald-500' : verification_rate >= 70 ? 'bg-blue-500' : verification_rate >= 50 ? 'bg-amber-500' : 'bg-red-500';

    /* ── Area Chart (enhanced) ── */
    const SERIES_COLORS: Record<string, string> = { Reports: '#6366f1', Resolved: '#10b981' };

    const { filteredDays, reportsData, resolvedData, pendingData, peakIndex, peakValue, peakDate, avgValue, alertDates } = useMemo(() => {
        // Build a complete date range with zeros for missing days
        const dataMap = new Map(daily_reports.map(d => [d.date, d]));
        const allDays: typeof daily_reports = [];
        const today = new Date();
        for (let i = chartRange - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const mon = d.toLocaleDateString('en-US', { month: 'short' });
            const day = String(d.getDate()).padStart(2, '0');
            const label = `${mon} ${day}`;
            const existing = dataMap.get(label);
            allDays.push(existing ?? { date: label, total: 0, resolved: 0 });
        }
        const fd = allDays;
        let rp = fd.map(d => d.total);
        let rv = fd.map(d => d.resolved);
        let pd = fd.map(d => Math.max(0, d.total - d.resolved));

        if (cumulative) {
            rp = rp.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
            rv = rv.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
            pd = pd.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
        }

        const pi = rp.length > 0 ? rp.indexOf(Math.max(...rp)) : -1;
        const pv = pi >= 0 ? rp[pi] : 0;
        const pDate = pi >= 0 ? fd[pi]?.date : undefined;
        const av = rp.length > 0 ? Math.round(rp.reduce((a, b) => a + b, 0) / rp.length) : 0;

        // Build set of alert dates that fall within filtered range
        const fdSet = new Set(fd.map(d => d.date));
        const aDates = critical_alerts
            .map(a => {
                const d = new Date(a.created_at);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })
            .filter(d => fdSet.has(d));

        return { filteredDays: fd, reportsData: rp, resolvedData: rv, pendingData: pd, peakIndex: pi, peakValue: pv, peakDate: pDate, avgValue: av, alertDates: [...new Set(aDates)] };
    }, [daily_reports, chartRange, cumulative, critical_alerts]);

    const areaSeries = useMemo(() => {
        const all: { name: string; data: number[] }[] = [];
        if (visibleSeries.has('Reports'))  all.push({ name: 'Reports',  data: reportsData });
        if (visibleSeries.has('Resolved')) all.push({ name: 'Resolved', data: resolvedData });
        return all;
    }, [visibleSeries, reportsData, resolvedData, pendingData]);

    const areaOptions: ApexOptions = useMemo(() => {
        const seriesColors = areaSeries.map(s => SERIES_COLORS[s.name] ?? '#94a3b8');
        const seriesWidths = areaSeries.map(() => 2.5);

        // Build annotations
        const yaxisAnnotations: ApexOptions['annotations'] extends { yaxis?: infer Y } ? Y : never = [{
            y: avgValue,
            borderColor: '#94a3b8',
            strokeDashArray: 4,
            label: { text: `Avg: ${avgValue}`, position: 'left', style: { fontSize: '10px', color: '#94a3b8', background: 'transparent' }, offsetX: 10 },
        }];

        const xaxisAnnotations = alertDates.map(d => ({
            x: d,
            borderColor: '#ef4444',
            strokeDashArray: 3,
            label: { text: 'Alert', orientation: 'horizontal' as const, style: { fontSize: '9px', color: '#ef4444', background: '#fef2f2', padding: { left: 4, right: 4, top: 2, bottom: 2 } } },
        }));


        return {
            chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 600, easing: 'easeinout' }, selection: { enabled: false } },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: seriesWidths },
            fill: {
                type: 'gradient',
                gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 90, 100] },
            },
            colors: seriesColors,
            grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 0, right: 4 } },
            xaxis: { categories: filteredDays.map(d => d.date), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: 0 }, tooltip: { enabled: false } },
            yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
            legend: { show: false },
            markers: { size: 0, hover: { size: 5, sizeOffset: 1 } },
            annotations: {
                yaxis: yaxisAnnotations,
                xaxis: xaxisAnnotations,
            },
            tooltip: {
                shared: true, intersect: false,
                custom: ({ series, dataPointIndex, w }) => {
                    const label = w.globals.categoryLabels[dataPointIndex] ?? w.globals.labels[dataPointIndex];
                    const rows = series.map((s: number[], i: number) => ({
                        color: seriesColors[i] ?? '#94a3b8',
                        name: areaSeries[i]?.name ?? '',
                        value: s[dataPointIndex],
                    }));
                    return tooltipHtml(label, rows);
                },
            },
        };
    }, [filteredDays, areaSeries, avgValue, alertDates]);

    /* ── Donut Chart ── */
    if (!mounted) return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <DashboardSkeleton />
        </AppLayout>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="min-h-full bg-gradient-to-b from-neutral-50 via-neutral-50/80 to-white dark:from-neutral-950 dark:via-neutral-950/80 dark:to-neutral-900">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:gap-7 lg:p-8">

                {/* ━━━ Header ━━━ */}
                <div className={`flex flex-col gap-3 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 shadow-lg shadow-neutral-900/20 dark:bg-white dark:shadow-white/10">
                                <LayoutDashboard className="size-5 text-white dark:text-neutral-900" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                                    {t('dashboard.title')}
                                </h1>
                                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t('dashboard.subtitle')}</p>
                            </div>
                        </div>
                        <div className="relative z-30 flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-800/60">
                            <DashboardFilters filters={filters} barangayList={barangay_list} period={period} customFrom={custom_from} customTo={custom_to} />
                            <div className="h-5 w-px bg-neutral-200/80 dark:bg-neutral-700/60" />
                            <PeriodToggle bare period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin" extraParams={{
                                ...(filters.severity ? { severity: filters.severity } : {}),
                                ...(filters.status ? { status: filters.status } : {}),
                                ...(filters.barangay ? { barangay: filters.barangay } : {}),
                            }} />
                        </div>
                    </div>
                </div>

                {/* ━━━ Primary KPI Cards ━━━ */}
                <div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
                        {([
                            { key: 'total_reports', label: t('dashboard.total_flood_reports'), value: stats.total_reports, trend: trends.reports, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('total_reports'), icon: FileText, grad: 'from-indigo-500 via-blue-500 to-cyan-500', shadow: 'shadow-indigo-500/40', alert: false, accent: 'neutral' as const, insights: [
                                { label: 'Resolved cases', value: resolvedCount, color: '#10b981', max: stats.total_reports, trend: trendDir(trends.resolved) },
                                { label: 'Flooded areas', value: stats.active, color: '#3b82f6', max: stats.total_reports, trend: trendDir(trends.active) },
                                { label: 'Awaiting verification', value: stats.pending, color: '#f59e0b', max: stats.total_reports, trend: trendDir(trends.pending) },
                                { label: 'Rejected reports', value: rejectedCount, color: '#94a3b8' },
                            ] },
                            { key: 'active_floods', label: t('dashboard.flooded_areas'), value: stats.active, trend: trends.active, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('active_floods'), icon: Waves, grad: 'from-cyan-500 via-teal-500 to-emerald-500', shadow: 'shadow-cyan-500/40', alert: false, accent: kpiAccent('active'), insights: [
                                { label: 'Critical flood incidents', value: criticalCount, color: '#ef4444' },
                                { label: 'High severity floods', value: highCount, color: '#f97316' },
                                { label: '% of total flood reports', value: `${activePct}%`, color: '#3b82f6' },
                            ] },
                            { key: 'pending', label: t('dashboard.awaiting_verification'), value: stats.pending, trend: trends.pending, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('pending'), icon: Clock, grad: 'from-amber-400 via-orange-500 to-rose-500', shadow: 'shadow-amber-500/40', alert: stats.pending > 0, accent: kpiAccent('pending'), insights: [
                                { label: '% of total flood reports', value: `${pendingPct}%`, color: '#f59e0b' },
                                { label: 'Resolved today', value: stats.resolved_today, color: '#10b981' },
                                { label: 'Avg response time', value: formatResponseTime(avg_response_time), color: '#6366f1' },
                            ] },
                            { key: 'responders', label: t('dashboard.rescue_personnel'), value: stats.total_responders, trend: undefined, trendLabel: `${stats.resolved_today} ${t('dashboard.cases_resolved_today')}`, desc: smartDesc('responders'), icon: ShieldCheck, grad: 'from-violet-500 via-purple-500 to-indigo-600', shadow: 'shadow-violet-500/40', alert: false, accent: 'neutral' as const, insights: [
                                { label: 'Reports per personnel', value: reportsPerResponder, color: '#8b5cf6' },
                                { label: 'Cases resolved today', value: stats.resolved_today, color: '#10b981' },
                                { label: 'Response teams deployed', value: team_stats.deployed, color: '#06b6d4' },
                            ] },
                            { key: 'alerts', label: t('dashboard.announcements'), value: active_alerts, trend: trends.alerts, trendLabel: `${tl}, ${trends.period_label}`, desc: smartDesc('alerts'), icon: AlertTriangle, grad: 'from-rose-500 via-red-500 to-pink-600', shadow: 'shadow-rose-500/40', alert: active_alerts > 0, accent: kpiAccent('alerts'), insights: [
                                { label: 'Critical announcements', value: critical_alerts.length, color: '#ef4444' },
                                { label: 'Affected areas', value: affected_areas, color: '#8b5cf6' },
                                { label: 'Flooded areas', value: stats.active, color: '#06b6d4' },
                            ] },
                        ] as const).map(({ key, label, value, trend, trendLabel, desc, insights, icon: Icon, grad, shadow, alert, accent }, i) => (
                            <PrimaryStatCard
                                key={label}
                                label={label} value={value} trend={trend} trendLabel={trendLabel} desc={desc} insights={[...insights]}
                                icon={Icon} grad={grad} shadow={shadow} alert={alert} accent={accent}
                                index={i} mounted={mounted}
                                urgency={getUrgency(key)} actionLink={actionLinks[key]}
                            />
                        ))}
                    </div>
                </div>

                {/* ━━━ Secondary KPI + Verification Gauge Row ━━━ */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
                    {([
                        { key: 'resolved_today', icon: CheckCircle2, grad: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', value: stats.resolved_today, label: t('dashboard.resolved_today'), trend: trends.resolved, accent: kpiAccent('resolved'), desc: smartDesc('resolved_today'), insights: [
                            { label: 'Awaiting verification', value: stats.pending, color: '#f59e0b', max: stats.total_reports, trend: trendDir(trends.pending) },
                            { label: 'Flooded areas active', value: stats.active, color: '#3b82f6', max: stats.total_reports, trend: trendDir(trends.active) },
                            { label: 'Resolution rate', value: `${resolutionRate}%`, color: '#10b981' },
                        ] },
                        { key: 'avg_response', icon: Clock, grad: 'from-orange-400 to-amber-500', shadow: 'shadow-orange-500/20', value: formatResponseTime(avg_response_time), label: t('dashboard.avg_response_time'), trend: undefined, accent: kpiAccent('response'), desc: smartDesc('avg_response'), insights: [
                            { label: 'Awaiting verification', value: stats.pending, color: '#f59e0b' },
                            { label: 'Rescue personnel', value: stats.total_responders, color: '#8b5cf6' },
                            { label: 'Reports per personnel', value: reportsPerResponder, color: '#6366f1' },
                        ] },
                        { key: 'resolution_rate', icon: TrendingUp, grad: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/20', value: `${resolutionRate}%`, label: t('dashboard.resolution_rate'), trend: undefined, accent: kpiAccent('resolution'), desc: smartDesc('resolution_rate'), insights: [
                            { label: 'Resolved cases', value: resolvedCount, color: '#10b981' },
                            { label: 'Total flood reports', value: stats.total_reports, color: '#6366f1' },
                            { label: 'Rejected reports', value: rejectedCount, color: '#94a3b8' },
                        ] },
                        { key: 'active_teams', icon: Shield, grad: 'from-teal-400 to-cyan-500', shadow: 'shadow-teal-500/20', value: team_stats.active, label: t('dashboard.response_teams'), trend: undefined, accent: 'neutral' as const, desc: smartDesc('active_teams'), insights: [
                            { label: 'Teams deployed', value: team_stats.deployed, color: '#14b8a6' },
                            { label: 'Inactive teams', value: team_stats.inactive, color: '#94a3b8' },
                            { label: 'Deployment rate', value: `${deploymentRate}%`, color: '#06b6d4' },
                        ] },
                    ] as const).map(({ key, icon: Icon, grad, shadow, value, label, trend, accent, desc, insights }, i) => (
                        <SecondaryStatCard key={label} icon={Icon} grad={grad} shadow={shadow} value={value} label={label} trend={trend} accent={accent} desc={desc} insights={[...insights]} trendLabel={i < 3 ? trends.label : `${team_stats.deployed} deployed${team_stats.inactive > 0 ? ` · ${team_stats.inactive} inactive` : ''}`} periodLabel={i < 3 ? trends.period_label : ''} mounted={mounted} delay={i * 80 + 480} urgency={getUrgency(key)} actionLink={actionLinks[key]} />
                    ))}

                    {/* Inline Verification Gauge */}
                    <VerificationGauge rate={verification_rate} color={vrColor} label={vrLabel} bg={vrBg} mounted={mounted} locale={locale} />
                </div>

                {/* ━━━ Flood Incident Trend (full width) ━━━ */}
                <div>
                    <SectionLabel>Analytics</SectionLabel>
                    <div className="mt-3">
                        <Card>
                            <CardHeader icon={TrendingUp} title={t('dashboard.flood_incident_trend')} subtitle={cumulative ? `${t('dashboard.cumulative')} - ${chartRange}D` : `${t('dashboard.daily_reports')} - ${chartRange}D`}>
                                {/* Time range pills */}
                                <div className="ml-auto flex items-center gap-1">
                                    {([7, 14, 30, 90] as const).map(d => (
                                        <button key={d} onClick={() => setChartRange(d)}
                                            className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${chartRange === d ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                                        >{d}D</button>
                                    ))}
                                </div>
                            </CardHeader>

                            {/* Controls row: series toggles + cumulative switch */}
                            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100/60 px-4 pb-3 pt-3 dark:border-neutral-800/60">
                                {(['Reports', 'Resolved'] as const).map(name => {
                                    const color = SERIES_COLORS[name];
                                    const active = visibleSeries.has(name);
                                    return (
                                        <button key={name} onClick={() => { const next = new Set(visibleSeries); if (active) next.delete(name); else next.add(name); setVisibleSeries(next); }}
                                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${active ? '' : 'opacity-40'}`}
                                            style={active ? { backgroundColor: color + '15', color } : {}}
                                        >
                                            <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                                            {name}
                                        </button>
                                    );
                                })}

                                <div className="ml-auto flex items-center gap-2">
                                    <button onClick={() => setCumulative(!cumulative)}
                                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors ${cumulative ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                                    >{cumulative ? t('dashboard.cumulative') : t('dashboard.daily')}</button>
                                </div>
                            </div>

                            <div className="px-2 pb-2 pt-1 sm:px-3">
                                {filteredDays.length > 0 && areaSeries.length > 0
                                    ? <ReactApexChart type="area" series={areaSeries} options={areaOptions} height={320} />
                                    : <Empty text="No flood report data available" />}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ━━━ Flood Risk + Barangay Row ━━━ */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Flood Risk Score */}
                    <Card>
                        <CardHeader icon={Target} title={t('dashboard.flood_risk')} subtitle={t('dashboard.barangay_ranking')} />
                        <div className="flex items-center gap-4 px-5 pt-3">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#dc2626]" />High</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#d97706]" />Moderate</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#059669]" />Low</span>
                        </div>
                        <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
                            {flood_risk_scores.length > 0 ? (
                                <ReactApexChart
                                    type="bar"
                                    height={280}
                                    series={[{ name: 'Risk Score', data: flood_risk_scores.map(r => r.score) }]}
                                    options={{
                                        chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 800, easing: 'easeinout' }, sparkline: { enabled: false } },
                                        plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '50%', distributed: true } },
                                        fill: {
                                            type: 'gradient',
                                            gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] },
                                        },
                                        colors: flood_risk_scores.map(r => r.level === 'High' ? '#dc2626' : r.level === 'Moderate' ? '#d97706' : '#059669'),
                                        dataLabels: {
                                            enabled: true,
                                            offsetY: -18,
                                            style: { fontSize: '10px', fontWeight: 700, colors: ['#374151'] },
                                            formatter: (val: number) => String(val),
                                            background: { enabled: false },
                                        },
                                        states: { hover: { filter: { type: 'darken', value: 0.15 } } },
                                        xaxis: {
                                            categories: flood_risk_scores.map(r => r.barangay),
                                            labels: { style: { fontSize: '10px', fontWeight: 500, colors: '#6b7280' }, rotate: 0, trim: true, hideOverlappingLabels: true },
                                            axisBorder: { show: false },
                                            axisTicks: { show: false },
                                        },
                                        yaxis: { show: false },
                                        grid: { show: false },
                                        legend: { show: false },
                                        tooltip: {
                                            theme: 'light',
                                            style: { fontSize: '11px' },
                                            y: { formatter: (val: number, opt: any) => `${val} pts · ${flood_risk_scores[opt.dataPointIndex].incidents} incidents · ${flood_risk_scores[opt.dataPointIndex].level}` },
                                        },
                                    } as ApexOptions}
                                />
                            ) : <Empty text="Not enough data" />}
                        </div>
                    </Card>

                    {/* Barangay Comparison */}
                    <Card>
                        <CardHeader icon={BarChart3} title={t('dashboard.top_barangays')} subtitle={t('dashboard.by_incident_count')} />
                        <div className="flex items-center gap-4 px-5 pt-3">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#dc2626]" />Highest</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#d97706]" />Top 3</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500"><span className="size-2.5 rounded-sm bg-[#4f46e5]" />Others</span>
                        </div>
                        <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
                            {barangay_breakdown.length > 0 ? (
                                <ReactApexChart
                                    type="bar"
                                    height={280}
                                    series={[{ name: 'Reports', data: barangay_breakdown.map(b => b.count) }]}
                                    options={{
                                        chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 800, easing: 'easeinout' } },
                                        plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '50%', distributed: true } },
                                        fill: {
                                            type: 'gradient',
                                            gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] },
                                        },
                                        colors: barangay_breakdown.map((_, i) => i === 0 ? '#dc2626' : i <= 2 ? '#d97706' : '#4f46e5'),
                                        dataLabels: {
                                            enabled: true,
                                            offsetY: -18,
                                            style: { fontSize: '10px', fontWeight: 700, colors: ['#374151'] },
                                            background: { enabled: false },
                                        },
                                        states: { hover: { filter: { type: 'darken', value: 0.15 } } },
                                        xaxis: {
                                            categories: barangay_breakdown.map(b => b.barangay),
                                            labels: { style: { fontSize: '10px', fontWeight: 500, colors: '#6b7280' }, rotate: 0, trim: true, hideOverlappingLabels: true },
                                            axisBorder: { show: false },
                                            axisTicks: { show: false },
                                        },
                                        yaxis: { show: false },
                                        grid: { show: false },
                                        legend: { show: false },
                                        tooltip: {
                                            theme: 'light',
                                            style: { fontSize: '11px' },
                                            y: { formatter: (val: number) => `${val} report${val !== 1 ? 's' : ''}` },
                                        },
                                    } as ApexOptions}
                                />
                            ) : <Empty text="No barangay data available" />}
                        </div>
                    </Card>
                </div>

                {/* ━━━ Incident Map ━━━ */}
                <div>
                    <SectionLabel>Operations</SectionLabel>
                    <div className="mt-3">
                        <Card className="overflow-hidden">
                            <div className="flex items-center justify-between border-b border-neutral-100/80 px-5 py-4 dark:border-neutral-800/80">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/60">
                                        <MapPin className="size-4 text-neutral-500 dark:text-neutral-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t('dashboard.flood_incident_map')}</p>
                                        <p className="text-[11px] text-neutral-400">{map_reports.length} {t('dashboard.active_flooded_areas')}</p>
                                    </div>
                                </div>
                                <Link href="/admin/reports/map" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition-all hover:border-neutral-400 hover:text-neutral-900 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white">
                                    <Globe className="size-3.5" />
                                    {t('dashboard.full_map')}
                                </Link>
                            </div>
                            <div className="p-3 sm:p-4">
                                {map_reports.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {map_reports.slice(0, 8).map((r) => (
                                            <Link key={r.id} href={`/admin/reports/${r.id}`}
                                                className="group flex flex-col justify-between rounded-xl border border-neutral-100/80 bg-neutral-50/30 p-3.5 transition-all hover:border-neutral-300 hover:bg-white hover:shadow-lg hover:shadow-neutral-900/[0.03] dark:border-neutral-800/60 dark:bg-neutral-800/30 dark:hover:border-neutral-700 dark:hover:bg-neutral-800">
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
                                    <div className="flex h-32 items-center justify-center"><Empty text={t('dashboard.no_active_floods')} /></div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ━━━ Recent Reports Table ━━━ */}
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-100/80 px-5 py-4 dark:border-neutral-800/80">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/60">
                                <FileText className="size-4 text-neutral-500 dark:text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Recent Flood Reports</p>
                                <p className="text-[11px] text-neutral-400">Latest submitted flood incident reports</p>
                            </div>
                        </div>
                        <Link href="/admin/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition-all hover:border-neutral-400 hover:text-neutral-900 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white">
                            View all <ExternalLink className="size-3" />
                        </Link>
                    </div>

                    {/* Mobile */}
                    <div className="block sm:hidden">
                        <div className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                            {recent_reports.map((report) => (
                                <Link key={report.id} href={`/admin/reports/${report.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30">
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
                                <tr className="border-b border-neutral-100/80 bg-neutral-50/30 dark:border-neutral-800/80 dark:bg-neutral-800/20">
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Reference</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Date</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Reporter</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Severity</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/60 dark:divide-neutral-800/60">
                                {recent_reports.map((report) => (
                                    <tr key={report.id} className="group transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30">
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

/* ─── Dashboard Filters ─── */
const SEVERITY_OPTIONS = [
    { value: 'critical', label: 'Critical', color: '#ef4444' },
    { value: 'high',     label: 'High',     color: '#f97316' },
    { value: 'moderate', label: 'Moderate', color: '#fbbf24' },
    { value: 'low',      label: 'Low',      color: '#22c55e' },
];
const STATUS_OPTIONS = [
    { value: 'pending',  label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' },
];

function DashboardFilters({ filters, barangayList, period, customFrom, customTo }: {
    filters: { severity?: string | null; status?: string | null; barangay?: string | null };
    barangayList: string[];
    period: string;
    customFrom?: string | null;
    customTo?: string | null;
}) {
    const selectedSeverities = filters.severity ? filters.severity.split(',') : [];
    const selectedStatuses = filters.status ? filters.status.split(',') : [];
    const selectedBarangays = filters.barangay ? filters.barangay.split(',') : [];
    const activeCount = selectedSeverities.length + selectedStatuses.length + selectedBarangays.length;

    const [localSev, setLocalSev] = useState(selectedSeverities);
    const [localStatus, setLocalStatus] = useState(selectedStatuses);
    const [localBarangays, setLocalBarangays] = useState(selectedBarangays);
    const [brgySearch, setBrgySearch] = useState('');

    useEffect(() => {
        setLocalSev(filters.severity ? filters.severity.split(',') : []);
        setLocalStatus(filters.status ? filters.status.split(',') : []);
        setLocalBarangays(filters.barangay ? filters.barangay.split(',') : []);
    }, [filters.severity, filters.status, filters.barangay]);

    const toggleSev = (v: string) => setLocalSev(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
    const toggleStatus = (v: string) => setLocalStatus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
    const toggleBarangay = (v: string) => setLocalBarangays(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

    const filteredBarangays = brgySearch
        ? barangayList.filter(b => b.toLowerCase().includes(brgySearch.toLowerCase()))
        : barangayList;

    const apply = (close: () => void) => {
        const params: Record<string, string> = { period };
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
        if (localSev.length) params.severity = localSev.join(',');
        if (localStatus.length) params.status = localStatus.join(',');
        if (localBarangays.length) params.barangay = localBarangays.join(',');
        router.get('/admin', params, { preserveState: true, preserveScroll: true });
        close();
    };

    const clearAll = (close: () => void) => {
        setLocalSev([]);
        setLocalStatus([]);
        setLocalBarangays([]);
        setBrgySearch('');
        const params: Record<string, string> = { period };
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
        router.get('/admin', params, { preserveState: true, preserveScroll: true });
        close();
    };

    return (
        <Popover className="relative">
            {({ open }) => (
                <>
                    <PopoverButton
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold outline-none transition-all sm:text-xs ${
                            activeCount > 0
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                    >
                        <Filter className="size-3.5" />
                        Filters
                        {activeCount > 0 && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white">
                                {activeCount}
                            </span>
                        )}
                        <ChevronDown className={`size-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </PopoverButton>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <PopoverPanel
                            anchor="bottom end"
                            className="z-[9999] mt-2 w-80 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-2xl shadow-black/15 backdrop-blur-xl dark:border-neutral-700/80 dark:bg-neutral-900/95 [--anchor-gap:6px]"
                        >
                            {({ close }) => (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
                                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Filters</p>
                                        {(localSev.length > 0 || localStatus.length > 0 || localBarangays.length > 0) && (
                                            <button onClick={() => { setLocalSev([]); setLocalStatus([]); setLocalBarangays([]); setBrgySearch(''); }}
                                                className="text-[10px] font-medium text-red-500 hover:text-red-600">
                                                Clear all
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-[60vh] overflow-y-auto">
                                        {/* Severity */}
                                        <div className="px-4 pt-3 pb-2">
                                            <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Severity</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {SEVERITY_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => toggleSev(opt.value)}
                                                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                                                            localSev.includes(opt.value)
                                                                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                                                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
                                                        }`}
                                                    >
                                                        <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="border-t border-neutral-100 px-4 pt-3 pb-2 dark:border-neutral-800">
                                            <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Status</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {STATUS_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => toggleStatus(opt.value)}
                                                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                                                            localStatus.includes(opt.value)
                                                                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                                                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Barangay */}
                                        <div className="border-t border-neutral-100 px-4 pt-3 pb-1 dark:border-neutral-800">
                                            <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                                Barangay
                                                {localBarangays.length > 0 && (
                                                    <span className="ml-1.5 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[8px] font-bold text-white dark:bg-white dark:text-neutral-900">{localBarangays.length}</span>
                                                )}
                                            </p>
                                            <input
                                                type="text"
                                                value={brgySearch}
                                                onChange={(e) => setBrgySearch(e.target.value)}
                                                placeholder="Search barangay..."
                                                className="mb-2 h-7 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-[10px] outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-1 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:focus:border-neutral-600"
                                            />
                                            <div className="max-h-36 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30">
                                                {filteredBarangays.length === 0 ? (
                                                    <p className="px-2.5 py-3 text-center text-[10px] text-neutral-400">No barangays found</p>
                                                ) : (
                                                    filteredBarangays.map(b => (
                                                        <label
                                                            key={b}
                                                            className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={localBarangays.includes(b)}
                                                                onChange={() => toggleBarangay(b)}
                                                                className="size-3 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500/20 dark:border-neutral-600"
                                                            />
                                                            <span className="text-neutral-700 dark:text-neutral-300">{b}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
                                        <button
                                            onClick={() => clearAll(close)}
                                            className="rounded-lg px-3 py-1.5 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={() => apply(close)}
                                            className="rounded-lg bg-neutral-900 px-5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </>
                            )}
                        </PopoverPanel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}

function VerificationGauge({ rate, color, label, bg, mounted, locale }: { rate: number; color: string; label: string; bg: string; mounted: boolean; locale: string }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const { open, toggle } = useKpiTooltip(btnRef);

    const isFil = locale === 'fil';
    const desc = rate >= 90
        ? isFil
            ? `${rate}% ng mga report ay na-verify na — napakagaling ng verification, halos lahat na-review na. Maayos ang takbo ng verification pipeline.`
            : `${rate}% of submitted reports have been verified — outstanding review performance. The verification pipeline is running efficiently.`
        : rate >= 70
        ? isFil
            ? `${rate}% verification rate — maganda ang takbo pero may pwede pa i-improve. Tingnan kung may pending reports na kailangan pang i-check.`
            : `${rate}% verification rate — good progress but there's room to speed up reviews. Check for any pending reports that need attention.`
        : rate >= 50
        ? isFil
            ? `${rate}% lang ng reports ang na-verify — nahuhuli na ang pag-review, kailangan dagdagan ng reviewer. Dagdagan ang reviewers para maiwasan ang bottleneck.`
            : `Only ${rate}% of reports verified — the review queue is falling behind. Allocate more reviewers to prevent bottlenecks.`
        : isFil
            ? `${rate}% verification rate — kritikal na baba, kailangan agad na aksyon. Karamihan ng reports nakatengga pa at hindi pa nare-review.`
            : `${rate}% verification rate is critically low — most reports are stuck unreviewed. Immediate action needed to clear the backlog.`;

    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-lg border border-neutral-200/70 bg-white px-3 py-2.5 transition-all duration-700 hover:shadow-md hover:border-neutral-300/80 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '800ms' }}
        >
            <div className={`absolute inset-x-0 top-0 h-[2px] ${bg}`} />
            <KpiTooltip desc={desc} insights={[]} visible={open} parentRef={cardRef} urgency={rate >= 70 ? 'good' : rate >= 50 ? 'warning' : 'urgent'} />
            <div className="flex items-start justify-between">
                <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Verification Rate</p>
                <button
                    ref={btnRef}
                    type="button"
                    onClick={toggle}
                    className={`z-10 flex size-4 shrink-0 items-center justify-center rounded transition-colors ${open ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' : 'text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400'}`}
                >
                    <CircleHelp className="size-3 pointer-events-none" />
                </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
                <div className="relative flex size-11 shrink-0 items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="#f1f5f9" strokeWidth="5" className="dark:stroke-neutral-800" />
                        <circle cx="28" cy="28" r="23" fill="none"
                            stroke={color} strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={`${(rate / 100) * 144.5} 144.5`}
                        />
                    </svg>
                    <span className="absolute text-[10px] font-bold tabular-nums text-neutral-900 dark:text-white">{rate}%</span>
                </div>
                <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[9px]">
                        <span className={`size-1.5 rounded-full ${bg}`} />
                        <span className="font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-neutral-300 dark:text-neutral-600">
            <Droplets className="size-6" />
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{text}</p>
        </div>
    );
}
