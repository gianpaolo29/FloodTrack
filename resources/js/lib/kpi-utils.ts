export interface InsightRow {
    label: string;
    value: string | number;
    color?: string;
}

export interface TrendData {
    label: string;
    period_label: string;
    [key: string]: number | string;
}

export const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'Monthly' },
    { key: 'all',   label: 'All' },
    { key: 'custom', label: 'Custom' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export function formatResponseTime(minutes: number): string {
    if (minutes <= 0) return '—';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
