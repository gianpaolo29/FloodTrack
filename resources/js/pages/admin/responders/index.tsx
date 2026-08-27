import { swalDelete, swalSuccess } from '@/lib/swal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Eye, EyeOff, MapPin, Pencil, Phone, Plus, Search, ShieldCheck, Star, Trash2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import type { BreadcrumbItem } from '@/types';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };
const NASUGBU_BOUNDS = { north: 14.115, south: 14.010, east: 120.680, west: 120.565 };

function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}

interface Responder {
    id: number;
    name: string;
    email: string;
    contact_number: string | null;
    home_address: string | null;
    home_latitude: number | null;
    home_longitude: number | null;
    avatar_url: string | null;
    total_assigned: number;
    active_assignments: number;
    resolved_count: number;
    created_at: string;
    team_id: number | null;
    team_name: string | null;
    team_is_active: boolean | null;
    is_leader: boolean;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    responders: Paginated<Responder>;
    filters: { search?: string };
    teams_count: number;
    stats: { total: number; active_assignments: number; total_resolved: number; in_teams: number };
    trends: { total: number; active_assignments: number; total_resolved: number; label: string; period_label: string };
    period: string;
    custom_from: string | null;
    custom_to: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Responders', href: '/admin/responders' },
];

export default function AdminRespondersIndex({ responders, filters, teams_count, stats, trends, period, custom_from, custom_to }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const [showCreate, setShowCreate] = useState(false);
    const [editingResponder, setEditingResponder] = useState<Responder | null>(null);
    const [searchValue, setSearchValue] = useState('');

    const handleDelete = async (r: Responder) => {
        const confirmed = await swalDelete(r.name);
        if (!confirmed) return;
        router.delete(`/admin/responders/${r.id}`, { preserveState: false, preserveScroll: true });
    };

    const filtered = responders.data.filter((r) => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.contact_number ?? '').toLowerCase().includes(q) || (r.home_address ?? '').toLowerCase().includes(q) || (r.team_name ?? '').toLowerCase().includes(q);
    });

    const hasFilters = !!searchValue;

    const tl = trends.label;
    const inTeamsPct = stats.total > 0 ? Math.round((stats.in_teams / stats.total) * 100) : 0;
    const loadPerResponder = stats.total > 0 ? Math.round(stats.active_assignments / stats.total * 10) / 10 : 0;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total': {
                if (stats.total === 0) return 'No responders registered — recruit responders to build emergency response capability.';
                const t = trends.total;
                const parts: string[] = [];
                if (t > 0) parts.push(`Responder capacity growing (${Math.abs(t)}% ${tl}) — building a stronger response force.`);
                else if (t === 0) parts.push(`Responder count stable ${tl}.`);
                if (inTeamsPct >= 80) parts.push('Most responders are organized in teams — strong coordination structure.');
                else if (inTeamsPct >= 50) parts.push('Moderate team organization — assign more responders to teams for better coordination.');
                else parts.push('Most responders are unassigned — organize them into teams for effective response.');
                if (loadPerResponder > 5) parts.push('Workload per responder is heavy — consider recruiting additional members.');
                return parts.join(' ');
            }
            case 'active': {
                if (stats.active_assignments === 0) return 'No active assignments — responders are available and on standby for incoming reports.';
                const t = trends.active_assignments;
                const parts: string[] = [];
                if (t > 30) parts.push(`Assignments surging (${Math.abs(t)}% ${tl}) — workload is intensifying, monitor for burnout.`);
                else if (t > 0) parts.push(`Assignments increasing (${Math.abs(t)}% ${tl}) — teams are being engaged with more reports.`);
                else if (t < -20) parts.push(`Assignments dropping (${Math.abs(t)}% ${tl}) — demand is easing, teams can focus on quality.`);
                else if (t < 0) parts.push(`Assignments easing (${Math.abs(t)}% ${tl}) — slightly lighter workload.`);
                else parts.push(`Assignment volume steady ${tl}.`);
                if (loadPerResponder > 5) parts.push('High load per responder — redistribute or add team members.');
                else if (loadPerResponder > 2) parts.push('Moderate workload — sustainable if teams are well-organized.');
                else parts.push('Light workload — capacity available for additional assignments.');
                return parts.join(' ');
            }
            case 'resolved': {
                if (stats.total_resolved === 0) return 'No assignments completed yet — encourage teams to close out cases and report progress.';
                const t = trends.total_resolved;
                const parts: string[] = [];
                if (t > 20) parts.push(`Resolutions surging (${Math.abs(t)}% ${tl}) — outstanding team productivity.`);
                else if (t > 0) parts.push(`Resolutions improving (${Math.abs(t)}% ${tl}) — teams are making steady progress.`);
                else if (t < -20) parts.push(`Resolutions dropping (${Math.abs(t)}% ${tl}) — check if teams are blocked or need support.`);
                else if (t < 0) parts.push(`Resolutions slowing (${Math.abs(t)}% ${tl}) — investigate potential blockers.`);
                else parts.push(`Resolution pace steady ${tl}.`);
                if (stats.total_resolved > stats.active_assignments) parts.push('Clearing faster than incoming — excellent throughput.');
                else if (stats.active_assignments > 0) parts.push('Active cases still outnumber completed — keep pushing for closures.');
                return parts.join(' ');
            }
            case 'in_teams': {
                if (stats.in_teams === 0) return 'No responders in teams — organize the workforce for coordinated emergency response.';
                const parts: string[] = [];
                if (inTeamsPct >= 90) parts.push('Almost all responders are in teams — excellent organizational coverage.');
                else if (inTeamsPct >= 60) parts.push('Good team coverage — assign remaining responders for full coordination.');
                else parts.push('Less than half of responders are in teams — this limits coordinated response capability.');
                if (stats.active_assignments > 0 && inTeamsPct < 50) parts.push('With active assignments ongoing, better team organization would improve response efficiency.');
                else if (inTeamsPct >= 90) parts.push('Team structure supports efficient deployment and communication.');
                return parts.join(' ');
            }
            default: return '';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Responders" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25">
                            <ShieldCheck className="size-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Responders</h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Manage responder accounts and track their assignments.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/responders" />
                        <Link
                            href="/admin/teams"
                            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            <Users className="size-4" />
                            Manage Teams
                        </Link>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                        >
                            <Plus className="size-4" />
                            Add Responder
                        </button>
                    </div>
                </div>

                {/* KPI Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <PrimaryStatCard
                        label="Total Responders"
                        value={stats.total}
                        trend={trends.total}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total')}
                        insights={[{ label: 'In Teams', value: stats.in_teams }]}
                        icon={ShieldCheck}
                        grad="from-violet-500 via-indigo-500 to-blue-500"
                        shadow="shadow-violet-500/40"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <PrimaryStatCard
                        label="Active Assignments"
                        value={stats.active_assignments}
                        trend={trends.active_assignments}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('active')}
                        insights={[]}
                        icon={Activity}
                        grad="from-amber-500 via-orange-500 to-red-500"
                        shadow="shadow-amber-500/40"
                        alert={stats.active_assignments > 0}
                        index={1}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={CheckCircle2}
                        grad="from-emerald-500 to-teal-500"
                        shadow="shadow-emerald-500/25"
                        value={stats.total_resolved}
                        label="Total Resolved"
                        trend={trends.total_resolved}
                        desc={smartDesc('resolved')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={Users}
                        grad="from-blue-500 to-indigo-500"
                        shadow="shadow-blue-500/25"
                        value={stats.in_teams}
                        label="In Teams"
                        trend={undefined}
                        desc={smartDesc('in_teams')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={500}
                    />
                </div>

                {/* Table card */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Responders</span>
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                {responders.total}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search responders..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-8 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-indigo-500 dark:focus:bg-neutral-900"
                                />
                                {searchValue && (
                                    <button onClick={() => setSearchValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile card view */}
                    <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                        {filtered.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                {r.avatar_url ? (
                                    <img src={r.avatar_url} alt={r.name} className="size-9 shrink-0 rounded-xl object-cover shadow-sm shadow-indigo-500/20" />
                                ) : (
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/20">
                                        {r.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
                                        {r.active_assignments > 0 ? (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800/40">
                                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                                                Idle
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{r.email}</p>
                                    {r.home_address && (
                                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                                            <MapPin className="size-3 shrink-0" />
                                            {r.home_address}
                                        </p>
                                    )}
                                    <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                                        <span>{r.total_assigned} assigned</span>
                                        <span>{r.resolved_count} resolved</span>
                                        {r.contact_number && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="size-3" />
                                                {r.contact_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Responder</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Team</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Home Address</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Assignments</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {filtered.map((r) => (
                                    <tr key={r.id} className="group transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {r.avatar_url ? (
                                                    <img src={r.avatar_url} alt={r.name} className="size-9 shrink-0 rounded-xl object-cover shadow-sm shadow-indigo-500/20" />
                                                ) : (
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/20">
                                                        {r.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
                                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{r.email}</p>
                                                    {r.contact_number && (
                                                        <p className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                                                            <Phone className="size-3" />
                                                            {r.contact_number}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {r.team_name ? (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Link
                                                        href="/admin/teams"
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 transition-colors hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-800/40"
                                                    >
                                                        <Users className="size-3" />
                                                        {r.team_name}
                                                    </Link>
                                                    {r.team_is_active === false && (
                                                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                            Inactive
                                                        </span>
                                                    )}
                                                    {r.is_leader && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800/40">
                                                            <Star className="size-2.5" />
                                                            Leader
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-300 dark:text-neutral-600">No team</span>
                                            )}
                                        </td>
                                        <td className="max-w-[200px] px-5 py-4">
                                            {r.home_address ? (
                                                <div className="flex items-start gap-1.5">
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                                                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={r.home_address}>
                                                        {r.home_address}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-indigo-700 dark:text-indigo-400">
                                                <ClipboardList className="size-4 text-indigo-500/70 dark:text-indigo-500/50" />
                                                {r.total_assigned}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {r.active_assignments > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800/40">
                                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                                                    <span className="size-1.5 rounded-full bg-neutral-400" />
                                                    Idle
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={() => setEditingResponder(r)}
                                                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-indigo-600 dark:hover:bg-neutral-800 dark:hover:text-indigo-400"
                                                    title="Edit responder"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(r)}
                                                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                    title="Delete responder"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25">
                                <ShieldCheck className="size-7 text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No responders found</p>
                                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your search.' : 'Add a responder to get started.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {responders.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {responders.total} responder{responders.total !== 1 ? 's' : ''} total
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        const prev = responders.links[0];
                                        if (prev?.url) router.get(prev.url);
                                    }}
                                    disabled={responders.current_page === 1}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {responders.links.slice(1, -1).map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm'
                                                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                                            }`}
                                        >
                                            {link.label}
                                        </button>
                                    ) : null,
                                )}
                                <button
                                    onClick={() => {
                                        const next = responders.links[responders.links.length - 1];
                                        if (next?.url) router.get(next.url);
                                    }}
                                    disabled={responders.current_page === responders.last_page}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <ResponderFormModal onClose={() => setShowCreate(false)} />
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingResponder && (
                    <ResponderFormModal
                        responder={editingResponder}
                        onClose={() => setEditingResponder(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Responder Form Modal (Create / Edit) ─── */

function ResponderFormModal({
    responder,
    onClose,
}: {
    responder?: Responder;
    onClose: () => void;
}) {
    const isEdit = !!responder;
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm({
        name:           responder?.name           ?? '',
        email:          responder?.email          ?? '',
        contact_number: responder?.contact_number ?? '09',
        password:       '',
        home_address:   responder?.home_address   ?? '',
        home_latitude:  responder?.home_latitude?.toString()  ?? '',
        home_longitude: responder?.home_longitude?.toString() ?? '',
    });

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '');
        const val = (digits.startsWith('09') ? digits : '09').slice(0, 11);
        form.setData('contact_number', val);
    };

    const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        if (e.key === 'Backspace' && (input.selectionStart ?? 0) <= 2 && (input.selectionEnd ?? 0) <= 2) {
            e.preventDefault();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/responders/${responder!.id}`, {
                preserveState: false,
                preserveScroll: true,
                onSuccess: () => { onClose(); swalSuccess('Success', 'Responder updated successfully.'); },
            });
        } else {
            form.post('/admin/responders', {
                preserveState: false,
                onSuccess: () => { form.reset(); onClose(); swalSuccess('Success', 'Responder created successfully.'); },
            });
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const inputClassName =
        'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-indigo-500 dark:focus:bg-neutral-900';

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={modalSpring}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center gap-3 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                    {isEdit && responder?.avatar_url ? (
                        <img src={responder.avatar_url} alt={responder.name} className="size-9 shrink-0 rounded-xl object-cover shadow-sm" />
                    ) : (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm">
                            {isEdit ? <Pencil className="size-4 text-white" /> : <Plus className="size-4 text-white" />}
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            {isEdit ? 'Edit Responder' : 'Add Responder'}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEdit ? `Update ${responder!.name}'s account details` : 'Create a new responder account'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Modal body */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField label="Full Name" error={form.errors.name}>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className={inputClassName}
                                placeholder="Juan Dela Cruz"
                                required
                            />
                        </FormField>
                        <FormField label="Email" error={form.errors.email}>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className={inputClassName}
                                placeholder="juan@example.com"
                                required
                            />
                        </FormField>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField label="Contact Number" error={form.errors.contact_number}>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.data.contact_number}
                                onChange={handlePhoneChange}
                                onKeyDown={handlePhoneKeyDown}
                                onFocus={(e) => { if (!e.target.value) form.setData('contact_number', '09'); }}
                                className={inputClassName}
                                placeholder="09XXXXXXXXX"
                                maxLength={11}
                            />
                        </FormField>
                        <FormField label={isEdit ? 'New Password' : 'Password'} error={form.errors.password}>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className={inputClassName + ' pr-10'}
                                    placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
                                    required={!isEdit}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                        </FormField>
                    </div>

                    <FormField label="Home Address" error={form.errors.home_address}>
                        <HomeAddressAutocomplete
                            value={form.data.home_address}
                            onChange={(addr, lat, lng) => {
                                form.setData('home_address', addr);
                                form.setData('home_latitude', lat);
                                form.setData('home_longitude', lng);
                            }}
                            className={inputClassName}
                        />
                    </FormField>

                    {/* Modal footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-neutral-200/60 pt-5 dark:border-neutral-700/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                        >
                            {isEdit ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                            {form.processing ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Responder'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Home Address Autocomplete ─── */

function HomeAddressAutocomplete({ value, onChange, className }: {
    value: string;
    onChange: (address: string, lat: string, lng: string) => void;
    className?: string;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [inputVal,    setInputVal]    = useState(value);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [open,        setOpen]        = useState(false);
    const [fetching,    setFetching]    = useState(false);

    const acServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef    = useRef<google.maps.places.PlacesService | null>(null);
    const placesDivRef = useRef<HTMLDivElement | null>(null);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef   = useRef<HTMLDivElement>(null);

    useEffect(() => { setInputVal(value); }, [value]);

    useEffect(() => {
        if (!isLoaded) return;
        acServiceRef.current = new google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        document.body.appendChild(div);
        placesDivRef.current = div;
        placesRef.current = new google.maps.places.PlacesService(div);
        return () => { if (placesDivRef.current) document.body.removeChild(placesDivRef.current); };
    }, [isLoaded]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchPredictions = useCallback((q: string) => {
        if (!q || q.length < 2 || !acServiceRef.current) { setPredictions([]); setOpen(false); return; }
        const bounds = new google.maps.LatLngBounds(
            { lat: NASUGBU_BOUNDS.south, lng: NASUGBU_BOUNDS.west },
            { lat: NASUGBU_BOUNDS.north, lng: NASUGBU_BOUNDS.east },
        );
        setFetching(true);
        acServiceRef.current.getPlacePredictions(
            { input: q, bounds, strictBounds: true, componentRestrictions: { country: 'ph' } },
            (preds, status) => {
                setFetching(false);
                if (status === 'OK' && preds) {
                    const filtered = preds.filter((p) => p.description.toLowerCase().includes('nasugbu'));
                    setPredictions(filtered);
                    setOpen(filtered.length > 0);
                } else {
                    setPredictions([]); setOpen(false);
                }
            },
        );
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setInputVal(q);
        onChange(q, '', '');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchPredictions(q), 300);
    };

    const selectPrediction = (pred: google.maps.places.AutocompletePrediction) => {
        setOpen(false);
        if (!placesRef.current) return;
        placesRef.current.getDetails(
            { placeId: pred.place_id, fields: ['formatted_address', 'geometry', 'name'] },
            (place, status) => {
                if (status !== 'OK' || !place?.geometry?.location) return;
                const lat  = place.geometry.location.lat().toFixed(7);
                const lng  = place.geometry.location.lng().toFixed(7);
                const addr = cleanAddress(place.formatted_address ?? place.name ?? '');
                setInputVal(addr);
                onChange(addr, lat, lng);
            },
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    value={inputVal}
                    onChange={handleInput}
                    onFocus={() => predictions.length > 0 && setOpen(true)}
                    placeholder="Search home address in Nasugbu…"
                    className={`${className} pl-9`}
                    autoComplete="off"
                />
                {fetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-indigo-500" />
                    </div>
                )}
            </div>
            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        >
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {pred.structured_formatting.main_text}
                            </span>
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                {pred.structured_formatting.secondary_text}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── Form Field ─── */

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
