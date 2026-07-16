'use no memo';
import { Head, Link, router } from '@inertiajs/react';
import { GoogleMap, InfoWindowF, MarkerF, OverlayViewF, useJsApiLoader } from '@react-google-maps/api';
import { CalendarDays, Flame, List, MapPin, SlidersHorizontal, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Report, ReportStatus, Severity } from '@/types/admin';
import { SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Filters {
    status?: string;
    severity?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    reports: Report[];
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Reports', href: '/admin/reports' },
    { title: 'Map view', href: '/admin/reports/map' },
];

const STATUS_OPTIONS = ['', 'pending', 'verified', 'assigned', 'resolved', 'rejected'];
const SEVERITY_OPTIONS = ['', 'critical', 'high', 'moderate', 'low'];

const SEVERITY_META: Record<Severity, { color: string; hex: string; rgb: string; label: string }> = {
    critical: { color: 'bg-red-500',    hex: '#ef4444', rgb: '239,68,68',   label: 'Critical' },
    high:     { color: 'bg-orange-500', hex: '#f97316', rgb: '249,115,22',  label: 'High'     },
    moderate: { color: 'bg-amber-400',  hex: '#fbbf24', rgb: '251,191,36',  label: 'Moderate' },
    low:      { color: 'bg-emerald-500',hex: '#22c55e', rgb: '34,197,94',   label: 'Low'      },
};

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1 };
const STATUS_MULTIPLIER: Record<ReportStatus, number> = {
    verified: 1.5, assigned: 1.5, resolved: 1.2, pending: 0.8, rejected: 0.0,
};

