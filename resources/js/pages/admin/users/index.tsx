import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    User as UserIcon,
    Users2,
    X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    resident:  'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    responder: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
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
                        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                        <p className="text-sm text-muted-foreground">
                            {users.total} registered user{users.total !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                        <Plus className="size-3.5" />
                        Add User
                    </Button>
                </div>

                {/* Create user modal */}
                {showCreate && (
                    <UserFormCard
                        title="Create User"
                        onClose={() => setShowCreate(false)}
                    />
                )}

                {/* Edit user modal */}
                {editingUser && (
                    <UserFormCard
                        title="Edit User"
                        user={editingUser}
                        onClose={() => setEditingUser(null)}
                    />
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search name or email..."
                            defaultValue={filters.search ?? ''}
                            className="pl-9 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') filter('search', (e.target as HTMLInputElement).value);
                            }}
                        />
                    </div>
                    <select
                        value={filters.role ?? ''}
                        onChange={(e) => filter('role', e.target.value)}
                        className="h-9 rounded-lg border border-input bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="">All roles</option>
                        <option value="resident">Residents</option>
                        <option value="responder">Responders</option>
                    </select>
                    {hasFilters && (
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => router.get('/admin/users')}
                            className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" /> Clear
                        </Button>
                    )}
                </div>

                {/* Bulk action bar */}
                {selected.length > 0 && (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="flex flex-wrap items-center gap-3 p-3">
                            <span className="text-sm font-medium">{selected.length} selected</span>
                            <div className="h-5 w-px bg-border" />
                            <Button variant="outline" size="sm" className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => runBulkAction('make_resident')} disabled={bulkProcessing}>
                                <UserIcon className="size-3.5" /> Set Resident
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={() => runBulkAction('make_responder')} disabled={bulkProcessing}>
                                <ShieldCheck className="size-3.5" /> Set Responder
                            </Button>
                            {confirmBulkDelete ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-destructive">Are you sure?</span>
                                    <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => runBulkAction('delete')} disabled={bulkProcessing}>
                                        <Trash2 className="size-3.5" /> Confirm Delete
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmBulkDelete(false)}>Cancel</Button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" className="gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => runBulkAction('delete')} disabled={bulkProcessing}>
                                    <Trash2 className="size-3.5" /> Delete
                                </Button>
                            )}
                            <div className="ml-auto">
                                <Button variant="ghost" size="sm" onClick={() => { setSelected([]); setConfirmBulkDelete(false); }} className="text-muted-foreground">Clear selection</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    <th className="px-4 py-3 w-10">
                                        <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="size-4 rounded border-border text-primary focus:ring-primary/20" />
                                    </th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3 text-right">Reports</th>
                                    <th className="px-4 py-3 text-right">Active</th>
                                    <th className="px-4 py-3">Joined</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {users.data.map((user) => (
                                    <tr key={user.id} className={`group transition-colors ${selected.includes(user.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                                        <td className="px-4 py-3.5">
                                            <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleOne(user.id)} className="size-4 rounded border-border text-primary focus:ring-primary/20" />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground">{user.email}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLES[user.role] ?? ''}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground">{user.contact_number ?? '—'}</td>
                                        <td className="px-4 py-3.5 text-right tabular-nums font-medium">{user.reports_count}</td>
                                        <td className="px-4 py-3.5 text-right tabular-nums font-medium">{user.active_assignments}</td>
                                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Edit user"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                {deletingId === user.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeletingId(user.id)}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
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
                                                <Users2 className="size-8 text-muted-foreground/40" />
                                                <p className="text-sm text-muted-foreground">No users found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{(users.current_page - 1) * users.per_page + 1}</span>–<span className="font-medium text-foreground">{Math.min(users.current_page * users.per_page, users.total)}</span> of{' '}
                            <span className="font-medium text-foreground">{users.total}</span>
                        </span>
                        <div className="flex gap-1">
                            {users.links.map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                            link.active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span key={i} className="rounded-lg px-3 py-1.5 text-xs opacity-30" dangerouslySetInnerHTML={{ __html: link.label }} />
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

/* ─── User Form Card (Create / Edit) ─── */

function UserFormCard({
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

    return (
        <Card className="border-primary/20 overflow-hidden">
            <div className="flex items-center justify-between border-b bg-primary/5 px-6 py-4">
                <h3 className="text-sm font-semibold">{title}</h3>
                <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="size-4" />
                </button>
            </div>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField label="Full Name" error={form.errors.name}>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="John Doe"
                                required
                            />
                        </FormField>
                        <FormField label="Email" error={form.errors.email}>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="+63 917 123 4567"
                            />
                        </FormField>
                        <FormField label={isEdit ? 'New Password (optional)' : 'Password'} error={form.errors.password}>
                            <input
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
                                required={!isEdit}
                            />
                        </FormField>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={form.processing} className="gap-1.5">
                            {isEdit ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                            {isEdit ? 'Save Changes' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
