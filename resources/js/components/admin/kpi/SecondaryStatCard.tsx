import { useRef, useState } from 'react';
import { KpiTooltip } from './KpiTooltip';
import type { InsightRow } from '@/lib/kpi-utils';

interface Props {
    icon: React.ElementType;
    grad: string;
    shadow: string;
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

export function SecondaryStatCard({ icon: Icon, grad, shadow, value, label, trend, desc, insights, trendLabel, periodLabel, mounted, delay }: Props) {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className={`relative flex items-start justify-between gap-4 rounded-2xl border border-white/60 bg-white p-4 shadow-sm shadow-black/[0.04] transition-all duration-700 hover:shadow-md hover:scale-[1.01] cursor-pointer sm:p-5 dark:border-neutral-700/50 dark:bg-neutral-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: `${delay}ms` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                {trend !== undefined && (
                    <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                    </span>
                )}
                <p className="text-[10px] text-neutral-400">{trendLabel}{periodLabel ? `, ${periodLabel}` : ''}</p>
            </div>
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} shadow-lg ${shadow}`}>
                <Icon className="size-5 text-white" />
            </div>
        </div>
    );
}
