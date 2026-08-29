import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Bot,
    Calendar,
    Camera,
    CameraOff,
    CheckCircle2,
    ClipboardList,
    Clock,
    Copy,
    ExternalLink,
    Image,
    ImageOff,
    Mail,
    MapPin,
    Navigation,
    Pencil,
    Phone,
    RefreshCw,
    Save,
    Shield,
    ShieldCheck,
    Sparkles,
    Trash2,
    User,
    UserCheck,
    Users,
    Video,
    X,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { FieldReport, MemberStatus, Report, ReportStatus, ResponderStatus, Severity, SlaStage, SlaStatus, SlaTracking, Team } from '@/types/admin';
import { RESPONDER_STATUS_COLORS, RESPONDER_STATUS_LABELS, SEVERITY_COLORS, SLA_STAGE_LABELS, SLA_STATUS_COLORS, SLA_STATUS_LABELS, STATUS_COLORS } from '@/types/admin';

interface Props {
    report: Report;
    teams: Team[];
    field_report: FieldReport | null;
}

const SEVERITY_OPTIONS = ['low', 'moderate', 'high', 'critical'] as const;

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:bg-neutral-800 dark:focus:ring-sky-500/20';

const STATUS_FLOW: { status: ReportStatus; label: string; color: string }[] = [
    { status: 'pending', label: 'Pending', color: 'amber' },
    { status: 'verified', label: 'Verified', color: 'blue' },
    { status: 'assigned', label: 'Assigned', color: 'indigo' },
    { status: 'resolved', label: 'Resolved', color: 'emerald' },
];

