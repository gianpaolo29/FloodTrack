import { Head } from '@inertiajs/react';
import { Settings } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Settings', href: '/admin/settings' },
];

export default function AdminSettings() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings — FloodTrack Admin" />

            <div className="flex flex-col gap-6 p-6">

                <div className="flex items-center gap-2">
                    <Settings className="size-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">System Settings</h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">General</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">System name</p>
                                    <p className="text-xs text-muted-foreground">The name displayed across the platform</p>
                                </div>
                                <span className="text-sm font-medium">FloodTrack</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Default region</p>
                                    <p className="text-xs text-muted-foreground">Default map center for new sessions</p>
                                </div>
                                <span className="text-sm text-muted-foreground">Philippines</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Notifications</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Email notifications</p>
                                    <p className="text-xs text-muted-foreground">Send email on critical reports</p>
                                </div>
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Enabled</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Auto-assign responders</p>
                                    <p className="text-xs text-muted-foreground">Automatically assign nearest responder</p>
                                </div>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Disabled</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Data retention</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Report retention</p>
                                    <p className="text-xs text-muted-foreground">How long resolved reports are kept</p>
                                </div>
                                <span className="text-sm text-muted-foreground">Indefinite</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Media storage</p>
                                    <p className="text-xs text-muted-foreground">Where uploaded evidence is stored</p>
                                </div>
                                <span className="text-sm text-muted-foreground">Local disk</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">About</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version</span>
                                <span className="font-medium">1.0.0</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Framework</span>
                                <span className="font-medium">Laravel 13</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Frontend</span>
                                <span className="font-medium">React 19 + Inertia.js</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
