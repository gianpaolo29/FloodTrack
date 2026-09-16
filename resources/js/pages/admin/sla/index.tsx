import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Save,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Severity, SlaConfig, SlaStage } from '@/types/admin';
import { SLA_STAGE_LABELS } from '@/types/admin';

/* ─── Types ─── */
interface Props {
    configs: Record<Severity, Record<SlaStage, SlaConfig>>;
    sla_enabled: boolean;
    // accept but ignore extra props from backend
    [key: string]: any;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'SLA Rules', href: '/admin/sla' },
];

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low'];
const STAGES: SlaStage[] = ['pending_to_verified', 'verified_to_assigned', 'assigned_to_resolved'];

const SEV_COLORS: Record<Severity, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high:     'text-orange-600 dark:text-orange-400',
    moderate: 'text-amber-600 dark:text-amber-400',
    low:      'text-emerald-600 dark:text-emerald-400',
};

const SEV_DOT: Record<Severity, string> = {
    critical: 'bg-red-500',
    high:     'bg-orange-500',
    moderate: 'bg-amber-500',
    low:      'bg-emerald-500',
};

/* ─── Main page ─── */
export default function SlaIndex({ configs, sla_enabled }: Props) {
    const buildConfigArray = () => {
        const items: {
            severity: Severity;
            stage: SlaStage;
            threshold_minutes: number;
            warning_pct: number;
            critical_pct: number;
        }[] = [];

        for (const sev of SEVERITIES) {
            for (const stage of STAGES) {
                const c = configs[sev]?.[stage];
                items.push({
                    severity: sev,
                    stage,
                    threshold_minutes: c?.threshold_minutes ?? 60,
                    warning_pct: c?.warning_pct ?? 80,
                    critical_pct: c?.critical_pct ?? 150,
                });
            }
        }
        return items;
    };

    const form = useForm({ configs: buildConfigArray() });

    const updateField = (sev: Severity, stage: SlaStage, value: number) => {
        const updated = form.data.configs.map((c) =>
            c.severity === sev && c.stage === stage ? { ...c, threshold_minutes: value } : c,
        );
        form.setData('configs', updated);
    };

    const getConfig = (sev: Severity, stage: SlaStage) =>
        form.data.configs.find((c) => c.severity === sev && c.stage === stage)!;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/sla/configs', {
            preserveState: false,
            onSuccess: () => swalSuccess('SLA thresholds saved'),
        });
    };

    const handleToggle = () => {
        router.post('/admin/sla/toggle', {}, { preserveState: false });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="SLA Rules" />

            <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">SLA Rules</h1>
                        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                            Set maximum response times for each stage of the report pipeline.
                        </p>
                    </div>
                    <button
                        onClick={handleToggle}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.97] ${
                            sla_enabled
                                ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                                : 'bg-neutral-400 text-white hover:bg-neutral-500 dark:bg-neutral-600 dark:hover:bg-neutral-500'
                        }`}
                    >
                        {sla_enabled ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                        {sla_enabled ? 'SLA Enabled' : 'SLA Disabled'}
                    </button>
                </div>

                {/* Threshold table */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-3 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 dark:bg-white">
                            <Clock className="size-3.5 text-white dark:text-neutral-900" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Response Time Thresholds</h2>
                            <p className="text-[11px] text-neutral-400">Time limits in minutes for each severity and stage</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
                                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Severity</th>
                                        {STAGES.map((s) => (
                                            <th key={s} className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                                                {SLA_STAGE_LABELS[s]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/60">
                                    {SEVERITIES.map((sev) => (
                                        <tr key={sev} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`size-2 rounded-full ${SEV_DOT[sev]}`} />
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${SEV_COLORS[sev]}`}>{sev}</span>
                                                </div>
                                            </td>
                                            {STAGES.map((stage) => {
                                                const c = getConfig(sev, stage);
                                                return (
                                                    <td key={stage} className="px-4 py-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={9999}
                                                                value={c.threshold_minutes}
                                                                onChange={(e) => updateField(sev, stage, parseInt(e.target.value) || 1)}
                                                                className="w-20 rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-center text-xs font-medium tabular-nums outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                                            />
                                                            <span className="text-[10px] text-neutral-400">min</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Save bar */}
                        <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                Reports exceeding these limits will trigger SLA breach notifications.
                            </p>
                            <button
                                type="submit"
                                disabled={form.processing || !form.isDirty}
                                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                <Save className="size-4" />
                                {form.processing ? 'Saving...' : 'Save Thresholds'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Dirty banner */}
                {form.isDirty && (
                    <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-neutral-200/60 bg-white/90 px-6 py-4 shadow-lg backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-900/90">
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">Unsaved changes</span>
                        <button
                            type="button"
                            onClick={() => form.reset()}
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            <Save className="size-4" />
                            {form.processing ? 'Saving...' : 'Save Thresholds'}
                        </button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
