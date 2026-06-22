import { Head, Link, router, useForm } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useCallback } from 'react';
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

const ROLE_COLORS: Record<string, string> = {
    resident:  'bg-blue-100 text-blue-700',
    responder: 'bg-teal-100 text-teal-700',
};

export default function AdminUsersIndex({ users, filters }: Props) {
    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/users', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6">

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search name or email…"
                            defaultValue={filters.search ?? ''}
                            className="pl-9"
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
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="">All roles</option>
                        <option value="resident">Residents</option>
                        <option value="responder">Responders</option>
                    </select>
                    {(filters.role || filters.search) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.get('/admin/users')}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium">Contact</th>
                                        <th className="px-4 py-3 font-medium text-right">Reports</th>
                                        <th className="px-4 py-3 font-medium text-right">Active</th>
                                        <th className="px-4 py-3 font-medium">Joined</th>
                                        <th className="px-4 py-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.data.map((user) => (
                                        <UserRow key={user.id} user={user} />
                                    ))}
                                    {users.data.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                                                No users found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            Showing {(users.current_page - 1) * users.per_page + 1}–
                            {Math.min(users.current_page * users.per_page, users.total)} of {users.total}
                        </span>
                        <div className="flex gap-1">
                            {users.links.map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`rounded px-3 py-1.5 text-xs ${
                                            link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded px-3 py-1.5 text-xs opacity-40"
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

    const ROLE_COLORS: Record<string, string> = {
        resident:  'bg-blue-100 text-blue-700',
        responder: 'bg-teal-100 text-teal-700',
    };

    return (
        <tr className="hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium">{user.name}</td>
            <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
            <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                    {user.role}
                </span>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{user.contact_number ?? '—'}</td>
            <td className="px-4 py-3 text-right">{user.reports_count}</td>
            <td className="px-4 py-3 text-right">{user.active_assignments}</td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
            <td className="px-4 py-3">
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
                        className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none"
                    >
                        <option value="resident">Resident</option>
                        <option value="responder">Responder</option>
                    </select>
                    {roleForm.isDirty && (
                        <button
                            type="submit"
                            disabled={roleForm.processing}
                            className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                            Save
                        </button>
                    )}
                </form>
            </td>
        </tr>
    );
}
