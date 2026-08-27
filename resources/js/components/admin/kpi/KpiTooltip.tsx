import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { InsightRow } from '@/lib/kpi-utils';

export function KpiTooltip({ desc, insights, visible, parentRef }: {
    desc: string;
    insights: InsightRow[];
    visible: boolean;
    parentRef: React.RefObject<HTMLDivElement | null>;
}) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!visible || !parentRef.current) { setPos(null); return; }
        const rect = parentRef.current.getBoundingClientRect();
        const tooltipW = 260;
        const top = rect.bottom + 8;
        let left = rect.left + rect.width / 2;
        left = Math.max(tooltipW / 2 + 8, Math.min(left, window.innerWidth - tooltipW / 2 - 8));
        setPos({ top, left });
    }, [visible, parentRef]);

    if (!visible) return null;

    return ReactDOM.createPortal(
        <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-none"
            style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                transform: 'translate(-50%, 0)',
                opacity: pos ? 1 : 0,
            }}
        >
            <div className="flex justify-center mb-[-5px]">
                <div className="size-2.5 rotate-45 bg-white/95 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60" />
            </div>
            <div className="w-[260px] rounded-xl bg-white/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/15 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
                {insights.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-2">
                        {insights.map((row, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color ?? '#94a3b8' }} />
                                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{row.label}</span>
                                </div>
                                <span className="text-[11px] font-bold tabular-nums text-neutral-800 dark:text-neutral-200">{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}
                {insights.length > 0 && (
                    <div className="mb-2 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                )}
                <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{desc}</p>
            </div>
        </div>,
        document.body
    );
}
