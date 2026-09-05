import { useRef, useState } from 'react';
import { KpiTooltip } from './KpiTooltip';
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
    mounted: boolean;
    delay: number;
}

export function SecondaryStatCard({ icon: Icon, value, label, trend, desc, insights, trendLabel, periodLabel, mounted, delay }: Props) {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className={`group relative flex items-start justify-between gap-4 rounded-2xl border border-neutral-200/70 bg-white p-4 sm:p-5 transition-all duration-700 hover:shadow-lg hover:border-neutral-300/80 cursor-pointer dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: `${delay}ms` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-400 sm:text-[11px] dark:text-neutral-500">{label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                {trend !== undefined && (
                    <span className={`mt-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        trend >= 0
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    }`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
                <p className="mt-1 truncate text-[9px] text-neutral-400 sm:text-[10px] dark:text-neutral-500">{trendLabel}{periodLabel ? `, ${periodLabel}` : ''}</p>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 transition-colors duration-300 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700">
                <Icon className="size-5 text-neutral-500 dark:text-neutral-400" />
            </div>
        </div>
    );
}
