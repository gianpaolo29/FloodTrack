import { swalDelete, swalSuccess } from '@/lib/swal';
import { Head, router, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pencil,
    Plus,
    Search,
    Trash2,
    Users2,
    X,
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
    search?: string;
}

interface Props {
    users: Paginated<AdminUser>;
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Residents', href: '/admin/users' },
];

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

export default function AdminUsersIndex({ users, filters }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/users', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const hasFilters = !!filters.search;

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

    const runBulkAction = async (action: string) => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected resident(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post('/admin/users/bulk', { ids: selected, action }, {
            preserveState: true,
            onFinish: () => { setBulkProcessing(false); setSelected([]); },
            onSuccess: () => swalSuccess('Done', `Bulk ${action} completed successfully.`),
        });
    };

    const handleDelete = async (id: number) => {
        const confirmed = await swalDelete('this resident');
        if (!confirmed) return;
        router.delete(`/admin/users/${id}`, {
            preserveState: true,
            onSuccess: () => swalSuccess('Deleted', 'Resident has been deleted.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Residents" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Residents</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Manage resident accounts.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Resident
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4">
                    <StatCard
                        icon={Users2}
                        iconBg="bg-blue-50 dark:bg-blue-950/30"
                        iconColor="text-blue-600 dark:text-blue-400"
                        label="Total Residents"
                        value={users.total}
                    />
                </div>

                {/* Bulk action bar */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-2xl border border-sky-200/60 bg-sky-50/80 px-5 py-3 dark:border-sky-800/40 dark:bg-sky-950/30"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">{selected.length} selected</span>
                                <div className="h-5 w-px bg-sky-200 dark:bg-sky-800" />
                                <button
                                    onClick={() => runBulkAction('delete')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <div className="ml-auto">
                                    <button
                                        onClick={() => setSelected([])}
                                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Table card */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Table header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                                <Users2 className="size-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Residents</h2>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{users.total} results</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search residents..."
                                    defaultValue={filters.search ?? ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') filter('search', (e.target as HTMLInputElement).value);
                                    }}
                                    className="h-9 w-56 rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500"
                                />
                            </div>
                            {hasFilters && (
                                <button
                                    onClick={() => router.get('/admin/users')}
                                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                    title="Clear filters"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                    <th className="px-6 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Resident</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Reports</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group transition-colors ${
                                            selected.includes(user.id)
                                                ? 'bg-sky-50/60 dark:bg-sky-950/20'
                                                : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20'
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(user.id)}
                                                onChange={() => toggleOne(user.id)}
                                                className="size-3.5 rounded border-neutral-300 text-sky-600 focus:ring-sky-500/20 dark:border-neutral-600"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-100 text-sm font-bold text-sky-700 shadow-sm dark:from-sky-900/40 dark:to-blue-900/40 dark:text-sky-300">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
                                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                                                {user.reports_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                                    title="Edit resident"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                    title="Delete resident"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.data.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-20">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                <Users2 className="size-6 text-neutral-400 dark:text-neutral-500" />
                            </div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">No residents found</p>
                            {hasFilters && (
                                <button
                                    onClick={() => router.get('/admin/users')}
                                    className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Page {users.current_page} of {users.last_page}
                        </span>
                        <div className="flex gap-1">
                            {users.links.map((link, i) =>
                                link.url ? (
                                    <a
                                        key={i}
                                        href={link.url}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.get(link.url!);
                                        }}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                                                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded-lg px-3 py-1.5 text-xs opacity-30"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <UserFormModal
                        title="Add Resident"
                        onClose={() => setShowCreate(false)}
                    />
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <UserFormModal
                        title="Edit Resident"
                        user={editingUser}
                        onClose={() => setEditingUser(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Stat Card ─── */

function StatCard({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    value,
}: {
    icon: typeof Users2;
    iconBg: string;
    iconColor: string;
    label: string;
    value: number;
}) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-neutral-200/60 bg-white px-5 py-4 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="flex flex-col gap-1">
                <div className={`flex size-10 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon className={`size-5 ${iconColor}`} />
                </div>
                <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
            </div>
            <p className="text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
        </div>
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
        role: 'resident',
        contact_number: user?.contact_number ?? '',
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/users/${user!.id}`, { onSuccess: () => { onClose(); swalSuccess('Success', 'Resident updated successfully.'); } });
        } else {
            form.post('/admin/users', { onSuccess: () => { form.reset(); onClose(); swalSuccess('Success', 'Resident added successfully.'); } });
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const inputClassName =
        'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:bg-neutral-900';

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
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                        {isEdit ? <Pencil className="size-4 text-white" /> : <Plus className="size-4 text-white" />}
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEdit ? 'Update resident details' : 'Add a new resident account'}
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
                    <div className="grid gap-5 sm:grid-cols-2">
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
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                        >
                            {isEdit ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                            {form.processing ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Resident'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
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
