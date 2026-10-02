'use no memo';
import { Head, Link, router } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Building2, CalendarDays, ChevronDown, Clock, Filter, List, MapPin, Radio, Users, X } from 'lucide-react';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import 'leaflet.heat';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { io, type Socket } from 'socket.io-client';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { EvacuationCenter, Hazard, MapResponder, Report, ReportStatus, Severity } from '@/types/admin';
import { EVACUATION_CENTER_TYPE_LABELS, HAZARD_TYPE_OPTIONS, SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';
import { MapSkeleton } from '@/components/admin/skeletons';

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
const SEVERITY_FILTER_OPTIONS = [
    { value: 'critical', label: 'Critical', color: '#ef4444' },
    { value: 'high',     label: 'High',     color: '#f97316' },
    { value: 'moderate', label: 'Moderate', color: '#fbbf24' },
    { value: 'low',      label: 'Low',      color: '#22c55e' },
];

const SEVERITY_META: Record<Severity, { color: string; hex: string; rgb: string; label: string }> = {
    critical: { color: 'bg-red-500',    hex: '#ef4444', rgb: '239,68,68',   label: 'Critical' },
    high:     { color: 'bg-orange-500', hex: '#f97316', rgb: '249,115,22',  label: 'High'     },
    moderate: { color: 'bg-amber-400',  hex: '#fbbf24', rgb: '251,191,36',  label: 'Moderate' },
    low:      { color: 'bg-emerald-500',hex: '#22c55e', rgb: '34,197,94',   label: 'Low'      },
};

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

/** Blue circle marker for responders */
function createResponderMarker(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.25"/></filter>
        <circle filter="url(#s)" cx="16" cy="16" r="13" fill="#2563eb" stroke="white" stroke-width="2.5"/>
        <circle cx="16" cy="12" r="4" fill="white" opacity="0.9"/>
        <path d="M9 22.5c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" fill="white" opacity="0.9"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
function MapEventHandlers({ onZoomChange, onClick, mapRef }: {
    onZoomChange: (zoom: number) => void;
    onClick: () => void;
    mapRef: React.MutableRefObject<L.Map | null>;
}) {
    const map = useMap();
    mapRef.current = map;
    useMapEvents({
        zoomend: () => onZoomChange(map.getZoom()),
        click: () => onClick(),
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
        // Re-enforce bounds after fitBounds
        map.setMaxBounds(L.latLngBounds(NASUGBU_BOUNDS));
        map.setMinZoom(11);
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

/* ─── Filter select ─── */
function FilterSelect({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-2.5 pr-7 text-xs text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
                <option value="">{placeholder}</option>
                {options.filter(Boolean).map((opt) => (
                    <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                    </option>
            ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        </div>
    );
}

/* ─── Combined map filter (single dropdown) ─── */
function MapCombinedFilter({ filters, onFilter, hasFilters }: {
    filters: Filters;
    onFilter: (key: string, value: string) => void;
    hasFilters: boolean;
}) {
    const [localStatuses, setLocalStatuses] = useState<string[]>(filters.status ? filters.status.split(',') : []);
    const [localSeverities, setLocalSeverities] = useState<string[]>(filters.severity ? filters.severity.split(',') : []);
    const [localDateFrom, setLocalDateFrom] = useState(filters.date_from ?? '');
    const [localDateTo, setLocalDateTo] = useState(filters.date_to ?? '');

    useEffect(() => {
        setLocalStatuses(filters.status ? filters.status.split(',') : []);
        setLocalSeverities(filters.severity ? filters.severity.split(',') : []);
        setLocalDateFrom(filters.date_from ?? '');
        setLocalDateTo(filters.date_to ?? '');
    }, [filters.status, filters.severity, filters.date_from, filters.date_to]);

    const activeCount = (filters.status ? filters.status.split(',').length : 0)
        + (filters.severity ? filters.severity.split(',').length : 0)
        + (filters.date_from ? 1 : 0)
        + (filters.date_to ? 1 : 0);

    const toggleStatus = (value: string) => setLocalStatuses(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    const toggleSeverity = (value: string) => setLocalSeverities(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

    const apply = (close: () => void) => {
        router.get('/admin/reports/map', {
            status: localStatuses.join(',') || undefined,
            severity: localSeverities.join(',') || undefined,
            date_from: localDateFrom || undefined,
            date_to: localDateTo || undefined,
        }, { preserveState: true, replace: true });
        close();
    };

    const clearAll = (close: () => void) => {
        setLocalStatuses([]);
        setLocalSeverities([]);
        setLocalDateFrom('');
        setLocalDateTo('');
        router.get('/admin/reports/map', {}, { preserveState: true, replace: true });
        close();
    };

    return (
        <Popover className="relative border-b border-neutral-100 px-3 sm:px-5 py-3 dark:border-neutral-800">
            {({ open }) => (
                <>
                    <PopoverButton
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium outline-none transition-all ${
                            activeCount > 0
                                ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900'
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
                        <ChevronDown className={`size-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </PopoverButton>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <PopoverPanel className="absolute left-3 right-3 sm:left-5 sm:right-5 top-full z-50 mt-0 max-h-[60vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                            {({ close }) => (
                                <>
                                    {/* Status */}
                                    <div className="p-3 pb-0">
                                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">Status</p>
                                        <div className="flex flex-wrap gap-1">
                                            {STATUS_FILTER_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => toggleStatus(opt.value)}
                                                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                                                        localStatuses.includes(opt.value)
                                                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                                            : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Severity */}
                                    <div className="mt-2.5 px-3">
                                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">Severity</p>
                                        <div className="flex flex-wrap gap-1">
                                            {SEVERITY_FILTER_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => toggleSeverity(opt.value)}
                                                    className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                                                        localSeverities.includes(opt.value)
                                                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                                            : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                                    }`}
                                                >
                                                    <span className="size-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date range */}
                                    <div className="mt-2.5 px-3">
                                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">Date Range</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="mb-0.5 block text-[9px] text-neutral-400">From</label>
                                                <input type="date" value={localDateFrom} onChange={(e) => setLocalDateFrom(e.target.value)}
                                                    className="h-7 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-[10px] outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-500/10 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" />
                                            </div>
                                            <div>
                                                <label className="mb-0.5 block text-[9px] text-neutral-400">To</label>
                                                <input type="date" value={localDateTo} onChange={(e) => setLocalDateTo(e.target.value)} min={localDateFrom || undefined}
                                                    className="h-7 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-[10px] outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-500/10 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Apply / Clear */}
                                    <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 px-3 py-2 dark:border-neutral-700">
                                        <button
                                            onClick={() => clearAll(close)}
                                            className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={() => apply(close)}
                                            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </>
                            )}
                        </PopoverPanel>
                    </Transition>
                </>
            )}
        </Popover>
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
interface LiveResponder {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    avatar_url: string | null;
    team_name: string | null;
    location_updated_at: string;
}

function useMapSocket(initial: MapResponder[], onNewReport: () => void) {
    const [responders, setResponders] = useState<Map<number, LiveResponder>>(() => {
        const map = new Map<number, LiveResponder>();
        for (const r of initial) {
            map.set(r.id, {
                id: r.id,
                name: r.name,
                latitude: r.current_latitude,
                longitude: r.current_longitude,
                avatar_url: r.avatar_url,
                team_name: r.team?.name ?? null,
                location_updated_at: r.location_updated_at ?? new Date().toISOString(),
            });
        }
        return map;
    });

    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/\/$/, '');

        let socket: Socket | null = null;

        fetch('/admin/socket-token', {
            headers: {
                'Accept': 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(
                    document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
                ),
            },
        })
            .then((res) => {
                if (!res.ok) {
                    console.warn('[map-socket] socket-token fetch failed:', res.status);
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (!data?.token) {
                    console.warn('[map-socket] no token received, socket will not connect');
                    return;
                }

                socket = io(socketUrl, {
                    auth: { token: data.token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 3000,
                });

                socket.on('connect', () => {
                    console.log('[map-socket] connected', socket?.id);
                });

                socket.on('connect_error', (err) => {
                    console.warn('[map-socket] connection error:', err.message);
                });

                // Live responder locations
                socket.on('responder-location', (payload: { user_id: number; name: string; latitude: number; longitude: number; timestamp: string }) => {
                    setResponders((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(payload.user_id);
                        next.set(payload.user_id, {
                            id: payload.user_id,
                            name: payload.name,
                            latitude: payload.latitude,
                            longitude: payload.longitude,
                            avatar_url: existing?.avatar_url ?? null,
                            team_name: existing?.team_name ?? null,
                            location_updated_at: payload.timestamp,
                        });
                        return next;
                    });
                });

                // Auto-refresh: new reports and status changes
                socket.on('new-report', onNewReport);
                socket.on('report-status', onNewReport);
            })
            .catch((err) => {
                console.warn('[map-socket] setup failed:', err);
            });

        return () => {
            socket?.disconnect();
        };
    }, []);

    return useMemo(() => Array.from(responders.values()), [responders]);
}

/* ─── Main page ─── */
export default function AdminReportsMap({ reports, filters, evacuation_centers, responders: initialResponders, hazards }: Props) {
    // Auto-refresh: silently reload Inertia page data when socket fires new-report/report-status
    const refreshDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleReportEvent = useCallback(() => {
        if (refreshDebounce.current) clearTimeout(refreshDebounce.current);
        refreshDebounce.current = setTimeout(() => {
            router.reload({ only: ['reports'], preserveState: true });
        }, 1500);
    }, []);

    const liveResponders = useMapSocket(initialResponders, handleReportEvent);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const [selectedEvacCenter, setSelectedEvacCenter]   = useState<EvacuationCenter | null>(null);
    const [selectedResponder, setSelectedResponder]     = useState<LiveResponder | null>(null);
    const [selectedHazard, setSelectedHazard]           = useState<Hazard | null>(null);
    const [showEvacCenters, setShowEvacCenters]         = useState(false);
    const [showResponders, setShowResponders]           = useState(true);
    const [showAssignmentLines, setShowAssignmentLines] = useState(true);
    const [zoom, setZoom]                               = useState(12);

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

    const responderIcon = useMemo(() => makeDivIcon(RESPONDER_MARKER_URL, 32, 32, 16, 16), []);

    const staleResponderIcon = useMemo(() => {
        return L.divIcon({
            html: `<img src="${RESPONDER_MARKER_URL}" width="32" height="32" style="display:block;opacity:0.45;" />`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
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
                <div className="flex w-full flex-col overflow-visible border-b border-neutral-200/70 bg-white lg:w-[340px] lg:border-b-0 lg:border-l dark:border-neutral-800 dark:bg-neutral-900">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-neutral-100 px-3 sm:px-5 py-4 dark:border-neutral-800">
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">Map View</h1>
                            <p className="mt-0.5 text-[11px] text-neutral-400">Flood report locations</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                {reports.length} report{reports.length !== 1 ? 's' : ''}
                            </span>
                            <Link href="/admin/reports" className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                <List className="size-3" /> List
                            </Link>
                        </div>
                    </div>

                    {/* Severity stat pills */}
                    <div className="grid grid-cols-4 gap-2 border-b border-neutral-100 px-3 sm:px-5 py-3 dark:border-neutral-800">
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

                    {/* Filters */}
                    <MapCombinedFilter filters={filters} onFilter={filter} hasFilters={hasFilters} />

                    {/* Legend + Report list + Responder list */}
                    <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3">
                        {/* Legend */}
                        <div className="mb-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Heatmap</p>
                            <div className="flex flex-wrap gap-3">
                                <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Low</span>
                                <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Moderate</span>
                                <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />High</span>
                                <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Critical</span>
                            </div>
                            {showEvacCenters && (
                                <div className="flex flex-wrap gap-3 mt-2">
                                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                        <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
                                        Evac Center
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                        <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
                                        Full
                                    </span>
                                </div>
                            )}
                            {showResponders && (
                                <div className="flex flex-wrap gap-3 mt-2">
                                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                        Responder
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600 opacity-40" />
                                        Stale ({'>'}10m)
                                    </span>
                                </div>
                            )}
                            {showAssignmentLines && assignmentLines.length > 0 && (
                                <div className={`flex flex-wrap gap-3 mt-2`}>
                                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                        <span className="h-0.5 w-4 bg-violet-500" style={{ borderTop: '2px dashed #8b5cf6' }} />
                                        Assignment link
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Responder list */}
                        {showResponders && liveResponders.length > 0 && (
                            <>
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                    <span className="flex items-center gap-1">
                                        <Users className="size-3" />
                                        On-duty responders
                                        <span className="normal-case font-normal text-neutral-300">— click to focus</span>
                                    </span>
                                </p>
                                <div className="mb-4 space-y-1.5">
                                    {liveResponders.map((r) => {
                                        const stale = isStale(r.location_updated_at);
                                        return (
                                            <button
                                                key={`resp-${r.id}`}
                                                onClick={() => {
                                                    clearSelection();
                                                    setSelectedResponder(selectedResponder?.id === r.id ? null : r);
                                                    if (selectedResponder?.id !== r.id) focusOnLocation(r.latitude, r.longitude);
                                                }}
                                                className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                                                    selectedResponder?.id === r.id
                                                        ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-600 dark:bg-blue-900/20'
                                                        : 'border-neutral-100 bg-neutral-50/50 hover:border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-neutral-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ${stale ? 'opacity-40' : ''}`} />
                                                        <span className="truncate text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                                                            {r.name}
                                                        </span>
                                                    </div>
                                                    {stale && (
                                                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 ring-1 ring-amber-200">
                                                            Stale
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                                                    <span>{r.team_name ?? 'No team'}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="size-2.5" />
                                                        {formatLastSeen(r.location_updated_at)}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Report list */}
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                            Reports {reports.length > 0 && <span className="normal-case font-normal text-neutral-300">— click to focus</span>}
                        </p>
                        <div className="space-y-1.5">
                            {sortedReports.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => focusOnLocation(r.latitude, r.longitude)}
                                    className="w-full rounded-xl border border-neutral-100 bg-neutral-50/50 p-2.5 text-left transition-all hover:border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-neutral-700"
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
                                            {new Date(r.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={13}
                        minZoom={11}
                        maxZoom={18}
                        maxBounds={NASUGBU_BOUNDS}
                        maxBoundsViscosity={1.0}
                        zoomControl={true}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <DarkModeTileLayer />
                        <MapEventHandlers onZoomChange={setZoom} onClick={clearSelection} mapRef={mapRef} />
                        <MapFitBounds reports={reports} evacuation_centers={evacuation_centers} />
                        <HeatmapLayer points={heatPoints} />

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
                                icon={isStale(r.location_updated_at) ? staleResponderIcon : responderIcon}
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
                        {hazards.map((h) => (
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

                    {/* Map Legend */}
                    <div className="absolute bottom-4 left-4 z-[1000] w-[200px] overflow-hidden rounded-xl border border-white/20 bg-white/90 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-neutral-700/40 dark:bg-neutral-900/90 dark:shadow-black/30">
                        {/* Header */}
                        <div className="border-b border-neutral-100/80 px-3.5 py-2 dark:border-neutral-800/60">
                            <p className="text-[9px] font-bold tracking-wide text-neutral-800 dark:text-neutral-200">Map Legend</p>
                        </div>

                        {/* Heatmap Intensity */}
                        <div className="border-b border-neutral-100/60 px-3.5 py-2.5 dark:border-neutral-800/40">
                            <p className="mb-2 text-[7px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Report Density</p>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[7px] text-neutral-400">Low</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                                    background: 'linear-gradient(to right, #22c55e, #fbbf24, #f97316, #ef4444, #991b1b)',
                                }} />
                                <span className="text-[7px] text-neutral-400">High</span>
                            </div>
                        </div>

                        {/* Severity */}
                        <div className="border-b border-neutral-100/60 px-3.5 py-2.5 dark:border-neutral-800/40">
                            <p className="mb-2 text-[7px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Severity</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {[
                                    { label: 'Critical', color: '#991b1b' },
                                    { label: 'High', color: '#ef4444' },
                                    { label: 'Moderate', color: '#f97316' },
                                    { label: 'Low', color: '#fbbf24' },
                                ].map(({ label, color }) => (
                                    <div key={label} className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full ring-1 ring-black/5" style={{ backgroundColor: color }} />
                                        <span className="text-[8px] font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hazards */}
                        {hazards.length > 0 && (() => {
                            const floodTypes = [...new Set(hazards.filter(h => h.category === 'flood').map(h => h.type))];
                            const roadTypes = [...new Set(hazards.filter(h => h.category === 'road').map(h => h.type))];
                            return (
                                <div className="px-3.5 py-2.5">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-[7px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Hazards</p>
                                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[7px] font-bold tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">{hazards.length}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {floodTypes.length > 0 && (
                                            <div>
                                                <div className="mb-1 flex items-center gap-1.5">
                                                    <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0L8 8H0z" fill="#3b82f6" /></svg>
                                                    <span className="text-[8px] font-semibold text-blue-600 dark:text-blue-400">Flood</span>
                                                </div>
                                                <div className="ml-3.5 flex flex-col gap-0.5 border-l border-blue-200/60 pl-2 dark:border-blue-800/40">
                                                    {floodTypes.map(t => (
                                                        <span key={t} className="text-[7px] text-neutral-500 dark:text-neutral-400">{hazardTypeLabel('flood', t)}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {roadTypes.length > 0 && (
                                            <div>
                                                <div className="mb-1 flex items-center gap-1.5">
                                                    <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0L8 8H0z" fill="#f97316" /></svg>
                                                    <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400">Road</span>
                                                </div>
                                                <div className="ml-3.5 flex flex-col gap-0.5 border-l border-orange-200/60 pl-2 dark:border-orange-800/40">
                                                    {roadTypes.map(t => (
                                                        <span key={t} className="text-[7px] text-neutral-500 dark:text-neutral-400">{hazardTypeLabel('road', t)}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
