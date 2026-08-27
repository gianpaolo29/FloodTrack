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
    grad: string;
    shadow: string;
    alert?: boolean;
    index: number;
    mounted: boolean;
}

export function PrimaryStatCard({ label, value, trend, trendLabel, desc, insights, icon: Icon, grad, shadow, alert, index, mounted }: Props) {
    const count = useCountUp(value, mounted, index * 90);
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-lg ${shadow} sm:p-5 transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${index * 80}ms` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <KpiTooltip desc={desc} insights={insights} visible={showTooltip} parentRef={cardRef} />
            <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl transition-all duration-500 group-hover:size-32 group-hover:blur-2xl" />
            <div className="pointer-events-none absolute -bottom-4 -left-4 size-16 rounded-full bg-black/10 blur-xl" />
            {alert && (
                <span className="absolute right-3 top-3 flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-sm" />
                </span>
            )}
            <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white/80 sm:text-xs">{label}</p>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-white sm:text-3xl">
                        {count.toLocaleString()}
                    </p>
                    {trend !== undefined && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/90">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                            </span>
                        </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-white/55">{trendLabel}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/20 sm:size-11 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-5 text-white sm:size-[22px]" />
                </div>
            </div>
        </div>
    );
}
