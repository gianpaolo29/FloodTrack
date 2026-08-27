import { swalDelete, swalSuccess } from '@/lib/swal';
import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Pencil,
    Plus,
    PowerOff,
    Search,
    Shield,
    ShieldCheck,
    Star,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import type { BreadcrumbItem } from '@/types';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

// ─── Types ───────────────────────────────────────────────────────────────────

interface Responder {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    team_id: number | null;
}

interface TeamMember {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    is_leader: boolean;
}

interface Team {
    id: number;
    name: string;
    leader_id: number;
    members: TeamMember[];
    active_assignments: number;
    total_assigned: number;
    resolved_count: number;
    avg_response_minutes: number;
    is_active: boolean;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface TeamStats {
    total_teams: number;
    total_responders: number;
    in_teams: number;
    unassigned: number;
}

interface Trends {
    total_teams?: number;
    label: string;
    period_label: string;
}

interface Props {
    teams: Paginated<Team>;
    responders: Responder[];
    filters: { search?: string };
    stats: TeamStats;
    trends: Trends;
    period: string;
    custom_from?: string | null;
    custom_to?: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Teams', href: '/admin/teams' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTeamsIndex({ teams, responders, filters, stats, trends, period, custom_from, custom_to }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Team | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const handleDelete = useCallback(async (team: Team) => {
        const confirmed = await swalDelete(`team "${team.name}"`);
        if (!confirmed) return;
        router.delete(`/admin/teams/${team.id}`, {
            preserveState: false,
            onSuccess: () => swalSuccess('Deleted', 'Team has been deleted.'),
        });
    }, []);

    const handleToggle = useCallback((team: Team) => {
        router.post(`/admin/teams/${team.id}/toggle`, {}, {
            preserveState: false,
            preserveScroll: true,
        });
    }, []);

    const filtered = teams.data.filter((t) => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.members.some((m) => m.name.toLowerCase().includes(q));
    });

    const tl = trends.label;
    const assignedPct = stats.total_responders > 0 ? Math.round((stats.in_teams / stats.total_responders) * 100) : 0;
    const avgPerTeam = stats.total_teams > 0 ? Math.round(stats.total_responders / stats.total_teams * 10) / 10 : 0;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total_teams': {
                if (stats.total_teams === 0) return 'No teams created yet — organize responders into teams to improve coordination.';
                const t = trends.total_teams;
                const parts: string[] = [];
                if (t > 0) parts.push(`Teams expanding (${Math.abs(t)}% ${tl}) — response capacity is growing.`);
                else if (t === 0) parts.push(`Team count stable ${tl}.`);
                if (avgPerTeam < 2) parts.push('Teams are understaffed — consider consolidating or recruiting more responders.');
                else if (avgPerTeam > 6) parts.push('Large teams — consider splitting for better area coverage.');
                else parts.push('Team sizes look balanced for effective coordination.');
                if (stats.unassigned > 3) parts.push('Several responders still unassigned — form a new team or redistribute.');
                return parts.join(' ');
            }
            case 'total_responders': {
                if (stats.total_responders === 0) return 'No responders registered yet — add responders to start building teams.';
                const parts: string[] = [];
                if (assignedPct >= 90) parts.push('Nearly all responders are in teams — excellent organization.');
                else if (assignedPct >= 60) parts.push('Most responders are assigned to teams — good coverage.');
                else if (assignedPct > 0) parts.push('Less than half of responders are in teams — improve team assignments for better coordination.');
                else parts.push('No responders assigned to teams yet — start organizing teams immediately.');
                if (stats.unassigned > 5) parts.push('Enough unassigned responders to form new teams — consider expanding.');
                else if (stats.unassigned > 0) parts.push('A few responders available for reassignment if needed.');
                return parts.join(' ');
            }
            case 'in_teams': {
                if (stats.in_teams === 0) return 'No responders assigned to teams yet — organize the workforce for coordinated response.';
                const parts: string[] = [];
                if (assignedPct >= 90) parts.push('Almost full team coverage — response coordination is strong.');
                else if (assignedPct >= 60) parts.push('Good team coverage — continue assigning remaining responders for full coordination.');
                else parts.push('Team coverage is low — many responders are operating without team coordination.');
                if (avgPerTeam < 2) parts.push('Average team size is small — consolidate teams for better effectiveness.');
                else parts.push('Team sizes are adequate for coordinated operations.');
                return parts.join(' ');
            }
            case 'unassigned': {
                if (stats.unassigned === 0) return 'All responders are assigned — full team coverage achieved. Great organization.';
                const parts: string[] = [];
                if (stats.unassigned >= 6) parts.push('Significant pool of unassigned responders — enough to form multiple new teams.');
                else if (stats.unassigned >= 3) parts.push('Enough unassigned responders for a new team — consider organizing them.');
                else parts.push('Small number of unassigned responders — assign them to existing teams for full coverage.');
                if (assignedPct < 50) parts.push('Over half the workforce is unassigned — this limits coordinated response capability.');
                else parts.push('Most responders are already organized — these are the remaining few.');
                return parts.join(' ');
            }
            default: return '';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teams" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                            <Users className="size-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Teams</h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Organize responders into coordinated teams.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/teams" />
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                        >
                            <Plus className="size-4" />
                            Create Team
                        </button>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <PrimaryStatCard
                        label="Total Teams"
                        value={stats.total_teams}
                        trend={trends.total_teams}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total_teams')}
                        insights={[
                            { label: 'In Teams', value: stats.in_teams, color: '#10b981' },
                            { label: 'Unassigned', value: stats.unassigned, color: '#f59e0b' },
                        ]}
                        icon={Users}
                        grad="from-indigo-500 via-violet-500 to-purple-500"
                        shadow="shadow-indigo-500/40"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={ShieldCheck}
                        grad="from-blue-500 to-indigo-500"
                        shadow="shadow-blue-500/25"
                        value={stats.total_responders}
                        label="Total Responders"
                        desc={smartDesc('total_responders')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={300}
                    />
                    <SecondaryStatCard
                        icon={Shield}
                        grad="from-emerald-500 to-teal-500"
                        shadow="shadow-emerald-500/25"
                        value={stats.in_teams}
                        label="In Teams"
                        desc={smartDesc('in_teams')}
                        insights={[
                            { label: '% assigned', value: stats.total_responders > 0 ? `${Math.round((stats.in_teams / stats.total_responders) * 100)}%` : '0%', color: '#10b981' },
                        ]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={Users}
                        grad="from-amber-500 to-orange-500"
                        shadow="shadow-amber-500/25"
                        value={stats.unassigned}
                        label="Unassigned"
                        desc={smartDesc('unassigned')}
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
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Teams</span>
                            <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                {teams.total}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-8 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500"
                                />
                                {searchValue && (
                                    <button onClick={() => setSearchValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team cards grid */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                                <Users className="size-7 text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No teams found</p>
                                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                    {searchValue ? 'Try adjusting your search.' : 'Create a team to get started.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((team) => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    onEdit={() => setEditTarget(team)}
                                    onDelete={() => handleDelete(team)}
                                    onToggle={() => handleToggle(team)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {teams.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {teams.total} team{teams.total !== 1 ? 's' : ''} total
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { const p = teams.links[0]; if (p?.url) router.get(p.url); }}
                                    disabled={teams.current_page === 1}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {teams.links.slice(1, -1).map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm'
                                                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
                                            }`}
                                        >
                                            {link.label}
                                        </button>
                                    ) : null,
                                )}
                                <button
                                    onClick={() => { const n = teams.links[teams.links.length - 1]; if (n?.url) router.get(n.url); }}
                                    disabled={teams.current_page === teams.last_page}
                                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create modal */}
            <AnimatePresence>
                {showCreate && (
                    <TeamFormModal
                        responders={responders}
                        onClose={() => setShowCreate(false)}
                    />
                )}
            </AnimatePresence>

            {/* Edit modal */}
            <AnimatePresence>
                {editTarget && (
                    <TeamFormModal
                        team={editTarget}
                        responders={responders}
                        onClose={() => setEditTarget(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team, onEdit, onDelete, onToggle }: { team: Team; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
    const leader = team.members.find((m) => m.id === team.leader_id);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-neutral-900 ${team.is_active ? 'border-neutral-200/60 dark:border-neutral-700/60' : 'border-neutral-300/60 opacity-70 dark:border-neutral-600/60'}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${team.is_active ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                        <Shield className="size-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{team.name}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${team.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800' : 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700'}`}>
                                <span className={`size-1.5 rounded-full ${team.is_active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                                {team.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={onToggle}
                        className={`rounded-lg p-1.5 transition-colors ${team.is_active ? 'text-neutral-400 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-950/30' : 'text-neutral-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950/30'}`}
                        title={team.is_active ? 'Deactivate team' : 'Activate team'}
                    >
                        <PowerOff className="size-3.5" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                        title="Edit team"
                    >
                        <Pencil className="size-3.5" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                        title="Delete team"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </div>

            {/* Leader */}
            {leader && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/60 px-3 py-2 dark:bg-amber-950/20">
                    <Star className="size-3.5 shrink-0 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Leader:</span>
                    <span className="truncate text-xs text-amber-700 dark:text-amber-300">{leader.name}</span>
                </div>
            )}

            {/* Members */}
            <div className="flex flex-col gap-1.5">
                {team.members.slice(0, 4).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                        <div className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${m.is_leader ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-400 to-blue-500'}`}>
                            {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-xs text-neutral-700 dark:text-neutral-300">{m.name}</span>
                        {m.is_leader && (
                            <Star className="ml-auto size-3 shrink-0 text-amber-400" />
                        )}
                    </div>
                ))}
                {team.members.length > 4 && (
                    <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                        +{team.members.length - 4} more
                    </p>
                )}
            </div>

            {/* Performance metrics */}
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/40">
                {team.total_assigned === 0 ? (
                    <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500">Not yet deployed</p>
                ) : (
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-emerald-600 dark:text-emerald-400">
                            ✓ {team.resolved_count} resolved
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                            {team.total_assigned > 0 ? Math.round((team.resolved_count / team.total_assigned) * 100) : 0}% rate
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-neutral-500 dark:text-neutral-400">
                            ~{team.avg_response_minutes >= 60
                                ? `${Math.floor(team.avg_response_minutes / 60)}h ${Math.round(team.avg_response_minutes % 60)}m`
                                : `${Math.round(team.avg_response_minutes)}m`} avg
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Created {new Date(team.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {team.active_assignments > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                        {team.active_assignments} active
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// ─── Team Form Modal (Create / Edit) ─────────────────────────────────────────

function TeamFormModal({
    team,
    responders,
    onClose,
}: {
    team?: Team;
    responders: Responder[];
    onClose: () => void;
}) {
    const isEdit = !!team;

    const form = useForm({
        name:       team?.name ?? '',
        leader_id:  team?.leader_id ? String(team.leader_id) : '',
        member_ids: team?.members.map((m) => String(m.id)) ?? [] as string[],
    });

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/teams/${team!.id}`, {
                preserveState: false,
                onSuccess: () => { onClose(); swalSuccess('Updated', 'Team has been updated.'); },
            });
        } else {
            form.post('/admin/teams', {
                preserveState: false,
                onSuccess: () => { form.reset(); onClose(); swalSuccess('Created', 'Team has been created.'); },
            });
        }
    };

    const toggleMember = (id: string) => {
        const current = form.data.member_ids;
        form.setData(
            'member_ids',
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        );
    };

    // If leader is set but not in members, auto-add
    const ensureLeaderInMembers = (leaderId: string) => {
        if (leaderId && !form.data.member_ids.includes(leaderId)) {
            form.setData('member_ids', [...form.data.member_ids, leaderId]);
        }
        form.setData('leader_id', leaderId);
    };

    const inputClass =
        'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500';

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
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={modalSpring}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                        {isEdit ? <Pencil className="size-4 text-white" /> : <Plus className="size-4 text-white" />}
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            {isEdit ? 'Edit Team' : 'Create Team'}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEdit ? `Editing "${team!.name}"` : 'Set up a new response team'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto p-6" style={{ maxHeight: '70vh' }}>

                    {/* Team name */}
                    <FormField label="Team Name" error={form.errors.name}>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Alpha Squad"
                            required
                        />
                    </FormField>

                    {/* Leader */}
                    <FormField label="Team Leader" error={form.errors.leader_id}>
                        <div className="relative">
                            <select
                                value={form.data.leader_id}
                                onChange={(e) => ensureLeaderInMembers(e.target.value)}
                                className={inputClass + ' appearance-none pr-8'}
                                required
                            >
                                <option value="">Select leader...</option>
                                {responders.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                    </FormField>

                    {/* Members */}
                    <FormField label={`Members (${form.data.member_ids.length} selected)`} error={form.errors.member_ids as string | undefined}>
                        <div className="max-h-52 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                            {responders.map((r, idx) => {
                                const selected  = form.data.member_ids.includes(String(r.id));
                                const isLeader  = String(r.id) === form.data.leader_id;
                                const isLast    = idx === responders.length - 1;
                                return (
                                    <label
                                        key={r.id}
                                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${selected ? 'bg-violet-50/60 dark:bg-violet-950/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'} ${!isLast ? 'border-b border-neutral-100 dark:border-neutral-800' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => toggleMember(String(r.id))}
                                            disabled={isLeader} // leader always included
                                            className="size-4 rounded accent-violet-600"
                                        />
                                        <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${isLeader ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-400 to-blue-500'}`}>
                                            {r.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.name}</p>
                                            <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{r.email}</p>
                                        </div>
                                        {isLeader && (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                                                <Star className="size-2.5" />
                                                Leader
                                            </span>
                                        )}
                                        {!isLeader && r.team_id && r.team_id !== team?.id && (
                                            <span className="shrink-0 text-[10px] text-neutral-400">in team</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </FormField>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-neutral-200/60 pt-2 dark:border-neutral-700/60">
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
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                        >
                            {isEdit ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                            {form.processing ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save Changes' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {label}
            </label>
            {children}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
