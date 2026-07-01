import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    MapPin,
    ShieldAlert,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import type { Report } from '@/types/admin';
import {
    SEVERITY_COLORS as SEV,
    STATUS_COLORS as STA,
    HAZARD_LABELS as HAZ,
} from '@/types/admin';

interface Stats {
    total_reports: number;
    pending: number;
    active: number;
    resolved_today: number;
    total_users: number;
    total_responders: number;
}

interface Props {
    stats: Stats;
    severity_breakdown: Record<string, number>;
    status_breakdown: Record<string, number>;
    recent_reports: Report[];
    active_alerts: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Dashboard', href: '/admin' },
];

export default function AdminDashboard({
    stats,
    severity_breakdown,
    status_breakdown,
    recent_reports,
    active_alerts,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard — FloodTrack" />

            <div className="flex flex-col gap-8 p-6 lg:p-8">

                {/* Welcome header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Overview of flood reports, responders, and system activity.
                    </p>
                </div>

                {/* Primary stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={MapPin}
                        iconBg="bg-blue-500/10"
                        iconColor="text-blue-600"
                        label="Total Reports"
                        value={stats.total_reports}
                    />
                    <MetricCard
                        icon={Clock}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-600"
                        label="Pending Review"
                        value={stats.pending}
                        accent={stats.pending > 0 ? 'border-l-amber-500' : undefined}
                    />
                    <MetricCard
                        icon={Zap}
                        iconBg="bg-indigo-500/10"
                        iconColor="text-indigo-600"
                        label="Active Incidents"
                        value={stats.active}
                    />
                    <MetricCard
                        icon={CheckCircle2}
                        iconBg="bg-emerald-500/10"
                        iconColor="text-emerald-600"
                        label="Resolved Today"
                        value={stats.resolved_today}
                    />
                </div>

                {/* Secondary stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                        icon={Users}
                        iconBg="bg-violet-500/10"
                        iconColor="text-violet-600"
                        label="Registered Users"
                        value={stats.total_users}
                    />
                    <MetricCard
                        icon={ShieldAlert}
                        iconBg="bg-sky-500/10"
                        iconColor="text-sky-600"
                        label="Responders"
                        value={stats.total_responders}
                    />
                    <MetricCard
                        icon={AlertTriangle}
                        iconBg="bg-rose-500/10"
                        iconColor="text-rose-600"
                        label="Active Alerts"
                        value={active_alerts}
                        accent={active_alerts > 0 ? 'border-l-rose-500' : undefined}
                    />
                </div>

                {/* Breakdowns */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">
                                Reports by Severity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center gap-4 p-6">
                            {(['critical', 'high', 'moderate', 'low'] as const).map((sev) => {
                                const count = severity_breakdown[sev] ?? 0;
                                return (
                                    <div key={sev} className="flex items-center gap-2.5">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SEV[sev]}`}>
                                            {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                        </span>
                                        <span className="text-sm font-bold tabular-nums">
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-6 py-4">
                            <CardTitle className="text-sm font-semibold tracking-tight">
                                Reports by Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center gap-4 p-6">
                            {(['pending', 'verified', 'assigned', 'resolved', 'rejected'] as const).map((st) => {
                                const count = status_breakdown[st] ?? 0;
                                return (
                                    <div key={st} className="flex items-center gap-2.5">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STA[st]}`}>
                                            {st.charAt(0).toUpperCase() + st.slice(1)}
                                        </span>
                                        <span className="text-sm font-bold tabular-nums">
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent reports table */}
                <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                            Recent Reports
                        </CardTitle>
                        <Link
                            href="/admin/reports"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            View all
                            <ArrowUpRight className="size-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/20 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        <th className="px-6 py-3">Reference</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Severity</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Reporter</th>
                                        <th className="px-6 py-3">Location</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {recent_reports.map((report) => (
                                        <tr
                                            key={report.id}
                                            className="group transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-6 py-3.5">
                                                <Link
                                                    href={`/admin/reports/${report.id}`}
                                                    className="inline-flex items-center gap-1 font-mono text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                                >
                                                    {report.reference_number}
                                                    <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground">
                                                {HAZ[report.hazard_type]}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEV[report.severity]}`}>
                                                    {report.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STA[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 font-medium">{report.user?.name ?? '—'}</td>
                                            <td className="px-6 py-3.5 max-w-[180px] truncate text-muted-foreground">
                                                {report.address ?? '—'}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                                                {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                    {recent_reports.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <MapPin className="size-8 text-muted-foreground/40" />
                                                    <p className="text-sm text-muted-foreground">No reports yet</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function MetricCard({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    value,
    accent,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    label: string;
    value: number;
    accent?: string;
}) {
    return (
        <Card className={`relative overflow-hidden transition-shadow hover:shadow-md ${accent ? `border-l-4 ${accent}` : ''}`}>
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon className={`size-5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
