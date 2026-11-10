'use no memo';
import { Head, Link, router } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, Filter, List, MapPin, Radio, Users } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet.heat';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { io, type Socket } from 'socket.io-client';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { EvacuationCenter, Hazard, MapResponder, Report, Severity } from '@/types/admin';
import { EVACUATION_CENTER_TYPE_LABELS, HAZARD_TYPE_OPTIONS, SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';
import { MapSkeleton } from '@/components/admin/skeletons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Filters {
    status?: string;
    severity?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    reports: Report[];
    filters: Filters;
    evacuation_centers: EvacuationCenter[];
    responders: MapResponder[];
    responder_counts: { on_duty: number; off_duty: number; total_responders: number; tracking: number };
    hazards: Hazard[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Reports', href: '/admin/reports' },
    { title: 'Map view', href: '/admin/reports/map' },
];

const STATUS_FILTER_OPTIONS = [
    { value: 'pending',      label: 'Pending' },
    { value: 'verified',     label: 'Verified' },
    { value: 'assigned',     label: 'Assigned' },
    { value: 'resolved',     label: 'Resolved' },
    { value: 'rejected',     label: 'Rejected' },
];
const SEVERITY_META: Record<Severity, { color: string; hex: string; rgb: string; label: string }> = {
    critical: { color: 'bg-red-500',    hex: '#ef4444', rgb: '239,68,68',   label: 'Critical' },
    high:     { color: 'bg-orange-500', hex: '#f97316', rgb: '249,115,22',  label: 'High'     },
    moderate: { color: 'bg-amber-400',  hex: '#fbbf24', rgb: '251,191,36',  label: 'Moderate' },
    low:      { color: 'bg-emerald-500',hex: '#22c55e', rgb: '34,197,94',   label: 'Low'      },
};

const SEVERITY_FILTER_OPTIONS = (['critical', 'high', 'moderate', 'low'] as Severity[]).map(s => ({
    value: s,
    label: SEVERITY_META[s].label,
    color: SEVERITY_META[s].hex,
}));

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1 };

