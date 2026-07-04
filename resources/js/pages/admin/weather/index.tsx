import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertTriangle,
    CloudRain,
    Compass,
    Crosshair,
    Droplets,
    Eye,
    Gauge,
    Loader2,
    MapPin,
    Search,
    Sunrise,
    Sunset,
    Thermometer,
    Wind,
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
    temperature: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust: number;
    visibility: number;
    clouds: number;
    rain_1h: number;
    rain_3h: number;
    description: string;
    icon: string;
    main: string;
    city: string;
    country: string;
    sunrise: number | null;
    sunset: number | null;
    dt: number;
}

interface HourlyItem {
    dt: number;
    date: string;
    temperature: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_gust: number;
    rain_3h: number;
    description: string;
    icon: string;
    main: string;
    pop: number;
}

interface DailyItem {
    date: string;
    day: string;
    temp_min: number;
    temp_max: number;
    rain_total: number;
    wind_max: number;
    pop: number;
    description: string;
    icon: string;
    main: string;
}

interface WeatherAlert {
    type: 'critical' | 'warning';
    title: string;
    message: string;
    icon: string;
}

interface Props {
    current: CurrentWeather;
    daily_forecast: DailyItem[];
    hourly_forecast: HourlyItem[];
    alerts: WeatherAlert[];
    coordinates: { lat: number; lon: number };
}

/* ─── Helpers ─── */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Weather', href: '/admin/weather' },
];

const iconUrl = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

const windDir = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

const fmtTime = (ts: number | null) =>
    ts ? new Date(ts * 1000).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtHour = (dt: number) =>
    new Date(dt * 1000).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

/* ─── Shared styles ─── */

const GLASS = 'rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_40px_-12px_rgba(0,0,0,0.4)]';
const GLASS_INNER = 'rounded-xl border border-white/[0.06] bg-white/[0.03]';

const tooltipStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#e2e8f0',
    padding: '8px 12px',
    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5)',
};

/* ─── Main Component ─── */

