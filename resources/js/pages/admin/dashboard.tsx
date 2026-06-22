import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    MapPin,
    ShieldAlert,
    Users,
    Zap,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import type { Report, SEVERITY_COLORS, STATUS_COLORS, HAZARD_LABELS } from '@/types/admin';
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

            <div className="flex flex-col gap-6 p-6">

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={<MapPin className="size-5 text-blue-600" />}
                        label="Total reports"
                        value={stats.total_reports}
                        bg="bg-blue-50"
                    />
                    <StatCard
                        icon={<Clock className="size-5 text-amber-600" />}
                        label="Pending review"
                        value={stats.pending}
                        bg="bg-amber-50"
                        urgent={stats.pending > 0}
                    />
                    <StatCard
                        icon={<Zap className="size-5 text-teal-600" />}
                        label="Active incidents"
                        value={stats.active}
                        bg="bg-teal-50"
                    />
                    <StatCard
                        icon={<CheckCircle className="size-5 text-green-600" />}
                        label="Resolved today"
                        value={stats.resolved_today}
                        bg="bg-green-50"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        icon={<Users className="size-5 text-violet-600" />}
                        label="Registered users"
                        value={stats.total_users}
                        bg="bg-violet-50"
                    />
                    <StatCard
                        icon={<ShieldAlert className="size-5 text-indigo-600" />}
                        label="Responders"
                        value={stats.total_responders}
                        bg="bg-indigo-50"
                    />
                    <StatCard
                        icon={<AlertTriangle className="size-5 text-red-600" />}
                        label="Active alerts"
                        value={active_alerts}
                        bg="bg-red-50"
                        urgent={active_alerts > 0}
                    />
                </div>

                {/* Breakdowns */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Reports by severity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-3">
                            {(['critical', 'high', 'moderate', 'low'] as const).map((sev) => (
                                <div key={sev} className="flex items-center gap-2">
                                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEV[sev]}`}>
                                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                    </span>
                                    <span className="text-sm font-semibold">
                                        {severity_breakdown[sev] ?? 0}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Reports by status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-3">
                            {(['pending', 'verified', 'assigned', 'resolved', 'rejected'] as const).map((st) => (
                                <div key={st} className="flex items-center gap-2">
                                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STA[st]}`}>
                                        {st.charAt(0).toUpperCase() + st.slice(1)}
                                    </span>
                                    <span className="text-sm font-semibold">
                                        {status_breakdown[st] ?? 0}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent reports table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent reports</CardTitle>
                        <Link
                            href="/admin/reports"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            View all →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Reference</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Severity</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Reporter</th>
                                        <th className="px-4 py-3 font-medium">Location</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recent_reports.map((report) => (
                                        <tr
                                            key={report.id}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/admin/reports/${report.id}`}
                                                    className="font-mono text-xs text-blue-600 hover:underline"
                                                >
                                                    {report.reference_number}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {HAZ[report.hazard_type]}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEV[report.severity]}`}>
                                                    {report.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STA[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{report.user?.name ?? '—'}</td>
                                            <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
                                                {report.address ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                    {recent_reports.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                                No reports yet.
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

function StatCard({
    icon, label, value, bg, urgent = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    bg: string;
    urgent?: boolean;
}) {
    return (
        <Card className={urgent ? 'ring-2 ring-red-300' : ''}>
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-10 items-center justify-center rounded-lg ${bg}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
