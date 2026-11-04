import { useRef } from 'react';
import { CircleHelp } from 'lucide-react';
import { KpiTooltip } from './KpiTooltip';
import { useKpiTooltip } from '@/hooks/use-kpi-tooltip';
import type { InsightRow } from '@/lib/kpi-utils';

interface Props {
    icon: React.ElementType;
    grad?: string;
    shadow?: string;
    value: string | number;
    label: string;
    trend?: number;
    desc: string;
    insights: InsightRow[];
    trendLabel: string;
    periodLabel: string;
    accent?: 'green' | 'amber' | 'red' | 'neutral';
    mounted: boolean;
    delay: number;
    urgency?: 'good' | 'warning' | 'urgent';
    actionLink?: { label: string; href: string };
}

const ACCENT_STYLES = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    neutral: 'bg-neutral-300 dark:bg-neutral-600',
} as const;

export function SecondaryStatCard({ icon: Icon, value, label, trend, desc, insights, trendLabel, periodLabel, accent, mounted, delay, urgency, actionLink }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const { open, toggle } = useKpiTooltip(btnRef);

    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-lg border border-neutral-200/70 bg-white px-3 py-2.5 transition-all duration-700 hover:shadow-md hover:border-neutral-300/80 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {accent && <div className={`absolute inset-x-0 top-0 h-[2px] ${ACCENT_STYLES[accent]}`} />}
            <KpiTooltip desc={desc} insights={insights} visible={open} parentRef={cardRef} urgency={urgency} actionLink={actionLink} />
            <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
                <button
                    ref={btnRef}
                    type="button"
                    onClick={toggle}
                    className={`z-10 flex size-4 shrink-0 items-center justify-center rounded transition-colors ${open ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' : 'text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400'}`}
                >
                    <CircleHelp className="size-3 pointer-events-none" />
                </button>
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-neutral-900 sm:text-xl dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {trend !== undefined && (
                <span className={`mt-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-semibold tabular-nums ${
                    trend >= 0
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                }`}>
                    {trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}%
                </span>
            )}
            <p className="mt-0.5 truncate text-[8px] text-neutral-400 dark:text-neutral-500">{trendLabel}{periodLabel ? `, ${periodLabel}` : ''}</p>
        </div>
    );
}
