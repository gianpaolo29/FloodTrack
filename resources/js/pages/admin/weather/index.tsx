import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    CloudRain,
    CloudSun,
    Compass,
    Crosshair,
    Droplets,
    Eye,
    Gauge,
    GitCompare,
    Loader2,
    MapPin,
    Mountain,
    RefreshCw,
    Search,
    ShieldAlert,
    Sparkles,
    Sunrise,
    Sunset,
    Thermometer,
    TrendingUp,
    Waves,
    Wind,
    Zap,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const GMAP_LIBRARIES: ('places')[] = ['places'];

/* ─── Types ─── */

interface CurrentWeather {
    temperature: number; feels_like: number; temp_min: number; temp_max: number;
    humidity: number; pressure: number; wind_speed: number; wind_deg: number;
    wind_gust: number; visibility: number; clouds: number; rain_1h: number;
    rain_3h: number; description: string; icon: string; main: string;
    city: string; country: string; sunrise: number | null; sunset: number | null; dt: number;
}
interface HourlyItem {
    dt: number; date: string; temperature: number; humidity: number; pressure: number;
    wind_speed: number; wind_gust: number; rain_3h: number; description: string;
    icon: string; main: string; pop: number;
}
interface DailyItem {
    date: string; day: string; temp_min: number; temp_max: number; rain_total: number;
    wind_max: number; pop: number; description: string; icon: string; main: string;
}
interface WeatherAlert { type: 'critical' | 'warning'; title: string; message: string; icon: string }

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
interface WeatherInsight {
    type: 'overview' | 'critical' | 'warning' | 'info'; title: string; body: string; icon: string;
    overall_risk_score?: number; overall_risk_level?: string;
}
interface BarangayData {
    barangays: BarangayWeather[]; analysis: WeatherInsight[]; generated_at: string;
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

interface Props {
    current: CurrentWeather; daily_forecast: DailyItem[]; hourly_forecast: HourlyItem[];
    alerts: WeatherAlert[]; coordinates: { lat: number; lon: number };
    barangay_data: BarangayData;
}

/* ─── Helpers ─── */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Weather', href: '/admin/weather' },
];