export default function AdminReportShow({ report, teams, field_report }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Reports', href: '/admin/reports' },
        { title: report.reference_number, href: `/admin/reports/${report.id}` },
    ];

    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const verifyForm  = useForm({});
    const rejectForm  = useForm({ notes: '' });
    const assignForm  = useForm({ team_id: '' });
    const reopenForm  = useForm({});
    const editForm    = useForm({
        severity: report.severity,
        address: report.address ?? '',
        description: report.description ?? '',
    });

    const canVerify = report.status === 'pending';
    const canAssign = ['pending', 'verified'].includes(report.status);
    const canReject = ['pending', 'verified'].includes(report.status);
    const canReopen = ['resolved', 'rejected'].includes(report.status);

    const handleDelete = async () => {
        const confirmed = await swalDelete('this report');
        if (!confirmed) return;
        setDeleting(true);
        router.delete(`/admin/reports/${report.id}`, {
            preserveState: false,
            onFinish: () => setDeleting(false),
            onSuccess: () => swalSuccess('Deleted', 'Report has been deleted.'),
        });
    };

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(`/admin/reports/${report.id}`, {
            preserveState: false,
            onSuccess: () => {
                setEditing(false);
                swalSuccess('Updated', 'Report has been updated.');
            },
        });
    };

    const currentStep = STATUS_FLOW.findIndex((s) => s.status === report.status);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={report.reference_number} />

            <div className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/admin/reports"
                            className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-700 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                    {report.reference_number}
                                </h1>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_COLORS[report.severity]}`}>
                                    {report.severity}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
                                    {report.status}
                                </span>
                            </div>
                            <p className="mt-0.5 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                                Submitted {new Date(report.created_at).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            >
                                <Pencil className="size-3.5" />
                                Edit
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 shadow-sm transition-all hover:bg-red-50 hover:shadow-md disabled:opacity-50 dark:border-red-800/40 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                            <Trash2 className="size-3.5" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* Status progress bar (non-rejected reports) */}
                {report.status !== 'rejected' && (
                    <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                        <div className="flex items-center justify-between">
                            {STATUS_FLOW.map((step, i) => {
                                const isActive = i <= currentStep;
                                const isCurrent = step.status === report.status;
                                return (
                                    <div key={step.status} className="flex flex-1 items-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`flex size-8 items-center justify-center rounded-full border-2 transition-colors ${
                                                isCurrent
                                                    ? 'border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                                                    : isActive
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : 'border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800'
                                            }`}>
                                                {isActive && !isCurrent ? (
                                                    <CheckCircle2 className="size-4" />
                                                ) : (
                                                    <span className="text-xs font-bold">{i + 1}</span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                                isCurrent ? 'text-sky-600 dark:text-sky-400' : isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'
                                            }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {i < STATUS_FLOW.length - 1 && (
                                            <div className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${
                                                i < currentStep ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-700'
                                            }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SLA Compliance */}
                {(report.sla_tracking?.length ?? 0) > 0 && <SlaComplianceCard tracking={report.sla_tracking!} />}

                {/* Rejected banner */}
                {report.status === 'rejected' && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-200/60 bg-red-50/80 px-5 py-3.5 dark:border-red-800/40 dark:bg-red-950/20">
                        <XCircle className="size-5 shrink-0 text-red-500" />
                        <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">This report has been rejected</p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/80">You can reopen it to restart the verification process.</p>
                        </div>
                    </div>
                )}

                {/* AI Analysis Panel */}
                <AiAnalysisPanel report={report} />

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Left column */}
                    <div className="flex flex-col gap-6 lg:col-span-2">

                        {/* Edit Form or Details */}
                        <AnimatePresence mode="wait">
                            {editing ? (
                                <motion.div
                                    key="edit"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-2xl border border-sky-200/60 bg-white shadow-sm dark:border-sky-800/40 dark:bg-neutral-900"
                                >
                                    <div className="flex items-center justify-between border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                                                <Pencil className="size-3.5 text-white" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Edit Report</h3>
                                        </div>
                                        <button
                                            onClick={() => { setEditing(false); editForm.reset(); }}
                                            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleEditSave} className="flex flex-col gap-5 p-6">
                                        <FormField label="Severity" error={editForm.errors.severity}>
                                            <div className="grid grid-cols-4 gap-2">
                                                {SEVERITY_OPTIONS.map((sev) => {
                                                    const active = editForm.data.severity === sev;
                                                    return (
                                                        <button
                                                            key={sev}
                                                            type="button"
                                                            onClick={() => editForm.setData('severity', sev as Severity)}
                                                            className={`rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition-all ${
                                                                active
                                                                    ? `${SEVERITY_COLORS[sev]} border-transparent`
                                                                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                                                            }`}
                                                        >
                                                            {sev}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </FormField>

                                        <FormField label="Address" error={editForm.errors.address}>
                                            <input
                                                type="text"
                                                value={editForm.data.address}
                                                onChange={(e) => editForm.setData('address', e.target.value)}
                                                className={inputClass}
                                                placeholder="Report address..."
                                            />
                                        </FormField>

                                        <FormField label="Description" error={editForm.errors.description}>
                                            <textarea
                                                value={editForm.data.description}
                                                onChange={(e) => editForm.setData('description', e.target.value)}
                                                rows={4}
                                                className={`${inputClass} resize-none`}
                                                placeholder="Report description..."
                                            />
                                        </FormField>

                                        <div className="flex items-center justify-end gap-3 border-t border-neutral-200/60 pt-4 dark:border-neutral-700/60">
                                            <button
                                                type="button"
                                                onClick={() => { setEditing(false); editForm.reset(); }}
                                                className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={editForm.processing || !editForm.isDirty}
                                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                                            >
                                                <Save className="size-4" />
                                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900"
                                >
                                    <div className="border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Report Details</h3>
                                    </div>
                                    <div className="grid gap-0 divide-y divide-neutral-100 dark:divide-neutral-800 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
                                        <div className="flex flex-col gap-0 divide-y divide-neutral-100 dark:divide-neutral-800">
                                            <DetailRow icon={Shield} label="Severity">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[report.severity]}`}>
                                                    {report.severity}
                                                </span>
                                            </DetailRow>
                                            <DetailRow icon={CheckCircle2} label="Status">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </DetailRow>
                                            <DetailRow icon={MapPin} label="Address">
                                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{report.address ?? '---'}</span>
                                            </DetailRow>
                                            <DetailRow icon={Navigation} label="Coordinates">
                                                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                                                </span>
                                            </DetailRow>
                                        </div>
                                        <div className="flex flex-col gap-0 divide-y divide-neutral-100 dark:divide-neutral-800">
                                            <DetailRow icon={Calendar} label="Submitted">
                                                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                                    {new Date(report.created_at).toLocaleString('en-PH')}
                                                </span>
                                            </DetailRow>
                                            {report.verified_at && (
                                                <DetailRow icon={CheckCircle2} label="Verified">
                                                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                                        {new Date(report.verified_at).toLocaleString('en-PH')}
                                                    </span>
                                                </DetailRow>
                                            )}
                                            {report.resolved_at && (
                                                <DetailRow icon={CheckCircle2} label="Resolved">
                                                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                                        {new Date(report.resolved_at).toLocaleString('en-PH')}
                                                    </span>
                                                </DetailRow>
                                            )}
                                            {report.verifier && (
                                                <DetailRow icon={UserCheck} label="Verified by">
                                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        {report.verifier.name}
                                                    </span>
                                                </DetailRow>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Description */}
                        {!editing && report.description && (
                            <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                                <div className="border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Description</h3>
                                </div>
                                <div className="px-6 py-5">
                                    <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                        {report.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Evidence */}
                        {(report.media?.length ?? 0) > 0 && (
                            <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                                <div className="flex items-center gap-2 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                    <Image className="size-4 text-neutral-500" />
                                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                        Evidence
                                    </h3>
                                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                        {report.media!.length}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {report.media!.map((m) =>
                                            m.file_type === 'image' ? (
                                                <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl">
                                                    <img
                                                        src={m.url}
                                                        alt="Evidence"
                                                        className="aspect-video w-full object-cover ring-1 ring-neutral-200/60 transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-sky-500/50 dark:ring-neutral-700/60"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                                        <ExternalLink className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                    </div>
                                                </a>
                                            ) : (
                                                <a
                                                    key={m.id}
                                                    href={m.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl bg-neutral-50 ring-1 ring-neutral-200/60 text-neutral-500 transition-all hover:bg-neutral-100 hover:ring-2 hover:ring-sky-500/50 dark:bg-neutral-800 dark:ring-neutral-700/60"
                                                >
                                                    <Video className="size-6 text-neutral-400 transition-colors group-hover:text-sky-500" />
                                                    <span className="text-xs font-medium">Play Video</span>
                                                </a>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Field Report */}
                        {field_report && (
                            <div className="rounded-2xl border border-emerald-200/60 bg-white shadow-sm dark:border-emerald-700/40 dark:bg-neutral-900">
                                <div className="flex items-center gap-2 border-b border-emerald-100/60 px-6 py-4 dark:border-emerald-800/40">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                                        <ClipboardList className="size-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Field Report</h3>
                                    {field_report.user && (
                                        <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                                            by <span className="font-medium text-neutral-700 dark:text-neutral-300">{field_report.user.name}</span>
                                            {' · '}
                                            {new Date(field_report.updated_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-5 p-6">
                                    <FieldReportSection label="Actions Taken">
                                        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{field_report.actions_taken}</p>
                                    </FieldReportSection>

                                    {field_report.resources_used && (
                                        <FieldReportSection label="Resources Used">
                                            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{field_report.resources_used}</p>
                                        </FieldReportSection>
                                    )}

                                    {field_report.damage_assessment && (
                                        <FieldReportSection label="Damage Assessment">
                                            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{field_report.damage_assessment}</p>
                                        </FieldReportSection>
                                    )}

                                    {field_report.people_assisted != null && (
                                        <FieldReportSection label="People Assisted">
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950/30 dark:text-emerald-300">
                                                {field_report.people_assisted}
                                            </span>
                                        </FieldReportSection>
                                    )}

                                    {(field_report.checklist?.length ?? 0) > 0 && (
                                        <FieldReportSection label="Checklist">
                                            <ul className="flex flex-col gap-1.5">
                                                {field_report.checklist!.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </FieldReportSection>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        {(report.status_updates?.length ?? 0) > 0 && (
                            <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                                <div className="flex items-center gap-2 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                    <Clock className="size-4 text-neutral-500" />
                                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Status Timeline</h3>
                                </div>
                                <div className="p-6">
                                    <ol className="relative ml-3 border-l-2 border-neutral-200 flex flex-col gap-6 dark:border-neutral-700">
                                        {report.status_updates!.map((u, i) => (
                                            <li key={u.id} className="ml-6">
                                                <div className={`absolute -left-[9px] mt-0.5 size-4 rounded-full border-2 border-white dark:border-neutral-900 ${
                                                    i === 0 ? 'bg-sky-500' : !u.user ? 'bg-sky-400 dark:bg-sky-500' : 'bg-neutral-300 dark:bg-neutral-600'
                                                }`} />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[u.status as ReportStatus] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                                        {u.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        by {u.user ? (
                                                            <>
                                                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">{u.user.name}</span>
                                                                <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">&middot;</span>
                                                                <span className={`${u.user.role === 'admin' ? 'text-purple-600 dark:text-purple-400' : u.user.role === 'responder' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                                                                    {u.user.role}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                                                                <Bot className="size-3" />
                                                                AI System
                                                            </span>
                                                        )}
                                                        <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">&middot;</span>
                                                        {new Date(u.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {u.notes && (
                                                    <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 leading-relaxed dark:bg-neutral-800 dark:text-neutral-400">
                                                        {u.notes}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-6">

                        {/* Reporter */}
                        <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                            <div className="flex items-center gap-2 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                <User className="size-4 text-neutral-500" />
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Reporter</h3>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-sm">
                                        {(report.user?.name ?? 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{report.user?.name ?? '---'}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Resident</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                                        <Mail className="size-3.5 text-neutral-400" />
                                        <span>{report.user?.email ?? '---'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                                        <Phone className="size-3.5 text-neutral-400" />
                                        <span>{report.user?.contact_number ?? '---'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned team / responder */}
                        <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                            <div className="flex items-center gap-2 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                <Users className="size-4 text-neutral-500" />
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assigned Team</h3>
                                {report.assigned_team && (
                                    <span className="ml-auto inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-600/10 dark:bg-indigo-950/40 dark:text-indigo-300">
                                        {report.assigned_team.name}
                                    </span>
                                )}
                            </div>
                            <div className="p-5">
                                {report.team_members && report.team_members.length > 0 ? (
                                    <div className="flex flex-col gap-3">
                                        {/* Team readiness summary */}
                                        <TeamReadinessSummary
                                            members={report.team_members}
                                            memberStatuses={report.member_statuses ?? []}
                                        />
                                        {/* Member list */}
                                        <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                                            {report.team_members.map((m) => {
                                                const ms = report.member_statuses?.find(s => s.user_id === m.id);
                                                const status: ResponderStatus = ms?.status ?? 'pending';
                                                return (
                                                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                                        <div className={`relative flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm ${m.is_leader ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-neutral-400 to-neutral-500'}`}>
                                                            {m.name.charAt(0).toUpperCase()}
                                                            {m.is_leader && (
                                                                <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-white ring-1 ring-white">★</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                                                {m.name}
                                                                {m.is_leader && <span className="ml-1.5 text-[10px] font-normal text-indigo-500">Leader</span>}
                                                            </p>
                                                        </div>
                                                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${RESPONDER_STATUS_COLORS[status]}`}>
                                                            {RESPONDER_STATUS_LABELS[status]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : report.assigned_responder ? (
                                    /* Legacy single-responder fallback */
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                                            {report.assigned_responder.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{report.assigned_responder.name}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                {report.assigned_responder.contact_number ?? 'No contact'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-3">
                                        <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                            <Users className="size-5 text-neutral-400 dark:text-neutral-500" />
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">No team assigned yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                            <div className="border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Quick Actions</h3>
                            </div>
                            <div className="flex flex-col gap-4 p-5">

                                {canVerify && (
                                    <form onSubmit={(e) => { e.preventDefault(); verifyForm.post(`/admin/reports/${report.id}/verify`, { preserveState: false, onSuccess: () => swalSuccess('Verified', 'Report has been verified.') }); }}>
                                        <button
                                            type="submit"
                                            disabled={verifyForm.processing}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Verify Report
                                        </button>
                                    </form>
                                )}

                                {(canAssign || report.status === 'assigned') && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            assignForm.post(`/admin/reports/${report.id}/assign`, {
                                                preserveState: false,
                                                onSuccess: () => swalSuccess('Assigned', 'Team has been assigned.'),
                                            });
                                        }}
                                        className="flex flex-col gap-3"
                                    >
                                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                            {report.assigned_team ? 'Reassign team' : 'Assign team'}
                                        </label>
                                        <select
                                            value={assignForm.data.team_id}
                                            onChange={(e) => assignForm.setData('team_id', e.target.value)}
                                            className={inputClass}
                                            required
                                        >
                                            <option value="">Select team...</option>
                                            {teams.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} — {t.members.length} member{t.members.length !== 1 ? 's' : ''}
                                                    {(t.active_assignments ?? 0) > 0 ? ` · ${t.active_assignments} active` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                            Only active teams are shown.
                                        </p>
                                        {report.assigned_team && (t => t && (t.active_assignments ?? 0) > 1)(teams.find(t => t.id === report.assigned_team!.id)) && (
                                            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                                <span>⚠</span> This team is currently deployed on another report.
                                            </p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={assignForm.processing}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                        >
                                            <UserCheck className="size-4" />
                                            {report.assigned_team ? 'Reassign' : 'Assign'}
                                        </button>
                                    </form>
                                )}

                                {canReject && (
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); rejectForm.post(`/admin/reports/${report.id}/reject`, { preserveState: false, onSuccess: () => swalSuccess('Rejected', 'Report has been rejected.') }); }}
                                        className="flex flex-col gap-3"
                                    >
                                        <textarea
                                            placeholder="Reason for rejection (optional)"
                                            value={rejectForm.data.notes}
                                            onChange={(e) => rejectForm.setData('notes', e.target.value)}
                                            rows={2}
                                            className={`${inputClass} resize-none`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={rejectForm.processing}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md disabled:opacity-50"
                                        >
                                            <XCircle className="size-4" />
                                            Reject
                                        </button>
                                    </form>
                                )}

                                {canReopen && (
                                    <form onSubmit={(e) => { e.preventDefault(); reopenForm.post(`/admin/reports/${report.id}/reopen`, { preserveState: false, onSuccess: () => swalSuccess('Reopened', 'Report has been reopened.') }); }}>
                                        <button
                                            type="submit"
                                            disabled={reopenForm.processing}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-all hover:bg-sky-100 hover:shadow-sm disabled:opacity-50 dark:border-sky-800/40 dark:bg-sky-950/20 dark:text-sky-400 dark:hover:bg-sky-950/30"
                                        >
                                            <RefreshCw className="size-4" />
                                            Reopen Report
                                        </button>
                                    </form>
                                )}

                                {!canVerify && !canAssign && !canReject && !canReopen && report.status !== 'assigned' && (
                                    <div className="flex flex-col items-center gap-2 py-4">
                                        <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                            <Clock className="size-5 text-neutral-400 dark:text-neutral-500" />
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            No actions available for this status
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── AI Analysis Panel ─── */

function AiAnalysisPanel({ report }: { report: Report }) {
    const { ai_flagged, ai_flag_reason, ai_image_verified, ai_image_notes, ai_exif_status, ai_exif_notes, potential_duplicate_of } = report;

    // Don't show if AI hasn't run (no flag, no image result)
    if (!ai_flagged && ai_image_verified === null) return null;

    const isDuplicate  = potential_duplicate_of != null;
    const imageFailed  = ai_image_verified === false;
    const imageOk      = ai_image_verified === true;
    const exifPass     = ai_exif_status === 'pass';
    const exifFail     = ai_exif_status === 'fail';
    const exifNoData   = ai_exif_status === 'no_data';
    const textFlagged  = ai_flagged && !isDuplicate && !imageFailed && !exifFail;
    const allClear     = !ai_flagged && imageOk && !exifFail;

    return (
        <div className={`rounded-2xl border p-5 ${
            allClear
                ? 'border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20'
                : 'border-amber-200/60 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20'
        }`}>
            {/* Header */}
            <div className="mb-4 flex items-center gap-2.5">
                <div className={`flex size-8 items-center justify-center rounded-lg ${
                    allClear ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                    <Bot className="size-4 text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${
                        allClear ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'
                    }`}>
                        AI Analysis
                    </h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                        allClear
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}>
                        <Sparkles className="size-2.5" />
                        GPT-4o
                    </span>
                </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-4">
                {allClear && (
                    <AiBadge icon={<CheckCircle2 className="size-3" />} label="Report looks legitimate" color="emerald" />
                )}
                {imageOk && (
                    <AiBadge icon={<Image className="size-3" />} label="Image verified" color="emerald" />
                )}
                {imageFailed && (
                    <AiBadge icon={<ImageOff className="size-3" />} label="Image could not be verified" color="amber" />
                )}
                {isDuplicate && (
                    <AiBadge icon={<Copy className="size-3" />} label={`Possible duplicate of #${potential_duplicate_of}`} color="amber" />
                )}
                {exifPass && (
                    <AiBadge icon={<Camera className="size-3" />} label="EXIF metadata verified" color="emerald" />
                )}
                {exifFail && (
                    <AiBadge icon={<CameraOff className="size-3" />} label="EXIF check failed — possible internet photo" color="amber" />
                )}
                {exifNoData && (
                    <AiBadge icon={<CameraOff className="size-3" />} label="No EXIF data — may be downloaded" color="amber" />
                )}
                {textFlagged && (
                    <AiBadge icon={<XCircle className="size-3" />} label="Suspicious content detected" color="amber" />
                )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
                {ai_image_notes && (
                    <div className="rounded-lg bg-white/60 px-3.5 py-2.5 dark:bg-black/20">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Image notes</p>
                        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{ai_image_notes}</p>
                    </div>
                )}
                {ai_exif_notes && (
                    <div className="rounded-lg bg-white/60 px-3.5 py-2.5 dark:bg-black/20">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">EXIF metadata</p>
                        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{ai_exif_notes}</p>
                    </div>
                )}
                {ai_flag_reason && (
                    <div className="rounded-lg bg-white/60 px-3.5 py-2.5 dark:bg-black/20">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Flag reason</p>
                        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{ai_flag_reason}</p>
                    </div>
                )}
            </div>

            <p className="mt-3 text-[10px] text-neutral-400 dark:text-neutral-500">
                AI analysis is advisory only. Admin decision takes precedence.
            </p>
        </div>
    );
}

function AiBadge({ icon, label, color }: { icon: React.ReactNode; label: string; color: 'emerald' | 'amber' }) {
    const cls = color === 'emerald'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
            {icon}
            {label}
        </span>
    );
}

/* ─── Detail Row ─── */

function DetailRow({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 px-3 sm:px-5 py-3.5">
            <Icon className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
                <div className="mt-0.5">{children}</div>
            </div>
        </div>
    );
}

/* ─── Team Readiness Summary ─── */

function TeamReadinessSummary({ members, memberStatuses }: { members: import('@/types/admin').TeamMember[]; memberStatuses: MemberStatus[] }) {
    const STATUS_ORDER: ResponderStatus[] = ['pending', 'en_route', 'on_scene', 'resolved'];
    const counts: Record<ResponderStatus, number> = { pending: 0, en_route: 0, on_scene: 0, resolved: 0 };
    members.forEach((m) => {
        const ms = memberStatuses.find((s) => s.user_id === m.id);
        const status: ResponderStatus = ms?.status ?? 'pending';
        counts[status]++;
    });
    const mostAdvanced = [...STATUS_ORDER].reverse().find((s) => counts[s] > 0) ?? 'pending';
    const allResolved = counts.resolved === members.length;
    return (
        <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${allResolved ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-indigo-50 dark:bg-indigo-950/20'}`}>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${allResolved ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-300'}`}>
                    Team status
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${RESPONDER_STATUS_COLORS[mostAdvanced]}`}>
                    {RESPONDER_STATUS_LABELS[mostAdvanced]}
                </span>
            </div>
            <div className="flex items-center gap-1">
                {STATUS_ORDER.map((s) => counts[s] > 0 && (
                    <span key={s} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${RESPONDER_STATUS_COLORS[s]}`}>
                        {counts[s]}
                    </span>
                ))}
                <span className="text-[10px] text-neutral-400 ml-1">{members.length} total</span>
            </div>
        </div>
    );
}

/* ─── Field Report Section ─── */

function FieldReportSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
            {children}
        </div>
    );
}

/* ─── Form Field ─── */

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/* ─── SLA Compliance Card ─── */

const SLA_BAR_COLORS: Record<SlaStatus, string> = {
    on_track: 'bg-emerald-500',
    at_risk:  'bg-amber-500',
    breached: 'bg-red-500',
    met:      'bg-blue-500',
};

function SlaComplianceCard({ tracking }: { tracking: SlaTracking[] }) {
    const stages: SlaStage[] = ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved'];

    return (
        <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
            <div className="mb-4 flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-sm">
                    <Clock className="size-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">SLA Compliance</h3>
            </div>

            <div className="flex flex-col gap-4">
                {stages.map((stage) => {
                    const t = tracking.find((tr) => tr.stage === stage);
                    if (!t) return null;

                    const elapsed = t.completed_at
                        ? (t.elapsed_minutes ?? 0)
                        : Math.round((Date.now() - new Date(t.started_at).getTime()) / 60000 * 10) / 10;
                    const pct = t.threshold_minutes > 0 ? Math.min((elapsed / t.threshold_minutes) * 100, 100) : 0;
                    const remaining = t.threshold_minutes - elapsed;
                    const status = t.sla_status as SlaStatus;

                    return (
                        <div key={stage} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    {SLA_STAGE_LABELS[stage]}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                                        {Math.round(elapsed)} min / {t.threshold_minutes} min
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${SLA_STATUS_COLORS[status]}`}>
                                        {SLA_STATUS_LABELS[status]}
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${SLA_BAR_COLORS[status]}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                            </div>
                            {!t.completed_at && (
                                <p className={`text-[10px] font-medium ${remaining > 0 ? 'text-neutral-400' : 'text-red-500'}`}>
                                    {remaining > 0
                                        ? `${Math.round(remaining)} min remaining`
                                        : `${Math.round(Math.abs(remaining))} min overdue`}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

