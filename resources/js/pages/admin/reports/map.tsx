'use no memo';
import { Head, Link, router } from '@inertiajs/react';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { List, MapPin, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';
import type { Report, Severity } from '@/types/admin';
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

const MARKER_COLORS: Record<Severity, string> = {
    low: '#22c55e',
    moderate: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
};

function createMarkerUrl(severity: Severity): string {
    const color = encodeURIComponent(MARKER_COLORS[severity]);
    return `https://maps.google.com/mapfiles/ms/icons/${
        severity === 'critical' ? 'red' :
        severity === 'high' ? 'orange' :
        severity === 'moderate' ? 'yellow' :
        'green'
    }-dot.png`;
}

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
};

export default function AdminReportsMap({ reports, filters }: Props) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '',
    });

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const filter = useCallback(
        (key: string, value: string) => {
            router.get('/admin/reports/map', { ...filters, [key]: value || undefined }, {
                preserveState: true,
                replace: true,
            });
        },
        [filters],
    );

    const hasFilters = !!(filters.status || filters.severity || filters.hazard_type);

    // Default center: Philippines (or first report)
    const center = useMemo(() => {
        if (reports.length > 0) return { lat: reports[0].latitude, lng: reports[0].longitude };
        return { lat: 14.5995, lng: 120.9842 }; // Manila
    }, [reports]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        if (reports.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        reports.forEach((r) => bounds.extend({ lat: r.latitude, lng: r.longitude }));
        map.fitBounds(bounds, 40);
    }, [reports]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Map View — FloodTrack Admin" />

            <div className="flex flex-col gap-4 p-6 lg:p-8 h-[calc(100vh-4rem)]">
                {/* Header with filters */}
                <Card className="overflow-hidden">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <div className="flex items-center gap-2 mr-auto">
                            <MapPin className="size-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">
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

                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.get('/admin/reports/map')}
                                className="gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
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
                    <span className="font-semibold">Severity:</span>
                    {(['critical', 'high', 'moderate', 'low'] as Severity[]).map((s) => (
                        <span key={s} className="flex items-center gap-1.5">
                            <span
                                className="inline-block size-3 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: MARKER_COLORS[s] }}
                            />
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </span>
                    ))}
                </div>

                {/* Map */}
                <div className="flex-1 rounded-xl overflow-hidden border shadow-sm">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={center}
                            zoom={12}
                            options={mapOptions}
                            onLoad={onMapLoad}
                            onClick={() => setSelectedReport(null)}
                        >
                            {reports.map((report) => (
                                <MarkerF
                                    key={report.id}
                                    position={{ lat: report.latitude, lng: report.longitude }}
                                    icon={{
                                        url: createMarkerUrl(report.severity),
                                        scaledSize: new google.maps.Size(32, 32),
                                    }}
                                    onClick={() => setSelectedReport(report)}
                                />
                            ))}

                            {selectedReport && (
                                <InfoWindowF
                                    position={{ lat: selectedReport.latitude, lng: selectedReport.longitude }}
                                    onCloseClick={() => setSelectedReport(null)}
                                    options={{ maxWidth: 300, minWidth: 240 }}
                                >
                                    <div className="flex flex-col gap-2 p-1 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold">
                                                {selectedReport.reference_number}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[selectedReport.severity]}`}
                                            >
                                                {selectedReport.severity}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 text-xs">
                                                {HAZARD_LABELS[selectedReport.hazard_type]}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[selectedReport.status]}`}
                                            >
                                                {selectedReport.status}
                                            </span>
                                        </div>

                                        {selectedReport.address && (
                                            <p className="text-xs text-gray-500 leading-snug">
                                                {selectedReport.address}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>by {selectedReport.user?.name ?? 'Unknown'}</span>
                                            <span>
                                                {new Date(selectedReport.created_at).toLocaleDateString('en-PH', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>

                                        <Link
                                            href={`/admin/reports/${selectedReport.id}`}
                                            className="mt-1 block rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                                        >
                                            View details
                                        </Link>
                                    </div>
                                </InfoWindowF>
                            )}
                        </GoogleMap>
                    ) : (
                        <div className="flex h-full items-center justify-center bg-muted/30">
                            <div className="flex flex-col items-center gap-3">
                                <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading map...</p>
                            </div>
                        </div>
                    )}
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
            className="h-9 rounded-lg border border-input bg-muted/30 px-3 text-sm transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