const iconUrl = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`;
const windDir = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
const fmtTime = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtHour = (dt: number) => new Date(dt * 1000).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

const CARD = 'rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900';
const CARD_INNER = 'rounded-xl border border-neutral-200/60 bg-neutral-50/50 dark:border-neutral-700/60 dark:bg-neutral-800/50';

const RISK_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
    low:      { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200/60 dark:border-emerald-800/40', dot: 'bg-emerald-500' },
    moderate: { text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40',     border: 'border-amber-200/60 dark:border-amber-800/40',   dot: 'bg-amber-500' },
    high:     { text: 'text-orange-600 dark:text-orange-400',    bg: 'bg-orange-50 dark:bg-orange-950/40',    border: 'border-orange-200/60 dark:border-orange-800/40',  dot: 'bg-orange-500' },
    critical: { text: 'text-red-600 dark:text-red-400',          bg: 'bg-red-50 dark:bg-red-950/40',          border: 'border-red-200/60 dark:border-red-800/40',        dot: 'bg-red-500' },
};

const INSIGHT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
    critical: { bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200/60 dark:border-red-800/40',     icon: 'text-red-500' },
    warning:  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/60 dark:border-amber-800/40', icon: 'text-amber-500' },
    info:     { bg: 'bg-sky-50 dark:bg-sky-950/30',      border: 'border-sky-200/60 dark:border-sky-800/40',      icon: 'text-sky-500' },
    overview: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/60 dark:border-emerald-800/40', icon: 'text-emerald-500' },
};

const INSIGHT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    'cloud-sun': CloudSun, 'cloud-rain': CloudRain, 'alert-triangle': AlertTriangle,
    'trending-up': TrendingUp, 'git-compare': GitCompare, 'droplets': Droplets, 'sparkles': Sparkles,
};

const RISK_BAR_COLORS: Record<string, string> = {
    low: 'bg-emerald-500', moderate: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-500',
};

const AI_RISK_STYLES: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    high:     'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    moderate: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    low:      'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

const AI_RISK_BOX_STYLES: Record<string, string> = {
    critical: 'bg-red-50 border border-red-200/60 dark:bg-red-950/30 dark:border-red-800/40',
    high:     'bg-orange-50 border border-orange-200/60 dark:bg-orange-950/30 dark:border-orange-800/40',
    moderate: 'bg-amber-50 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/40',
    low:      'bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/40',
};

const AI_RISK_TEXT_STYLES: Record<string, string> = {
    critical: 'text-red-700 dark:text-red-400',
    high:     'text-orange-700 dark:text-orange-400',
    moderate: 'text-amber-700 dark:text-amber-400',
    low:      'text-emerald-700 dark:text-emerald-400',
};

const tooltipStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px',
    fontSize: '11px', color: '#525252', padding: '8px 12px', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)',
};
const tooltipStyleDark: React.CSSProperties = {
    background: '#171717', border: '1px solid #404040', borderRadius: '10px',
    fontSize: '11px', color: '#d4d4d4', padding: '8px 12px', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.4)',
};

/* ─── Main ─── */

export default function AdminWeather({ current, daily_forecast, hourly_forecast, alerts, coordinates, barangay_data }: Props) {
    const [expandedBrgy, setExpandedBrgy] = useState<string | null>(null);
    const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [aiData, setAiData] = useState<AiWeatherInsight | null>(null);

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

    const chartData = hourly_forecast.map((h) => ({
        time: fmtHour(h.dt), temp: h.temperature, humidity: h.humidity,
        pressure: h.pressure, wind: h.wind_speed, gust: h.wind_gust, rain: h.rain_3h,
    }));

    const now = current.dt;
    const sunrise = current.sunrise ?? now;
    const sunset = current.sunset ?? now;
    const dayProgress = Math.max(0, Math.min(1, (now - sunrise) / (sunset - sunrise)));
    const isDaytime = now >= sunrise && now <= sunset;

    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '', libraries: GMAP_LIBRARIES });
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);

    const navigateToCoords = useCallback((lat: number, lon: number) => {
        router.get('/admin/weather', { lat, lon }, { preserveState: false });
    }, []);

    const hasAutoDetected = useRef(false);
    useEffect(() => {
        if (hasAutoDetected.current) return;
        hasAutoDetected.current = true;
        const params = new URLSearchParams(window.location.search);
        if (params.has('lat') && params.has('lon')) return;
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => navigateToCoords(pos.coords.latitude, pos.coords.longitude),
            () => {}, { enableHighAccuracy: true, timeout: 8000 },
        );
    }, [navigateToCoords]);

    const onPlaceChanged = useCallback(() => {
        const loc = autocompleteRef.current?.getPlace()?.geometry?.location;
        if (loc) navigateToCoords(loc.lat(), loc.lng());
    }, [navigateToCoords]);

    const useMyLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { setGeoLoading(false); navigateToCoords(pos.coords.latitude, pos.coords.longitude); },
            () => setGeoLoading(false), { enableHighAccuracy: true, timeout: 10000 },
        );
    }, [navigateToCoords]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Weather" />

            <div className="space-y-4 p-3 sm:p-5">

                {/* ─── Search Bar ─── */}
                <div className="flex items-center gap-3">
                    <div className={CARD + ' flex flex-1 items-center gap-3 px-4 py-2.5'}>
                        <Search className="size-4 text-neutral-400 shrink-0" />
                        {isLoaded ? (
                            <Autocomplete onLoad={(ac) => { autocompleteRef.current = ac; }} onPlaceChanged={onPlaceChanged} options={{ types: ['(cities)'] }} className="flex-1">
                                <input type="text" placeholder="Search city or location..." className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none dark:text-white dark:placeholder-neutral-500" />
                            </Autocomplete>
                        ) : (
                            <input type="text" placeholder="Loading..." disabled className="w-full bg-transparent text-sm text-neutral-400 outline-none" />
                        )}
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-neutral-400">
                            <MapPin className="size-3" />
                            <span className="tabular-nums">{coordinates.lat.toFixed(2)}, {coordinates.lon.toFixed(2)}</span>
                        </div>
                    </div>
                    <button onClick={useMyLocation} disabled={geoLoading} className={CARD + ' flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-all cursor-pointer disabled:opacity-50 dark:text-neutral-400 dark:hover:text-white'}>
                        {geoLoading ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
                        <span className="hidden sm:inline text-xs font-medium">My Location</span>
                    </button>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {alerts.map((a, i) => (
                            <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                                a.type === 'critical'
                                    ? 'border border-red-200/60 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300'
                                    : 'border border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300'
                            }`}>
                                <span className="text-lg">{a.icon}</span>
                                <span className="font-semibold">{a.title}</span>
                                <span className="text-xs opacity-70 hidden sm:inline">{a.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── Top: Hero + Map ─── */}
                <div className="grid gap-4 lg:grid-cols-[400px_1fr]">

                    {/* Left */}
                    <div className="flex flex-col gap-4">

                        {/* Hero */}
                        <div className={CARD + ' overflow-hidden relative'}>
                            <div className="absolute -top-20 -right-20 size-40 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
                            <div className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                                            {current.city}
                                            {current.country ? <span className="text-neutral-400 font-normal ml-1.5 text-sm">{current.country}</span> : ''}
                                        </h2>
                                        <p className="text-[11px] text-neutral-400 mt-0.5">
                                            {new Date(current.dt * 1000).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className="text-[11px] text-neutral-400">{isDaytime ? 'Daytime' : 'Nighttime'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-6xl font-extralight tracking-tighter tabular-nums leading-none text-neutral-900 dark:text-white">
                                            {current.temperature}<span className="text-2xl text-neutral-300 font-light dark:text-neutral-600">°C</span>
                                        </p>
                                        <p className="text-sm text-neutral-500 mt-2 capitalize dark:text-neutral-400">{current.description}</p>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            Feels like {current.feels_like}°C · H:{current.temp_max}° L:{current.temp_min}°
                                        </p>
                                    </div>
                                    <img src={iconUrl(current.icon)} alt={current.description} className="size-24 opacity-90 drop-shadow-lg" />
                                </div>

                                {/* Sunrise / Sunset */}
                                <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-2">
                                        <span className="flex items-center gap-1"><Sunrise className="size-3 text-amber-500" />{fmtTime(current.sunrise)}</span>
                                        <span className="flex items-center gap-1">{fmtTime(current.sunset)}<Sunset className="size-3 text-orange-500" /></span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden dark:bg-neutral-800">
                                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 transition-all duration-1000" style={{ width: `${dayProgress * 100}%` }} />
                                    </div>
                                </div>

                                {/* 5-day forecast */}
                                <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-5 gap-1 dark:border-neutral-800">
                                    {daily_forecast.slice(0, 5).map((d, i) => (
                                        <div key={i} className="flex flex-col items-center gap-0.5 group cursor-default">
                                            <span className="text-[10px] font-medium text-neutral-400 group-hover:text-neutral-600 transition-colors dark:group-hover:text-neutral-300">
                                                {i === 0 ? 'Now' : d.day}
                                            </span>
                                            <img src={iconUrl(d.icon)} alt={d.description} className="size-8 opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <span className="text-xs font-semibold text-neutral-900 tabular-nums dark:text-white">{d.temp_max}°</span>
                                            <span className="text-[10px] text-neutral-400 tabular-nums">{d.temp_min}°</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Temperature chart */}
                        <div className={CARD + ' flex-1 p-5'}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex size-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30">
                                    <Thermometer className="size-4 text-rose-500" />
                                </div>
                                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider dark:text-white">Temperature</span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    { val: current.temperature, unit: '°C', label: 'Current', color: 'text-rose-500' },
                                    { val: current.feels_like, unit: '°C', label: 'Feels Like', color: 'text-orange-500' },
                                    { val: current.humidity, unit: '%', label: 'Humidity', color: 'text-sky-500' },
                                ].map((m) => (
                                    <div key={m.label} className={CARD_INNER + ' px-3 py-2.5 text-center'}>
                                        <p className={`text-xl font-bold tabular-nums ${m.color}`}>
                                            {m.val}<span className="text-[10px] text-neutral-400 ml-0.5">{m.unit}</span>
                                        </p>
                                        <p className="text-[9px] text-neutral-400 mt-0.5 uppercase tracking-wider">{m.label}</p>
                                    </div>
                                ))}
                            </div>

                            <ResponsiveContainer width="100%" height={130}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#a3a3a3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 9, fill: '#a3a3a3' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={2} fill="url(#gTemp)" name="Temp °C" dot={false} activeDot={{ r: 4, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Weather Map */}
                    <div className={CARD + ' overflow-hidden min-h-[520px]'}>
                        <iframe
                            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=7&overlay=rain&product=ecmwf&level=surface&lat=${coordinates.lat}&lon=${coordinates.lon}&detailLat=${coordinates.lat}&detailLon=${coordinates.lon}&marker=true`}
                            className="w-full h-full min-h-[520px] border-0 rounded-2xl"
                            loading="lazy"
                            title="Weather Map"
                        />
                    </div>
                </div>

                {/* ─── Hourly Forecast ─── */}
                <div className={CARD + ' overflow-hidden'}>
                    <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest dark:text-neutral-400">Hourly Forecast</span>
                    </div>
                    <div className="flex">
                        {hourly_forecast.map((h, i) => (
                            <div key={i} className="flex flex-1 flex-col items-center gap-1 px-1 py-3 border-r border-neutral-100/60 last:border-r-0 hover:bg-neutral-50/50 transition-colors cursor-default dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                                <span className="text-[9px] text-neutral-400 font-medium">{fmtHour(h.dt)}</span>
                                <img src={iconUrl(h.icon)} alt={h.description} className="size-7 opacity-80" />
                                <span className="text-xs font-bold text-neutral-900 tabular-nums dark:text-white">{h.temperature}°</span>
                                <div className="flex items-center gap-0.5 text-[9px] text-sky-500">
                                    <Droplets className="size-2" />
                                    <span>{h.pop}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Metric Cards ─── */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={<Wind className="size-4 text-cyan-500" />} iconBg="bg-cyan-50 dark:bg-cyan-900/30" title="Wind"
                        metrics={[{ value: current.wind_speed, unit: 'km/h', label: `Speed · ${windDir(current.wind_deg)}` }, { value: current.wind_gust, unit: 'km/h', label: 'Gust' }]}
                        chart={
                            <ResponsiveContainer width="100%" height={100}>
                                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Line type="monotone" dataKey="wind" stroke="#06b6d4" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} name="Wind" />
                                    <Line type="monotone" dataKey="gust" stroke="#a78bfa" strokeWidth={1} strokeDasharray="4 3" dot={false} name="Gust" />
                                </LineChart>
                            </ResponsiveContainer>
                        }
                    />
                    <MetricCard icon={<Gauge className="size-4 text-violet-500" />} iconBg="bg-violet-50 dark:bg-violet-900/30" title="Pressure"
                        metrics={[{ value: current.pressure, unit: 'hPa', label: 'Atmospheric' }]}
                        chart={
                            <ResponsiveContainer width="100%" height={100}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs><linearGradient id="gPr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.12} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="pressure" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gPr)" name="hPa" dot={false} activeDot={{ r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        }
                    />
                    <MetricCard icon={<Droplets className="size-4 text-blue-500" />} iconBg="bg-blue-50 dark:bg-blue-900/30" title="Humidity"
                        metrics={[{ value: current.humidity, unit: '%', label: 'Relative' }]}
                        chart={
                            <ResponsiveContainer width="100%" height={100}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs><linearGradient id="gHu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gHu)" name="%" dot={false} activeDot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        }
                    />
                    <MetricCard icon={<CloudRain className="size-4 text-indigo-500" />} iconBg="bg-indigo-50 dark:bg-indigo-900/30" title="Rain"
                        metrics={[{ value: current.rain_1h, unit: 'mm/h', label: 'Rate' }, { value: current.rain_3h, unit: 'mm', label: '3h Total' }]}
                        chart={
                            <ResponsiveContainer width="100%" height={100}>
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 8, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="rain" fill="#6366f1" radius={[3, 3, 0, 0]} name="Rain mm" />
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    />
                </div>

                {/* ─── Detail Tiles ─── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailTile icon={<Eye className="size-4 text-emerald-500" />} label="Visibility" value={`${current.visibility} km`} sub={current.visibility < 5 ? 'Reduced' : 'Clear'} />
                    <DetailTile icon={<Compass className="size-4 text-amber-500" />} label="Wind Direction" value={windDir(current.wind_deg)} sub={`${current.wind_deg}°`} />
                    <DetailTile icon={<Sunrise className="size-4 text-yellow-500" />} label="Sunrise" value={fmtTime(current.sunrise)} sub="Morning" />
                    <DetailTile icon={<Sunset className="size-4 text-orange-500" />} label="Sunset" value={fmtTime(current.sunset)} sub="Evening" />
                </div>

                {/* No alerts */}
                {alerts.length === 0 && (
                    <div className={CARD + ' flex items-center gap-3 px-5 py-3.5'}>
                        <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                            <AlertTriangle className="size-4 text-emerald-500" />
                        </div>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">No Severe Weather Alerts</span>
                        <span className="text-xs text-neutral-400">— All conditions normal</span>
                    </div>
                )}

                {/* ─── Barangay Weather Section ─── */}
                {barangay_data && (
                    <>
                        {/* Section header */}
                        <div className="flex items-center gap-3 pt-4">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                                <MapPin className="size-4 text-sky-500" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider dark:text-white">Barangay Weather Monitor</h2>
                                <p className="text-[10px] text-neutral-400">Nasugbu, Batangas — {barangay_data.barangays.length} barangays</p>
                            </div>
                        </div>

                        {/* Risk summary strip */}
                        <div className={CARD + ' grid grid-cols-4 gap-0 divide-x divide-neutral-100 dark:divide-neutral-800 overflow-hidden'}>
                            {(['critical', 'high', 'moderate', 'low'] as const).map((level) => {
                                const count = barangay_data.barangays.filter(b => b.flood_risk.level === level).length;
                                const rc = RISK_COLORS[level];
                                return (
                                    <div key={level} className="flex flex-col items-center py-4 gap-1">
                                        <div className={`size-2 rounded-full ${rc.dot}`} />
                                        <span className={`text-2xl font-bold tabular-nums ${rc.text}`}>{count}</span>
                                        <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest">{level}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* AI Analysis */}
                        <div className="flex items-center gap-2 pt-2">
                            <Sparkles className="size-4 text-violet-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest dark:text-neutral-400">AI Weather Analysis</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {barangay_data.analysis.map((insight, i) => {
                                const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.info;
                                const IconComp = INSIGHT_ICON_MAP[insight.icon] ?? AlertTriangle;
                                return (
                                    <div key={i} className={`rounded-2xl border p-4 ${style.bg} ${style.border} ${insight.overall_risk_score !== undefined ? 'sm:col-span-2' : ''}`}>
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                                                <IconComp className={`size-4 ${style.icon}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{insight.title}</h3>
                                                    {(insight.type === 'critical' || insight.type === 'warning') && (
                                                        <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${insight.type === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                                                            {insight.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-600 leading-relaxed mt-1 dark:text-neutral-300">{insight.body}</p>
                                            </div>
                                        </div>
                                        {insight.overall_risk_score !== undefined && (
                                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-200/40 dark:border-neutral-700/40">
                                                <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">Municipality Risk</span>
                                                <div className="flex-1 h-2 rounded-full bg-neutral-200/60 dark:bg-neutral-700/60 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${RISK_BAR_COLORS[insight.overall_risk_level ?? 'low']}`} style={{ width: `${insight.overall_risk_score}%` }} />
                                                </div>
                                                <span className={`text-xs font-bold tabular-nums ${RISK_COLORS[insight.overall_risk_level ?? 'low']?.text ?? ''}`}>
                                                    {insight.overall_risk_score}/100
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ─── GPT-Powered AI Recommendation ─── */}
                        <div className={CARD + ' overflow-hidden'}>
                            {/* Header */}
                            <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30">
                                    <Sparkles className="size-4 text-violet-500" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs font-bold text-neutral-900 dark:text-white">AI Weather Recommendation</span>
                                    <p className="text-[10px] text-neutral-400">GPT-4o powered analysis of barangay weather behavior</p>
                                </div>
                            </div>

                            <div className="p-5">
                                {aiState === 'idle' && (
                                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                                        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30">
                                            <Sparkles className="size-7 text-violet-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-800 dark:text-white">AI-Powered Weather Intelligence</p>
                                            <p className="mt-1 max-w-sm text-xs text-neutral-400">Analyze weather behavior across all barangays using AI to get situational briefings and actionable recommendations for the MDRRMO</p>
                                        </div>
                                        <button
                                            onClick={generateWeatherInsights}
                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/40 hover:brightness-110 active:scale-95 cursor-pointer"
                                        >
                                            <Sparkles className="size-4" />
                                            Generate AI Recommendation
                                        </button>
                                    </div>
                                )}

                                {aiState === 'loading' && (
                                    <div className="flex flex-col items-center gap-4 py-10 text-center">
                                        <div className="relative">
                                            <div className="size-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-500" />
                                            <Sparkles className="absolute inset-0 m-auto size-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Analyzing weather across {barangay_data.barangays.length} barangays...</p>
                                            <p className="mt-0.5 text-xs text-neutral-400">AI is observing weather behavior and computing risk patterns</p>
                                        </div>
                                    </div>
                                )}

                                {aiState === 'error' && (
                                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                                        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
                                            <AlertCircle className="size-7 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-800 dark:text-white">Analysis failed</p>
                                            <p className="mt-1 text-xs text-neutral-400">Could not connect to AI service. Please try again.</p>
                                        </div>
                                        <button
                                            onClick={generateWeatherInsights}
                                            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:border-violet-300 hover:text-violet-600 cursor-pointer dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                        >
                                            <RefreshCw className="size-3.5" />
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {aiState === 'done' && aiData && (
                                    <div className="flex flex-col gap-4 sm:gap-5">
                                        {/* Risk Level + Refresh */}
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${AI_RISK_STYLES[aiData.risk_level]}`}>
                                                <span className="size-1.5 rounded-full bg-current" />
                                                {aiData.risk_level} risk
                                            </span>
                                            <button
                                                onClick={generateWeatherInsights}
                                                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-all hover:border-violet-300 hover:text-violet-600 cursor-pointer dark:border-neutral-700 dark:hover:border-violet-700 dark:hover:text-violet-400"
                                            >
                                                <RefreshCw className="size-3" />
                                                Refresh
                                            </button>
                                        </div>

                                        {/* Summary */}
                                        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{aiData.summary}</p>

                                        {/* Weather Pattern */}
                                        <div className={`rounded-xl p-3.5 ${AI_RISK_BOX_STYLES[aiData.risk_level]}`}>
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <CloudSun className={`size-3.5 ${AI_RISK_TEXT_STYLES[aiData.risk_level]}`} />
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${AI_RISK_TEXT_STYLES[aiData.risk_level]}`}>
                                                    Weather Pattern
                                                </span>
                                            </div>
                                            <p className={`text-xs font-medium leading-relaxed ${AI_RISK_TEXT_STYLES[aiData.risk_level]}`}>
                                                {aiData.weather_pattern}
                                            </p>
                                        </div>

                                        {/* Key Findings */}
                                        <div>
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Key Findings</p>
                                            <ul className="flex flex-col gap-2">
                                                {aiData.key_findings.map((finding, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                                                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                                                        {finding}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* At-Risk Barangays */}
                                        {aiData.at_risk_barangays.length > 0 && (
                                            <div>
                                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">At-Risk Barangays</p>
                                                <div className="flex flex-col gap-2">
                                                    {aiData.at_risk_barangays.map((brgy, i) => (
                                                        <div key={i} className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 dark:border-red-800/30 dark:bg-red-950/20">
                                                            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                                                            <div>
                                                                <span className="text-xs font-bold text-neutral-900 dark:text-white">{brgy.name}</span>
                                                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{brgy.reason}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recommendations */}
                                        <div>
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Recommendations</p>
                                            <ul className="flex flex-col gap-2">
                                                {aiData.recommendations.map((rec, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                                                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                                                            {i + 1}
                                                        </span>
                                                        {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Priority Action */}
                                        <div className={`rounded-xl p-3.5 ${AI_RISK_BOX_STYLES[aiData.risk_level]}`}>
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <Zap className={`size-3.5 ${AI_RISK_TEXT_STYLES[aiData.risk_level]}`} />
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${AI_RISK_TEXT_STYLES[aiData.risk_level]}`}>
                                                    Priority Action
                                                </span>
                                            </div>
                                            <p className={`text-xs font-medium leading-relaxed ${AI_RISK_TEXT_STYLES[aiData.risk_level]}`}>
                                                {aiData.priority_action}
                                            </p>
                                        </div>

                                        {/* Forecast Outlook */}
                                        <div className="rounded-xl border border-sky-200/60 bg-sky-50/50 p-3.5 dark:border-sky-800/40 dark:bg-sky-950/20">
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <TrendingUp className="size-3.5 text-sky-600 dark:text-sky-400" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                                                    24-48h Forecast Outlook
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium leading-relaxed text-sky-700 dark:text-sky-300">
                                                {aiData.forecast_outlook}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 dark:text-neutral-600">
                                            <ChevronRight className="size-3" />
                                            AI-generated analysis. Always verify with on-ground information and PAGASA advisories.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Barangay list */}
                        <div className="flex items-center gap-2 pt-2">
                            <Mountain className="size-4 text-sky-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest dark:text-neutral-400">All Barangays</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {barangay_data.barangays.map((brgy) => {
                                const isExpanded = expandedBrgy === brgy.name;
                                const rc = RISK_COLORS[brgy.flood_risk.level];
                                return (
                                    <div key={brgy.name} className={`${CARD} overflow-hidden transition-all`} style={{ borderLeftWidth: 4, borderLeftColor: brgy.flood_risk.level === 'critical' ? '#ef4444' : brgy.flood_risk.level === 'high' ? '#f97316' : brgy.flood_risk.level === 'moderate' ? '#f59e0b' : '#10b981' }}>
                                        <button onClick={() => setExpandedBrgy(isExpanded ? null : brgy.name)} className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-neutral-50/50 transition-colors dark:hover:bg-neutral-800/30 cursor-pointer">
                                            {/* Risk dot */}
                                            <div className={`size-2.5 shrink-0 rounded-full ${rc.dot}`} />

                                            {/* Name + tags */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{brgy.name}</span>
                                                    {brgy.flood_prone && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">Flood-prone</span>}
                                                    {brgy.coastal && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">Coastal</span>}
                                                    {brgy.near_river && <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">River</span>}
                                                </div>
                                                <p className="text-[10px] text-neutral-400 mt-0.5">{brgy.weather.description} · {brgy.elevation_m}m elevation</p>
                                            </div>

                                            {/* Weather snapshot */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                    <img src={iconUrl(brgy.weather.icon)} alt="" className="size-8 opacity-80" />
                                                    <span className="text-lg font-bold text-neutral-900 tabular-nums dark:text-white">{brgy.weather.temperature}°</span>
                                                </div>

                                                {/* Risk score */}
                                                <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl ${rc.bg}`}>
                                                    <span className={`text-lg font-extrabold tabular-nums leading-none ${rc.text}`}>{brgy.flood_risk.score}</span>
                                                    <span className={`text-[7px] font-bold uppercase tracking-wider ${rc.text}`}>{brgy.flood_risk.level}</span>
                                                </div>

                                                {isExpanded ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
                                            </div>
                                        </button>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0 border-t border-neutral-100 dark:border-neutral-800">
                                                {/* Conditions grid */}
                                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-3 mb-2">Current Conditions</p>
                                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                    {[
                                                        { icon: <Thermometer className="size-3.5 text-rose-500" />, val: `${brgy.weather.temperature}°C`, label: 'Temp' },
                                                        { icon: <Droplets className="size-3.5 text-blue-500" />, val: `${brgy.weather.humidity}%`, label: 'Humidity' },
                                                        { icon: <Wind className="size-3.5 text-cyan-500" />, val: `${brgy.weather.wind_speed} km/h`, label: 'Wind' },
                                                        { icon: <CloudRain className={`size-3.5 ${brgy.weather.rain_1h >= 2.5 ? 'text-orange-500' : 'text-indigo-500'}`} />, val: `${brgy.weather.rain_1h} mm/h`, label: 'Rain' },
                                                        { icon: <Eye className="size-3.5 text-emerald-500" />, val: `${brgy.weather.clouds}%`, label: 'Clouds' },
                                                        { icon: <Gauge className="size-3.5 text-violet-500" />, val: `${brgy.weather.pressure} hPa`, label: 'Pressure' },
                                                    ].map((m) => (
                                                        <div key={m.label} className={CARD_INNER + ' flex flex-col items-center py-2.5 gap-0.5'}>
                                                            {m.icon}
                                                            <span className="text-xs font-bold text-neutral-900 tabular-nums dark:text-white">{m.val}</span>
                                                            <span className="text-[8px] text-neutral-400 uppercase tracking-wider">{m.label}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Forecast */}
                                                {brgy.forecast.length > 0 && (
                                                    <>
                                                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-4 mb-2">3-Day Forecast</p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {brgy.forecast.map((day, idx) => (
                                                                <div key={idx} className={CARD_INNER + ' flex flex-col items-center py-3 gap-1'}>
                                                                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">{day.day}</span>
                                                                    <img src={iconUrl(day.icon)} alt="" className="size-8 opacity-80" />
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

                                                {/* Risk bar */}
                                                <div className="mt-4">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Flood Risk Score</span>
                                                        <span className={`text-xs font-bold ${rc.text}`}>{brgy.flood_risk.score}/100 — {brgy.flood_risk.level}</span>
                                                    </div>
                                                    <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden dark:bg-neutral-800">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${RISK_BAR_COLORS[brgy.flood_risk.level]}`} style={{ width: `${brgy.flood_risk.score}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Barangay data timestamp */}
                        <p className="text-[10px] text-neutral-400 text-center">
                            Barangay data generated {new Date(barangay_data.generated_at).toLocaleString('en-PH')}
                        </p>
                    </>
                )}

                {/* Footer */}
                <p className="text-[10px] text-neutral-400 text-center py-2">
                    Updated {new Date(current.dt * 1000).toLocaleString('en-PH')} · OpenWeatherMap
                </p>
            </div>
        </AppLayout>
    );
}

/* ─── Metric Card ─── */

function MetricCard({ icon, iconBg, title, metrics, chart }: {
    icon: React.ReactNode; iconBg: string; title: string;
    metrics: { value: number; unit: string; label: string }[]; chart: React.ReactNode;
}) {
    return (
        <div className={CARD + ' p-5 group transition-shadow hover:shadow-md'}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`flex size-8 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest dark:text-neutral-400">{title}</span>
            </div>
            <div className={`flex items-baseline ${metrics.length > 1 ? 'justify-between' : ''} mb-3`}>
                {metrics.map((m) => (
                    <div key={m.label}>
                        <span className="text-2xl font-bold text-neutral-900 tabular-nums tracking-tight dark:text-white">{m.value}</span>
                        <span className="text-[10px] text-neutral-400 ml-1">{m.unit}</span>
                        <p className="text-[9px] text-neutral-400 mt-0.5 uppercase tracking-wider">{m.label}</p>
                    </div>
                ))}
            </div>
            {chart}
        </div>
    );
}

/* ─── Detail Tile ─── */

function DetailTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
    return (
        <div className={CARD + ' flex items-center gap-4 px-5 py-4 group transition-shadow hover:shadow-md'}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-200/60 group-hover:border-neutral-300/60 transition-all dark:bg-neutral-800 dark:border-neutral-700/60">
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{label}</p>
                <p className="text-lg font-bold text-neutral-900 tracking-tight dark:text-white">{value}</p>
                <p className="text-[10px] text-neutral-400">{sub}</p>
            </div>
        </div>
    );
}
