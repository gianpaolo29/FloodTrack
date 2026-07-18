import { swalDelete, swalSuccess } from '@/lib/swal';
import { Head, router, useForm } from '@inertiajs/react';
import { useJsApiLoader } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    MapPin,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const NASUGBU_BOUNDS = { north: 14.115, south: 14.010, east: 120.680, west: 120.565 };

function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}

const PLUS_CODE_RE = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}$/i;

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

    const withAddressCount  = users.data.filter((u) => !!u.home_address).length;
    const totalReportsCount = users.data.reduce((sum, u) => sum + (u.reports_count ?? 0), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Residents" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                            <Users2 className="size-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Residents
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Manage resident accounts and their information
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Resident
                    </button>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/30">
                                <Users2 className="size-4 text-violet-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{users.total}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">registered residents</p>
                    </div>
                    <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-purple-50/60 p-5 shadow-sm dark:border-violet-800/40 dark:from-violet-950/30 dark:to-purple-950/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-500">With Address</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                                <MapPin className="size-4 text-violet-500" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-violet-800 dark:text-violet-300">{withAddressCount}</p>
                        <p className="mt-1 text-xs text-violet-600/70 dark:text-violet-500/70">on this page</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Reports</p>
                            <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <FileText className="size-4 text-neutral-400" />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-700 dark:text-neutral-300">{totalReportsCount}</p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">filed this page</p>
                    </div>
                </div>

                {/* ── Bulk action bar ── */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.99 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 to-purple-50/60 px-5 py-3.5 dark:border-violet-800/40 dark:from-violet-950/30 dark:to-purple-950/20"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-4 w-px bg-violet-300/60 dark:bg-violet-700/60" />
                                <button
                                    onClick={() => runBulkAction('delete')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <button
                                    onClick={() => setSelected([])}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/40"
                                >
                                    Clear selection
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Table Card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                            All Residents
                            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                {users.total}
                            </span>
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search residents..."
                                    defaultValue={filters.search ?? ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') filter('search', (e.target as HTMLInputElement).value);
                                    }}
                                    className="h-9 w-52 rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none transition-all placeholder:text-neutral-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                                />
                            </div>
                            {hasFilters && (
                                <button
                                    onClick={() => router.get('/admin/users')}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-neutral-700 dark:hover:border-red-800/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    title="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-800/40">
                                    <th className="w-10 px-5 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500/20 dark:border-neutral-600"
                                        />
                                    </th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Resident</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Contact</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Home Address</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Reports</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group transition-colors ${
                                            selected.includes(user.id)
                                                ? 'bg-violet-50/60 dark:bg-violet-950/20'
                                                : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30'
                                        }`}
                                    >
                                        <td className="w-10 px-5 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(user.id)}
                                                onChange={() => toggleOne(user.id)}
                                                className="size-3.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500/20 dark:border-neutral-600"
                                            />
                                        </td>

                                        {/* Resident */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
                                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-5 py-4">
                                            {user.contact_number ? (
                                                <span className="text-xs text-neutral-600 dark:text-neutral-400">{user.contact_number}</span>
                                            ) : (
                                                <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Home Address */}
                                        <td className="max-w-[200px] px-5 py-4">
                                            {user.home_address ? (
                                                <div className="flex items-start gap-1.5">
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                                                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={user.home_address}>
                                                        {user.home_address}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Reports */}
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                                                (user.reports_count ?? 0) > 0
                                                    ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-700/40'
                                                    : 'text-neutral-400 dark:text-neutral-500'
                                            }`}>
                                                {user.reports_count ?? 0}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                                                    title="Edit resident"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                    title="Delete resident"
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
                    {users.data.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20">
                                <Users2 className="size-8 text-violet-400 dark:text-violet-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No residents found</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your search.' : 'No residents have registered yet.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Page{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{users.current_page}</span>
                                {' '}of{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{users.last_page}</span>
                                <span className="ml-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="ml-2">{users.total} total</span>
                            </span>
                            <div className="flex items-center gap-1">
                                {users.links.map((link, i) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next')     || link.label.includes('&raquo;');
                                    if (isPrev || isNext) {
                                        return link.url ? (
                                            <button key={i} onClick={() => router.get(link.url!)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-violet-700/40 dark:hover:bg-violet-950/20 dark:hover:text-violet-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                        ) : (
                                            <span key={i} className="flex size-8 items-center justify-center rounded-lg opacity-30 text-neutral-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </span>
                                        );
                                    }
                                    return link.url ? (
                                        <button key={i} onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm'
                                                    : 'border border-neutral-200 text-neutral-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-violet-700/40 dark:hover:bg-violet-950/20'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span key={i} className="flex size-8 items-center justify-center rounded-lg text-xs opacity-30 text-neutral-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }} />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
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
        name:           user?.name           ?? '',
        email:          user?.email          ?? '',
        role:           'resident',
        contact_number: user?.contact_number ?? '',
        password:       '',
        home_address:   user?.home_address   ?? '',
        home_latitude:  user?.home_latitude?.toString()  ?? '',
        home_longitude: user?.home_longitude?.toString() ?? '',
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

/* ─── Home Address Autocomplete (Nasugbu-scoped) ─── */

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
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-sky-500" />
                    </div>
                )}
            </div>
            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/30"
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