/** Teal square pin with a cross for evacuation centers */
function createEvacMarker(isFull: boolean): string {
    const fill = isFull ? '#dc2626' : '#0d9488';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
        <rect filter="url(#s)" x="2" y="2" width="26" height="26" rx="7" fill="${fill}"/>
        <path d="M15 8v14M8 15h14" stroke="white" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Responder marker with status color and optional heading arrow */
const RESPONDER_STATUS_MARKER_COLORS: Record<string, string> = {
    idle: '#2563eb',
    en_route: '#f59e0b',
    on_scene: '#22c55e',
};

function createResponderMarkerSvg(status: ResponderMapStatus, state: 'online' | 'stale' | 'offline', heading?: number | null): string {
    const color = RESPONDER_STATUS_MARKER_COLORS[status] ?? '#2563eb';
    const opacity = state === 'offline' ? '0.3' : state === 'stale' ? '0.5' : '1';
    const headingArrow = heading != null && state === 'online'
        ? `<g transform="rotate(${heading}, 20, 20)"><polygon points="20,3 16,11 24,11" fill="${color}" opacity="0.8"/></g>`
        : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <g opacity="${opacity}">
            ${headingArrow}
            <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.25"/></filter>
            <circle filter="url(#s)" cx="20" cy="20" r="13" fill="${color}" stroke="white" stroke-width="2.5"/>
            <circle cx="20" cy="16" r="4" fill="white" opacity="0.9"/>
            <path d="M13 26.5c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" fill="white" opacity="0.9"/>
        </g>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Legacy — keep for backward compat
function createResponderMarker(): string {
    return createResponderMarkerSvg('idle', 'online');
}
const RESPONDER_MARKER_URL = createResponderMarker();

/** Per-type hazard icons */
const HAZARD_ICONS: Record<string, string> = {
    // Flood types — water/wave themed
    flash_flood:   `<path d="M17 8l-3 5h6l-3 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                     <path d="M11 21c1-1 2-1 3 0s2 1 3 0s2-1 3 0" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    river_flood:   `<path d="M9 14c2-2 4-2 6 0s4 2 6 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M9 18c2-2 4-2 6 0s4 2 6 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M15 8v3" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    coastal_flood: `<path d="M9 16c2-2 4-2 6 0s4 2 6 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M9 20c2-2 4-2 6 0s4 2 6 0" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7"/>
                     <path d="M15 8l-2 5h4z" fill="white" opacity="0.9"/>`,
    urban_flood:   `<rect x="11" y="10" width="8" height="10" rx="1" fill="none" stroke="white" stroke-width="1.8"/>
                     <path d="M13 14h4M13 17h4" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                     <path d="M9 22c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    // Road types — road/warning themed
    closed_road:   `<circle cx="15" cy="15" r="6" fill="none" stroke="white" stroke-width="2"/>
                     <path d="M12 12l6 6M18 12l-6 6" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    debris:        `<path d="M10 20l3-5 2 3 3-7 3 9" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                     <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.8"/>
                     <circle cx="18" cy="10" r="1" fill="white" opacity="0.6"/>`,
    landslide:     `<path d="M8 22l7-14 7 14z" fill="none" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
                     <path d="M12 22l3-6 3 6" fill="white" opacity="0.3"/>
                     <path d="M10 18l2-2 2 1 2-3" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    flooded_road:  `<path d="M8 15h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                     <path d="M8 15l2-5h10l2 5" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
                     <path d="M9 19c2-1.5 3-1.5 5 0s3 1.5 5 0" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    slow_zone:     `<circle cx="15" cy="14" r="6" fill="none" stroke="white" stroke-width="2"/>
                     <path d="M15 11v3.5l2.5 1.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const HAZARD_DEFAULT_ICON = `<circle cx="15" cy="12" r="1.5" fill="white"/>
    <path d="M15 15v4" stroke="white" stroke-width="2" stroke-linecap="round"/>`;

function createHazardMarker(severity: Severity, type: string): string {
    const hex = SEVERITY_META[severity].hex;
    const icon = HAZARD_ICONS[type] ?? HAZARD_DEFAULT_ICON;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="40" viewBox="0 0 36 40">
        <defs>
            <filter id="hs" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.25"/>
            </filter>
            <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="white" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="white" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <path filter="url(#hs)" d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill="${hex}"/>
        <path d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill="url(#hg)"/>
        <path d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill="none" stroke="white" stroke-width="1.2" opacity="0.6"/>
        <g transform="translate(3, 3)">
            ${icon}
        </g>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hazardTypeLabel(category: 'flood' | 'road', type: string): string {
    return HAZARD_TYPE_OPTIONS[category]?.find(o => o.value === type)?.label ?? type;
}

const DEFAULT_CENTER = [14.0681, 120.6236] as L.LatLngExpression;
const NASUGBU_BOUNDS: L.LatLngBoundsExpression = [
    [13.95, 120.50], // southwest
    [14.18, 120.75], // northeast
];

/* ─── Helper: create a Leaflet DivIcon from an image URL ─── */
function makeDivIcon(url: string, width: number, height: number, anchorX: number, anchorY: number): L.DivIcon {
    return L.divIcon({
        html: `<img src="${url}" width="${width}" height="${height}" style="display:block;" />`,
        className: '',
        iconSize: [width, height],
        iconAnchor: [anchorX, anchorY],
        popupAnchor: [0, -anchorY],
    });
}

/* ─── MapEventHandlers child component ─── */
function MapEventHandlers({ onClick, mapRef, onZoom }: {
    onClick: () => void;
    mapRef: React.MutableRefObject<L.Map | null>;
    onZoom?: (zoom: number) => void;
}) {
    const map = useMap();
    mapRef.current = map;
    useMapEvents({
        click: () => onClick(),
        zoomend: () => onZoom?.(map.getZoom()),
    });
    return null;
}

/* ─── MapFitBounds child component ─── */
function MapFitBounds({ reports, evacuation_centers }: { reports: Report[]; evacuation_centers: EvacuationCenter[] }) {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (fitted.current) return;
        fitted.current = true;
        const allPoints = [
            ...reports.map((r) => [r.latitude, r.longitude] as [number, number]),
            ...evacuation_centers.map((e) => [e.latitude, e.longitude] as [number, number]),
        ];
        if (allPoints.length === 0) {
            map.setView(DEFAULT_CENTER, 13);
            return;
        }
        const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => L.latLng(lat, lng)));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }, [map, reports, evacuation_centers]);
    return null;
}


/* ─── Heatmap layer using leaflet.heat ─── */
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap();
    const layerRef = useRef<L.Layer | null>(null);

    const buildLayer = useCallback(() => {
        if (layerRef.current) map.removeLayer(layerRef.current);
        if (points.length === 0) { layerRef.current = null; return; }

        // Guard: skip if map container has no dimensions yet (prevents getImageData crash)
        const size = map.getSize();
        if (!size.x || !size.y) return;

        const zoom = map.getZoom();
        // Scale radius and blur with zoom — bigger at close zoom, smaller when zoomed out
        const scale = Math.max(0.08, Math.min(2.5, Math.pow(2, (zoom - 14) / 1.2)));
        const radius = Math.max(1, Math.round(14 * scale));
        const blur = Math.max(1, Math.round(10 * scale));

        // @ts-ignore
        const layer = L.heatLayer(points, {
            radius,
            blur,
            maxZoom: 18,
            minOpacity: 0.35,
            max: Math.max(...points.map(p => p[2]), 1),
            gradient: {
                0.0: '#22c55e',
                0.25: '#fbbf24',
                0.5: '#f97316',
                0.75: '#ef4444',
                1.0: '#991b1b',
            },
        });

        layer.addTo(map);
        layerRef.current = layer;
    }, [map, points]);

    useEffect(() => {
        buildLayer();
        map.on('zoomend', buildLayer);
        map.on('resize', buildLayer);
        return () => {
            map.off('zoomend', buildLayer);
            map.off('resize', buildLayer);
            if (layerRef.current) map.removeLayer(layerRef.current);
        };
    }, [map, points]);

    return null;
}

/* ─── Dark mode tile switcher ─── */
function DarkModeTileLayer() {
    const map = useMap();
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Apply CSS filter to tile pane for dark mode — no API key needed
    useEffect(() => {
        const tilePane = map.getPane('tilePane');
        if (tilePane) {
            tilePane.style.filter = isDark
                ? 'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)'
                : '';
        }
    }, [isDark, map]);

    return (
        <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
    );
}

/* ─── Combined map filter (single dropdown) ─── */
/** Date preset helpers */
function getDatePreset(preset: string): { from: string; to: string } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const to = fmt(today);

    switch (preset) {
        case 'today':
            return { from: to, to };
        case 'week': {
            const d = new Date(today);
            d.setDate(d.getDate() - d.getDay());
            return { from: fmt(d), to };
        }
        case 'month': {
            const d = new Date(today.getFullYear(), today.getMonth(), 1);
            return { from: fmt(d), to };
        }
        case '7days': {
            const d = new Date(today);
            d.setDate(d.getDate() - 6);
            return { from: fmt(d), to };
        }
        case '30days': {
            const d = new Date(today);
            d.setDate(d.getDate() - 29);
            return { from: fmt(d), to };
        }
        default:
            return { from: '', to: '' };
    }
}

const DATE_PRESETS = [
    { value: 'today',  label: 'Today' },
    { value: 'week',   label: 'This Week' },
    { value: 'month',  label: 'This Month' },
    { value: '7days',  label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
];

function MapCombinedFilter({ filters, onFilter, hasFilters }: {
    filters: Filters;
    onFilter: (key: string, value: string) => void;
    hasFilters: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [localStatuses, setLocalStatuses] = useState<string[]>(filters.status ? filters.status.split(',') : []);
    const [localSeverities, setLocalSeverities] = useState<string[]>(filters.severity ? filters.severity.split(',') : []);
    const [localDateFrom, setLocalDateFrom] = useState(filters.date_from ?? '');
    const [localDateTo, setLocalDateTo] = useState(filters.date_to ?? '');
    const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

    useEffect(() => {
        setLocalStatuses(filters.status ? filters.status.split(',') : []);
        setLocalSeverities(filters.severity ? filters.severity.split(',') : []);
        setLocalDateFrom(filters.date_from ?? '');
        setLocalDateTo(filters.date_to ?? '');
    }, [filters.status, filters.severity, filters.date_from, filters.date_to]);

    // Detect active preset on mount / filter change
    useEffect(() => {
        if (!filters.date_from) { setActiveDatePreset(null); return; }
        const match = DATE_PRESETS.find(p => {
            const { from, to } = getDatePreset(p.value);
            return from === filters.date_from && to === (filters.date_to ?? '');
        });
        setActiveDatePreset(match?.value ?? null);
    }, [filters.date_from, filters.date_to]);

    const activeCount = (filters.status ? filters.status.split(',').length : 0)
        + (filters.severity ? filters.severity.split(',').length : 0)
        + ((filters.date_from || filters.date_to) ? 1 : 0);

    const toggleStatus = (value: string) => setLocalStatuses(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    const toggleSeverity = (value: string) => setLocalSeverities(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

    const selectDatePreset = (preset: string) => {
        if (activeDatePreset === preset) {
            setActiveDatePreset(null);
            setLocalDateFrom('');
            setLocalDateTo('');
        } else {
            const { from, to } = getDatePreset(preset);
            setActiveDatePreset(preset);
            setLocalDateFrom(from);
            setLocalDateTo(to);
        }
    };

    const apply = () => {
        router.get('/admin/reports/map', {
            status: localStatuses.join(',') || undefined,
            severity: localSeverities.join(',') || undefined,
            date_from: localDateFrom || undefined,
            date_to: localDateTo || undefined,
        }, { preserveState: true, replace: true });
        setOpen(false);
    };

    const clearAll = () => {
        setLocalStatuses([]);
        setLocalSeverities([]);
        setLocalDateFrom('');
        setLocalDateTo('');
        setActiveDatePreset(null);
        router.get('/admin/reports/map', {}, { preserveState: true, replace: true });
        setOpen(false);
    };

    return (
        <div className="border-b border-neutral-100 px-3 sm:px-5 py-3 dark:border-neutral-800">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <button
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium outline-none transition-all ${
                            activeCount > 0
                                ? 'border-[oklch(0.55_0.14_240)] bg-[oklch(0.55_0.14_240)] text-white shadow-sm dark:border-[oklch(0.62_0.14_240)] dark:bg-[oklch(0.62_0.14_240)] dark:text-white'
                                : 'border-neutral-200 bg-white text-neutral-600 shadow-sm hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
                        }`}
                    >
                        <Filter className="size-3" />
                        Filters
                        {activeCount > 0 && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white">
                                {activeCount}
                            </span>
                        )}
                    </button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-4">
                        <DialogTitle className="text-[14px]">Filter Reports</DialogTitle>
                        <DialogDescription className="text-[11px]">
                            Narrow down reports by status, severity, and date.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 px-5 pb-4">
                        {/* Status */}
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                                {STATUS_FILTER_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => toggleStatus(opt.value)}
                                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                                            localStatuses.includes(opt.value)
                                                ? 'border-[oklch(0.55_0.14_240)] bg-[oklch(0.55_0.14_240)] text-white dark:border-[oklch(0.62_0.14_240)] dark:bg-[oklch(0.62_0.14_240)] dark:text-white'
                                                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Severity */}
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Severity</p>
                            <div className="flex flex-wrap gap-1.5">
                                {SEVERITY_FILTER_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => toggleSeverity(opt.value)}
                                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                                            localSeverities.includes(opt.value)
                                                ? 'border-[oklch(0.55_0.14_240)] bg-[oklch(0.55_0.14_240)] text-white dark:border-[oklch(0.62_0.14_240)] dark:bg-[oklch(0.62_0.14_240)] dark:text-white'
                                                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                        }`}
                                    >
                                        <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Date Presets */}
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Quick Date</p>
                            <div className="flex flex-wrap gap-1.5">
                                {DATE_PRESETS.map(preset => (
                                    <button
                                        key={preset.value}
                                        onClick={() => selectDatePreset(preset.value)}
                                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                                            activeDatePreset === preset.value
                                                ? 'border-[oklch(0.55_0.14_240)] bg-[oklch(0.55_0.14_240)] text-white dark:border-[oklch(0.62_0.14_240)] dark:bg-[oklch(0.62_0.14_240)] dark:text-white'
                                                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Custom Range</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-neutral-500">From</label>
                                    <input type="date" value={localDateFrom} onChange={(e) => { setLocalDateFrom(e.target.value); setActiveDatePreset(null); }}
                                        className="h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-[11px] outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-neutral-500">To</label>
                                    <input type="date" value={localDateTo} onChange={(e) => { setLocalDateTo(e.target.value); setActiveDatePreset(null); }} min={localDateFrom || undefined}
                                        className="h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-[11px] outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                        <button
                            onClick={clearAll}
                            className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                        >
                            Reset all
                        </button>
                        <button
                            onClick={apply}
                            className="rounded-lg bg-neutral-900 px-5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            Apply filters
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ─── Last-seen helper ─── */
function formatLastSeen(iso: string | null): string {
    if (!iso) return 'Unknown';
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 30) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function isStale(iso: string | null): boolean {
    if (!iso) return true;
    return Date.now() - new Date(iso).getTime() > 10 * 60 * 1000; // >10 min
}

/* ─── Live responder state from Socket.IO ─── */

type ResponderMapStatus = 'idle' | 'en_route' | 'on_scene';

interface LiveResponder {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    avatar_url: string | null;
    team_id: number | null;
    team_name: string | null;
    status: ResponderMapStatus;
    location_updated_at: string;
}

function getResponderState(updatedAt: string | null): 'online' | 'stale' | 'offline' {
    if (!updatedAt) return 'offline';
    const age = (Date.now() - new Date(updatedAt).getTime()) / 60_000;
    if (age >= 5) return 'offline';
    if (age >= 2) return 'stale';
    return 'online';
}

function useMapSocket(initial: MapResponder[], initialOnDuty: number, onNewReport: () => void) {
    const [onDutyCount, setOnDutyCount] = useState(initialOnDuty);
    const [responders, setResponders] = useState<Map<number, LiveResponder>>(() => {
        const map = new Map<number, LiveResponder>();
        for (const r of initial) {
            if (r.current_latitude && r.current_longitude) {
                map.set(r.id, {
                    id: r.id,
                    name: r.name,
                    latitude: r.current_latitude,
                    longitude: r.current_longitude,
                    heading: null,
                    speed: null,
                    avatar_url: r.avatar_url,
                    team_id: r.team_id,
                    team_name: r.team?.name ?? null,
                    status: 'idle',
                    location_updated_at: r.location_updated_at ?? new Date().toISOString(),
                });
            }
        }
        return map;
    });

    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/\/$/, '');
        let socket: Socket | null = null;

        fetch('/admin/socket-token', {
            headers: {
                'Accept': 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
            },
        })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (!data?.token) return;

                socket = io(socketUrl, {
                    auth: { token: data.token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 3000,
                });

                socket.on('connect', () => console.log('[map-socket] connected', socket?.id));
                socket.on('connect_error', (err) => console.warn('[map-socket] error:', err.message));

                // New event: location.updated (from admin:responders room)
                socket.on('location.updated', (p: { user_id: number; name: string; team_id?: number; lat: number; lng: number; heading?: number; speed?: number; recorded_at: string }) => {
                    setResponders((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(p.user_id);
                        next.set(p.user_id, {
                            ...existing!,
                            id: p.user_id,
                            name: p.name,
                            latitude: p.lat,
                            longitude: p.lng,
                            heading: p.heading ?? existing?.heading ?? null,
                            speed: p.speed ?? existing?.speed ?? null,
                            avatar_url: existing?.avatar_url ?? null,
                            team_id: p.team_id ?? existing?.team_id ?? null,
                            team_name: existing?.team_name ?? null,
                            status: existing?.status ?? 'idle',
                            location_updated_at: p.recorded_at,
                        });
                        return next;
                    });
                });

                // Legacy event compatibility
                socket.on('responder-location', (p: { user_id: number; name: string; latitude: number; longitude: number; timestamp: string }) => {
                    setResponders((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(p.user_id);
                        next.set(p.user_id, {
                            id: p.user_id,
                            name: p.name,
                            latitude: p.latitude,
                            longitude: p.longitude,
                            heading: existing?.heading ?? null,
                            speed: existing?.speed ?? null,
                            avatar_url: existing?.avatar_url ?? null,
                            team_id: existing?.team_id ?? null,
                            team_name: existing?.team_name ?? null,
                            status: existing?.status ?? 'idle',
                            location_updated_at: p.timestamp,
                        });
                        return next;
                    });
                });

                // Responder status changes
                socket.on('responder.status', (p: { report_id: number; responder: { id: number; name: string; status: string } }) => {
                    setResponders((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(p.responder.id);
                        if (existing) {
                            next.set(p.responder.id, { ...existing, status: p.responder.status as ResponderMapStatus });
                        }
                        return next;
                    });
                });

                // Duty changed — add or remove responders + update count
                socket.on('duty.changed', (p: { user_id: number; on_duty: boolean }) => {
                    setOnDutyCount((prev) => Math.max(0, prev + (p.on_duty ? 1 : -1)));
                    setResponders((prev) => {
                        const next = new Map(prev);
                        if (!p.on_duty) {
                            next.delete(p.user_id);
                        }
                        return next;
                    });
                });

                // Stale notification
                socket.on('responder.stale', (_p: { user_id: number; last_seen: string }) => {
                    // State is derived from location_updated_at in render, no action needed
                });

                socket.on('new-report', onNewReport);
                socket.on('report-status', onNewReport);
            })
            .catch((err) => console.warn('[map-socket] setup failed:', err));

        return () => { socket?.disconnect(); };
    }, []);

    const list = useMemo(() => Array.from(responders.values()), [responders]);
    return { liveResponders: list, onDutyCount };
}

/* ─── Main page ─── */
export default function AdminReportsMap({ reports, filters, evacuation_centers, responders: initialResponders, responder_counts, hazards }: Props) {
    // Auto-refresh: silently reload Inertia page data when socket fires new-report/report-status
    const refreshDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleReportEvent = useCallback(() => {
        if (refreshDebounce.current) clearTimeout(refreshDebounce.current);
        refreshDebounce.current = setTimeout(() => {
            router.reload({ only: ['reports'], preserveState: true });
        }, 1500);
    }, []);

    const { liveResponders, onDutyCount } = useMapSocket(initialResponders, responder_counts.on_duty, handleReportEvent);
    const offDutyCount = responder_counts.total_responders - onDutyCount;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const [selectedEvacCenter, setSelectedEvacCenter]   = useState<EvacuationCenter | null>(null);
    const [selectedResponder, setSelectedResponder]     = useState<LiveResponder | null>(null);
    const [selectedHazard, setSelectedHazard]           = useState<Hazard | null>(null);
    const [showHeatmap, setShowHeatmap]                 = useState(true);
    const [showReportMarkers, setShowReportMarkers]     = useState(false);
    const [showHazards, setShowHazards]                 = useState(false);
    const [showEvacCenters, setShowEvacCenters]         = useState(false);
    const [showResponders, setShowResponders]           = useState(false);
    const [showAssignmentLines, setShowAssignmentLines] = useState(false);

    // Track zoom for responsive responder markers
    const [mapZoom, setMapZoom] = useState(13);

    // Keep "last seen" text live
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!showResponders || liveResponders.length === 0) return;
        const id = setInterval(() => setTick((t) => t + 1), 15_000);
        return () => clearInterval(id);
    }, [showResponders, liveResponders.length]);

    const hasFilters  = !!(filters.status || filters.severity || filters.date_from || filters.date_to);

    const filter = useCallback((key: string, value: string) => {
        router.get('/admin/reports/map', { ...filters, [key]: value || undefined }, {
            preserveState: true, replace: true,
        });
    }, [filters]);

    const mapRef = useRef<L.Map | null>(null);

    const focusOnLocation = useCallback((lat: number, lng: number) => {
        if (!mapRef.current) return;
        mapRef.current.panTo([lat, lng]);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedEvacCenter(null);
        setSelectedResponder(null);
        setSelectedHazard(null);
    }, []);

    // Memoized icons
    const evacIcons = useMemo(() => ({
        available: makeDivIcon(createEvacMarker(false), 30, 30, 15, 15),
        full: makeDivIcon(createEvacMarker(true), 30, 30, 15, 15),
    }), []);

    const getResponderIcon = useCallback((r: LiveResponder, zoom: number) => {
        const state = getResponderState(r.location_updated_at);
        const color = RESPONDER_STATUS_MARKER_COLORS[r.status] ?? '#2563eb';
        const opacity = state === 'offline' ? '0.3' : state === 'stale' ? '0.5' : '1';

        // Scale based on zoom: small at z11, full at z16+
        const scale = Math.max(0.5, Math.min(1, (zoom - 11) / 5));
        const size = Math.round(36 * scale);
        const border = Math.max(2, Math.round(3 * scale));
        const fontSize = Math.round(15 * scale);
        const dotSize = Math.max(6, Math.round(10 * scale));
        const dotBorder = Math.max(1, Math.round(2 * scale));
        const nameFontSize = Math.round(10 * scale);
        const showName = zoom >= 13;

        const heading = r.heading != null && state === 'online'
            ? `<div style="position:absolute;top:${Math.round(-8 * scale)}px;left:50%;transform:translateX(-50%) rotate(${r.heading}deg);width:0;height:0;border-left:${Math.round(6 * scale)}px solid transparent;border-right:${Math.round(6 * scale)}px solid transparent;border-bottom:${Math.round(10 * scale)}px solid ${color};opacity:0.8;"></div>`
            : '';
        const firstName = (r.name?.split(' ')[0] ?? '').slice(0, 10);
        const dotColor = state === 'online' ? '#22c55e' : state === 'stale' ? '#f59e0b' : '#9ca3af';
        const nameLabel = showName
            ? `<div style="text-align:center;margin-top:1px;font-size:${nameFontSize}px;font-weight:700;color:#1e293b;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;">${firstName}</div>`
            : '';

        const avatarContent = r.avatar_url
            ? `<img src="${r.avatar_url}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
            : `<span style="color:white;font-size:${fontSize}px;font-weight:700;line-height:${size - border * 2}px;text-align:center;display:block;width:100%;">${(r.name?.charAt(0) ?? '?').toUpperCase()}</span>`;
        const avatarBg = r.avatar_url ? '#fff' : color;

        const totalH = size + (showName ? nameFontSize + 4 : 0);

        return L.divIcon({
            html: `<div style="opacity:${opacity};display:flex;flex-direction:column;align-items:center;">
                <div style="position:relative;">
                    ${heading}
                    <div style="width:${size}px;height:${size}px;border-radius:50%;border:${border}px solid ${color};overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.25);background:${avatarBg};display:flex;align-items:center;justify-content:center;">
                        ${avatarContent}
                    </div>
                    <div style="position:absolute;bottom:-1px;right:-1px;width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${dotColor};border:${dotBorder}px solid white;"></div>
                </div>
                ${nameLabel}
            </div>`,
            className: '',
            iconSize: [80, totalH],
            iconAnchor: [40, Math.round(size / 2)],
            popupAnchor: [0, -Math.round(size / 2)],
        });
    }, []);

    const hazardIcons = useMemo(() => {
        const icons: Record<string, L.DivIcon> = {};
        const allTypes = ['flash_flood', 'river_flood', 'coastal_flood', 'urban_flood', 'closed_road', 'debris', 'landslide', 'flooded_road', 'slow_zone'];
        for (const s of ['critical', 'high', 'moderate', 'low'] as Severity[]) {
            for (const t of allTypes) {
                icons[`${s}-${t}`] = makeDivIcon(createHazardMarker(s, t), 36, 40, 18, 40);
            }
        }
        return icons;
    }, []);

    // Compute assignment lines: assigned reports → their responder's live location
    const assignmentLines = useMemo(() => {
        if (!showAssignmentLines || !showResponders) return [];
        return reports
            .filter(r => r.status === 'assigned' && r.assigned_to)
            .map(r => {
                const resp = liveResponders.find(lr => lr.id === r.assigned_to);
                if (!resp) return null;
                return {
                    reportId: r.id,
                    path: [
                        [resp.latitude, resp.longitude] as L.LatLngExpression,
                        [r.latitude, r.longitude] as L.LatLngExpression,
                    ],
                };
            })
            .filter(Boolean) as { reportId: number; path: L.LatLngExpression[] }[];
    }, [reports, liveResponders, showAssignmentLines, showResponders]);


    // Severity counts for stat pills
    const counts = useMemo(() => ({
        critical: reports.filter((r) => r.severity === 'critical').length,
        high:     reports.filter((r) => r.severity === 'high').length,
        moderate: reports.filter((r) => r.severity === 'moderate').length,
        low:      reports.filter((r) => r.severity === 'low').length,
    }), [reports]);

    // Heatmap data from reports
    const heatPoints = useMemo(() =>
        reports
            .filter(r => r.latitude && r.longitude)
            .map(r => [r.latitude, r.longitude, SEVERITY_WEIGHT[r.severity]] as [number, number, number]),
        [reports],
    );

    // Sort reports: critical first
    const sortedReports = useMemo(() =>
        [...reports].sort((a, b) => {
            const sevDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
            if (sevDiff !== 0) return sevDiff;
            // Oldest first as tiebreaker
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }),
    [reports]);

    if (!mounted) return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Map View" />
            <MapSkeleton />
        </AppLayout>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Map View" />

            <div className="relative z-0 flex h-[calc(100vh-57px)] flex-col lg:flex-row-reverse">

                {/* ── Side panel ── */}
                <div className="flex w-full flex-col overflow-visible border-b border-neutral-200/50 bg-white lg:w-[340px] lg:border-b-0 lg:border-l dark:border-neutral-800/80 dark:bg-neutral-900">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-5 py-4">
                        <div>
                            <h1 className="text-[13px] font-bold tracking-tight text-neutral-900 dark:text-white">Map View</h1>
                            <p className="mt-0.5 text-[11px] text-neutral-400">{reports.length} report{reports.length !== 1 ? 's' : ''} found</p>
                        </div>
                        <Link href="/admin/reports" className="flex items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                            <List className="size-3" /> List view
                        </Link>
                    </div>

                    {/* Severity stat pills */}
                    <div className="grid grid-cols-4 gap-1.5 px-4 sm:px-5 pb-3">
                        {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => filter('severity', filters.severity === s ? '' : s)}
                                className={`group relative flex flex-col items-center rounded-lg py-2 transition-all ${
                                    filters.severity === s
                                        ? 'bg-neutral-900 dark:bg-white'
                                        : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800'
                                }`}
                            >
                                <span className={`text-sm font-bold tabular-nums ${
                                    filters.severity === s
                                        ? 'text-white dark:text-neutral-900'
                                        : 'text-neutral-900 dark:text-white'
                                }`}>{counts[s]}</span>
                                <span className={`mt-1 h-1 w-6 rounded-full ${SEVERITY_META[s].color}`} />
                                <span className={`mt-1 text-[9px] font-medium ${
                                    filters.severity === s
                                        ? 'text-neutral-400 dark:text-neutral-500'
                                        : 'text-neutral-400'
                                }`}>{SEVERITY_META[s].label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <MapCombinedFilter filters={filters} onFilter={filter} hasFilters={hasFilters} />

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto">

                        {/* Layer toggles */}
                        <div className="border-b border-neutral-100/80 px-4 sm:px-5 py-3 dark:border-neutral-800/60">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400/80">Layers</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                {([
                                    { key: 'heatmap',     label: 'Heatmap',      checked: showHeatmap,         toggle: () => setShowHeatmap(v => !v) },
                                    { key: 'reports',     label: 'Reports',      checked: showReportMarkers,   toggle: () => setShowReportMarkers(v => !v) },
                                    { key: 'hazards',     label: 'Hazards',      checked: showHazards,         toggle: () => setShowHazards(v => !v) },
                                    { key: 'evac',        label: 'Evac Centers', checked: showEvacCenters,     toggle: () => setShowEvacCenters(v => !v) },
                                    { key: 'responders',  label: 'Responders',   checked: showResponders,      toggle: () => setShowResponders(v => !v) },
                                    { key: 'assignments', label: 'Assignments',  checked: showAssignmentLines, toggle: () => setShowAssignmentLines(v => !v) },
                                ] as const).map(({ key, label, checked, toggle }) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={toggle}
                                                className="peer size-3.5 cursor-pointer appearance-none rounded border border-neutral-300 bg-white transition checked:border-neutral-900 checked:bg-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:checked:border-white dark:checked:bg-white"
                                            />
                                            <svg className="pointer-events-none absolute hidden size-2.5 peer-checked:block" viewBox="0 0 10 10" fill="none">
                                                <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-neutral-900" />
                                            </svg>
                                        </div>
                                        <span className={`text-[11px] font-medium transition ${checked ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'}`}>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Hazard Map Legend */}
                        <div className="border-b border-neutral-100/80 px-4 sm:px-5 py-3 dark:border-neutral-800/60">
                            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400/80">Hazard Map Legend</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
                                {/* Flood */}
                                <div>
                                    <p className="mb-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">Flood</p>
                                    <div className="flex flex-col gap-1">
                                        {HAZARD_TYPE_OPTIONS.flood.map(opt => {
                                            const active = hazards.some(h => h.category === 'flood' && h.type === opt.value);
                                            const severity: Severity = hazards.find(h => h.category === 'flood' && h.type === opt.value)?.severity ?? 'moderate';
                                            const hex = SEVERITY_META[severity].hex;
                                            const icon = HAZARD_ICONS[opt.value] ?? HAZARD_DEFAULT_ICON;
                                            return (
                                                <div key={opt.value} className="flex items-center gap-1.5" style={!active ? { opacity: 0.5 } : undefined}>
                                                    <svg width="22" height="24" viewBox="0 0 36 40" className="shrink-0">
                                                        <path d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill={hex} stroke={hex} strokeWidth="1" />
                                                        <path d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.15" />
                                                        <g transform="translate(3, 3)" dangerouslySetInnerHTML={{ __html: icon }} />
                                                    </svg>
                                                    <span className={`text-[10px] leading-tight font-medium ${active ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'}`}>{opt.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* Road */}
                                <div>
                                    <p className="mb-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">Road</p>
                                    <div className="flex flex-col gap-1">
                                        {HAZARD_TYPE_OPTIONS.road.map(opt => {
                                            const active = hazards.some(h => h.category === 'road' && h.type === opt.value);
                                            const severity: Severity = hazards.find(h => h.category === 'road' && h.type === opt.value)?.severity ?? 'moderate';
                                            const hex = SEVERITY_META[severity].hex;
                                            const icon = HAZARD_ICONS[opt.value] ?? HAZARD_DEFAULT_ICON;
                                            return (
                                                <div key={opt.value} className="flex items-center gap-1.5" style={!active ? { opacity: 0.5 } : undefined}>
                                                    <svg width="22" height="24" viewBox="0 0 36 40" className="shrink-0">
                                                        <path d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill={hex} stroke={hex} strokeWidth="1" />
                                                        <path d="M16.27 3.5a2 2 0 0 1 3.46 0L33.05 28.5a2 2 0 0 1-1.73 3H4.68a2 2 0 0 1-1.73-3z" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.15" />
                                                        <g transform="translate(3, 3)" dangerouslySetInnerHTML={{ __html: icon }} />
                                                    </svg>
                                                    <span className={`text-[10px] leading-tight font-medium ${active ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'}`}>{opt.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Responders */}
                        {showResponders && (
                            <div className="border-b border-neutral-100/80 px-4 sm:px-5 py-3 dark:border-neutral-800/60">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400/80">
                                        <Users className="size-3" />Responders
                                    </span>
                                </div>
                                <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                                    <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" /></span>
                                        {onDutyCount} On Duty
                                    </span>
                                    <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                        <Radio className="size-2.5" />
                                        {liveResponders.length} Live
                                    </span>
                                    <span className="flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                        {offDutyCount} Off Duty
                                    </span>
                                </div>
                                {liveResponders.length > 0 ? (
                                    <div className="space-y-1">
                                        {[...liveResponders]
                                            .sort((a, b) => {
                                                const order: Record<string, number> = { en_route: 0, on_scene: 1, idle: 2 };
                                                const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
                                                if (diff !== 0) return diff;
                                                const stateA = getResponderState(a.location_updated_at);
                                                const stateB = getResponderState(b.location_updated_at);
                                                const so: Record<string, number> = { online: 0, stale: 1, offline: 2 };
                                                return (so[stateA] ?? 9) - (so[stateB] ?? 9);
                                            })
                                            .map((r) => {
                                            const state = getResponderState(r.location_updated_at);
                                            const statusColors: Record<string, string> = { idle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', en_route: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', on_scene: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                                            const statusLabels: Record<string, string> = { idle: 'Idle', en_route: 'En Route', on_scene: 'On Scene' };
                                            const dotColor = state === 'offline' ? 'bg-neutral-300 dark:bg-neutral-600' : state === 'stale' ? 'bg-amber-400' : 'bg-emerald-500';
                                            return (
                                                <button
                                                    key={`resp-${r.id}`}
                                                    onClick={() => {
                                                        clearSelection();
                                                        setSelectedResponder(selectedResponder?.id === r.id ? null : r);
                                                        if (selectedResponder?.id !== r.id) focusOnLocation(r.latitude, r.longitude);
                                                    }}
                                                    className={`w-full rounded-lg p-2 text-left transition-all ${
                                                        selectedResponder?.id === r.id
                                                            ? 'bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-700'
                                                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                                                    } ${state === 'offline' ? 'opacity-40' : state === 'stale' ? 'opacity-60' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className={`size-2 shrink-0 rounded-full ${dotColor}`} />
                                                            <span className="truncate text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">{r.name}</span>
                                                        </div>
                                                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusColors[r.status] ?? statusColors.idle}`}>
                                                            {statusLabels[r.status] ?? 'Idle'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-2 pl-4 text-[10px] text-neutral-400">
                                                        {r.team_name && <span>{r.team_name}</span>}
                                                        <span className="ml-auto flex items-center gap-1">
                                                            <Clock className="size-2.5" />
                                                            {state === 'offline' ? 'Offline' : state === 'stale' ? `Stale · ${formatLastSeen(r.location_updated_at)}` : formatLastSeen(r.location_updated_at)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="py-2 text-center text-[10px] text-neutral-400">No responders online</p>
                                )}
                            </div>
                        )}

                        {/* Reports */}
                        <div className="px-4 sm:px-5 py-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400/80">Reports</span>
                                {reports.length > 0 && (
                                    <span className="text-[9px] text-neutral-300 dark:text-neutral-600">tap to locate</span>
                                )}
                            </div>
                            <div className="space-y-1">
                                {sortedReports.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => focusOnLocation(r.latitude, r.longitude)}
                                        className="w-full rounded-lg p-2 text-left transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
                                                    <circle cx="5" cy="5" r="4" fill={SEVERITY_META[r.severity].hex} fillOpacity="0.3" stroke={SEVERITY_META[r.severity].hex} strokeWidth="1.5" />
                                                </svg>
                                                <span className="truncate font-mono text-[11px] font-bold text-neutral-700 dark:text-neutral-300">{r.reference_number}</span>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                                        </div>
                                        {r.address && (
                                            <p className="mt-0.5 truncate pl-[18px] text-[10px] text-neutral-400">{r.address}</p>
                                        )}
                                        <div className="mt-0.5 flex items-center justify-between pl-[18px] text-[10px] text-neutral-400">
                                            <span>{r.user?.name ?? 'Unknown'}</span>
                                            <span>{new Date(r.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </button>
                                ))}
                                {reports.length === 0 && (
                                    <div className="flex flex-col items-center py-12 text-neutral-400">
                                        <MapPin className="size-6 mb-2 opacity-30" />
                                        <p className="text-xs">No reports match your filters</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Map ── */}
                <div className="relative flex-1">
                    {/* Live badge overlay */}
                    <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-sm dark:bg-neutral-900/90">
                        <span className="flex items-center gap-1.5">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
                                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Live</span>
                        </span>
                        <span className="h-3 w-px bg-neutral-300 dark:bg-neutral-600" />
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {onDutyCount} On Duty
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                            <span className="size-1.5 rounded-full bg-neutral-400" />
                            {offDutyCount} Off
                        </span>
                    </div>
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={13}
                        minZoom={5}
                        maxZoom={18}
                        zoomControl={true}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <DarkModeTileLayer />
                        <MapEventHandlers onClick={clearSelection} mapRef={mapRef} onZoom={setMapZoom} />
                        <MapFitBounds reports={reports} evacuation_centers={evacuation_centers} />
                        {showHeatmap && <HeatmapLayer points={heatPoints} />}

                        {/* Report markers — CircleMarkers */}
                        {showReportMarkers && sortedReports.map((r) => (
                            <CircleMarker
                                key={`report-${r.id}`}
                                center={[r.latitude, r.longitude]}
                                radius={10}
                                pathOptions={{
                                    color: SEVERITY_META[r.severity].hex,
                                    fillColor: SEVERITY_META[r.severity].hex,
                                    fillOpacity: 0.35,
                                    weight: 2.5,
                                }}
                                eventHandlers={{
                                    click: () => focusOnLocation(r.latitude, r.longitude),
                                }}
                            >
                                <Popup maxWidth={270} minWidth={220}>
                                    <div style={{ minWidth: 200 }}>
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex size-[18px] items-center justify-center rounded-full" style={{ backgroundColor: SEVERITY_META[r.severity].hex + '18' }}>
                                                    <span className="size-[7px] rounded-full" style={{ backgroundColor: SEVERITY_META[r.severity].hex }} />
                                                </span>
                                                <span className="text-[11px] font-bold capitalize text-neutral-800">{r.severity}</span>
                                            </div>
                                            <span className={`rounded-full px-2 py-[3px] text-[10px] font-semibold leading-none ${STATUS_COLORS[r.status]}`}>
                                                {r.status}
                                            </span>
                                        </div>

                                        {/* Body */}
                                        <div className="border-t border-neutral-100 px-3 py-2.5">
                                            {r.address && (
                                                <p className="text-[11px] leading-relaxed text-neutral-500">{r.address}</p>
                                            )}
                                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-400">
                                                <span className="font-medium">{r.user?.name ?? 'Unknown'}</span>
                                                <span>{new Date(r.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="border-t border-neutral-100 px-3 py-2.5">
                                            <Link
                                                href={`/admin/reports/${r.id}`}
                                                style={{ color: '#fff' }}
                                                className="block rounded-lg bg-[oklch(0.55_0.14_240)] px-3 py-1.5 text-center text-[11px] font-semibold !text-white shadow-sm transition hover:bg-[oklch(0.50_0.14_240)] hover:shadow-md"
                                            >
                                                View details
                                            </Link>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}

                        {/* Evacuation center markers */}
                        {showEvacCenters && evacuation_centers.map((ec) => {
                            const isFull = ec.current_occupancy >= ec.capacity;
                            return (
                                <Marker
                                    key={`evac-${ec.id}`}
                                    position={[ec.latitude, ec.longitude]}
                                    icon={isFull ? evacIcons.full : evacIcons.available}
                                    zIndexOffset={10}
                                    eventHandlers={{
                                        click: () => {
                                            clearSelection();
                                            setSelectedEvacCenter(selectedEvacCenter?.id === ec.id ? null : ec);
                                            if (selectedEvacCenter?.id !== ec.id) focusOnLocation(ec.latitude, ec.longitude);
                                        },
                                    }}
                                >
                                    {selectedEvacCenter?.id === ec.id && (
                                        <Popup
                                            maxWidth={280}
                                            minWidth={240}
                                            eventHandlers={{ remove: () => setSelectedEvacCenter(null) }}
                                        >
                                            <div className="flex flex-col gap-2 p-3 pt-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-xs font-bold text-neutral-900 leading-snug">{selectedEvacCenter.name}</p>
                                                    <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-200">
                                                        {EVACUATION_CENTER_TYPE_LABELS[selectedEvacCenter.type]}
                                                    </span>
                                                </div>

                                                {selectedEvacCenter.address && (
                                                    <p className="text-[11px] text-gray-500 leading-snug">{selectedEvacCenter.address}</p>
                                                )}

                                                {/* Occupancy bar */}
                                                <div>
                                                    <div className="mb-1 flex items-center justify-between text-[10px] text-gray-500">
                                                        <span>Occupancy</span>
                                                        <span className="font-semibold">
                                                            {selectedEvacCenter.current_occupancy} / {selectedEvacCenter.capacity}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                selectedEvacCenter.current_occupancy >= selectedEvacCenter.capacity
                                                                    ? 'bg-red-500'
                                                                    : selectedEvacCenter.current_occupancy / selectedEvacCenter.capacity > 0.8
                                                                    ? 'bg-amber-400'
                                                                    : 'bg-teal-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, Math.round(selectedEvacCenter.current_occupancy / selectedEvacCenter.capacity * 100))}%` }}
                                                        />
                                                    </div>
                                                    <p className={`mt-1 text-[10px] font-semibold ${
                                                        selectedEvacCenter.current_occupancy >= selectedEvacCenter.capacity
                                                            ? 'text-red-600' : 'text-teal-600'
                                                    }`}>
                                                        {selectedEvacCenter.current_occupancy >= selectedEvacCenter.capacity
                                                            ? 'Full — no available space'
                                                            : `${selectedEvacCenter.capacity - selectedEvacCenter.current_occupancy} slots available`}
                                                    </p>
                                                </div>

                                                <Link
                                                    href="/admin/evacuation-centers"
                                                    className="mt-0.5 block rounded-lg bg-neutral-900 px-3 py-2 text-center text-[11px] font-semibold text-white transition hover:bg-neutral-800"
                                                >
                                                    Manage centers →
                                                </Link>
                                            </div>
                                        </Popup>
                                    )}
                                </Marker>
                            );
                        })}

                        {/* Responder markers */}
                        {showResponders && liveResponders.map((r) => (
                            <Marker
                                key={`resp-${r.id}`}
                                position={[r.latitude, r.longitude]}
                                icon={getResponderIcon(r, mapZoom)}
                                zIndexOffset={20}
                                eventHandlers={{
                                    click: () => {
                                        clearSelection();
                                        setSelectedResponder(selectedResponder?.id === r.id ? null : r);
                                        if (selectedResponder?.id !== r.id) focusOnLocation(r.latitude, r.longitude);
                                    },
                                }}
                            >
                                {selectedResponder?.id === r.id && (
                                    <Popup
                                        maxWidth={260}
                                        minWidth={200}
                                        eventHandlers={{ remove: () => setSelectedResponder(null) }}
                                    >
                                        <div className="flex flex-col gap-2 p-3 pt-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                    {selectedResponder.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-neutral-900">{selectedResponder.name}</p>
                                                    {selectedResponder.team_name && (
                                                        <p className="text-[10px] text-gray-500">{selectedResponder.team_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5">
                                                <Clock className="size-3 text-gray-400" />
                                                <span className="text-[11px] text-gray-500">Last seen:</span>
                                                <span className={`text-[11px] font-semibold ${isStale(selectedResponder.location_updated_at) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {formatLastSeen(selectedResponder.location_updated_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Radio className={`size-3 ${isStale(selectedResponder.location_updated_at) ? 'text-amber-500' : 'text-emerald-500'}`} />
                                                <span className={`text-[11px] font-semibold ${isStale(selectedResponder.location_updated_at) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {isStale(selectedResponder.location_updated_at) ? 'Signal lost' : 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </Popup>
                                )}
                            </Marker>
                        ))}

                        {/* Hazard markers (active only) */}
                        {showHazards && hazards.map((h) => (
                            <Marker
                                key={`haz-${h.id}`}
                                position={[h.latitude, h.longitude]}
                                icon={hazardIcons[`${h.severity}-${h.type}`] ?? hazardIcons[`${h.severity}-flash_flood`]}
                                zIndexOffset={500}
                                eventHandlers={{
                                    click: () => {
                                        clearSelection();
                                        setSelectedHazard(selectedHazard?.id === h.id ? null : h);
                                        if (selectedHazard?.id !== h.id) focusOnLocation(h.latitude, h.longitude);
                                    },
                                }}
                            >
                                {selectedHazard?.id === h.id && (
                                    <Popup
                                        maxWidth={260}
                                        minWidth={200}
                                        eventHandlers={{ remove: () => setSelectedHazard(null) }}
                                    >
                                        <div className="flex flex-col gap-2 p-1" style={{ minWidth: 180 }}>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className={`text-[10px] font-bold capitalize ${SEVERITY_COLORS[selectedHazard.severity]}`}>
                                                    {selectedHazard.severity}
                                                </span>
                                                <span className="text-[10px] font-semibold text-neutral-500">
                                                    {selectedHazard.category === 'flood' ? 'Flood' : 'Road'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-neutral-900">{selectedHazard.title}</p>
                                            <p className="text-[11px] text-gray-500">
                                                {hazardTypeLabel(selectedHazard.category, selectedHazard.type)}
                                            </p>
                                            {selectedHazard.address && (
                                                <p className="text-[10px] text-gray-400">{selectedHazard.address}</p>
                                            )}
                                        </div>
                                    </Popup>
                                )}
                            </Marker>
                        ))}

                        {/* Assignment lines: responder → report */}
                        {showAssignmentLines && assignmentLines.map((line) => (
                            <Polyline
                                key={`line-${line.reportId}`}
                                positions={line.path}
                                pathOptions={{
                                    color: '#8b5cf6',
                                    weight: 2,
                                    opacity: 0.7,
                                    dashArray: '8 6',
                                }}
                            />
                        ))}

                    </MapContainer>


                </div>
            </div>
        </AppLayout>
    );
}
