import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    CloudRain,
    Droplets,
    Eye,
    Gauge,
    Sunrise,
    Sunset,
    Thermometer,
    Wind,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';

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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Weather', href: '/admin/weather' },
];

function weatherIconUrl(icon: string) {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function windDirection(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function formatTime(ts: number | null): string {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminWeather({
    current,
    daily_forecast,
    hourly_forecast,
    alerts,
    coordinates,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Weather — FloodTrack Admin" />

            <div className="flex flex-col gap-8 p-6 lg:p-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Weather Monitor</h1>
                    <p className="text-sm text-muted-foreground">
                        Real-time weather data for {current.city}{current.country ? `, ${current.country}` : ''}
                    </p>
                </div>

                {/* Severe weather alerts */}
                {alerts.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {alerts.map((alert, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-4 rounded-xl border-l-4 p-4 ${
                                    alert.type === 'critical'
                                        ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
                                        : 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                }`}
                            >
                                <span className="text-2xl shrink-0">{alert.icon}</span>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-sm font-bold ${
                                            alert.type === 'critical' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
                                        }`}>
                                            {alert.title}
                                        </h3>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            alert.type === 'critical'
                                                ? 'bg-red-100 text-red-700 ring-1 ring-red-600/10'
                                                : 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/10'
                                        }`}>
                                            {alert.type}
                                        </span>
                                    </div>
                                    <p className={`mt-0.5 text-sm ${
                                        alert.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                                    }`}>
                                        {alert.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Current weather hero */}
                <Card className="overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
                    <CardContent className="p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <img
                                    src={weatherIconUrl(current.icon)}
                                    alt={current.description}
                                    className="size-24 drop-shadow-lg"
                                />
                                <div>
                                    <p className="text-6xl font-bold tracking-tighter tabular-nums">
                                        {current.temperature}°
                                    </p>
                                    <p className="mt-1 text-lg font-medium text-white/80">
                                        {current.description}
                                    </p>
                                    <p className="text-sm text-white/60">
                                        Feels like {current.feels_like}°C
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                                <div className="flex items-center gap-2 text-white/80">
                                    <Thermometer className="size-4" />
                                    <span>H: {current.temp_max}° L: {current.temp_min}°</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/80">
                                    <Droplets className="size-4" />
                                    <span>Humidity: {current.humidity}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/80">
                                    <Wind className="size-4" />
                                    <span>{current.wind_speed} km/h {windDirection(current.wind_deg)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/80">
                                    <CloudRain className="size-4" />
                                    <span>Rain: {current.rain_1h} mm/h</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/80">
                                    <Sunrise className="size-4" />
                                    <span>Sunrise: {formatTime(current.sunrise)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/80">
                                    <Sunset className="size-4" />
                                    <span>Sunset: {formatTime(current.sunset)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Weather detail cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <WeatherMetric
                        icon={Thermometer}
                        iconBg="bg-rose-500/10"
                        iconColor="text-rose-600"
                        label="Temperature"
                        value={`${current.temperature}°C`}
                        detail={`Feels like ${current.feels_like}°C`}
                    />
                    <WeatherMetric
                        icon={CloudRain}
                        iconBg="bg-blue-500/10"
                        iconColor="text-blue-600"
                        label="Rainfall"
                        value={`${current.rain_1h} mm/h`}
                        detail={`${current.rain_3h} mm in last 3h`}
                    />
                    <WeatherMetric
                        icon={Wind}
                        iconBg="bg-cyan-500/10"
                        iconColor="text-cyan-600"
                        label="Wind Speed"
                        value={`${current.wind_speed} km/h`}
                        detail={`Gusts up to ${current.wind_gust} km/h`}
                    />
                    <WeatherMetric
                        icon={Droplets}
                        iconBg="bg-indigo-500/10"
                        iconColor="text-indigo-600"
                        label="Humidity"
                        value={`${current.humidity}%`}
                        detail={`Cloud cover: ${current.clouds}%`}
                    />
                </div>

                {/* Additional metrics */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <WeatherMetric
                        icon={Gauge}
                        iconBg="bg-violet-500/10"
                        iconColor="text-violet-600"
                        label="Pressure"
                        value={`${current.pressure} hPa`}
                        detail="Atmospheric pressure"
                    />
                    <WeatherMetric
                        icon={Eye}
                        iconBg="bg-emerald-500/10"
                        iconColor="text-emerald-600"
                        label="Visibility"
                        value={`${current.visibility} km`}
                        detail={current.visibility < 5 ? 'Reduced visibility' : 'Good visibility'}
                    />
                    <WeatherMetric
                        icon={Wind}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-600"
                        label="Wind Direction"
                        value={`${windDirection(current.wind_deg)} (${current.wind_deg}°)`}
                        detail={`Gusts: ${current.wind_gust} km/h`}
                    />
                </div>

                {/* Hourly forecast */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                            Hourly Forecast (next 36h)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <div className="flex min-w-max gap-0 divide-x divide-border/50">
                                {hourly_forecast.map((h, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1.5 px-5 py-4 min-w-[80px]">
                                        <p className="text-[10px] font-medium text-muted-foreground">
                                            {new Date(h.dt * 1000).toLocaleTimeString('en-PH', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                        <img
                                            src={weatherIconUrl(h.icon)}
                                            alt={h.description}
                                            className="size-8"
                                        />
                                        <p className="text-sm font-bold tabular-nums">{h.temperature}°</p>
                                        <div className="flex items-center gap-1 text-[10px] text-blue-600">
                                            <Droplets className="size-2.5" />
                                            <span>{h.pop}%</span>
                                        </div>
                                        {h.rain_3h > 0 && (
                                            <p className="text-[10px] text-muted-foreground">
                                                {h.rain_3h}mm
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Wind className="size-2.5" />
                                            <span>{h.wind_speed}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 5-day forecast */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                            5-Day Forecast
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {daily_forecast.map((d, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
                                >
                                    {/* Day */}
                                    <div className="w-16 shrink-0">
                                        <p className="text-sm font-bold">{i === 0 ? 'Today' : d.day}</p>
                                        <p className="text-[10px] text-muted-foreground">{d.date.slice(5)}</p>
                                    </div>

                                    {/* Icon & description */}
                                    <div className="flex items-center gap-2 w-40 shrink-0">
                                        <img
                                            src={weatherIconUrl(d.icon)}
                                            alt={d.description}
                                            className="size-10"
                                        />
                                        <span className="text-xs text-muted-foreground truncate">
                                            {d.description}
                                        </span>
                                    </div>

                                    {/* Temp range bar */}
                                    <div className="flex-1 flex items-center gap-3">
                                        <span className="text-xs font-medium text-blue-600 tabular-nums w-8 text-right">
                                            {d.temp_min}°
                                        </span>
                                        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-red-400 opacity-60" />
                                        <span className="text-xs font-medium text-rose-600 tabular-nums w-8">
                                            {d.temp_max}°
                                        </span>
                                    </div>

                                    {/* Rain */}
                                    <div className="flex items-center gap-1.5 w-20 shrink-0 justify-end">
                                        <CloudRain className="size-3.5 text-blue-500" />
                                        <span className="text-xs font-medium tabular-nums">
                                            {d.rain_total}mm
                                        </span>
                                    </div>

                                    {/* Wind */}
                                    <div className="flex items-center gap-1.5 w-24 shrink-0 justify-end">
                                        <Wind className="size-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium tabular-nums">
                                            {d.wind_max} km/h
                                        </span>
                                    </div>

                                    {/* Precipitation probability */}
                                    <div className="flex items-center gap-1.5 w-14 shrink-0 justify-end">
                                        <Droplets className="size-3.5 text-indigo-500" />
                                        <span className="text-xs font-medium tabular-nums">
                                            {d.pop}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {daily_forecast.length === 0 && (
                                <div className="flex flex-col items-center gap-2 py-16">
                                    <CloudRain className="size-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">Forecast data unavailable</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* No alerts message */}
                {alerts.length === 0 && (
                    <Card className="overflow-hidden border-l-4 border-l-emerald-500">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                                <AlertTriangle className="size-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">No Severe Weather Alerts</p>
                                <p className="text-xs text-muted-foreground">
                                    Current conditions are within normal parameters. System is monitoring for changes.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Last updated */}
                <p className="text-xs text-muted-foreground text-center">
                    Last updated: {new Date(current.dt * 1000).toLocaleString('en-PH')} · Data from OpenWeatherMap
                </p>
            </div>
        </AppLayout>
    );
}

function WeatherMetric({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    value,
    detail,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon className={`size-5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{detail}</p>
                </div>
            </CardContent>
        </Card>
    );
}
