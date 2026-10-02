import { Skeleton } from '@/components/ui/skeleton';

/** Stat card skeleton — matches PrimaryStatCard / SecondaryStatCard */
export function StatCardSkeleton() {
    return (
        <div className="rounded-lg border border-neutral-200/70 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between">
                <Skeleton className="h-2 w-20" />
                <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="mt-2 h-5 w-14" />
            <Skeleton className="mt-2 h-3 w-10 rounded" />
            <Skeleton className="mt-1.5 h-2 w-32" />
        </div>
    );
}

/** Row of stat card skeletons */
export function StatRowSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {Array.from({ length: count }).map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    );
}

/** Chart card skeleton */
export function ChartCardSkeleton({ height = 280 }: { height?: number }) {
    return (
        <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3 border-b border-neutral-100/80 px-5 py-3 dark:border-neutral-800/80">
                <div>
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="mt-1 h-2 w-40" />
                </div>
            </div>
            <div className="p-4">
                <Skeleton className="w-full rounded-lg" style={{ height }} />
            </div>
        </div>
    );
}

/** Table skeleton */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
    return (
        <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <div className="ml-auto flex gap-1.5">
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
            </div>
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-2 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-neutral-50 px-4 py-3 dark:border-neutral-800/50">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className={`h-2.5 flex-1 ${j === 0 ? 'max-w-[80px]' : ''}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Settings card skeleton */
export function SettingsCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <Skeleton className="size-6 rounded-lg" />
                <div>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-1 h-2 w-36" />
                </div>
            </div>
            <div className="flex flex-col gap-4 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-2.5 w-28" />
                            <Skeleton className="mt-1 h-2 w-40" />
                        </div>
                        <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Page header skeleton */
export function PageHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-1.5 h-2.5 w-56" />
            </div>
            <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
    );
}

/** Full dashboard skeleton */
export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">
            <PageHeaderSkeleton />
            <StatRowSkeleton count={5} />
            <StatRowSkeleton count={5} />
            <ChartCardSkeleton height={320} />
            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCardSkeleton />
                <ChartCardSkeleton />
            </div>
        </div>
    );
}

/** Full reports list skeleton */
export function ReportsListSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">
            <PageHeaderSkeleton />
            <StatRowSkeleton count={4} />
            <TableSkeleton rows={10} cols={8} />
        </div>
    );
}

/** Full statistics skeleton */
export function StatisticsSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">
            <PageHeaderSkeleton />
            <StatRowSkeleton count={3} />
            <ChartCardSkeleton height={280} />
            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCardSkeleton />
                <ChartCardSkeleton />
            </div>
            <ChartCardSkeleton height={280} />
            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCardSkeleton />
                <ChartCardSkeleton />
            </div>
        </div>
    );
}

/** Full settings skeleton */
export function SettingsSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">
            <PageHeaderSkeleton />
            <div className="grid gap-4 lg:grid-cols-2">
                <SettingsCardSkeleton />
                <SettingsCardSkeleton />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <SettingsCardSkeleton />
                <SettingsCardSkeleton />
            </div>
        </div>
    );
}

/** Teams / Responders / Users list skeleton */
export function ManagementListSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">
            <PageHeaderSkeleton />
            <StatRowSkeleton count={4} />
            <TableSkeleton rows={8} cols={6} />
        </div>
    );
}

/** Weather page skeleton */
export function WeatherSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 lg:p-8">
            <div className="rounded-lg border border-neutral-200/60 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-1 h-2.5 w-64" />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-neutral-200/70 p-3 dark:border-neutral-800">
                            <Skeleton className="h-2 w-16" />
                            <Skeleton className="mt-2 h-5 w-10" />
                        </div>
                    ))}
                </div>
            </div>
            <ChartCardSkeleton height={200} />
            <ChartCardSkeleton height={300} />
        </div>
    );
}

/** Map skeleton */
export function MapSkeleton() {
    return (
        <div className="flex h-[calc(100vh-57px)]">
            <Skeleton className="flex-1" />
        </div>
    );
}
