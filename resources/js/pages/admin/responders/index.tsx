import { swalSuccess } from '@/lib/swal';
import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, CheckCircle2, ClipboardList, Eye, Pencil, Phone, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

interface Responder {
    id: number;
    name: string;
    email: string;
    contact_number: string | null;
    total_assigned: number;
    active_assignments: number;
    resolved_count: number;
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
    responders: Paginated<Responder>;
    filters: { search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Responders', href: '/admin/responders' },
];

export default function AdminRespondersIndex({ responders, filters }: Props) {
    const [showCreate, setShowCreate] = useState(false);

    const search = useCallback((value: string) => {
        router.get('/admin/responders', { search: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, []);

    const totalActive = responders.data.reduce((sum, r) => sum + r.active_assignments, 0);
    const totalResolved = responders.data.reduce((sum, r) => sum + r.resolved_count, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Responders" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Responders</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Manage responder accounts and track their assignments.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]"
                    >
                        <Plus className="size-4" />
                        Add Responder
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-4">
                    <StatCard
                        icon={ShieldCheck}
                        iconBg="bg-blue-50 dark:bg-blue-950/30"
                        iconColor="text-blue-600 dark:text-blue-400"
                        label="Total Responders"
                        value={responders.total}
                    />
                    <StatCard
                        icon={Activity}
                        iconBg="bg-emerald-50 dark:bg-emerald-950/30"
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        label="Active"
                        value={totalActive}
                    />
                    <StatCard
                        icon={CheckCircle2}
                        iconBg="bg-amber-50 dark:bg-amber-950/30"
                        iconColor="text-amber-600 dark:text-amber-400"
                        label="Total Resolved"
                        value={totalResolved}
                    />
                </div>

                {/* Table card */}
                <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Table header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                                <Users className="size-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Responders</h2>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{responders.total} results</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search responders..."
                                    defaultValue={filters.search ?? ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') search((e.target as HTMLInputElement).value);
                                    }}
                                    className="h-9 w-56 rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500"
                                />
                            </div>
                            {filters.search && (
                                <button
                                    onClick={() => router.get('/admin/responders')}
                                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                    title="Clear search"
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
                                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Responder</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Assignments</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Status</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {responders.data.map((r) => (
                                    <tr key={r.id} className="group transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-100 text-sm font-bold text-sky-700 dark:from-sky-900/40 dark:to-blue-900/40 dark:text-sky-300">
                                                    {r.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
                                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{r.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                                                <ClipboardList className="size-4 text-sky-500/70 dark:text-sky-500/50" />
                                                {r.total_assigned}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {r.active_assignments > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                    <span className="size-1.5 rounded-full bg-neutral-400" />
                                                    idle
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                                    title="View details"
                                                >
                                                    <Eye className="size-4" />
                                                </button>
                                                <button
                                                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                                    title="Edit responder"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {responders.data.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-20">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                <ShieldCheck className="size-6 text-neutral-400 dark:text-neutral-500" />
                            </div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">No responders found</p>
                            {filters.search && (
                                <button
                                    onClick={() => router.get('/admin/responders')}
                                    className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {responders.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            Page {responders.current_page} of {responders.last_page}
                        </span>
                        <div className="flex gap-1">
                            {responders.links.map((link, i) =>
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
                    <ResponderFormModal onClose={() => setShowCreate(false)} />
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
    icon: typeof ShieldCheck;
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

/* ─── Responder Form Modal (Create) ─── */

function ResponderFormModal({ onClose }: { onClose: () => void }) {
    const form = useForm({
        name: '',
        email: '',
        contact_number: '',
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/responders', {
            onSuccess: () => {
                form.reset();
                onClose();
                swalSuccess('Success', 'Responder created successfully.');
            },
        });
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
                        <Plus className="size-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Add Responder</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Create a new responder account</p>
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
                                value={form.data.contact_number}
                                onChange={(e) => form.setData('contact_number', e.target.value)}
                                className={inputClassName}
                                placeholder="+63 917 123 4567"
                            />
                        </FormField>
                        <FormField label="Password" error={form.errors.password}>
                            <input
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className={inputClassName}
                                placeholder="Min 8 characters"
                                required
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
                            <Plus className="size-3.5" />
                            {form.processing ? 'Creating...' : 'Create Responder'}
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
