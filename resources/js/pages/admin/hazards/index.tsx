import { Head, router, useForm } from '@inertiajs/react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Car,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Crosshair,
    Droplets,
    MapPin,
    Pencil,
    Plus,
    Power,
    Save,
    Search,
    ShieldAlert,
    CloudRain,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import { swalDelete, swalSuccess } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';
import type { Hazard, HazardCategory, Severity } from '@/types/admin';
import { HAZARD_CATEGORY_LABELS, HAZARD_TYPE_OPTIONS } from '@/types/admin';

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    hazards: Paginated<Hazard>;
    stats: { total: number; active: number; inactive: number; flood: number; road: number };
    trends: { total: number; flood: number; road: number; label: string; period_label: string };
    period: string;
    custom_from: string | null;
    custom_to: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Hazards', href: '/admin/hazards' },
];

const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/15 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-500/20';

const modalSpring = { type: 'spring' as const, stiffness: 380, damping: 30 };

const CATEGORY_ICON: Record<HazardCategory, typeof Droplets> = {
    flood: Droplets,
    road:  Car,
};

const CATEGORY_COLORS: Record<HazardCategory, string> = {
    flood: 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
    road:  'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
};


function getTypeLabel(category: HazardCategory, type: string): string {
    return HAZARD_TYPE_OPTIONS[category]?.find((t) => t.value === type)?.label ?? type;
}

/* ─── Nasugbu bounds (shared) ─── */
const NASUGBU_BOUNDS = {
    north: 14.115,
    south: 14.010,
    east:  120.680,
    west:  120.565,
};

function isInNasugbu(latVal: number, lngVal: number): boolean {
    return (
        latVal >= NASUGBU_BOUNDS.south &&
        latVal <= NASUGBU_BOUNDS.north &&
        lngVal >= NASUGBU_BOUNDS.west  &&
        lngVal <= NASUGBU_BOUNDS.east
    );
}

function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}


/* ─── Smart hazard detection from geocode results ─── */

function detectHazardFromGeocode(
    results: google.maps.GeocoderResult[],
): { category: HazardCategory; type: string } | null {
    const ROAD_RESULT_TYPES = ['route', 'street_address', 'intersection'];
    const WATER_KEYWORDS    = ['river', 'creek', 'stream', 'ilog', 'bay', 'beach', 'coast', 'dagat', 'shore', 'lake', 'estero'];
    const ROAD_KEYWORDS     = ['highway', 'road', 'diversion', 'national road', 'brgy road', 'barangay road', 'daan'];

    /* Road: geocode type is route / street_address / intersection */
    for (const r of results) {
        if (r.types?.some((t) => ROAD_RESULT_TYPES.includes(t))) {
            const addr = r.formatted_address.toLowerCase();
            /* Flooded road vs generic closed road */
            const type = addr.includes('national') || addr.includes('highway') ? 'closed_road' : 'flooded_road';
            return { category: 'road', type };
        }
    }

    /* Flood: check address text for water body keywords */
    const firstAddr = (results[0]?.formatted_address ?? '').toLowerCase();
    const firstName  = (results[0]?.address_components?.[0]?.long_name ?? '').toLowerCase();
    const combined   = `${firstAddr} ${firstName}`;

    if (WATER_KEYWORDS.some((k) => combined.includes(k))) {
        const type = combined.includes('bay') || combined.includes('beach') || combined.includes('coast') || combined.includes('dagat')
            ? 'coastal_flood'
            : 'river_flood';
        return { category: 'flood', type };
    }

    /* Road keywords in address text (e.g. "National Road, Brgy. …") */
    if (ROAD_KEYWORDS.some((k) => combined.includes(k))) {
        return { category: 'road', type: 'flooded_road' };
    }

    return null;
}

/* ─── Main ─── */

