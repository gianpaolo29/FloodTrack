import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { InsightRow } from '@/lib/kpi-utils';
import { useLocale } from '@/hooks/use-locale';

const URGENCY_STYLES = {
    good: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    urgent: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
} as const;

export function KpiTooltip({ desc, insights, visible, parentRef, urgency, actionLink }: {
    desc: string;
    insights: InsightRow[];
    visible: boolean;
    parentRef: React.RefObject<HTMLDivElement | null>;
    urgency?: 'good' | 'warning' | 'urgent';
    actionLink?: { label: string; href: string };
}) {
    const { t } = useLocale();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const URGENCY_LABELS: Record<string, string> = {
        good: t('tooltip.looking_good'),
        warning: t('tooltip.needs_attention'),
        urgent: t('tooltip.urgent'),
    };

    useEffect(() => {
        if (!visible || !parentRef.current) { setPos(null); return; }
        const rect = parentRef.current.getBoundingClientRect();
        const tooltipW = 280;
        const top = rect.bottom + 8;
        let left = rect.left + rect.width / 2;
        left = Math.max(tooltipW / 2 + 8, Math.min(left, window.innerWidth - tooltipW / 2 - 8));
        setPos({ top, left });
    }, [visible, parentRef]);

    if (!visible) return null;

    const u = urgency ? { ...URGENCY_STYLES[urgency], label: URGENCY_LABELS[urgency] } : null;

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
            <div className="w-[280px] rounded-xl bg-white/95 backdrop-blur-xl px-4 py-3.5 shadow-2xl shadow-black/15 ring-1 ring-neutral-200/60 dark:bg-neutral-900/95 dark:ring-neutral-700/60">
                {/* Urgency badge */}
                {u && (
                    <div className={`mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${u.bg}`}>
                        <span className={`size-1.5 rounded-full ${u.dot}`} />
                        <span className={`text-[10px] font-semibold ${u.text}`}>{u.label}</span>
                    </div>
                )}

                {/* Insight rows */}
                {insights.length > 0 && (
                    <div className="flex flex-col gap-2 mb-2.5">
                        {insights.map((row, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color ?? '#94a3b8' }} />
                                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{row.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {row.trend && (
                                            <span className={`text-[9px] ${row.trend === 'up' ? 'text-emerald-500' : row.trend === 'down' ? 'text-red-500' : 'text-neutral-400'}`}>
                                                {row.trend === 'up' ? '\u2191' : row.trend === 'down' ? '\u2193' : '\u2014'}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold tabular-nums text-neutral-800 dark:text-neutral-200">{row.value}</span>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                {row.max !== undefined && row.max > 0 && typeof row.value === 'number' && (
                                    <div className="mt-1 h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${row.max > 0 ? Math.min((row.value / row.max) * 100, 100) : 0}%`,
                                                backgroundColor: row.color ?? '#94a3b8',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {insights.length > 0 && (
                    <div className="mb-2.5 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                )}

                {/* Description */}
                <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{desc}</p>

                {/* Action link */}
                {actionLink && (
                    <a
                        href={actionLink.href}
                        className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 pointer-events-auto"
                    >
                        {actionLink.label}
                        <span>&rarr;</span>
                    </a>
                )}

                {/* Timestamp */}
                <p className="mt-2 text-[9px] text-neutral-300 dark:text-neutral-600">{t('dashboard.updated_just_now')}</p>
            </div>
        </div>,
        document.body
    );
}
