import { Head, router } from '@inertiajs/react';
import { Search, ShieldCheck } from 'lucide-react';
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

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-muted-foreground" />
                        <h1 className="text-lg font-semibold">Responders</h1>
                        <span className="text-sm text-muted-foreground">({responders.total})</span>
                    </div>
                </div>

                {/* Search */}
                <Card>
                    <CardContent className="flex gap-3 p-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email…"
                                defaultValue={filters.search ?? ''}
                                className="pl-9"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        search((e.target as HTMLInputElement).value);
                                    }
                                }}
                            />
                        </div>
                        {filters.search && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get('/admin/responders')}
                            >
                                Clear
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Responder cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {responders.data.map((r) => (
                        <Card key={r.id}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                                        {r.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{r.name}</p>
                                        <p className="truncate text-xs text-muted-foreground font-normal">{r.email}</p>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-xl font-bold text-teal-600">{r.active_assignments}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Active</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-green-600">{r.resolved_count}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Resolved</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{r.total_assigned}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Total</p>
                                </div>
                            </CardContent>
                            {r.contact_number && (
                                <div className="border-t px-6 py-2">
                                    <p className="text-xs text-muted-foreground">
                                        Contact: {r.contact_number}
                                    </p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {responders.data.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No responders found.
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {responders.last_page > 1 && (
                    <Pagination links={responders.links} />
                )}
            </div>
        </AppLayout>
    );
}

function Pagination({ links }: { links: { url: string | null; label: string; active: boolean }[] }) {
    return (
        <div className="flex justify-center gap-1">
            {links.map((link, i) =>
                link.url ? (
                    <button
                        key={i}
                        onClick={() => router.get(link.url!)}
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
                ),
            )}
        </div>
    );
}