export default function AdminHazardsIndex({ hazards, stats, trends, period, custom_from, custom_to }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const [selected,        setSelected]        = useState<number[]>([]);
    const [bulkProcessing,  setBulkProcessing]  = useState(false);
    const [syncing,         setSyncing]         = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingHazard,   setEditingHazard]   = useState<Hazard | null>(null);
    const [search,          setSearch]          = useState('');
    const [categoryFilter,  setCategoryFilter]  = useState('');
    const [statusFilter,    setStatusFilter]    = useState('');

    const allOnPageSelected = hazards.data.length > 0 && hazards.data.every((h) => selected.includes(h.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !hazards.data.some((h) => h.id === id)));
        } else {
            setSelected([...new Set([...selected, ...hazards.data.map((h) => h.id)])]);
        }
    };
    const toggleOne = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

    const runBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected hazard(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post('/admin/hazards/bulk', { ids: selected, action }, {
            preserveState: false,
            onFinish:  () => { setBulkProcessing(false); setSelected([]); },
            onSuccess: () => swalSuccess('Done', `${selected.length} hazard(s) ${action}d.`),
        });
    };

    const hasFilters    = !!(search || categoryFilter || statusFilter);
    const clearFilters  = () => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); };

    const filtered = hazards.data.filter((h) => {
        if (categoryFilter && h.category !== categoryFilter) return false;
        if (statusFilter === 'active'   &&  !h.active) return false;
        if (statusFilter === 'inactive' &&   h.active) return false;
        if (search) {
            const q = search.toLowerCase();
            return h.title.toLowerCase().includes(q) || (h.address ?? '').toLowerCase().includes(q);
        }
        return true;
    });

    const tl = trends.label;
    const activePct = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
    const floodPct = stats.total > 0 ? Math.round((stats.flood / stats.total) * 100) : 0;
    const roadPct = stats.total > 0 ? Math.round((stats.road / stats.total) * 100) : 0;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total': {
                if (stats.total === 0) return 'No hazards registered this period — survey areas and report any emerging risks.';
                const t = trends.total;
                const parts: string[] = [];
                if (t > 20) parts.push(`Hazards surging (${Math.abs(t)}% ${tl}) — conditions are worsening, increase field monitoring.`);
                else if (t > 0) parts.push(`Hazards increasing (${Math.abs(t)}% ${tl}) — stay alert for new risk areas.`);
                else if (t === 0) parts.push(`Hazard count stable ${tl} — conditions are consistent.`);
                else if (t > -20) parts.push(`Hazards easing (${Math.abs(t)}% ${tl}) — conditions are gradually improving.`);
                else parts.push(`Hazards dropping significantly (${Math.abs(t)}% ${tl}) — situation is clearing up.`);
                if (activePct < 50 && stats.inactive > 0) parts.push('Many hazards are hidden from map — review inactive ones and reactivate if still relevant.');
                else if (activePct >= 80) parts.push('Most hazards are visible on map — good situational awareness.');
                if (stats.flood > stats.road) parts.push('Flood hazards are the dominant risk — prioritize waterway monitoring.');
                else if (stats.road > stats.flood) parts.push('Road hazards lead — focus on road closures and detour planning.');
                return parts.join(' ');
            }
            case 'active': {
                if (stats.active === 0) return 'No hazards currently visible on map — activate relevant ones to warn residents of danger areas.';
                const parts: string[] = [];
                if (activePct >= 80) parts.push('Strong map coverage — residents can see most reported hazards.');
                else if (activePct >= 50) parts.push('Moderate map coverage — consider activating more hazards for better public awareness.');
                else parts.push('Low map visibility — many hazards are hidden. Activate critical ones to keep residents informed.');
                if (stats.inactive > stats.active) parts.push('More hazards are hidden than visible — review and activate outdated entries.');
                else parts.push('Most reported hazards are being shown — good transparency.');
                return parts.join(' ');
            }
            case 'inactive': {
                if (stats.inactive === 0) return 'All hazards are active and visible — full transparency for residents. Great.';
                const parts: string[] = [];
                if (stats.inactive > stats.active) parts.push('More hazards are hidden than shown — review these and reactivate any that are still dangerous.');
                else parts.push('A portion of hazards are hidden — periodic review ensures nothing critical stays invisible.');
                if (activePct < 50) parts.push('With most hazards inactive, residents may not be aware of ongoing risks — prioritize reactivation.');
                else parts.push('Active hazards cover the main risks — inactive ones may be resolved or low-priority.');
                return parts.join(' ');
            }
            case 'flood': {
                if (stats.flood === 0) return 'No flood hazards reported — conditions appear dry. Continue monitoring waterways and drainage.';
                const t = trends.flood;
                const parts: string[] = [];
                if (t > 20) parts.push(`Flood hazards surging (${Math.abs(t)}% ${tl}) — water levels may be rising, deploy monitoring teams.`);
                else if (t > 0) parts.push(`Flood hazards increasing (${Math.abs(t)}% ${tl}) — monitor drainage systems and low-lying areas.`);
                else if (t < -20) parts.push(`Flood hazards dropping (${Math.abs(t)}% ${tl}) — waters may be receding, verify before clearing.`);
                else if (t < 0) parts.push(`Flood hazards declining (${Math.abs(t)}% ${tl}) — situation is easing.`);
                else parts.push(`Flood hazard count steady ${tl} — sustained risk, maintain vigilance.`);
                if (floodPct > 60) parts.push('Flooding is the primary hazard — focus resources on flood response and prevention.');
                else parts.push('Flood hazards are part of a mixed risk profile — balance response across hazard types.');
                return parts.join(' ');
            }
            case 'road': {
                if (stats.road === 0) return 'No road hazards reported — routes appear clear. Continue monitoring key corridors.';
                const t = trends.road;
                const parts: string[] = [];
                if (t > 20) parts.push(`Road hazards surging (${Math.abs(t)}% ${tl}) — check for new closures and coordinate detours.`);
                else if (t > 0) parts.push(`Road hazards increasing (${Math.abs(t)}% ${tl}) — transportation routes may be compromised.`);
                else if (t < -20) parts.push(`Road hazards dropping (${Math.abs(t)}% ${tl}) — routes are being cleared, verify before reopening.`);
                else if (t < 0) parts.push(`Road hazards declining (${Math.abs(t)}% ${tl}) — conditions improving.`);
                else parts.push(`Road hazard count steady ${tl} — ongoing disruptions, maintain detour plans.`);
                if (roadPct > 60) parts.push('Road closures are the primary concern — prioritize route clearing and public advisories.');
                else parts.push('Road hazards are part of a broader risk picture — coordinate with flood response efforts.');
                return parts.join(' ');
            }
            default: return '';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hazards" />

            <div className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-neutral-900 shadow-sm dark:bg-white">
                            <ShieldAlert className="size-5 sm:size-6 text-white dark:text-neutral-900" />
                            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-neutral-600 ring-2 ring-white dark:bg-neutral-400 dark:ring-neutral-900">
                                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                            </span>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Hazard Zone Management
                            </h1>
                            <p className="mt-0.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Manage flood &amp; road hazards visible on the resident map
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/hazards" />
                        <button
                            onClick={() => {
                                setSyncing(true);
                                router.post('/admin/hazards/sync-weather', {}, {
                                    preserveState: false,
                                    onFinish: () => setSyncing(false),
                                });
                            }}
                            disabled={syncing}
                            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:bg-neutral-100 hover:shadow-md active:scale-[0.97] disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                            <CloudRain className={`size-4 ${syncing ? 'animate-pulse' : ''}`} />
                            {syncing ? 'Syncing…' : 'Sync Weather Alerts'}
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.97] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            <Plus className="size-4" />
                            Add Hazard
                        </button>
                    </div>
                </div>

                {/* ── KPI Stats ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <PrimaryStatCard
                        label="Total Hazard Zones"
                        value={stats.total}
                        trend={trends.total}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total')}
                        insights={[{ label: 'Active', value: stats.active, color: '#10b981' }, { label: 'Inactive', value: stats.inactive }]}
                        icon={ShieldAlert}
                        grad="from-neutral-800 via-neutral-900 to-neutral-950"
                        shadow="shadow-sm"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <PrimaryStatCard
                        label="Active Hazard Zones"
                        value={stats.active}
                        trend={undefined}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('active')}
                        insights={[]}
                        icon={AlertTriangle}
                        grad="from-neutral-700 via-neutral-800 to-neutral-900"
                        shadow="shadow-sm"
                        alert={stats.active > 0}
                        index={1}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={Power}
                        grad="from-neutral-400 to-neutral-500"
                        shadow="shadow-sm"
                        value={stats.inactive}
                        label="Cleared Zones"
                        trend={undefined}
                        desc={smartDesc('inactive')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={Droplets}
                        grad="from-neutral-600 to-neutral-700"
                        shadow="shadow-sm"
                        value={stats.flood}
                        label="Flood Hazards"
                        trend={trends.flood}
                        desc={smartDesc('flood')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={500}
                    />
                    <SecondaryStatCard
                        icon={Car}
                        grad="from-neutral-500 to-neutral-600"
                        shadow="shadow-sm"
                        value={stats.road}
                        label="Road Hazards"
                        trend={trends.road}
                        desc={smartDesc('road')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={600}
                    />
                </div>

                {/* ── Bulk action bar ── */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.99 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-neutral-50 px-5 py-3.5 dark:border-neutral-700/40 dark:bg-neutral-800/50"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-4 w-px bg-neutral-300/60 dark:bg-neutral-600/60" />
                                <button onClick={() => runBulkAction('activate')} disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50">
                                    <Power className="size-3.5" /> Activate
                                </button>
                                <button onClick={() => runBulkAction('deactivate')} disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-amber-600 disabled:opacity-50">
                                    <Power className="size-3.5" /> Deactivate
                                </button>
                                <button onClick={() => runBulkAction('delete')} disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50">
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <button onClick={() => setSelected([])}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/40">
                                    Clear selection
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Table Card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-3 sm:px-5 py-4 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="h-9 appearance-none rounded-xl border border-neutral-200 bg-neutral-50 pl-3 pr-8 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                    <option value="">All categories</option>
                                    <option value="flood">Flood</option>
                                    <option value="road">Road</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                            </div>
                            <div className="relative">
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-9 appearance-none rounded-xl border border-neutral-200 bg-neutral-50 pl-3 pr-8 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                    <option value="">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search hazards..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-8 text-xs outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                            {hasFilters && (
                                <button onClick={clearFilters}
                                    className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-neutral-700 dark:hover:border-red-800/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    title="Clear filters">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile card view */}
                    <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                        {filtered.map((hazard) => {
                            const CatIcon = CATEGORY_ICON[hazard.category] ?? ShieldAlert;
                            const isFlood = hazard.category === 'flood';
                            return (
                                <div key={hazard.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                        <CatIcon className="size-4 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">{hazard.title}</p>
                                            {hazard.active ? (
                                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-700/40">
                                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Active
                                                </span>
                                            ) : (
                                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[hazard.category]}`}>
                                                {getTypeLabel(hazard.category, hazard.type)}
                                            </span>
                                        </div>
                                        {hazard.address && (
                                            <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">{hazard.address}</p>
                                        )}
                                    </div>
                                    <button onClick={() => setEditingHazard(hazard)}
                                        className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white">
                                        <Pencil className="size-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-800/40">
                                    <th className="w-10 px-5 py-3 text-center">
                                        <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500/20 dark:border-neutral-600" />
                                    </th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Hazard</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Type</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Location</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Created</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {filtered.map((hazard) => (
                                    <HazardRow
                                        key={hazard.id}
                                        hazard={hazard}
                                        isSelected={selected.includes(hazard.id)}
                                        onToggle={() => toggleOne(hazard.id)}
                                        onEdit={() => setEditingHazard(hazard)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                <ShieldAlert className="size-8 text-neutral-400 dark:text-neutral-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No hazards found</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your filters.' : 'Add your first hazard to get started.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {hazards.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-3 sm:px-5 py-4 dark:border-neutral-800">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Page{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{hazards.current_page}</span>
                                {' '}of{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{hazards.last_page}</span>
                                <span className="ml-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="ml-2">{hazards.total} total</span>
                            </span>
                            <div className="flex items-center gap-1">
                                {hazards.links.map((link, i) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next')     || link.label.includes('&raquo;');
                                    if (isPrev || isNext) {
                                        return link.url ? (
                                            <button key={i} onClick={() => router.get(link.url!)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                        ) : (
                                            <span key={i} className="flex size-8 items-center justify-center rounded-lg opacity-30 text-neutral-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </span>
                                        );
                                    }
                                    return link.url ? (
                                        <button key={i} onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                                                    : 'border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span key={i} className="flex size-8 items-center justify-center rounded-lg text-xs opacity-30 text-neutral-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }} />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showCreateModal && <HazardFormModal onClose={() => setShowCreateModal(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {editingHazard && <HazardFormModal hazard={editingHazard} onClose={() => setEditingHazard(null)} />}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── Hazard Table Row ─── */

function HazardRow({ hazard, isSelected, onToggle, onEdit }: {
    hazard: Hazard; isSelected: boolean; onToggle: () => void; onEdit: () => void;
}) {
    const deleteForm = useForm({});
    const CatIcon    = CATEGORY_ICON[hazard.category] ?? ShieldAlert;
    const isFlood    = hazard.category === 'flood';

    return (
        <tr className={`group transition-colors ${
            isSelected ? 'bg-neutral-50 dark:bg-neutral-800/50' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }`}>
            <td className="w-10 px-5 py-4 text-center">
                <input type="checkbox" checked={isSelected} onChange={onToggle}
                    className="size-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500/20 dark:border-neutral-600" />
            </td>

            {/* Hazard (icon + title + category badge) */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                        <CatIcon className="size-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {hazard.title}
                        </p>
                        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[hazard.category]}`}>
                            {HAZARD_CATEGORY_LABELS[hazard.category]}
                        </span>
                    </div>
                </div>
            </td>

            {/* Type */}
            <td className="px-5 py-4">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {getTypeLabel(hazard.category, hazard.type)}
                </span>
            </td>

            {/* Status */}
            <td className="px-5 py-4">
                {hazard.active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-700/40">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                        <span className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" /> Inactive
                    </span>
                )}
            </td>

            {/* Location */}
            <td className="max-w-[200px] px-5 py-4">
                {hazard.address ? (
                    <div className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={hazard.address}>
                            {hazard.address}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                )}
            </td>

            {/* Created */}
            <td className="whitespace-nowrap px-5 py-4">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {new Date(hazard.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </td>

            {/* Actions */}
            <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={() => router.post(`/admin/hazards/${hazard.id}/toggle`, {}, { preserveState: false })}
                        className={`rounded-lg p-1.5 transition-colors ${
                            hazard.active
                                ? 'text-neutral-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400'
                                : 'text-neutral-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400'
                        }`}
                        title={hazard.active ? 'Deactivate' : 'Activate'}>
                        <Power className="size-3.5" />
                    </button>
                    <button onClick={onEdit}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                        title="Edit hazard">
                        <Pencil className="size-3.5" />
                    </button>
                    <button
                        onClick={async () => {
                            const confirmed = await swalDelete('this hazard');
                            if (confirmed) deleteForm.delete(`/admin/hazards/${hazard.id}`, {
                                preserveState: false,
                                onSuccess: () => swalSuccess('Deleted', 'Hazard has been removed.'),
                            });
                        }}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Delete hazard">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ─── Create / Edit Modal ─── */

function HazardFormModal({ hazard, onClose }: { hazard?: Hazard; onClose: () => void }) {
    const isEditing = !!hazard;

    const form = useForm({
        category:  (hazard?.category  ?? 'flood')    as HazardCategory,
        type:       hazard?.type      ?? '',
        severity:  (hazard?.severity  ?? 'moderate') as Severity,
        title:      hazard?.title     ?? '',
        latitude:   hazard?.latitude?.toString()  ?? '',
        longitude:  hazard?.longitude?.toString() ?? '',
        address:    hazard?.address   ?? '',
    });

    const currentTypes = HAZARD_TYPE_OPTIONS[form.data.category] ?? [];

    /* Lock prevents map pin from overriding a manual category/type selection */
    const [catLocked, setCatLocked] = useState(isEditing);

    /* Auto-fill title from type label */
    const handleTypeChange = (val: string) => {
        const label = (HAZARD_TYPE_OPTIONS[form.data.category] ?? []).find((t) => t.value === val)?.label ?? val;
        form.setData('type', val);
        if (val) form.setData('title', label);
    };

    /* Called by MapPicker after a reverse geocode completes */
    const handleGeocode = useCallback((results: google.maps.GeocoderResult[]) => {
        if (catLocked || isEditing) return;
        const hint = detectHazardFromGeocode(results);
        if (!hint) return;
        /* Only auto-set if category or type hasn't been manually picked */
        if (hint.category !== form.data.category) {
            form.setData('category', hint.category);
        }
        const label = (HAZARD_TYPE_OPTIONS[hint.category] ?? []).find((t) => t.value === hint.type)?.label ?? hint.type;
        form.setData('type', hint.type);
        form.setData('title', label);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [catLocked, isEditing, form.data.category]);

    /* Readiness check */
    const hasPin  = form.data.latitude !== '' && form.data.longitude !== '';
    const isReady = !!(form.data.type && form.data.address && hasPin);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEditing) {
            form.put(`/admin/hazards/${hazard!.id}`, {
                preserveState: false,
                onSuccess: () => { onClose(); swalSuccess('Updated', 'Hazard has been updated.'); },
            });
        } else {
            form.post('/admin/hazards', {
                preserveState: false,
                onSuccess: () => { form.reset(); onClose(); swalSuccess('Created', 'Hazard is now visible on the map.'); },
            });
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={modalSpring}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl shadow-black/20 dark:border-neutral-700/60 dark:bg-neutral-900"
            >
                {/* Modal Header */}
                <div className="flex items-center gap-3.5 bg-neutral-50 px-6 py-4 dark:bg-neutral-800/50">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-900 shadow-sm dark:bg-white">
                        <ShieldAlert className="size-5 text-white dark:text-neutral-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                                {isEditing ? 'Edit Hazard' : 'Create New Hazard'}
                            </h3>
                            {isEditing && hazard?.type && (
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_COLORS[hazard.category]}`}>
                                    {getTypeLabel(hazard.category, hazard.type)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEditing ? 'Update hazard details below' : 'This hazard will appear on the map for all users'}
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />

                {/* Body — two-column */}
                <form onSubmit={submit} className="flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr]">

                        {/* LEFT — form fields */}
                        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 lg:border-b-0 lg:border-r dark:border-neutral-800">

                            {/* 1. Location (address autocomplete) */}
                            <FormField label="Location" error={form.errors.address}>
                                <AddressAutocomplete
                                    value={form.data.address}
                                    onAddressChange={(val) => form.setData('address', val)}
                                    onPlaceSelect={(lat, lng, addr) => {
                                        form.setData('address', addr);
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                    }}
                                    className={`${inputClass} pl-8`}
                                    placeholder="Search places in Nasugbu…"
                                />
                            </FormField>

                            {/* 2. Category toggle */}
                            <FormField label="Category" error={form.errors.category}>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['flood', 'road'] as const).map((cat) => {
                                        const CatIcon = CATEGORY_ICON[cat];
                                        const active  = form.data.category === cat;
                                        return (
                                            <button key={cat} type="button"
                                                onClick={() => { setCatLocked(true); form.setData('category', cat); form.setData('type', ''); }}
                                                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
                                                    active
                                                        ? 'border-neutral-900 bg-neutral-50 text-neutral-900 dark:border-white dark:bg-neutral-800 dark:text-white'
                                                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                                                }`}
                                            >
                                                <CatIcon className="size-4" />
                                                {HAZARD_CATEGORY_LABELS[cat]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FormField>

                            {/* 3. Hazard type */}
                            <FormField label="Hazard Type" error={form.errors.type}>
                                <div className="relative">
                                    <select value={form.data.type} onChange={(e) => handleTypeChange(e.target.value)}
                                        className={`${inputClass} appearance-none pr-8`} required>
                                        <option value="">Select type…</option>
                                        {currentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                </div>
                            </FormField>

                        </div>

                        {/* RIGHT — map */}
                        <div className="flex flex-col gap-2 px-4 py-4">
                            <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                Pin Location
                            </label>
                            <div className="flex-1">
                                <MapPicker
                                    latitude={form.data.latitude}
                                    longitude={form.data.longitude}
                                    address={form.data.address}
                                    onChange={(lat, lng, addr) => {
                                        form.setData('latitude', lat);
                                        form.setData('longitude', lng);
                                        if (addr) form.setData('address', addr);
                                    }}
                                    onGeocode={handleGeocode}
                                />
                            </div>
                            {(form.errors.latitude || form.errors.longitude) && (
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {form.errors.latitude || form.errors.longitude}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <div>
                            {isEditing && (
                                <button type="button"
                                    onClick={async () => {
                                        const confirmed = await swalDelete('this hazard');
                                        if (confirmed) router.delete(`/admin/hazards/${hazard!.id}`, {
                                            preserveState: false,
                                            onSuccess: () => { onClose(); swalSuccess('Deleted', 'Hazard has been removed.'); },
                                        });
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button type="button" onClick={onClose}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800">
                                Cancel
                            </button>
                            <button type="submit"
                                disabled={form.processing || (!isEditing && !isReady)}
                                title={!isReady && !isEditing ? 'Fill in all fields and pin a location first' : undefined}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isReady || isEditing
                                        ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                                        : 'bg-neutral-400 text-white shadow-neutral-400/20'
                                }`}
                            >
                                {isEditing ? <Save className="size-4" /> : <Plus className="size-4" />}
                                {form.processing ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Hazard'}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Map Picker ─── */

const MAP_DEFAULT   = { lat: 14.0771, lng: 120.6361 };
const MAP_CONTAINER = { width: '100%', height: '100%', minHeight: '200px', borderRadius: '12px' };
const MAP_OPTIONS: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    restriction: {
        latLngBounds: {
            north: NASUGBU_BOUNDS.north,
            south: NASUGBU_BOUNDS.south,
            east:  NASUGBU_BOUNDS.east,
            west:  NASUGBU_BOUNDS.west,
        },
        strictBounds: true,
    },
    styles: [
        { featureType: 'poi',     elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',                        stylers: [{ visibility: 'off' }] },
    ],
};

function MapPicker({ latitude, longitude, address, onChange, onGeocode }: {
    latitude: string; longitude: string; address: string;
    onChange: (lat: string, lng: string, address?: string) => void;
    onGeocode?: (results: google.maps.GeocoderResult[]) => void;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const [resolving,     setResolving]     = useState(false);
    const [outsideBounds, setOutsideBounds] = useState(false);

    const lat    = parseFloat(latitude);
    const lng    = parseFloat(longitude);
    const hasPin = !isNaN(lat) && !isNaN(lng);

    useEffect(() => {
        if (mapRef.current && hasPin) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(16);
        }
    }, [lat, lng, hasPin]);

    const reverseGeocode = useCallback((latVal: number, lngVal: number) => {
        const geocoder = new google.maps.Geocoder();
        setResolving(true);
        geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
            setResolving(false);
            if (status === 'OK' && results?.length) {
                const best = results.find(r => !/^[0-9A-Z]{4,8}\+/i.test(r.formatted_address)) ?? results[0];
                onChange(latVal.toFixed(7), lngVal.toFixed(7), cleanAddress(best.formatted_address));
                onGeocode?.(results);
            } else {
                onChange(latVal.toFixed(7), lngVal.toFixed(7));
            }
        });
    }, [onChange, onGeocode]);

    const handleMapEvent = useCallback((e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const latVal = e.latLng.lat();
        const lngVal = e.latLng.lng();
        if (!isInNasugbu(latVal, lngVal)) {
            setOutsideBounds(true);
            setTimeout(() => setOutsideBounds(false), 2500);
            return;
        }
        setOutsideBounds(false);
        reverseGeocode(latVal, lngVal);
    }, [reverseGeocode]);

    if (!isLoaded) {
        return (
            <div className="flex h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="text-sm text-neutral-400">Loading map…</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="relative overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-700">
                <GoogleMap
                    mapContainerStyle={MAP_CONTAINER}
                    center={hasPin ? { lat, lng } : MAP_DEFAULT}
                    zoom={hasPin ? 16 : 13}
                    options={MAP_OPTIONS}
                    onLoad={(map) => { mapRef.current = map; }}
                    onUnmount={() => { mapRef.current = null; }}
                    onClick={handleMapEvent}
                >
                    {hasPin && <MarkerF position={{ lat, lng }} draggable onDragEnd={handleMapEvent} />}
                </GoogleMap>

                <AnimatePresence>
                    {outsideBounds && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                        >
                            Pin must be inside Nasugbu, Batangas
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <p className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                <Crosshair className="size-3" />
                {hasPin ? 'Drag the pin to fine-tune the location' : 'Click on the map to place the pin'}
                {resolving && <span className="ml-1 text-neutral-500">· Resolving…</span>}
            </p>
        </div>
    );
}

/* ─── Address Autocomplete (Nasugbu-scoped, programmatic) ─── */

const PLUS_CODE_RE = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}$/i;

function AddressAutocomplete({ value, onAddressChange, onPlaceSelect, className, placeholder }: {
    value: string;
    onAddressChange: (val: string) => void;
    onPlaceSelect: (lat: string, lng: string, address: string) => void;
    className?: string;
    placeholder?: string;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [inputVal,    setInputVal]    = useState(value);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [open,        setOpen]        = useState(false);
    const [fetching,    setFetching]    = useState(false);

    const acServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef    = useRef<google.maps.places.PlacesService | null>(null);
    const placesDivRef = useRef<HTMLDivElement | null>(null);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef   = useRef<HTMLDivElement>(null);

    /* Sync external value (map pin reverse geocode) into input */
    useEffect(() => { setInputVal(value); }, [value]);

    /* Init Google Places services */
    useEffect(() => {
        if (!isLoaded) return;
        acServiceRef.current = new google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        document.body.appendChild(div);
        placesDivRef.current = div;
        placesRef.current = new google.maps.places.PlacesService(div);
        return () => { if (placesDivRef.current) document.body.removeChild(placesDivRef.current); };
    }, [isLoaded]);

    /* Close on outside click */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchPredictions = useCallback((q: string) => {
        if (!q || q.length < 2 || !acServiceRef.current) { setPredictions([]); setOpen(false); return; }
        const bounds = new google.maps.LatLngBounds(
            { lat: NASUGBU_BOUNDS.south, lng: NASUGBU_BOUNDS.west },
            { lat: NASUGBU_BOUNDS.north, lng: NASUGBU_BOUNDS.east },
        );
        setFetching(true);
        acServiceRef.current.getPlacePredictions(
            { input: q, bounds, strictBounds: true, componentRestrictions: { country: 'ph' } },
            (preds, status) => {
                setFetching(false);
                if (status === 'OK' && preds) {
                    const filtered = preds.filter((p) => p.description.toLowerCase().includes('nasugbu'));
                    setPredictions(filtered);
                    setOpen(filtered.length > 0);
                } else {
                    setPredictions([]); setOpen(false);
                }
            },
        );
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setInputVal(q);
        onAddressChange(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchPredictions(q), 300);
    };

    const selectPrediction = (pred: google.maps.places.AutocompletePrediction) => {
        setOpen(false);
        if (!placesRef.current) return;
        placesRef.current.getDetails(
            { placeId: pred.place_id, fields: ['formatted_address', 'geometry', 'name', 'address_components'] },
            (place, status) => {
                if (status !== 'OK' || !place?.geometry?.location) return;
                const lat  = place.geometry.location.lat().toFixed(7);
                const lng  = place.geometry.location.lng().toFixed(7);
                const addr = cleanAddress(place.formatted_address ?? place.name ?? '');
                setInputVal(addr);
                onPlaceSelect(lat, lng, addr);
            },
        );
    };

    return (
        <div ref={wrapperRef} className="relative flex flex-col gap-1">
            <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    value={inputVal}
                    onChange={handleInput}
                    onFocus={() => predictions.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    className={className}
                    autoComplete="off"
                />
                {fetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-t-white" />
                    </div>
                )}
            </div>

            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/30"
                        >
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {pred.structured_formatting.main_text}
                            </span>
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                {pred.structured_formatting.secondary_text}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── Form Field ─── */

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/* suppress unused import warning — Zap and AlertTriangle used as potential future icons */
void Zap; void AlertTriangle;
