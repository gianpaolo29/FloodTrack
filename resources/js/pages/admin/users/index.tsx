import { Head, Link, router, useForm } from '@inertiajs/react';
import { Search, Users2, X } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/users', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const hasFilters = !!(filters.role || filters.search);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                    <p className="text-sm text-muted-foreground">
                        {users.total} registered user{users.total !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search name or email..."
                            defaultValue={filters.search ?? ''}
                            className="pl-9 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    filter('search', (e.target as HTMLInputElement).value);
                                }
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
                            variant="ghost"
                            size="sm"
                            onClick={() => router.get('/admin/users')}
                            className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" />
                            Clear
                        </Button>
                    )}
                </div>

                {/* Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3 text-right">Reports</th>
                                    <th className="px-6 py-3 text-right">Active</th>
                                    <th className="px-6 py-3">Joined</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {users.data.map((user) => (
                                    <UserRow key={user.id} user={user} />
                                ))}
                                {users.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
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
                                    <span
                                        key={i}
                                        className="rounded-lg px-3 py-1.5 text-xs opacity-30"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function UserRow({ user }: { user: AdminUser }) {
    const roleForm = useForm({ role: user.role });

    return (
        <tr className="group transition-colors hover:bg-muted/30">
            <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.name}</span>
                </div>
            </td>
            <td className="px-6 py-3.5 text-muted-foreground">{user.email}</td>
            <td className="px-6 py-3.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLES[user.role] ?? ''}`}>
                    {user.role}
                </span>
            </td>
            <td className="px-6 py-3.5 text-muted-foreground">{user.contact_number ?? '—'}</td>
            <td className="px-6 py-3.5 text-right tabular-nums font-medium">{user.reports_count}</td>
            <td className="px-6 py-3.5 text-right tabular-nums font-medium">{user.active_assignments}</td>
            <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
            <td className="px-6 py-3.5">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        roleForm.patch(`/admin/users/${user.id}/role`);
                    }}
                    className="flex items-center gap-2"
                >
                    <select
                        value={roleForm.data.role}
                        onChange={(e) => roleForm.setData('role', e.target.value as typeof roleForm.data.role)}
                        className="h-7 rounded-md border border-input bg-muted/30 px-2 text-xs transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="resident">Resident</option>
                        <option value="responder">Responder</option>
                    </select>
                    {roleForm.isDirty && (
                        <button
                            type="submit"
                            disabled={roleForm.processing}
                            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                        >
                            Save
                        </button>
                    )}
                </form>
            </td>
        </tr>
    );
}
