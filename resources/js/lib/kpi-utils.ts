export interface InsightRow {
    label: string;
    value: string | number;
    color?: string;
    max?: number;
    trend?: 'up' | 'down' | 'flat';
    link?: string;
}

export interface TrendData {
    label: string;
    period_label: string;
    [key: string]: number | string;
}

export const PERIODS = [
    { key: 'today', labelKey: 'filter.today' },
    { key: 'week',  labelKey: 'filter.this_week' },
    { key: 'month', labelKey: 'filter.monthly' },
    { key: 'all',   labelKey: 'filter.all' },
    { key: 'custom', labelKey: 'filter.custom' },
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
