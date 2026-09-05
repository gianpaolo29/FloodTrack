import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    CloudRain,
    CloudSun,
    Droplets,
    Eye,
    Gauge,
    Loader2,
    MapPin,
    Mountain,
    Navigation,
    RefreshCw,
    Search,
    X,
    ShieldAlert,
    Sparkles,
    Thermometer,
    TrendingUp,
    Wind,
    Zap,
    Sun,
    Umbrella,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

/* ─── Types ─── */

interface DailyItem {
    date: string; day: string; temp_min: number; temp_max: number; rain_total: number;
    wind_max: number; pop: number; description: string; icon: string; main: string;
}

interface BarangayWeather {
    name: string; latitude: number; longitude: number; elevation_m: number;
    flood_prone: boolean; near_river: boolean; coastal: boolean;
    weather: {
        temperature: number; humidity: number; wind_speed: number; description: string;
        icon: string; rain_1h: number; clouds: number; pressure: number;
    };
    forecast: DailyItem[];
    flood_risk: { score: number; level: 'low' | 'moderate' | 'high' | 'critical' };
}

interface BarangayData {
    barangays: BarangayWeather[]; generated_at: string;
}

interface AiWeatherInsight {
    risk_level: 'critical' | 'high' | 'moderate' | 'low';
    summary: string;
    weather_pattern: string;
    key_findings: string[];
    at_risk_barangays: { name: string; reason: string }[];
    recommendations: string[];
    priority_action: string;
    forecast_outlook: string;
}

interface HourlyItem {
    dt: number; date: string; temperature: number; humidity: number; pressure: number;
    wind_speed: number; wind_gust: number; rain_3h: number; clouds: number;
    description: string; icon: string; main: string; pop: number;
}

interface MyLocationData {
    current: {
        temperature: number; feels_like: number; humidity: number; wind_speed: number;
        description: string; icon: string; rain_1h: number; clouds: number; pressure: number;
        city: string; country: string;
    };
    hourly: HourlyItem[];
    forecast: DailyItem[];
}

interface Props {
    barangay_data: BarangayData;
}

/* ─── Constants ─── */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Weather', href: '/admin/weather' },
];

const iconUrl = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

