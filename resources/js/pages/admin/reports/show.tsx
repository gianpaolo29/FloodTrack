import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, UserCheck, XCircle } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import type { Report, Responder } from '@/types/admin';
import { HAZARD_LABELS, SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Props {
    report: Report;
    responders: Responder[];
}

export default function AdminReportShow({ report, responders }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Reports', href: '/admin/reports' },
        { title: report.reference_number, href: `/admin/reports/${report.id}` },
    ];

    const verifyForm  = useForm({});
    const rejectForm  = useForm({ notes: '' });
    const assignForm  = useForm({ responder_id: '' });

    const canVerify = report.status === 'pending';
    const canAssign = ['pending', 'verified'].includes(report.status);
    const canReject = ['pending', 'verified'].includes(report.status);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${report.reference_number} — FloodTrack Admin`} />

            <div className="flex flex-col gap-6 p-6">

                <div className="flex items-center gap-3">
                    <Link href="/admin/reports" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" />
                    </Link>
                    <h1 className="text-lg font-semibold">{report.reference_number}</h1>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[report.severity]}`}>
                        {report.severity}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                        {report.status}
                    </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Left column — report details */}
                    <div className="flex flex-col gap-4 lg:col-span-2">

                        {/* Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Report details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                                <Detail label="Hazard type" value={HAZARD_LABELS[report.hazard_type]} />
                                <Detail label="Severity"    value={report.severity} />
                                <Detail label="Status"      value={report.status} />
                                <Detail label="Address"     value={report.address ?? '—'} />
                                <Detail label="Coordinates" value={`${report.latitude}, ${report.longitude}`} />
                                <Detail label="Submitted"   value={new Date(report.created_at).toLocaleString('en-PH')} />
                                {report.verified_at && (
                                    <Detail label="Verified at" value={new Date(report.verified_at).toLocaleString('en-PH')} />
                                )}
                                {report.resolved_at && (
                                    <Detail label="Resolved at" value={new Date(report.resolved_at).toLocaleString('en-PH')} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Description */}
                        {report.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {report.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Evidence */}
                        {(report.media?.length ?? 0) > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">
                                        Evidence ({report.media!.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {report.media!.map((m) =>
                                            m.file_type === 'image' ? (
                                                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                                                    <img
                                                        src={m.url}
                                                        alt="Evidence"
                                                        className="aspect-video w-full rounded-lg object-cover hover:opacity-90 transition-opacity"
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    key={m.id}
                                                    href={m.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
                                                >
                                                    ▶ Video
                                                </a>
                                            ),
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Status timeline */}
                        {(report.status_updates?.length ?? 0) > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Status timeline</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ol className="relative border-l border-muted ml-2 flex flex-col gap-4">
                                        {report.status_updates!.map((u) => (
                                            <li key={u.id} className="ml-4">
                                                <div className="absolute -left-1.5 mt-1 size-3 rounded-full border border-background bg-muted-foreground/40" />
                                                <div className="flex items-center gap-2">
                                                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[u.status as Report['status']] ?? 'bg-gray-100 text-gray-600'}`}>
                                                        {u.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        by {u.user.name} · {new Date(u.created_at).toLocaleString('en-PH')}
                                                    </span>
                                                </div>
                                                {u.notes && (
                                                    <p className="mt-1 text-sm text-muted-foreground">{u.notes}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column — reporter, actions */}
                    <div className="flex flex-col gap-4">

                        {/* Reporter */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Reporter</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-2 text-sm">
                                <Detail label="Name"    value={report.user?.name ?? '—'} />
                                <Detail label="Email"   value={report.user?.email ?? '—'} />
                                <Detail label="Contact" value={report.user?.contact_number ?? '—'} />
                            </CardContent>
                        </Card>

                        {/* Assigned responder */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Assigned responder</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-2 text-sm">
                                {report.assigned_responder ? (
                                    <>
                                        <Detail label="Name"    value={report.assigned_responder.name} />
                                        <Detail label="Contact" value={report.assigned_responder.contact_number ?? '—'} />
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Not yet assigned.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">

                                {/* Verify */}
                                {canVerify && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            verifyForm.post(`/admin/reports/${report.id}/verify`);
                                        }}
                                    >
                                        <Button
                                            type="submit"
                                            className="w-full gap-2"
                                            disabled={verifyForm.processing}
                                        >
                                            <CheckCircle className="size-4" />
                                            Verify report
                                        </Button>
                                    </form>
                                )}

                                {/* Assign */}
                                {canAssign && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            assignForm.post(`/admin/reports/${report.id}/assign`);
                                        }}
                                        className="flex flex-col gap-2"
                                    >
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Assign to responder
                                        </label>
                                        <select
                                            value={assignForm.data.responder_id}
                                            onChange={(e) => assignForm.setData('responder_id', e.target.value)}
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                            required
                                        >
                                            <option value="">Select responder…</option>
                                            {responders.map((r) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            className="w-full gap-2"
                                            disabled={assignForm.processing}
                                        >
                                            <UserCheck className="size-4" />
                                            Assign
                                        </Button>
                                    </form>
                                )}

                                {/* Reject */}
                                {canReject && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            rejectForm.post(`/admin/reports/${report.id}/reject`);
                                        }}
                                        className="flex flex-col gap-2"
                                    >
                                        <textarea
                                            placeholder="Reason for rejection (optional)"
                                            value={rejectForm.data.notes}
                                            onChange={(e) => rejectForm.setData('notes', e.target.value)}
                                            rows={2}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                        />
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            className="w-full gap-2"
                                            disabled={rejectForm.processing}
                                        >
                                            <XCircle className="size-4" />
                                            Reject
                                        </Button>
                                    </form>
                                )}

                                {!canVerify && !canAssign && !canReject && (
                                    <p className="text-sm text-muted-foreground text-center py-2">
                                        No actions available for this status.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    );
}
