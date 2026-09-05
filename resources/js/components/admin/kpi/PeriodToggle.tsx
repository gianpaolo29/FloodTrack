import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { router } from '@inertiajs/react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PERIODS } from '@/lib/kpi-utils';

/* ─── Calendar Date Range Picker (portal) ─── */
function CalendarPicker({ fromDate, toDate, onApply, onClose, anchorRef }: {
    fromDate: string | null; toDate: string | null;
    onApply: (from: string, to: string) => void; onClose: () => void;
    anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
    const [viewDate, setViewDate] = useState(() => {
        if (fromDate) return new Date(fromDate + 'T00:00:00');
        return new Date();
    });
    const [rangeStart, setRangeStart] = useState<string | null>(fromDate ?? null);
    const [rangeEnd, setRangeEnd] = useState<string | null>(toDate ?? null);
    const [selecting, setSelecting] = useState<'start' | 'end'>('start');
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const calW = 320;
        let left = rect.right - calW;
        if (left < 8) left = 8;
        if (left + calW > window.innerWidth - 8) left = window.innerWidth - calW - 8;
        setPos({ top: rect.bottom + 8, left });
    }, [anchorRef]);

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const isInRange = (dateStr: string) => {
        if (!rangeStart || !rangeEnd) return false;
        return dateStr >= rangeStart && dateStr <= rangeEnd;
    };

    const handleDayClick = (d: number) => {
        const dateStr = fmt(d);
        if (selecting === 'start') {
            setRangeStart(dateStr);
            setRangeEnd(null);
            setSelecting('end');
        } else {
            if (rangeStart && dateStr < rangeStart) {
                setRangeStart(dateStr);
                setRangeEnd(rangeStart);
            } else {
                setRangeEnd(dateStr);
            }
            setSelecting('start');
        }
    };

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const formatDisplay = (d: string | null) => {
        if (!d) return '—';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return ReactDOM.createPortal(
        <div
            className="calendar-portal fixed z-[9999] w-[320px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl shadow-black/15 dark:border-neutral-700 dark:bg-neutral-900 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, opacity: pos ? 1 : 0 }}
        >
            <div className="mb-3 flex items-center justify-between">
                <button onClick={prevMonth} className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                    <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-semibold text-neutral-800 dark:text-white">{monthName}</span>
                <button onClick={nextMonth} className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                    <ChevronRight className="size-4" />
                </button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <span key={d} className="py-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((d, i) => {
                    if (d === null) return <span key={`e-${i}`} />;
                    const dateStr = fmt(d);
                    const isStart = dateStr === rangeStart;
                    const isEnd = dateStr === rangeEnd;
                    const inRange = isInRange(dateStr);
                    const isToday = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;
                    return (
                        <button
                            key={d}
                            disabled={isFuture}
                            onClick={() => handleDayClick(d)}
                            className={`relative flex size-9 items-center justify-center text-xs font-medium transition-all mx-auto rounded-lg
                                ${isFuture ? 'cursor-not-allowed text-neutral-200 dark:text-neutral-700' : 'cursor-pointer'}
                                ${isStart || isEnd
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                    : inRange
                                        ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                        : isToday
                                            ? 'ring-1 ring-neutral-400 text-neutral-700 dark:ring-neutral-600 dark:text-neutral-300'
                                            : !isFuture ? 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800' : ''
                                }
                            `}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">From</p>
                    <p className={`mt-0.5 text-xs font-bold ${rangeStart ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-600'}`}>
                        {formatDisplay(rangeStart)}
                    </p>
                </div>
                <ChevronRight className="size-3 text-neutral-300 dark:text-neutral-600" />
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">To</p>
                    <p className={`mt-0.5 text-xs font-bold ${rangeEnd ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-600'}`}>
                        {formatDisplay(rangeEnd)}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
                <button onClick={onClose} className="flex-1 rounded-xl border border-neutral-200 py-2 text-[11px] font-semibold text-neutral-500 transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800">
                    Cancel
                </button>
                <button
                    onClick={() => { if (rangeStart && rangeEnd) onApply(rangeStart, rangeEnd); }}
                    disabled={!rangeStart || !rangeEnd}
                    className={`flex-1 rounded-xl py-2 text-[11px] font-semibold transition-all ${
                        rangeStart && rangeEnd
                            ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                            : 'bg-neutral-100 text-neutral-300 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-600'
                    }`}
                >
                    Apply
                </button>
            </div>
        </div>,
        document.body
    );
}

/* ─── Period Toggle ─── */
export function PeriodToggle({ period, customFrom, customTo, baseUrl, extraParams = {} }: {
    period: string;
    customFrom?: string | null;
    customTo?: string | null;
    baseUrl: string;
    extraParams?: Record<string, string>;
}) {
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Close calendar on outside click
    useEffect(() => {
        if (!showCalendar) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (calendarRef.current?.contains(target)) return;
            const portal = document.querySelector('.calendar-portal');
            if (portal?.contains(target)) return;
            setShowCalendar(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCalendar]);

    const customRangeLabel = period === 'custom' && customFrom
        ? (() => {
            const f = new Date(customFrom + 'T00:00:00');
            const t = customTo ? new Date(customTo + 'T00:00:00') : new Date();
            return `${f.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        })()
        : null;

    const navigate = (p: string, from?: string, to?: string) => {
        const params: Record<string, string> = { ...extraParams, period: p };
        if (from) params.from = from;
        if (to) params.to = to;
        router.get(baseUrl, params, { preserveState: true, preserveScroll: true });
    };

    const setPeriod = (key: string) => {
        if (key === 'custom') {
            setShowCalendar(true);
            return;
        }
        setShowCalendar(false);
        navigate(key);
    };

    const applyCustomRange = (from: string, to: string) => {
        setShowCalendar(false);
        navigate('custom', from, to);
    };

    return (
        <div className="relative flex flex-wrap items-center rounded-xl border border-neutral-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-800/60" ref={calendarRef}>
            {PERIODS.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => setPeriod(key)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all sm:px-3.5 sm:text-xs ${
                        period === key || (key === 'custom' && showCalendar)
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                >
                    {key === 'custom' ? (
                        <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {period === 'custom' && customRangeLabel ? customRangeLabel : label}
                        </span>
                    ) : label}
                </button>
            ))}
            {period === 'custom' && customRangeLabel && !showCalendar && (
                <button
                    onClick={() => setPeriod('all')}
                    className="ml-0.5 flex size-5 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                    title="Clear custom range"
                >
                    <X className="size-3" />
                </button>
            )}
            {showCalendar && (
                <CalendarPicker
                    fromDate={customFrom ?? null}
                    toDate={customTo ?? null}
                    onApply={applyCustomRange}
                    onClose={() => setShowCalendar(false)}
                    anchorRef={calendarRef}
                />
            )}
        </div>
    );
}
