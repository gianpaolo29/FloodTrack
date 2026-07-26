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
    Search,
    Shield,
    ShieldCheck,
    Star,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
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

interface Props {
    teams: Paginated<Team>;
    responders: Responder[];
    filters: { search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Teams', href: '/admin/teams' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTeamsIndex({ teams, responders, filters }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Team | null>(null);

    const search = useCallback((value: string) => {
        router.get('/admin/teams', { search: value || undefined }, { preserveState: true, replace: true });
    }, []);

    const handleDelete = useCallback(async (team: Team) => {
        const confirmed = await swalDelete(`team "${team.name}"`);
        if (!confirmed) return;
        router.delete(`/admin/teams/${team.id}`, {
            onSuccess: () => swalSuccess('Deleted', 'Team has been deleted.'),
        });
    }, []);

    const totalMembers   = teams.data.reduce((s, t) => s + t.members.length, 0);
    const totalActive    = teams.data.reduce((s, t) => s + t.active_assignments, 0);

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
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Create Team
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-500/20">
                            <Users className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{teams.total}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Teams</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">All registered teams</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm shadow-indigo-500/20">
                            <ShieldCheck className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{totalMembers}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Members</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Across all teams</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/20">
                            <ClipboardList className="size-4 text-white" />
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{totalActive}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Active Assignments</p>
                        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">Currently deployed</p>
                    </div>
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
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    defaultValue={filters.search ?? ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') search((e.target as HTMLInputElement).value);
                                    }}
                                    className="h-9 w-52 rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500"
                                />
                            </div>
                            {filters.search && (
                                <button
                                    onClick={() => router.get('/admin/teams')}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800"
                                    title="Clear search"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Team cards grid */}
                    {teams.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                                <Users className="size-7 text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No teams found</p>
                                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                    {filters.search ? 'Try adjusting your search.' : 'Create a team to get started.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                            {teams.data.map((team) => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    onEdit={() => setEditTarget(team)}
                                    onDelete={() => handleDelete(team)}
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

function TeamCard({ team, onEdit, onDelete }: { team: Team; onEdit: () => void; onDelete: () => void }) {
    const leader = team.members.find((m) => m.id === team.leader_id);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex flex-col gap-4 rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-500/20">
                        <Shield className="size-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{team.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                onSuccess: () => { onClose(); swalSuccess('Updated', 'Team has been updated.'); },
            });
        } else {
            form.post('/admin/teams', {
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
