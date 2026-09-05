import { useRef, useState } from 'react';
import { useCountUp } from '@/hooks/use-count-up';
import { KpiTooltip } from './KpiTooltip';
import type { InsightRow } from '@/lib/kpi-utils';

interface Props {
    label: string;
    value: number;
    trend?: number;
    trendLabel: string;
    desc: string;
    insights: InsightRow[];
    icon: React.ElementType;
    grad?: string;
    shadow?: string;
    alert?: boolean;
    index: number;
    mounted: boolean;
}

export function PrimaryStatCard({ label, value, trend, trendLabel, desc, insights, icon: Icon, alert, index, mounted }: Props) {
    const count = useCountUp(value, mounted, index * 90);
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-4 sm:p-5 transition-all duration-700 hover:shadow-lg hover:border-neutral-300/80 cursor-pointer dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${index * 80}ms` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            {alert && (
                <span className="absolute right-3 top-3 flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-neutral-900 opacity-20 dark:bg-white dark:opacity-30" />
                    <span className="relative inline-flex size-2 rounded-full bg-neutral-900 dark:bg-white" />
                </span>
            )}
            <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-400 sm:text-[11px] dark:text-neutral-500">{label}</p>
                    <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-neutral-900 sm:mt-2 sm:text-3xl dark:text-white">
                        {count.toLocaleString()}
                    </p>
                    {trend !== undefined && (
                        <p className="mt-1.5 flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                trend >= 0
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                            }`}>
                                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                        </p>
                    )}
                    <p className="mt-1 truncate text-[9px] text-neutral-400 sm:text-[10px] dark:text-neutral-500">{trendLabel}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 sm:size-11 transition-colors duration-300 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700">
                    <Icon className="size-5 text-neutral-500 dark:text-neutral-400 sm:size-[22px]" />
                </div>
            </div>
        </div>
    );
}