export default function AdminWeather({
    current,
    daily_forecast,
    hourly_forecast,
    alerts,
    coordinates,
}: Props) {
    const chartData = hourly_forecast.map((h) => ({
        time: fmtHour(h.dt),
        temp: h.temperature,
        humidity: h.humidity,
        pressure: h.pressure,
        wind: h.wind_speed,
        gust: h.wind_gust,
        rain: h.rain_3h,
    }));

    // Daylight progress
    const now = current.dt;
    const sunrise = current.sunrise ?? now;
    const sunset = current.sunset ?? now;
    const dayProgress = Math.max(0, Math.min(1, (now - sunrise) / (sunset - sunrise)));
    const isDaytime = now >= sunrise && now <= sunset;

    // ─── Google Places Autocomplete ───
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '',
        libraries: GMAP_LIBRARIES,
    });

    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);

    const navigateToCoords = useCallback((lat: number, lon: number) => {
        router.get('/admin/weather', { lat, lon }, { preserveState: false });
    }, []);

    // Auto-detect browser location on first visit (no explicit lat/lon in URL)
    const hasAutoDetected = useRef(false);
    useEffect(() => {
        if (hasAutoDetected.current) return;
        hasAutoDetected.current = true;

        const params = new URLSearchParams(window.location.search);
        if (params.has('lat') && params.has('lon')) return; // already has coords

        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => navigateToCoords(pos.coords.latitude, pos.coords.longitude),
            () => {}, // denied or error — keep server-side default
            { enableHighAccuracy: true, timeout: 8000 },
        );
    }, [navigateToCoords]);

    const onPlaceChanged = useCallback(() => {
        const place = autocompleteRef.current?.getPlace();
        const loc = place?.geometry?.location;
        if (loc) {
            navigateToCoords(loc.lat(), loc.lng());
        }
    }, [navigateToCoords]);

    const onAutocompleteMounted = useCallback((ac: google.maps.places.Autocomplete) => {
        autocompleteRef.current = ac;
    }, []);

    const useMyLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGeoLoading(false);
                navigateToCoords(pos.coords.latitude, pos.coords.longitude);
            },
            () => setGeoLoading(false),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, [navigateToCoords]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Weather — FloodTrack Admin" />

            <div className="min-h-screen bg-[#0a0e1a] text-white">
                <div className="flex flex-col gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto">

                    {/* ─── Location Search Bar ─── */}
                    <div className="flex items-center gap-3">
                        <div className={GLASS + ' flex-1 flex items-center gap-3 px-4 py-2.5'}>
                            <Search className="size-4 text-white/25 shrink-0" />
                            {isLoaded ? (
                                <Autocomplete
                                    onLoad={onAutocompleteMounted}
                                    onPlaceChanged={onPlaceChanged}
                                    options={{ types: ['(cities)'] }}
                                    className="flex-1"
                                >
                                    <input
                                        type="text"
                                        placeholder="Search city or location..."
                                        className="w-full bg-transparent text-sm text-white placeholder-white/20 outline-none"
                                    />
                                </Autocomplete>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Loading..."
                                    disabled
                                    className="w-full bg-transparent text-sm text-white/30 outline-none"
                                />
                            )}
                            <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-white/20">
                                <MapPin className="size-3" />
                                <span className="tabular-nums">{coordinates.lat.toFixed(2)}, {coordinates.lon.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={useMyLocation}
                            disabled={geoLoading}
                            className={GLASS + ' flex items-center gap-2 px-4 py-2.5 text-sm text-white/60 hover:text-white/90 hover:border-white/[0.15] transition-all cursor-pointer disabled:opacity-50'}
                        >
                            {geoLoading
                                ? <Loader2 className="size-4 animate-spin" />
                                : <Crosshair className="size-4" />
                            }
                            <span className="hidden sm:inline text-xs font-medium">My Location</span>
                        </button>
                    </div>

                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {alerts.map((a, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm backdrop-blur-md ${
                                        a.type === 'critical'
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                                    }`}
                                >
                                    <span className="text-lg">{a.icon}</span>
                                    <span className="font-semibold">{a.title}</span>
                                    <span className="text-xs opacity-70 hidden sm:inline">{a.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── Top Grid: Hero + Map ─── */}
                    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">

                        {/* Left column */}
                        <div className="flex flex-col gap-4">

                            {/* Hero card */}
                            <div className={GLASS + ' overflow-hidden relative'}>
                                {/* Ambient glow */}
                                <div className="absolute -top-20 -right-20 size-40 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

                                <div className="relative p-6">
                                    {/* Location + time */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-lg font-semibold tracking-tight">
                                                {current.city}
                                                {current.country ? <span className="text-white/40 font-normal ml-1.5 text-sm">{current.country}</span> : ''}
                                            </h2>
                                            <p className="text-[11px] text-white/30 mt-0.5">
                                                {new Date(current.dt * 1000).toLocaleDateString('en-PH', {
                                                    weekday: 'long', month: 'long', day: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right text-[11px] text-white/30">
                                            <p>{isDaytime ? 'Daytime' : 'Nighttime'}</p>
                                        </div>
                                    </div>

                                    {/* Current temp + icon */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-6xl font-extralight tracking-tighter tabular-nums leading-none">
                                                {current.temperature}
                                                <span className="text-2xl text-white/30 font-light">°C</span>
                                            </p>
                                            <p className="text-sm text-white/50 mt-2 capitalize">{current.description}</p>
                                            <p className="text-xs text-white/25 mt-0.5">
                                                Feels like {current.feels_like}°C · H:{current.temp_max}° L:{current.temp_min}°
                                            </p>
                                        </div>
                                        <img
                                            src={iconUrl(current.icon)}
                                            alt={current.description}
                                            className="size-24 opacity-90 drop-shadow-[0_0_20px_rgba(100,160,255,0.3)]"
                                        />
                                    </div>

                                    {/* Sunrise / Sunset bar */}
                                    <div className="mt-5 pt-4 border-t border-white/[0.06]">
                                        <div className="flex items-center justify-between text-[10px] text-white/30 mb-2">
                                            <span className="flex items-center gap-1"><Sunrise className="size-3" />{fmtTime(current.sunrise)}</span>
                                            <span className="flex items-center gap-1">{fmtTime(current.sunset)}<Sunset className="size-3" /></span>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-amber-400/60 via-yellow-300/80 to-orange-400/60 transition-all duration-1000"
                                                style={{ width: `${dayProgress * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* 5-day forecast */}
                                    <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-5 gap-1">
                                        {daily_forecast.slice(0, 5).map((d, i) => (
                                            <div key={i} className="flex flex-col items-center gap-0.5 group cursor-default">
                                                <span className="text-[10px] font-medium text-white/30 group-hover:text-white/60 transition-colors">
                                                    {i === 0 ? 'Now' : d.day}
                                                </span>
                                                <img src={iconUrl(d.icon)} alt={d.description} className="size-8 opacity-70 group-hover:opacity-100 transition-opacity" />
                                                <span className="text-xs font-medium text-white/80 tabular-nums">{d.temp_max}°</span>
                                                <span className="text-[10px] text-white/25 tabular-nums">{d.temp_min}°</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Temperature chart card */}
                            <div className={GLASS + ' flex-1 p-5'}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10">
                                            <Thermometer className="size-3.5 text-rose-400" />
                                        </div>
                                        <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Temperature</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    {[
                                        { val: current.temperature, unit: '°C', label: 'Current', color: 'text-rose-400' },
                                        { val: current.feels_like, unit: '°C', label: 'Feels Like', color: 'text-orange-400' },
                                        { val: current.humidity, unit: '%', label: 'Humidity', color: 'text-cyan-400' },
                                    ].map((m) => (
                                        <div key={m.label} className={GLASS_INNER + ' px-3 py-2.5 text-center'}>
                                            <p className={`text-xl font-semibold tabular-nums ${m.color}`}>
                                                {m.val}<span className="text-[10px] text-white/25 ml-0.5">{m.unit}</span>
                                            </p>
                                            <p className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">{m.label}</p>
                                        </div>
                                    ))}
                                </div>

                                <ResponsiveContainer width="100%" height={130}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                        <Area type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={2} fill="url(#gTemp)" name="Temp °C" dot={false} activeDot={{ r: 4, fill: '#f43f5e', stroke: '#0a0e1a', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Weather Map */}
                        <div className={GLASS + ' overflow-hidden min-h-[520px]'}>
                            <iframe
                                src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=7&overlay=rain&product=ecmwf&level=surface&lat=${coordinates.lat}&lon=${coordinates.lon}&detailLat=${coordinates.lat}&detailLon=${coordinates.lon}&marker=true`}
                                className="w-full h-full min-h-[520px] border-0 rounded-2xl"
                                loading="lazy"
                                title="Weather Map"
                            />
                        </div>
                    </div>

                    {/* ─── Hourly Forecast Strip ─── */}
                    <div className={GLASS + ' overflow-hidden'}>
                        <div className="px-5 py-3 border-b border-white/[0.04]">
                            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Hourly Forecast</span>
                        </div>
                        <div className="overflow-x-auto scrollbar-none">
                            <div className="flex min-w-max">
                                {hourly_forecast.map((h, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 px-4 py-3 min-w-[72px] border-r border-white/[0.03] last:border-r-0 hover:bg-white/[0.03] transition-colors cursor-default">
                                        <span className="text-[9px] text-white/25 font-medium">{fmtHour(h.dt)}</span>
                                        <img src={iconUrl(h.icon)} alt={h.description} className="size-7 opacity-70" />
                                        <span className="text-xs font-semibold text-white/80 tabular-nums">{h.temperature}°</span>
                                        <div className="flex items-center gap-0.5 text-[9px] text-blue-400/60">
                                            <Droplets className="size-2" />
                                            <span>{h.pop}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─── Metric Cards Grid ─── */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricChartCard
                            icon={<Wind className="size-3.5 text-cyan-400" />}
                            iconBg="bg-cyan-500/10"
                            title="Wind"
                            metrics={[
                                { value: current.wind_speed, unit: 'km/h', label: `Speed · ${windDir(current.wind_deg)}` },
                                { value: current.wind_gust, unit: 'km/h', label: 'Gust' },
                            ]}
                            chart={
                                <ResponsiveContainer width="100%" height={110}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                        <Line type="monotone" dataKey="wind" stroke="#22d3ee" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#22d3ee', stroke: '#0a0e1a', strokeWidth: 2 }} name="Wind" />
                                        <Line type="monotone" dataKey="gust" stroke="#818cf8" strokeWidth={1} strokeDasharray="4 3" dot={false} name="Gust" />
                                    </LineChart>
                                </ResponsiveContainer>
                            }
                        />

                        <MetricChartCard
                            icon={<Gauge className="size-3.5 text-violet-400" />}
                            iconBg="bg-violet-500/10"
                            title="Pressure"
                            metrics={[
                                { value: current.pressure, unit: 'hPa', label: 'Atmospheric' },
                            ]}
                            chart={
                                <ResponsiveContainer width="100%" height={110}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gPressure" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                        <Area type="monotone" dataKey="pressure" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gPressure)" name="hPa" dot={false} activeDot={{ r: 3, fill: '#a78bfa', stroke: '#0a0e1a', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            }
                        />

                        <MetricChartCard
                            icon={<Droplets className="size-3.5 text-blue-400" />}
                            iconBg="bg-blue-500/10"
                            title="Humidity"
                            metrics={[
                                { value: current.humidity, unit: '%', label: 'Relative' },
                            ]}
                            chart={
                                <ResponsiveContainer width="100%" height={110}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gHumidity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                        <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gHumidity)" name="%" dot={false} activeDot={{ r: 3, fill: '#3b82f6', stroke: '#0a0e1a', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            }
                        />

                        <MetricChartCard
                            icon={<CloudRain className="size-3.5 text-indigo-400" />}
                            iconBg="bg-indigo-500/10"
                            title="Rain"
                            metrics={[
                                { value: current.rain_1h, unit: 'mm/h', label: 'Rate' },
                                { value: current.rain_3h, unit: 'mm', label: '3h Total' },
                            ]}
                            chart={
                                <ResponsiveContainer width="100%" height={110}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gRain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Bar dataKey="rain" fill="url(#gRain)" radius={[3, 3, 0, 0]} name="Rain mm" />
                                    </BarChart>
                                </ResponsiveContainer>
                            }
                        />
                    </div>

                    {/* ─── Extra Detail Row ─── */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailTile icon={<Eye className="size-4 text-emerald-400" />} label="Visibility" value={`${current.visibility} km`} sub={current.visibility < 5 ? 'Reduced' : 'Clear'} />
                        <DetailTile icon={<Compass className="size-4 text-amber-400" />} label="Wind Direction" value={`${windDir(current.wind_deg)}`} sub={`${current.wind_deg}°`} />
                        <DetailTile
                            icon={<Sunrise className="size-4 text-yellow-400" />}
                            label="Sunrise"
                            value={fmtTime(current.sunrise)}
                            sub="Morning"
                        />
                        <DetailTile
                            icon={<Sunset className="size-4 text-orange-400" />}
                            label="Sunset"
                            value={fmtTime(current.sunset)}
                            sub="Evening"
                        />
                    </div>

                    {/* No alerts */}
                    {alerts.length === 0 && (
                        <div className={GLASS + ' flex items-center gap-3 px-5 py-3.5'}>
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
                                <AlertTriangle className="size-3.5 text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-emerald-400/80">No Severe Weather Alerts</span>
                            <span className="text-xs text-white/20">— All conditions normal</span>
                        </div>
                    )}

                    {/* Footer */}
                    <p className="text-[10px] text-white/15 text-center py-2">
                        Updated {new Date(current.dt * 1000).toLocaleString('en-PH')} · OpenWeatherMap
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── Metric Card with Chart ─── */

function MetricChartCard({
    icon,
    iconBg,
    title,
    metrics,
    chart,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    metrics: { value: number; unit: string; label: string }[];
    chart: React.ReactNode;
}) {
    return (
        <div className={GLASS + ' p-5 group hover:border-white/[0.12] transition-colors'}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className={`flex size-7 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">{title}</span>
            </div>

            {/* Values */}
            <div className={`flex items-baseline ${metrics.length > 1 ? 'justify-between' : ''} mb-3`}>
                {metrics.map((m) => (
                    <div key={m.label}>
                        <span className="text-2xl font-semibold text-white tabular-nums tracking-tight">{m.value}</span>
                        <span className="text-[10px] text-white/25 ml-1">{m.unit}</span>
                        <p className="text-[9px] text-white/20 mt-0.5 uppercase tracking-wider">{m.label}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {chart}
        </div>
    );
}

/* ─── Detail Tile ─── */

function DetailTile({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <div className={GLASS + ' flex items-center gap-4 px-5 py-4 group hover:border-white/[0.12] transition-colors'}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] group-hover:ring-white/[0.1] transition-all">
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest">{label}</p>
                <p className="text-lg font-semibold text-white tracking-tight">{value}</p>
                <p className="text-[10px] text-white/20">{sub}</p>
            </div>
        </div>
    );
}
