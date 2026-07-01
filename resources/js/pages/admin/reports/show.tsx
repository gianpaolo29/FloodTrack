import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock, MapPin, UserCheck, XCircle } from 'lucide-react';
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

            <div className="flex flex-col gap-6 p-6 lg:p-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/reports"
                        className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold tracking-tight">{report.reference_number}</h1>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_COLORS[report.severity]}`}>
                            {report.severity}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
                            {report.status}
                        </span>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Left column */}
                    <div className="flex flex-col gap-6 lg:col-span-2">

                        {/* Details */}
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="text-sm font-semibold tracking-tight">Report Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
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
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                    <CardTitle className="text-sm font-semibold tracking-tight">Description</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {report.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Evidence */}
                        {(report.media?.length ?? 0) > 0 && (
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                    <CardTitle className="text-sm font-semibold tracking-tight">
                                        Evidence ({report.media!.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {report.media!.map((m) =>
                                            m.file_type === 'image' ? (
                                                <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="group">
                                                    <img
                                                        src={m.url}
                                                        alt="Evidence"
                                                        className="aspect-video w-full rounded-xl object-cover ring-1 ring-border transition-all group-hover:ring-2 group-hover:ring-blue-500/50 group-hover:shadow-lg"
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    key={m.id}
                                                    href={m.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted ring-1 ring-border text-sm text-muted-foreground transition-all hover:ring-2 hover:ring-blue-500/50 hover:shadow-lg"
                                                >
                                                    ▶ Video
                                                </a>
                                            ),
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Timeline */}
                        {(report.status_updates?.length ?? 0) > 0 && (
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                    <CardTitle className="text-sm font-semibold tracking-tight">Status Timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <ol className="relative ml-3 border-l-2 border-muted flex flex-col gap-6">
                                        {report.status_updates!.map((u) => (
                                            <li key={u.id} className="ml-6">
                                                <div className="absolute -left-[9px] mt-0.5 size-4 rounded-full border-2 border-background bg-muted-foreground/30" />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[u.status as Report['status']] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                                        {u.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        by <span className="font-medium text-foreground">{u.user.name}</span> · {new Date(u.created_at).toLocaleString('en-PH')}
                                                    </span>
                                                </div>
                                                {u.notes && (
                                                    <p className="mt-1.5 text-sm text-muted-foreground">{u.notes}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-6">

                        {/* Reporter */}
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="text-sm font-semibold tracking-tight">Reporter</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 p-6">
                                <Detail label="Name"    value={report.user?.name ?? '—'} />
                                <Detail label="Email"   value={report.user?.email ?? '—'} />
                                <Detail label="Contact" value={report.user?.contact_number ?? '—'} />
                            </CardContent>
                        </Card>

                        {/* Assigned responder */}
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="text-sm font-semibold tracking-tight">Assigned Responder</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 p-6">
                                {report.assigned_responder ? (
                                    <>
                                        <Detail label="Name"    value={report.assigned_responder.name} />
                                        <Detail label="Contact" value={report.assigned_responder.contact_number ?? '—'} />
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Not yet assigned</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 px-6 py-4">
                                <CardTitle className="text-sm font-semibold tracking-tight">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 p-6">

                                {canVerify && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            verifyForm.post(`/admin/reports/${report.id}/verify`);
                                        }}
                                    >
                                        <Button
                                            type="submit"
                                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                            disabled={verifyForm.processing}
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Verify Report
                                        </Button>
                                    </form>
                                )}

                                {canAssign && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            assignForm.post(`/admin/reports/${report.id}/assign`);
                                        }}
                                        className="flex flex-col gap-3"
                                    >
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Assign to responder
                                        </label>
                                        <select
                                            value={assignForm.data.responder_id}
                                            onChange={(e) => assignForm.setData('responder_id', e.target.value)}
                                            className="h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                            required
                                        >
                                            <option value="">Select responder...</option>
                                            {responders.map((r) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            className="w-full gap-2 shadow-sm"
                                            disabled={assignForm.processing}
                                        >
                                            <UserCheck className="size-4" />
                                            Assign
                                        </Button>
                                    </form>
                                )}

                                {canReject && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            rejectForm.post(`/admin/reports/${report.id}/reject`);
                                        }}
                                        className="flex flex-col gap-3"
                                    >
                                        <textarea
                                            placeholder="Reason for rejection (optional)"
                                            value={rejectForm.data.notes}
                                            onChange={(e) => rejectForm.setData('notes', e.target.value)}
                                            rows={2}
                                            className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                        />
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            className="w-full gap-2 shadow-sm"
                                            disabled={rejectForm.processing}
                                        >
                                            <XCircle className="size-4" />
                                            Reject
                                        </Button>
                                    </form>
                                )}

                                {!canVerify && !canAssign && !canReject && (
                                    <div className="flex flex-col items-center gap-2 py-4">
                                        <Clock className="size-6 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">
                                            No actions available for this status
                                        </p>
                                    </div>
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
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-medium">{value}</p>
        </div>
    );
}