const RISK_COLORS: Record<string, { text: string; bg: string; border: string; dot: string; glow: string }> = {
    low:      { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200/60 dark:border-emerald-800/40', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
    moderate: { text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40',     border: 'border-amber-200/60 dark:border-amber-800/40',   dot: 'bg-amber-500',   glow: 'shadow-amber-500/20' },
    high:     { text: 'text-orange-600 dark:text-orange-400',    bg: 'bg-orange-50 dark:bg-orange-950/40',    border: 'border-orange-200/60 dark:border-orange-800/40',  dot: 'bg-orange-500',  glow: 'shadow-orange-500/20' },
    critical: { text: 'text-red-600 dark:text-red-400',          bg: 'bg-red-50 dark:bg-red-950/40',          border: 'border-red-200/60 dark:border-red-800/40',        dot: 'bg-red-500',     glow: 'shadow-red-500/20' },
};

const RISK_BAR_COLORS: Record<string, string> = {
    low: 'bg-emerald-500', moderate: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-500',
};

const RISK_LEFT_BORDER: Record<string, string> = {
    low: '#10b981', moderate: '#f59e0b', high: '#f97316', critical: '#ef4444',
};

const AI_RISK_STYLES: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    high:     'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    moderate: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    low:      'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

const AI_RISK_BOX: Record<string, string> = {
    critical: 'bg-red-50 border border-red-200/60 dark:bg-red-950/30 dark:border-red-800/40',
    high:     'bg-orange-50 border border-orange-200/60 dark:bg-orange-950/30 dark:border-orange-800/40',
    moderate: 'bg-amber-50 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/40',
    low:      'bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/40',
};

const AI_RISK_TXT: Record<string, string> = {
    critical: 'text-red-700 dark:text-red-400',
    high:     'text-orange-700 dark:text-orange-400',
    moderate: 'text-amber-700 dark:text-amber-400',
    low:      'text-emerald-700 dark:text-emerald-400',
};

function windyUrl(lat: number, lon: number): string {
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=11&overlay=rain&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&marker=true&message=true`;
}

/* ─── Components ─── */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, title, subtitle, iconColor, iconBg, children }: {
    icon: React.ElementType; title: string; subtitle: string; iconColor: string; iconBg: string; children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <div className={`flex size-10 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`size-5 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
                <p className="text-[11px] text-neutral-400 truncate">{subtitle}</p>
            </div>
            {children}
        </div>
    );
}

function Metric({ icon, value, label, iconBg }: { icon: React.ReactNode; value: string; label: string; iconBg: string }) {
    return (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200/50 bg-white py-3 transition-all hover:border-neutral-300/60 hover:shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800/40 dark:hover:border-neutral-600/50">
            <div className={`flex size-7 items-center justify-center rounded-lg ${iconBg}`}>
                {icon}
            </div>
            <span className="text-xs font-bold text-neutral-900 tabular-nums dark:text-white">{value}</span>
            <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest">{label}</span>
        </div>
    );
}

/* ─── Main ─── */

export default function AdminWeather({ barangay_data }: Props) {
    const [expandedBrgy, setExpandedBrgy] = useState<string | null>(null);
    const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [aiData, setAiData] = useState<AiWeatherInsight | null>(null);
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState<string | null>(null);

    // My Location
    const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [myWeather, setMyWeather] = useState<MyLocationData | null>(null);
    const [myLocState, setMyLocState] = useState<'loading' | 'done' | 'error' | 'denied'>('loading');
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

    // Location search
    const [locSearch, setLocSearch] = useState('');
    const [locResults, setLocResults] = useState<{ name: string; lat: number; lon: number; display: string }[]>([]);
    const [locSearching, setLocSearching] = useState(false);
    const [locLabel, setLocLabel] = useState<string | null>(null);

    function fetchWeatherForCoords(lat: number, lng: number) {
        setMyLocState('loading');
        setMyCoords({ lat, lng });
        fetch(`/admin/weather/my-location?lat=${lat}&lon=${lng}`)
            .then(r => r.json())
            .then(data => { setMyWeather(data); setMyLocState('done'); })
            .catch(() => setMyLocState('error'));
    }

    useEffect(() => {
        if (!navigator.geolocation) { setMyLocState('error'); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setGpsCoords(c);
                fetchWeatherForCoords(c.lat, c.lng);
            },
            () => setMyLocState('denied'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    async function searchLocation(query: string) {
        if (!query.trim()) { setLocResults([]); return; }
        setLocSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
            const data = await res.json();
            setLocResults(data.map((r: any) => ({
                name: r.display_name.split(',')[0],
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
                display: r.display_name,
            })));
        } catch {
            setLocResults([]);
        } finally {
            setLocSearching(false);
        }
    }

    function selectSearchedLocation(result: { name: string; lat: number; lon: number; display: string }) {
        setLocLabel(result.display);
        setLocSearch('');
        setLocResults([]);
        fetchWeatherForCoords(result.lat, result.lon);
    }

    function resetToMyLocation() {
        if (!gpsCoords) return;
        setLocLabel(null);
        fetchWeatherForCoords(gpsCoords.lat, gpsCoords.lng);
    }

    // Auto-refresh every 5 min
    const myCoordsRef = useRef(myCoords);
    myCoordsRef.current = myCoords;
    const [lastRefresh, setLastRefresh] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['barangay_data'] });
            const c = myCoordsRef.current;
            if (c) {
                fetch(`/admin/weather/my-location?lat=${c.lat}&lon=${c.lng}`)
                    .then(r => r.json())
                    .then(data => setMyWeather(data))
                    .catch(() => {});
            }
            setLastRefresh(new Date());
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const filteredBarangays = useMemo(() => {
        let list = barangay_data.barangays;
        if (riskFilter) list = list.filter(b => b.flood_risk.level === riskFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(b =>
                b.name.toLowerCase().includes(q) ||
                b.weather.description.toLowerCase().includes(q) ||
                (b.flood_prone && 'flood-prone flood prone'.includes(q)) ||
                (b.coastal && 'coastal'.includes(q)) ||
                (b.near_river && 'river'.includes(q))
            );
        }
        return list;
    }, [barangay_data.barangays, search, riskFilter]);

    const stats = useMemo(() => {
        const b = barangay_data.barangays;
        return {
            avgTemp: Math.round(b.reduce((s, x) => s + x.weather.temperature, 0) / b.length),
            avgHumidity: Math.round(b.reduce((s, x) => s + x.weather.humidity, 0) / b.length),
            raining: b.filter(x => x.weather.rain_1h > 0).length,
            avgRisk: Math.round(b.reduce((s, x) => s + x.flood_risk.score, 0) / b.length),
        };
    }, [barangay_data.barangays]);

    async function generateWeatherInsights() {
        setAiState('loading');
        try {
            const res = await fetch('/admin/weather/ai-insights');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAiData(data);
            setAiState('done');
        } catch {
            setAiState('error');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Weather" />

            <div className="space-y-6 p-4 sm:p-6">

                {/* ═══════════════════════════════════════════════════
                    HERO
                ═══════════════════════════════════════════════════ */}
                <div className="relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="relative flex flex-col gap-6 p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 sm:size-11 dark:bg-blue-950/40">
                                    <CloudRain className="size-5 text-blue-500 sm:size-[22px]" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">Barangay Weather Monitor</h1>
                                    <p className="text-xs text-neutral-400">Nasugbu, Batangas — {barangay_data.barangays.length} barangays monitored</p>
                                </div>
                            </div>
                            <span className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200/60 bg-neutral-50/50 px-3 py-1.5 text-[10px] font-medium text-neutral-400 sm:inline-flex dark:border-neutral-700/60 dark:bg-neutral-800/50">
                                <span className="relative flex size-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                </span>
                                Live · {lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { icon: <Thermometer className="size-5 text-rose-500" />, val: `${stats.avgTemp}°`, label: 'Avg Temp', iconBg: 'bg-rose-50 dark:bg-rose-950/40' },
                                { icon: <Droplets className="size-5 text-blue-500" />, val: `${stats.avgHumidity}%`, label: 'Humidity', iconBg: 'bg-blue-50 dark:bg-blue-950/40' },
                                { icon: <CloudRain className="size-5 text-indigo-500" />, val: `${stats.raining}`, label: 'Raining', iconBg: 'bg-indigo-50 dark:bg-indigo-950/40' },
                                { icon: <ShieldAlert className="size-5 text-amber-500" />, val: `${stats.avgRisk}`, label: 'Avg Risk', iconBg: 'bg-amber-50 dark:bg-amber-950/40' },
                            ].map((s) => (
                                <div key={s.label} className="group relative flex items-start justify-between gap-4 rounded-2xl border border-neutral-200/70 bg-white p-4 transition-all hover:shadow-lg hover:border-neutral-300/80 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-400">{s.label}</p>
                                        <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-neutral-900 sm:text-2xl dark:text-white">{s.val}</p>
                                    </div>
                                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════
                    MY LOCATION
                ═══════════════════════════════════════════════════ */}
                <Card>
                    <CardHeader
                        icon={Navigation}
                        title={locLabel ? 'Searched Location' : 'My Location'}
                        subtitle={locLabel || 'Real-time weather at your exact GPS position'}
                        iconColor="text-sky-500"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    >
                        {locLabel && gpsCoords && (
                            <button
                                onClick={resetToMyLocation}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 shadow-sm transition-all hover:border-neutral-400 hover:text-neutral-900 cursor-pointer dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
                            >
                                <Navigation className="size-3" /> My Location
                            </button>
                        )}
                    </CardHeader>

                    {myLocState === 'loading' && (
                        <div className="flex flex-col items-center gap-3 py-14">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-neutral-200/50 animate-ping dark:bg-neutral-700/30" />
                                <Loader2 className="relative size-6 animate-spin text-neutral-400" />
                            </div>
                            <p className="text-xs font-medium text-neutral-400">Detecting your location...</p>
                        </div>
                    )}

                    {myLocState === 'denied' && (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
                                <MapPin className="size-5 text-amber-500" />
                            </div>
                            <p className="text-sm font-bold text-neutral-800 dark:text-white">Location access denied</p>
                            <p className="text-xs text-neutral-400">Enable location permissions in your browser settings</p>
                        </div>
                    )}

                    {myLocState === 'error' && (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
                                <AlertCircle className="size-5 text-red-500" />
                            </div>
                            <p className="text-sm font-semibold text-neutral-800 dark:text-white">Could not detect your location</p>
                            <p className="text-xs text-neutral-400">Check your browser location settings and refresh</p>
                        </div>
                    )}

                    {myLocState === 'done' && myCoords && myWeather && (
                        <div className="flex flex-col lg:flex-row">
                            {/* Weather panel */}
                            <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                                {/* Current */}
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="absolute inset-0 scale-125 rounded-full bg-sky-200/20 blur-xl dark:bg-sky-800/10" />
                                        <img src={iconUrl(myWeather.current.icon)} alt="" className="relative size-20 drop-shadow-lg" />
                                    </div>
                                    <div>
                                        <span className="text-4xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-white">
                                            {myWeather.current.temperature}°
                                        </span>
                                        <span className="ml-1 text-lg font-medium text-neutral-300 dark:text-neutral-600">C</span>
                                        <p className="mt-0.5 text-sm capitalize text-neutral-500 dark:text-neutral-400">{myWeather.current.description}</p>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-neutral-400">
                                            <MapPin className="size-3 text-sky-500" />
                                            {myWeather.current.city}{myWeather.current.country ? `, ${myWeather.current.country}` : ''} · {myCoords.lat.toFixed(4)}, {myCoords.lng.toFixed(4)}
                                        </p>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-2">
                                    <Metric icon={<Thermometer className="size-3.5 text-rose-500" />} value={`${myWeather.current.feels_like}°C`} label="Feels Like" iconBg="bg-rose-50 dark:bg-rose-950/40" />
                                    <Metric icon={<Droplets className="size-3.5 text-blue-500" />} value={`${myWeather.current.humidity}%`} label="Humidity" iconBg="bg-blue-50 dark:bg-blue-950/40" />
                                    <Metric icon={<Wind className="size-3.5 text-cyan-500" />} value={`${myWeather.current.wind_speed} km/h`} label="Wind" iconBg="bg-cyan-50 dark:bg-cyan-950/40" />
                                    <Metric icon={<Umbrella className="size-3.5 text-indigo-500" />} value={`${myWeather.current.rain_1h} mm/h`} label="Rain" iconBg={myWeather.current.rain_1h >= 2.5 ? 'bg-orange-50 dark:bg-orange-950/40' : 'bg-indigo-50 dark:bg-indigo-950/40'} />
                                    <Metric icon={<Eye className="size-3.5 text-emerald-500" />} value={`${myWeather.current.clouds}%`} label="Clouds" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
                                    <Metric icon={<Gauge className="size-3.5 text-violet-500" />} value={`${myWeather.current.pressure} hPa`} label="Pressure" iconBg="bg-violet-50 dark:bg-violet-950/40" />
                                </div>

                                {/* 24h prediction */}
                                {myWeather.hourly.length > 0 && (
                                    <div>
                                        <p className="mb-2.5 flex items-center gap-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                                            <Clock className="size-3 text-amber-500" />
                                            24-Hour Prediction
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                            {myWeather.hourly.map((h, i) => {
                                                const t = new Date(h.dt * 1000).toLocaleTimeString('en-PH', { hour: 'numeric', hour12: true });
                                                return (
                                                    <div key={i} className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-neutral-200/50 bg-white px-3 py-2.5 min-w-[68px] transition-all hover:shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800/40">
                                                        <span className="text-[10px] font-bold text-neutral-400">{t}</span>
                                                        <img src={iconUrl(h.icon)} alt="" className="size-7 drop-shadow-sm" />
                                                        <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-white">{Math.round(h.temperature)}°</span>
                                                        {h.rain_3h > 0 && (
                                                            <div className="flex items-center gap-0.5 text-sky-500">
                                                                <Droplets className="size-2" />
                                                                <span className="text-[9px] font-semibold tabular-nums">{h.rain_3h}mm</span>
                                                            </div>
                                                        )}
                                                        <span className="text-[8px] text-neutral-400 tabular-nums">{h.pop}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 3-day forecast */}
                                {myWeather.forecast.length > 0 && (
                                    <div>
                                        <p className="mb-2.5 flex items-center gap-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                                            <Sun className="size-3 text-indigo-500" />
                                            3-Day Forecast
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {myWeather.forecast.slice(0, 3).map((day, i) => (
                                                <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200/50 bg-white py-3.5 transition-all hover:shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800/40">
                                                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">{day.day}</span>
                                                    <img src={iconUrl(day.icon)} alt="" className="size-9 drop-shadow-sm" />
                                                    <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-white">{day.temp_max}° / {day.temp_min}°</span>
                                                    <div className="flex items-center gap-1 text-sky-500">
                                                        <Droplets className="size-2.5" />
                                                        <span className="text-[10px] font-semibold tabular-nums">{day.rain_total} mm</span>
                                                    </div>
                                                    <span className="text-[9px] text-neutral-400 tabular-nums">{day.pop}% chance</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Windy map + search */}
                            <div className="flex flex-col w-full border-t border-neutral-100/80 lg:w-[55%] lg:border-l lg:border-t-0 dark:border-neutral-800/60">
                                {/* Search bar on top of map */}
                                <div className="relative border-b border-neutral-100/80 px-4 py-2.5 dark:border-neutral-800/60">
                                    <div className="flex items-center gap-2.5">
                                        <Search className="size-3.5 text-neutral-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={locSearch}
                                            onChange={(e) => { setLocSearch(e.target.value); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') searchLocation(locSearch); }}
                                            placeholder="Search location..."
                                            className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 outline-none dark:text-white dark:placeholder-neutral-500"
                                        />
                                        {locSearching && <Loader2 className="size-3.5 animate-spin text-sky-500 shrink-0" />}
                                        {locSearch && !locSearching && (
                                            <button
                                                onClick={() => searchLocation(locSearch)}
                                                className="shrink-0 rounded-md bg-neutral-900 px-2.5 py-0.5 text-[10px] font-semibold text-white transition-all hover:bg-neutral-800 cursor-pointer dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                            >
                                                Search
                                            </button>
                                        )}
                                        {locSearch && (
                                            <button onClick={() => { setLocSearch(''); setLocResults([]); }} className="shrink-0 rounded-md p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 cursor-pointer">
                                                <X className="size-3" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {locResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full z-50 mx-4 mt-1 overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-xl shadow-black/10 dark:border-neutral-700/60 dark:bg-neutral-900">
                                            {locResults.map((r, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => selectSearchedLocation(r)}
                                                    className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-50 cursor-pointer dark:hover:bg-neutral-800/60"
                                                >
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-bold text-neutral-900 dark:text-white">{r.name}</p>
                                                        <p className="truncate text-[10px] text-neutral-400">{r.display}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Map */}
                                <div className="relative h-72 w-full flex-1 lg:h-auto lg:min-h-[480px]">
                                    <iframe
                                        title="Windy Weather Map"
                                        src={windyUrl(myCoords.lat, myCoords.lng)}
                                        className="absolute inset-0 h-full w-full"
                                        frameBorder="0"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* ═══════════════════════════════════════════════════
                    RISK SUMMARY
                ═══════════════════════════════════════════════════ */}
                <Card>
                    <div className="grid grid-cols-4 divide-x divide-neutral-100 dark:divide-neutral-800">
                        {(['critical', 'high', 'moderate', 'low'] as const).map((level) => {
                            const count = barangay_data.barangays.filter(b => b.flood_risk.level === level).length;
                            const rc = RISK_COLORS[level];
                            const active = riskFilter === level;
                            return (
                                <button
                                    key={level}
                                    onClick={() => setRiskFilter(active ? null : level)}
                                    className={`group flex flex-col items-center gap-1.5 py-5 transition-all cursor-pointer ${
                                        active ? `${rc.bg} shadow-inner` : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30'
                                    }`}
                                >
                                    <div className={`size-2 rounded-full ${rc.dot} transition-transform group-hover:scale-150 ${active ? 'scale-150 shadow-md ' + rc.glow : ''}`} />
                                    <span className={`text-2xl font-bold tabular-nums ${rc.text}`}>{count}</span>
                                    <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest">{level}</span>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* ═══════════════════════════════════════════════════
                    AI RECOMMENDATION
                ═══════════════════════════════════════════════════ */}
                <Card>
                    <CardHeader icon={Sparkles} title="AI Weather Recommendation" subtitle="GPT-4o powered analysis across all barangays" iconColor="text-violet-500" iconBg="bg-violet-50 dark:bg-violet-950/40" />

                    <div className="p-5 sm:p-6">
                        {aiState === 'idle' && (
                            <div className="flex flex-col items-center gap-6 py-10">
                                <div className="relative">
                                    <div className="absolute inset-0 scale-150 rounded-3xl bg-neutral-900/[0.04] blur-2xl dark:bg-white/[0.04]" />
                                    <div className="relative flex size-16 items-center justify-center rounded-2xl bg-neutral-900 shadow-lg shadow-neutral-900/20 dark:bg-white dark:shadow-white/10">
                                        <Sparkles className="size-7 text-white dark:text-neutral-900" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">AI-Powered Weather Intelligence</p>
                                    <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-400">
                                        Analyze weather behavior across all {barangay_data.barangays.length} barangays using GPT-4o for situational briefings and actionable MDRRMO recommendations
                                    </p>
                                </div>
                                <button
                                    onClick={generateWeatherInsights}
                                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 hover:shadow-xl active:scale-[0.97] cursor-pointer dark:bg-white dark:text-neutral-900 dark:shadow-white/10 dark:hover:bg-neutral-100"
                                >
                                    <Sparkles className="size-4" />
                                    Generate AI Recommendation
                                </button>
                            </div>
                        )}

                        {aiState === 'loading' && (
                            <div className="flex flex-col items-center gap-5 py-14">
                                <div className="relative">
                                    <div className="size-14 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-700 dark:border-neutral-700 dark:border-t-neutral-300" />
                                    <Sparkles className="absolute inset-0 m-auto size-5 text-neutral-500 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Analyzing {barangay_data.barangays.length} barangays...</p>
                                    <p className="mt-1 text-xs text-neutral-400">Computing weather patterns and risk correlations</p>
                                </div>
                            </div>
                        )}

                        {aiState === 'error' && (
                            <div className="flex flex-col items-center gap-4 py-12">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
                                    <AlertCircle className="size-7 text-red-500" />
                                </div>
                                <p className="text-sm font-semibold text-neutral-800 dark:text-white">Analysis failed</p>
                                <p className="text-xs text-neutral-400">Could not connect to AI service</p>
                                <button
                                    onClick={generateWeatherInsights}
                                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:border-neutral-400 hover:text-neutral-900 cursor-pointer dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
                                >
                                    <RefreshCw className="size-3.5" /> Retry
                                </button>
                            </div>
                        )}

                        {aiState === 'done' && aiData && (
                            <div className="flex flex-col gap-6">
                                {/* Risk + Refresh */}
                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${AI_RISK_STYLES[aiData.risk_level]}`}>
                                        <span className="size-2 rounded-full bg-current animate-pulse" />
                                        {aiData.risk_level} risk
                                    </span>
                                    <button onClick={generateWeatherInsights} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 transition-all hover:border-neutral-400 hover:text-neutral-900 cursor-pointer dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-white">
                                        <RefreshCw className="size-3" /> Refresh
                                    </button>
                                </div>

                                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{aiData.summary}</p>

                                {/* Weather Pattern */}
                                <div className={`rounded-xl p-4 ${AI_RISK_BOX[aiData.risk_level]}`}>
                                    <div className="mb-2 flex items-center gap-1.5">
                                        <CloudSun className={`size-3.5 ${AI_RISK_TXT[aiData.risk_level]}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${AI_RISK_TXT[aiData.risk_level]}`}>Weather Pattern</span>
                                    </div>
                                    <p className={`text-xs font-medium leading-relaxed ${AI_RISK_TXT[aiData.risk_level]}`}>{aiData.weather_pattern}</p>
                                </div>

                                {/* Two-col: Findings + At-Risk */}
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Key Findings</p>
                                        <ul className="flex flex-col gap-3">
                                            {aiData.key_findings.map((f, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                                                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />{f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {aiData.at_risk_barangays.length > 0 && (
                                        <div>
                                            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">At-Risk Barangays</p>
                                            <div className="flex flex-col gap-2.5">
                                                {aiData.at_risk_barangays.map((b, i) => (
                                                    <div key={i} className="flex items-start gap-2.5 rounded-xl border border-red-100/80 bg-red-50/40 px-3.5 py-2.5 dark:border-red-800/30 dark:bg-red-950/20">
                                                        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                                                        <div>
                                                            <span className="text-xs font-bold text-neutral-900 dark:text-white">{b.name}</span>
                                                            <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{b.reason}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Recommendations */}
                                <div>
                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Recommendations</p>
                                    <ul className="flex flex-col gap-3">
                                        {aiData.recommendations.map((r, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-bold text-white dark:bg-white dark:text-neutral-900">{i + 1}</span>
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Two-col: Priority + Outlook */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className={`rounded-xl p-4 ${AI_RISK_BOX[aiData.risk_level]}`}>
                                        <div className="mb-2 flex items-center gap-1.5">
                                            <Zap className={`size-3.5 ${AI_RISK_TXT[aiData.risk_level]}`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${AI_RISK_TXT[aiData.risk_level]}`}>Priority Action</span>
                                        </div>
                                        <p className={`text-xs font-medium leading-relaxed ${AI_RISK_TXT[aiData.risk_level]}`}>{aiData.priority_action}</p>
                                    </div>
                                    <div className="rounded-xl border border-neutral-200/50 bg-neutral-50/80 p-4 dark:border-neutral-700/40 dark:bg-neutral-800/50">
                                        <div className="mb-2 flex items-center gap-1.5">
                                            <TrendingUp className="size-3.5 text-neutral-500 dark:text-neutral-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">24-48h Outlook</span>
                                        </div>
                                        <p className="text-xs font-medium leading-relaxed text-neutral-700 dark:text-neutral-300">{aiData.forecast_outlook}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 dark:text-neutral-600">
                                    <ChevronRight className="size-3" />
                                    AI-generated analysis. Always verify with on-ground information and PAGASA advisories.
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* ═══════════════════════════════════════════════════
                    BARANGAY LIST
                ═══════════════════════════════════════════════════ */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                        <Mountain className="size-4 text-emerald-500" />
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest dark:text-neutral-400">All Barangays</span>
                    </div>
                    <span className="text-[10px] tabular-nums text-neutral-400">
                        {filteredBarangays.length} of {barangay_data.barangays.length}
                    </span>
                </div>

                {/* Search + filter */}
                <div className="flex flex-col gap-3">
                    <Card className="!shadow-none">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Search className="size-4 text-neutral-400 shrink-0" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search barangay name, tags (flood-prone, coastal, river)..."
                                className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none dark:text-white dark:placeholder-neutral-500"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 cursor-pointer">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </Card>
                    <div className="flex flex-wrap gap-1.5">
                        {(['critical', 'high', 'moderate', 'low'] as const).map((level) => {
                            const count = barangay_data.barangays.filter(b => b.flood_risk.level === level).length;
                            const rc = RISK_COLORS[level];
                            const active = riskFilter === level;
                            return (
                                <button
                                    key={level}
                                    onClick={() => setRiskFilter(active ? null : level)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                                        active
                                            ? `${rc.bg} ${rc.border} ${rc.text} shadow-md ${rc.glow}`
                                            : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <span className={`size-2 rounded-full ${rc.dot}`} />
                                    {level} <span className="opacity-60">({count})</span>
                                </button>
                            );
                        })}
                        {(search || riskFilter) && (
                            <button
                                onClick={() => { setSearch(''); setRiskFilter(null); }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-500 transition-all hover:bg-red-100 hover:shadow-sm cursor-pointer dark:border-red-800/40 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                            >
                                <X className="size-3" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2.5">
                    {filteredBarangays.length === 0 && (
                        <Card>
                            <div className="flex flex-col items-center gap-3 py-12">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                                    <Search className="size-5 text-neutral-400" />
                                </div>
                                <p className="text-sm font-medium text-neutral-400">No barangays match your search</p>
                            </div>
                        </Card>
                    )}

                    {filteredBarangays.map((brgy) => {
                        const isExpanded = expandedBrgy === brgy.name;
                        const rc = RISK_COLORS[brgy.flood_risk.level];
                        return (
                            <div
                                key={brgy.name}
                                className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                                style={{ borderLeftWidth: 4, borderLeftColor: RISK_LEFT_BORDER[brgy.flood_risk.level] }}
                            >
                                <button
                                    onClick={() => setExpandedBrgy(isExpanded ? null : brgy.name)}
                                    className="group w-full flex items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 cursor-pointer"
                                >
                                    <div className={`size-2.5 shrink-0 rounded-full ${rc.dot} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ${rc.border.replace('border-', 'ring-')}`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-neutral-900 dark:text-white">{brgy.name}</span>
                                            {brgy.flood_prone && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-100/80 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">Flood-prone</span>}
                                            {brgy.coastal && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sky-100/80 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">Coastal</span>}
                                            {brgy.near_river && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100/80 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">River</span>}
                                        </div>
                                        <p className="text-[10px] text-neutral-400 mt-0.5 capitalize">{brgy.weather.description} · {brgy.elevation_m}m elev</p>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1">
                                            <img src={iconUrl(brgy.weather.icon)} alt="" className="size-9 drop-shadow-md" />
                                            <span className="text-lg font-extrabold text-neutral-900 tabular-nums dark:text-white">{brgy.weather.temperature}°</span>
                                        </div>

                                        <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${rc.bg} ${rc.border} border`}>
                                            <span className={`text-lg font-extrabold tabular-nums leading-none ${rc.text}`}>{brgy.flood_risk.score}</span>
                                            <span className={`text-[7px] font-bold uppercase tracking-wider ${rc.text}`}>{brgy.flood_risk.level}</span>
                                        </div>

                                        <div className="transition-transform group-hover:translate-y-0.5">
                                            {isExpanded ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-neutral-100 bg-neutral-50/40 px-5 pb-5 pt-4 dark:border-neutral-800 dark:bg-neutral-800/20">
                                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5">Current Conditions</p>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            <Metric icon={<Thermometer className="size-3.5 text-rose-500" />} value={`${brgy.weather.temperature}°C`} label="Temp" iconBg="bg-rose-50 dark:bg-rose-950/40" />
                                            <Metric icon={<Droplets className="size-3.5 text-blue-500" />} value={`${brgy.weather.humidity}%`} label="Humidity" iconBg="bg-blue-50 dark:bg-blue-950/40" />
                                            <Metric icon={<Wind className="size-3.5 text-cyan-500" />} value={`${brgy.weather.wind_speed} km/h`} label="Wind" iconBg="bg-cyan-50 dark:bg-cyan-950/40" />
                                            <Metric icon={<Umbrella className="size-3.5 text-indigo-500" />} value={`${brgy.weather.rain_1h} mm/h`} label="Rain" iconBg={brgy.weather.rain_1h >= 2.5 ? 'bg-orange-50 dark:bg-orange-950/40' : 'bg-indigo-50 dark:bg-indigo-950/40'} />
                                            <Metric icon={<Eye className="size-3.5 text-emerald-500" />} value={`${brgy.weather.clouds}%`} label="Clouds" iconBg="bg-emerald-50 dark:bg-emerald-950/40" />
                                            <Metric icon={<Gauge className="size-3.5 text-violet-500" />} value={`${brgy.weather.pressure} hPa`} label="Pressure" iconBg="bg-violet-50 dark:bg-violet-950/40" />
                                        </div>

                                        {brgy.forecast.length > 0 && (
                                            <>
                                                <p className="mt-5 mb-2.5 flex items-center gap-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                                                    <Sun className="size-3 text-indigo-500" />
                                                    3-Day Forecast
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {brgy.forecast.map((day, idx) => (
                                                        <div key={idx} className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200/50 bg-white py-3.5 transition-all hover:shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800/40">
                                                            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">{day.day}</span>
                                                            <img src={iconUrl(day.icon)} alt="" className="size-9 drop-shadow-sm" />
                                                            <span className="text-xs font-bold text-neutral-900 tabular-nums dark:text-white">{day.temp_max}° / {day.temp_min}°</span>
                                                            <div className="flex items-center gap-1 text-sky-500">
                                                                <Droplets className="size-2.5" />
                                                                <span className="text-[10px] font-semibold tabular-nums">{day.rain_total} mm</span>
                                                            </div>
                                                            <span className="text-[9px] text-neutral-400 tabular-nums">{day.pop}% chance</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        <div className="mt-5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Flood Risk Score</span>
                                                <span className={`text-xs font-bold ${rc.text}`}>{brgy.flood_risk.score}/100 — {brgy.flood_risk.level}</span>
                                            </div>
                                            <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden dark:bg-neutral-800">
                                                <div className={`h-full rounded-full transition-all duration-700 ease-out ${RISK_BAR_COLORS[brgy.flood_risk.level]}`} style={{ width: `${brgy.flood_risk.score}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                    <p className="shrink-0 flex items-center gap-2 text-[10px] text-neutral-400 px-3">
                        <span className="relative flex size-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                        </span>
                        {new Date(barangay_data.generated_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · OpenWeatherMap
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                </div>
            </div>
        </AppLayout>
    );
}