/** Custom teardrop SVG pin per severity */
function createSvgMarker(severity: Severity): string {
    const hex = SEVERITY_META[severity].hex;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
        <path filter="url(#s)" d="M14 1C6.82 1 1 6.82 1 14c0 9.8 13 21 13 21s13-11.2 13-21C27 6.82 21.18 1 14 1z" fill="${hex}"/>
        <circle cx="14" cy="14" r="5.5" fill="white" opacity="0.9"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const mapContainerStyle = { width: '100%', height: '100%' };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry',           stylers: [{ color: '#f0f4f8' }] },
    { elementType: 'labels.icon',        stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill',   stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f0f4f8' }] },
    { featureType: 'poi',                stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',            stylers: [{ visibility: 'off' }] },
    { featureType: 'road',               elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial',      elementType: 'geometry',         stylers: [{ color: '#e5e7eb' }] },
    { featureType: 'road.highway',       elementType: 'geometry',         stylers: [{ color: '#d1d5db' }] },
    { featureType: 'road.highway',       elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'administrative',     elementType: 'geometry.stroke',  stylers: [{ color: '#d1d5db' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] },
    { featureType: 'water',              elementType: 'geometry',         stylers: [{ color: '#bfdbfe' }] },
    { featureType: 'water',              elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
    { featureType: 'landscape.natural',  elementType: 'geometry',         stylers: [{ color: '#ecfdf5' }] },
];

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    fullscreenControl: true,
    gestureHandling: 'greedy',
    styles: MAP_STYLES,
};

type ViewMode = 'markers' | 'heatmap' | 'both';

interface HeatPoint { lat: number; lng: number; weight: number; }

/* ─── Heatmap dots — zoom-aware ─── */
function intensityRgb(intensity: number): string {
    if (intensity < 0.25) return '34,197,94';
    if (intensity < 0.5)  return '251,191,36';
    if (intensity < 0.75) return '249,115,22';
    return '239,68,68';
}

function HeatmapOverlay({ points, visible, zoom }: { points: HeatPoint[]; visible: boolean; zoom: number }) {
    if (!visible || points.length === 0) return null;

    const maxWeight = Math.max(...points.map((p) => p.weight), 1);
    // Scale dots with zoom: reference zoom=12, gentle linear scale clamped
    const zoomFactor = Math.max(0.3, Math.min(2.5, (zoom - 8) / 4));

    return (
        <>
            {points.filter((p) => p.weight > 0).map((p, i) => {
                const intensity = p.weight / maxWeight;
                const size   = (14 + intensity * 16) * zoomFactor;
                const blur   = (3  + intensity * 4)  * zoomFactor;
                const rgb    = intensityRgb(intensity);
                const alpha1 = (0.45 + intensity * 0.35).toFixed(2);
                return (
                    <OverlayViewF key={i} position={{ lat: p.lat, lng: p.lng }} mapPaneName="overlayLayer">
                        <div style={{
                            width: size, height: size,
                            borderRadius: '50%',
                            pointerEvents: 'none',
                            background: `radial-gradient(circle, rgba(${rgb},${alpha1}) 0%, rgba(${rgb},0.08) 60%, rgba(${rgb},0) 100%)`,
                            filter: `blur(${blur}px)`,
                            transform: 'translate(-50%, -50%)',
                        }} />
                    </OverlayViewF>
                );
            })}
        </>
    );
}

/* ─── Filter select ─── */
function FilterSelect({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
            <option value="">{placeholder}</option>
            {options.filter(Boolean).map((opt) => (
                <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                </option>
            ))}
        </select>
    );
}

/* ─── Main page ─── */
export default function AdminReportsMap({ reports, filters }: Props) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [viewMode, setViewMode]             = useState<ViewMode>('markers');
    const [zoom, setZoom]                     = useState(12);

    const showMarkers = viewMode === 'markers' || viewMode === 'both';
    const showHeatmap = viewMode === 'heatmap' || viewMode === 'both';
    const hasFilters  = !!(filters.status || filters.severity || filters.date_from || filters.date_to);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/reports/map', { ...filters, [key]: value || undefined }, {
            preserveState: true, replace: true,
        });
    }, [filters]);

    const center = { lat: 14.0681, lng: 120.6236 }; // Nasugbu, Batangas

    const onMapLoad = useCallback((map: google.maps.Map) => {
        map.setCenter({ lat: 14.0681, lng: 120.6236 });
        map.setZoom(13);
    }, []);

    const heatPoints = useMemo((): HeatPoint[] => {
        return reports.flatMap((r) => {
            const weight = Math.round(SEVERITY_WEIGHT[r.severity] * STATUS_MULTIPLIER[r.status]);
            return weight > 0 ? [{ lat: r.latitude, lng: r.longitude, weight }] : [];
        });
    }, [reports]);

    // Severity counts for stat pills
    const counts = useMemo(() => ({
        critical: reports.filter((r) => r.severity === 'critical').length,
        high:     reports.filter((r) => r.severity === 'high').length,
        moderate: reports.filter((r) => r.severity === 'moderate').length,
        low:      reports.filter((r) => r.severity === 'low').length,
    }), [reports]);

    // Sort reports: critical first
    const sortedReports = useMemo(() =>
        [...reports].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]),
    [reports]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Map View" />

            <div className="flex h-[calc(100vh-57px)] flex-col lg:flex-row">

                {/* ── Side panel ── */}
                <div className="flex w-full flex-col border-b border-neutral-200/70 bg-white lg:w-[340px] lg:border-b-0 lg:border-r dark:border-neutral-800 dark:bg-neutral-900">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">Map View</h1>
                            <p className="mt-0.5 text-[11px] text-neutral-400">Flood report locations</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                                {reports.length} report{reports.length !== 1 ? 's' : ''}
                            </span>
                            <Link href="/admin/reports" className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                <List className="size-3" /> List
                            </Link>
                        </div>
                    </div>

                    {/* Severity stat pills */}
                    <div className="grid grid-cols-4 gap-2 border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
                        {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => filter('severity', filters.severity === s ? '' : s)}
                                className={`flex flex-col items-center rounded-xl p-2 transition-all ${
                                    filters.severity === s
                                        ? 'ring-2 ring-offset-1'
                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                }`}
                                style={filters.severity === s ? { '--tw-ring-color': SEVERITY_META[s].hex } as React.CSSProperties : {}}
                            >
                                <span className="text-base font-bold text-neutral-900 dark:text-white">{counts[s]}</span>
                                <span className={`mt-1 h-1.5 w-full rounded-full ${SEVERITY_META[s].color}`} />
                                <span className="mt-1 text-[9px] font-medium text-neutral-400">{SEVERITY_META[s].label}</span>
                            </button>
                        ))}
                    </div>

                    {/* View mode toggle */}
                    <div className="border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">View mode</p>
                        <div className="grid grid-cols-3 gap-1.5">
                            {([
                                { value: 'markers', label: 'Markers', icon: MapPin },
                                { value: 'both',    label: 'Both',    icon: SlidersHorizontal },
                                { value: 'heatmap', label: 'Heat map',icon: Flame },
                            ] as { value: ViewMode; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setViewMode(value)}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-semibold transition-all ${
                                        viewMode === value
                                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                                            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                                    }`}
                                >
                                    <Icon className="size-3" />{label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Filters</p>
                            {hasFilters && (
                                <button
                                    onClick={() => router.get('/admin/reports/map')}
                                    className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:text-red-600"
                                >
                                    <X className="size-3" /> Clear
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <FilterSelect value={filters.status ?? ''} onChange={(v) => filter('status', v)} options={STATUS_OPTIONS} placeholder="All statuses" />
                            <FilterSelect value={filters.severity ?? ''} onChange={(v) => filter('severity', v)} options={SEVERITY_OPTIONS} placeholder="All severities" />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-[10px] text-neutral-400">From</label>
                                    <input type="date" value={filters.date_from ?? ''} onChange={(e) => filter('date_from', e.target.value)}
                                        className="h-8 w-full rounded-lg border border-neutral-200 bg-white px-2 text-xs outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] text-neutral-400">To</label>
                                    <input type="date" value={filters.date_to ?? ''} onChange={(e) => filter('date_to', e.target.value)} min={filters.date_from ?? undefined}
                                        className="h-8 w-full rounded-lg border border-neutral-200 bg-white px-2 text-xs outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend + Report list */}
                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {/* Legend */}
                        <div className="mb-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Severity legend</p>
                            <div className="flex flex-wrap gap-3">
                                {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((s) => (
                                    <span key={s} className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                        <span className={`h-2.5 w-2.5 rounded-full ${SEVERITY_META[s].color}`} />
                                        {SEVERITY_META[s].label}
                                    </span>
                                ))}
                            </div>
                            {showHeatmap && (
                                <div className="mt-2 flex flex-wrap gap-3">
                                    <span className="text-[11px] font-medium text-neutral-500">Density:</span>
                                    {[
                                        { label: 'Low',      cls: 'bg-emerald-500' },
                                        { label: 'Moderate', cls: 'bg-amber-400'   },
                                        { label: 'High',     cls: 'bg-orange-500'  },
                                        { label: 'Critical', cls: 'bg-red-500'     },
                                    ].map(({ label, cls }) => (
                                        <span key={label} className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                            <span className={`h-2.5 w-2.5 rounded-full ${cls} opacity-70`} />
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Report list */}
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                            Reports {reports.length > 0 && <span className="normal-case font-normal text-neutral-300">— click to focus</span>}
                        </p>
                        <div className="space-y-1.5">
                            {sortedReports.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                                    className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                                        selectedReport?.id === r.id
                                            ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-700 dark:bg-sky-950/30'
                                            : 'border-neutral-100 bg-neutral-50/50 hover:border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-neutral-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: SEVERITY_META[r.severity].hex }}
                                            />
                                            <span className="truncate font-mono text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                                                {r.reference_number}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${SEVERITY_COLORS[r.severity]}`}>
                                                {r.severity}
                                            </span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_COLORS[r.status]}`}>
                                                {r.status}
                                            </span>
                                        </div>
                                    </div>
                                    {r.address && (
                                        <p className="mt-1 truncate text-[10px] text-neutral-400">{r.address}</p>
                                    )}
                                    <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                                        <span>{r.user?.name ?? 'Unknown'}</span>
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="size-2.5" />
                                            {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </button>
                            ))}
                            {reports.length === 0 && (
                                <div className="py-10 text-center text-xs text-neutral-400">No reports match your filters</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Map ── */}
                <div className="relative flex-1">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={center}
                            zoom={13}
                            options={mapOptions}
                            onLoad={onMapLoad}
                            onZoomChanged={function (this: google.maps.Map) { setZoom(this.getZoom() ?? 12); }}
                            onClick={() => setSelectedReport(null)}
                        >
                            {showMarkers && reports.map((report) => (
                                <MarkerF
                                    key={report.id}
                                    position={{ lat: report.latitude, lng: report.longitude }}
                                    icon={{
                                        url: createSvgMarker(report.severity),
                                        scaledSize: new google.maps.Size(28, 36),
                                        anchor: new google.maps.Point(14, 36),
                                    }}
                                    zIndex={SEVERITY_WEIGHT[report.severity]}
                                    onClick={() => setSelectedReport(report)}
                                />
                            ))}

                            {showMarkers && selectedReport && (
                                <InfoWindowF
                                    position={{ lat: selectedReport.latitude, lng: selectedReport.longitude }}
                                    onCloseClick={() => setSelectedReport(null)}
                                    options={{ maxWidth: 280, minWidth: 240, pixelOffset: new google.maps.Size(0, -36) }}
                                >
                                    <div className="flex flex-col gap-2 p-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold text-neutral-900">
                                                {selectedReport.reference_number}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[selectedReport.severity]}`}>
                                                    {selectedReport.severity}
                                                </span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[selectedReport.status]}`}>
                                                    {selectedReport.status}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedReport.address && (
                                            <p className="text-[11px] text-gray-500 leading-snug">{selectedReport.address}</p>
                                        )}

                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                            <span>{selectedReport.user?.name ?? 'Unknown'}</span>
                                            <span>{new Date(selectedReport.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>

                                        <Link
                                            href={`/admin/reports/${selectedReport.id}`}
                                            className="mt-0.5 block rounded-lg bg-sky-600 px-3 py-2 text-center text-[11px] font-semibold text-white transition hover:bg-sky-700"
                                        >
                                            View full report →
                                        </Link>
                                    </div>
                                </InfoWindowF>
                            )}

                            <HeatmapOverlay points={heatPoints} visible={showHeatmap} zoom={zoom} />
                        </GoogleMap>
                    ) : (
                        <div className="flex h-full items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                            <div className="flex flex-col items-center gap-3">
                                <div className="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-sky-500" />
                                <p className="text-xs text-neutral-400">Loading map…</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
