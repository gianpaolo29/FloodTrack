import { Head, Link, router } from '@inertiajs/react';
import { List, MapPin } from 'lucide-react';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import type { Report, Severity, HazardType, ReportStatus } from '@/types/admin';
import { HAZARD_LABELS, SEVERITY_COLORS, STATUS_COLORS } from '@/types/admin';

interface Filters {
    status?: string;
    severity?: string;
    hazard_type?: string;
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
const HAZARD_OPTIONS = ['', 'flood', 'road_damage', 'debris', 'drainage', 'other'];

// Marker colors by severity
const MARKER_COLORS: Record<Severity, string> = {
    low: '#22c55e',
    moderate: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
};

function createMarkerIcon(severity: Severity): L.DivIcon {
    const color = MARKER_COLORS[severity];
    return L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
            <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle fill="#fff" cx="12" cy="9" r="3"/>
        </svg>`,
    });
}

// Auto-fit map to report bounds
function FitBounds({ reports }: { reports: Report[] }) {
    const map = useMap();

    useEffect(() => {
        if (reports.length === 0) return;
        const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }, [reports, map]);

    return null;
}

export default function AdminReportsMap({ reports, filters }: Props) {
    const filter = useCallback(
        (key: string, value: string) => {
            router.get('/admin/reports/map', { ...filters, [key]: value || undefined }, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    // Default center: Philippines (or first report)
    const center = useMemo<[number, number]>(() => {
        if (reports.length > 0) return [reports[0].latitude, reports[0].longitude];
        return [14.5995, 120.9842]; // Manila
    }, [reports]);

    // Memoize icons
    const icons = useMemo(
        () =>
            Object.fromEntries(
                (['low', 'moderate', 'high', 'critical'] as Severity[]).map((s) => [s, createMarkerIcon(s)]),
            ) as Record<Severity, L.DivIcon>,
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Map View — FloodTrack Admin" />

            <div className="flex flex-col gap-4 p-6 h-[calc(100vh-4rem)]">
                {/* Header with filters */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <div className="flex items-center gap-2 mr-auto">
                            <MapPin className="size-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {reports.length} report{reports.length !== 1 ? 's' : ''} on map
                            </span>
                        </div>

                        <FilterSelect
                            value={filters.status ?? ''}
                            onChange={(v) => filter('status', v)}
                            options={STATUS_OPTIONS}
                            placeholder="All statuses"
                        />
                        <FilterSelect
                            value={filters.severity ?? ''}
                            onChange={(v) => filter('severity', v)}
                            options={SEVERITY_OPTIONS}
                            placeholder="All severities"
                        />
                        <FilterSelect
                            value={filters.hazard_type ?? ''}
                            onChange={(v) => filter('hazard_type', v)}
                            options={HAZARD_OPTIONS}
                            placeholder="All hazard types"
                            labelMap={HAZARD_LABELS}
                        />

                        {(filters.status || filters.severity || filters.hazard_type) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get('/admin/reports/map')}
                            >
                                Clear
                            </Button>
                        )}

                        <Link href="/admin/reports">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <List className="size-3.5" />
                                List view
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-medium">Severity:</span>
                    {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((s) => (
                        <span key={s} className="flex items-center gap-1">
                            <span
                                className="inline-block size-3 rounded-full"
                                style={{ backgroundColor: MARKER_COLORS[s] }}
                            />
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </span>
                    ))}
                </div>

                {/* Map */}
                <div className="flex-1 rounded-lg overflow-hidden border">
                    <MapContainer
                        center={center}
                        zoom={12}
                        className="h-full w-full"
                        zoomControl={true}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <FitBounds reports={reports} />

                        {reports.map((report) => (
                            <Marker
                                key={report.id}
                                position={[report.latitude, report.longitude]}
                                icon={icons[report.severity]}
                            >
                                <Popup maxWidth={280} minWidth={220}>
                                    <div className="flex flex-col gap-2 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-semibold">
                                                {report.reference_number}
                                            </span>
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[report.severity]}`}
                                            >
                                                {report.severity}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">
                                                {HAZARD_LABELS[report.hazard_type]}
                                            </span>
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[report.status]}`}
                                            >
                                                {report.status}
                                            </span>
                                        </div>

                                        {report.address && (
                                            <p className="text-xs text-muted-foreground leading-snug">
                                                {report.address}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>by {report.user?.name ?? 'Unknown'}</span>
                                            <span>
                                                {new Date(report.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>

                                        <Link
                                            href={`/admin/reports/${report.id}`}
                                            className="mt-1 block rounded-md bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                                        >
                                            View details
                                        </Link>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </AppLayout>
    );
}

function FilterSelect({
    value,
    onChange,
    options,
    placeholder,
    labelMap,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder: string;
    labelMap?: Record<string, string>;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
            <option value="">{placeholder}</option>
            {options.filter(Boolean).map((opt) => (
                <option key={opt} value={opt}>
                    {labelMap?.[opt] ?? opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                </option>
            ))}
        </select>
    );
}
