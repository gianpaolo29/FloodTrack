import { Head, router } from '@inertiajs/react';
import { Phone, Search, ShieldCheck, X } from 'lucide-react';
import { useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BreadcrumbItem } from '@/types';

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
    const search = useCallback((value: string) => {
        router.get('/admin/responders', { search: value || undefined }, {
            preserveState: true,
            replace: true,
        });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Responders — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Responders</h1>
                    <p className="text-sm text-muted-foreground">
                        {responders.total} registered responder{responders.total !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            defaultValue={filters.search ?? ''}
                            className="pl-9 rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-sm placeholder:text-muted-foreground/50 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    search((e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                    </div>
                    {filters.search && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.get('/admin/responders')}
                            className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" />
                            Clear
                        </Button>
                    )}
                </div>

                {/* Responder cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {responders.data.map((r) => (
                        <Card key={r.id} className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm transition-all hover:shadow-md dark:border-neutral-700/60 dark:bg-neutral-900">
                            <CardHeader className="pb-3 px-6 pt-6">
                                <CardTitle className="flex items-center gap-3 text-base">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-600 text-sm font-bold text-white shadow-sm">
                                        {r.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{r.name}</p>
                                        <p className="truncate text-xs text-muted-foreground font-normal">{r.email}</p>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-6 pb-4">
                                <div className="grid grid-cols-3 gap-3 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 text-center dark:border-neutral-700/60 dark:bg-neutral-800/50">
                                    <div>
                                        <p className="text-xl font-bold text-blue-600 tabular-nums">{r.active_assignments}</p>
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active</p>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-emerald-600 tabular-nums">{r.resolved_count}</p>
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Resolved</p>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold tabular-nums">{r.total_assigned}</p>
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</p>
                                    </div>
                                </div>
                            </CardContent>
                            {r.contact_number && (
                                <div className="border-t border-neutral-100 px-6 py-3 dark:border-neutral-800">
                                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Phone className="size-3" />
                                        {r.contact_number}
                                    </p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {responders.data.length === 0 && (
                    <Card className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <CardContent className="flex flex-col items-center gap-2 py-16">
                            <ShieldCheck className="size-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No responders found</p>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {responders.last_page > 1 && (
                    <div className="flex justify-center gap-1">
                        {responders.links.map((link, i) =>
                            link.url ? (
                                <button
                                    key={i}
                                    onClick={() => router.get(link.url!)}
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
                            ),
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
