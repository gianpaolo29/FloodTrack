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
interface Props {
    current: CurrentWeather; daily_forecast: DailyItem[]; hourly_forecast: HourlyItem[];
    alerts: WeatherAlert[]; coordinates: { lat: number; lon: number };
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

const tooltipStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px',
    fontSize: '11px', color: '#525252', padding: '8px 12px', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)',
};
const tooltipStyleDark: React.CSSProperties = {
    background: '#171717', border: '1px solid #404040', borderRadius: '10px',
    fontSize: '11px', color: '#d4d4d4', padding: '8px 12px', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.4)',
};

/* ─── Main ─── */

export default function AdminWeather({ current, daily_forecast, hourly_forecast, alerts, coordinates }: Props) {
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

            <div className="space-y-4 p-4 sm:p-5">

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
                    <div className="overflow-x-auto">
                        <div className="flex min-w-max">
                            {hourly_forecast.map((h, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 px-4 py-3 min-w-[72px] border-r border-neutral-100/60 last:border-r-0 hover:bg-neutral-50/50 transition-colors cursor-default dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
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
