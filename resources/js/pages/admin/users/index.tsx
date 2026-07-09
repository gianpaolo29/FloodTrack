import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    User as UserIcon,
    Users2,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { AdminUser } from '@/types/admin';

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Filters {
    role?: string;
    search?: string;
}

interface Props {
    users: Paginated<AdminUser>;
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Users', href: '/admin/users' },
];

const ROLE_STYLES: Record<string, string> = {
    resident:  'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-500/20',
    responder: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-500/20',
};

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 12 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 28 },
    },
    exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.15 } },
};

export default function AdminUsersIndex({ users, filters }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/users', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const hasFilters = !!(filters.role || filters.search);

    const allOnPageSelected = users.data.length > 0 && users.data.every((u) => selected.includes(u.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !users.data.some((u) => u.id === id)));
        } else {
            setSelected([...new Set([...selected, ...users.data.map((u) => u.id)])]);
        }
    };
    const toggleOne = (id: number) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const runBulkAction = (action: string) => {
        if (selected.length === 0) return;
        if (action === 'delete' && !confirmBulkDelete) { setConfirmBulkDelete(true); return; }
        setBulkProcessing(true);
        router.post('/admin/users/bulk', { ids: selected, action }, {
            preserveState: true,
            onFinish: () => { setBulkProcessing(false); setSelected([]); setConfirmBulkDelete(false); },
        });
    };

    const handleDelete = (id: number) => {
        router.delete(`/admin/users/${id}`, {
            preserveState: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Users</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {users.total} registered user{users.total !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                    >
                        <Plus className="size-4" />
                        Add User
                    </button>
                </div>

                {/* Create user modal */}
                <AnimatePresence>
                    {showCreate && (
                        <UserFormModal
                            title="Create User"
                            onClose={() => setShowCreate(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Edit user modal */}
                <AnimatePresence>
                    {editingUser && (
                        <UserFormModal
                            title="Edit User"
                            user={editingUser}
                            onClose={() => setEditingUser(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            defaultValue={filters.search ?? ''}
                            className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:focus:border-sky-500 dark:focus:bg-neutral-900"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') filter('search', (e.target as HTMLInputElement).value);
                            }}
                        />
                    </div>
                    <select
                        value={filters.role ?? ''}
                        onChange={(e) => filter('role', e.target.value)}
                        className="h-10 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:focus:border-sky-500 dark:focus:bg-neutral-900"
                    >
                        <option value="">All roles</option>
                        <option value="resident">Residents</option>
                        <option value="responder">Responders</option>
                    </select>
                    {hasFilters && (
                        <button
                            onClick={() => router.get('/admin/users')}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        >
                            <X className="size-3.5" /> Clear
                        </button>
                    )}
                </div>

                {/* Bulk action bar */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className="rounded-2xl border border-sky-200/60 bg-sky-50/50 p-3 dark:border-sky-800/40 dark:bg-sky-950/20"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{selected.length} selected</span>
                                <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
                                <button
                                    onClick={() => runBulkAction('make_resident')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40"
                                >
                                    <UserIcon className="size-3.5" /> Set Resident
                                </button>
                                <button
                                    onClick={() => runBulkAction('make_responder')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                                >
                                    <ShieldCheck className="size-3.5" /> Set Responder
                                </button>
                                {confirmBulkDelete ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Are you sure?</span>
                                        <button
                                            onClick={() => runBulkAction('delete')}
                                            disabled={bulkProcessing}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                        >
                                            <Trash2 className="size-3.5" /> Confirm Delete
                                        </button>
                                        <button
                                            onClick={() => setConfirmBulkDelete(false)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => runBulkAction('delete')}
                                        disabled={bulkProcessing}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40"
                                    >
                                        <Trash2 className="size-3.5" /> Delete
                                    </button>
                                )}
                                <div className="ml-auto">
                                    <button
                                        onClick={() => { setSelected([]); setConfirmBulkDelete(false); }}
                                        className="text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Table */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Table header */}
                    <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800/50">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                            <Users2 className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Users</h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{users.total} total</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left">
                                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 w-10">
                                        <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="size-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600" />
                                    </th>
                                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Name</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Email</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Role</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Contact</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Reports</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Active</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Joined</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group border-t border-neutral-100 transition-colors dark:border-neutral-800/50 ${
                                            selected.includes(user.id)
                                                ? 'bg-sky-50/50 dark:bg-sky-950/10'
                                                : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'
                                        }`}
                                    >
                                        <td className="px-4 py-3.5">
                                            <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleOne(user.id)} className="size-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600" />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-neutral-900 dark:text-neutral-100">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-neutral-500 dark:text-neutral-400">{user.email}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLES[user.role] ?? ''}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-neutral-500 dark:text-neutral-400">{user.contact_number ?? '\u2014'}</td>
                                        <td className="px-4 py-3.5 text-right tabular-nums font-medium text-neutral-900 dark:text-neutral-100">{user.reports_count}</td>
                                        <td className="px-4 py-3.5 text-right tabular-nums font-medium text-neutral-900 dark:text-neutral-100">{user.active_assignments}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                                            {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="rounded-lg p-1.5 text-neutral-400 opacity-0 transition-all hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                                    title="Edit user"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                {deletingId === user.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-red-700"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="rounded-lg px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeletingId(user.id)}
                                                        className="rounded-lg p-1.5 text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users2 className="size-8 text-neutral-300 dark:text-neutral-600" />
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No users found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Showing <span className="font-medium text-neutral-900 dark:text-neutral-100">{(users.current_page - 1) * users.per_page + 1}</span>
                            {'\u2013'}
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{Math.min(users.current_page * users.per_page, users.total)}</span> of{' '}
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{users.total}</span>
                        </span>
                        <div className="flex items-center gap-1">
                            {/* Previous */}
                            {users.links[0]?.url ? (
                                <Link
                                    href={users.links[0].url}
                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                >
                                    <ChevronLeft className="size-3.5" /> Prev
                                </Link>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-300 dark:text-neutral-600">
                                    <ChevronLeft className="size-3.5" /> Prev
                                </span>
                            )}

                            {/* Numbered pages */}
                            {users.links.slice(1, -1).map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`min-w-[32px] rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                                                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="min-w-[32px] rounded-lg px-3 py-1.5 text-center text-xs font-medium text-neutral-300 dark:text-neutral-600"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                )
                            ))}

                            {/* Next */}
                            {users.links[users.links.length - 1]?.url ? (
                                <Link
                                    href={users.links[users.links.length - 1].url!}
                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                >
                                    Next <ChevronRight className="size-3.5" />
                                </Link>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-300 dark:text-neutral-600">
                                    Next <ChevronRight className="size-3.5" />
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

/* ─── User Form Modal (Create / Edit) ─── */

function UserFormModal({
    title,
    user,
    onClose,
}: {
    title: string;
    user?: AdminUser;
    onClose: () => void;
}) {
    const isEdit = !!user;

    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'resident',
        contact_number: user?.contact_number ?? '',
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/users/${user!.id}`, { onSuccess: onClose });
        } else {
            form.post('/admin/users', { onSuccess: () => { form.reset(); onClose(); } });
        }
    };

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const inputClassName =
        'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:focus:border-sky-500 dark:focus:bg-neutral-900';

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                            {isEdit ? <Pencil className="size-4 text-white" /> : <Plus className="size-4 text-white" />}
                        </div>
                        <h3 className="text-base font-semibold text-white">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                                placeholder="John Doe"
                                required
                            />
                        </FormField>
                        <FormField label="Email" error={form.errors.email}>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className={inputClassName}
                                placeholder="john@example.com"
                                required
                            />
                        </FormField>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3">
                        <FormField label="Role" error={form.errors.role}>
                            <select
                                value={form.data.role}
                                onChange={(e) => form.setData('role', e.target.value as any)}
                                className={inputClassName}
                            >
                                <option value="resident">Resident</option>
                                <option value="responder">Responder</option>
                            </select>
                        </FormField>
                        <FormField label="Contact Number" error={form.errors.contact_number}>
                            <input
                                type="text"
                                value={form.data.contact_number}
                                onChange={(e) => form.setData('contact_number', e.target.value)}
                                className={inputClassName}
                                placeholder="+63 917 123 4567"
                            />
                        </FormField>
                        <FormField label={isEdit ? 'New Password' : 'Password'} error={form.errors.password}>
                            <input
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className={inputClassName}
                                placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
                                required={!isEdit}
                            />
                        </FormField>
                    </div>

                    {/* Modal footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-5 dark:border-neutral-800/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                        >
                            {isEdit ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                            {isEdit ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
