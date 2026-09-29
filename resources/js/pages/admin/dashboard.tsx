import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
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
}: Props) {
    const { t, locale } = useLocale();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const tm = setTimeout(() => setMounted(true), 80); return () => clearTimeout(tm); }, []);

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
    const vrColor = verification_rate >= 80 ? '#10b981' : verification_rate >= 50 ? '#f59e0b' : '#ef4444';
    const vrLabel = verification_rate >= 80 ? t('dashboard.on_track') : verification_rate >= 50 ? t('dashboard.needs_attention') : t('dashboard.critical');
    const vrBg    = verification_rate >= 80 ? 'bg-emerald-500' : verification_rate >= 50 ? 'bg-amber-500' : 'bg-red-500';

    /* ── Area Chart (enhanced) ── */
    const SERIES_COLORS: Record<string, string> = { Reports: '#6366f1', Resolved: '#10b981' };

    const { filteredDays, reportsData, resolvedData, pendingData, peakIndex, peakValue, peakDate, avgValue, alertDates } = useMemo(() => {
        const fd = daily_reports.slice(-chartRange);
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
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="min-h-full bg-gradient-to-b from-neutral-50 via-neutral-50/80 to-white dark:from-neutral-950 dark:via-neutral-950/80 dark:to-neutral-900">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:gap-7 lg:p-8">

                {/* ━━━ Header ━━━ */}
                <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 shadow-lg shadow-neutral-900/20 dark:bg-white dark:shadow-white/10">
                            <LayoutDashboard className="size-5 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                                {t('dashboard.title')}
                            </h1>
                            <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">{t('dashboard.subtitle')}</p>
                        </div>
                    </div>
                    <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin" />
                </div>

                {/* ━━━ Primary KPI Cards ━━━ */}
                <div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
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
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
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
                    <div className={`group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm p-4 sm:p-5 transition-all duration-700 hover:shadow-xl hover:shadow-neutral-900/[0.04] hover:border-neutral-300/70 dark:border-neutral-800/80 dark:bg-neutral-900/80 dark:hover:border-neutral-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '800ms' }}>
                        <div className={`absolute inset-x-0 top-0 h-[3px] ${vrBg}`} />
                        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-400 sm:text-[11px] dark:text-neutral-500">{t('dashboard.verification_rate')}</p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="relative flex size-14 shrink-0 items-center justify-center">
                                <svg className="size-full -rotate-90" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="23" fill="none" stroke="#f1f5f9" strokeWidth="5" className="dark:stroke-neutral-800" />
                                    <circle cx="28" cy="28" r="23" fill="none"
                                        stroke={vrColor} strokeWidth="5" strokeLinecap="round"
                                        strokeDasharray={`${(verification_rate / 100) * 144.5} 144.5`}
                                    />
                                </svg>
                                <span className="absolute text-sm font-bold tabular-nums text-neutral-900 dark:text-white">{verification_rate}%</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 text-[10px]">
                                    <span className={`size-1.5 rounded-full ${vrBg}`} />
                                    <span className="text-neutral-500 dark:text-neutral-400">{vrLabel}</span>
                                </span>
                            </div>
                        </div>
                    </div>
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
                        <div className="px-4 pb-4 pt-3">
                            {flood_risk_scores.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {flood_risk_scores.map((r, i) => (
                                        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-neutral-100/80 bg-neutral-50/40 px-3 py-2 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:bg-neutral-800/30 dark:hover:bg-neutral-800/50">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-[9px] font-bold text-white dark:bg-neutral-200 dark:text-neutral-900">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[11px] font-semibold text-neutral-900 dark:text-white" title={r.barangay}>
                                                    {r.barangay}
                                                </p>
                                                <p className="text-[9px] text-neutral-400">{r.incidents} incident{r.incidents !== 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end">
                                                <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-white">{r.score}</span>
                                                <span className={`inline-flex items-center rounded-md px-1 py-0.5 text-[8px] font-semibold ${
                                                    r.level === 'High' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                                    : r.level === 'Moderate' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                }`}>{r.level}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <Empty text="Not enough data" />}
                        </div>
                    </Card>

                    {/* Barangay Comparison */}
                    <Card>
                        <CardHeader icon={BarChart3} title={t('dashboard.top_barangays')} subtitle={t('dashboard.by_incident_count')} />
                        <div className="px-5 pb-5 pt-3">
                            {barangay_breakdown.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                    {barangay_breakdown.map((b, i) => {
                                        const maxCount = barangay_breakdown[0]?.count ?? 1;
                                        const pct = Math.round((b.count / maxCount) * 100);
                                        const barColor = i === 0
                                            ? 'from-red-500 to-rose-400'
                                            : i <= 2
                                                ? 'from-amber-500 to-orange-400'
                                                : 'from-indigo-500 to-indigo-400';
                                        const medalColors = ['bg-amber-400 text-amber-950', 'bg-neutral-300 text-neutral-700 dark:bg-neutral-500 dark:text-white', 'bg-amber-600 text-amber-100'];
                                        return (
                                            <div key={i} className="group/bar relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                {/* Rank */}
                                                <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                                                    i < 3 ? medalColors[i] : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                                                }`}>
                                                    {i + 1}
                                                </span>
                                                {/* Name + bar */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="truncate text-[11px] font-semibold text-neutral-800 transition-colors group-hover/bar:text-neutral-900 dark:text-neutral-200 dark:group-hover/bar:text-white" title={b.barangay}>
                                                            {b.barangay}
                                                        </span>
                                                        <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-neutral-900 dark:text-white">
                                                            {b.count}
                                                            <span className="ml-0.5 text-[9px] font-normal text-neutral-400"> report{b.count !== 1 ? 's' : ''}</span>
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-neutral-300 dark:text-neutral-600">
            <Droplets className="size-6" />
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{text}</p>
        </div>
    );
}
