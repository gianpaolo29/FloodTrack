import { Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle, MapPin, Siren, Zap } from 'lucide-react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const SEVERITY = [
    { label: 'Low',      color: '#2E9E5B', icon: <CheckCircle  className="size-3.5" /> },
    { label: 'Moderate', color: '#F4B400', icon: <AlertTriangle className="size-3.5" /> },
    { label: 'High',     color: '#EA6A0C', icon: <AlertTriangle className="size-3.5" /> },
    { label: 'Critical', color: '#D32F2F', icon: <Siren         className="size-3.5" /> },
];

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh bg-white">

            {/* ── Left branding panel (hidden on mobile) ─────────────────── */}
            <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0B2F52] via-[#124577] to-[#1F6FBF] p-10 text-white lg:flex">

                {/* Dot grid background */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />

                {/* Logo */}
                <Link href={home()} className="relative flex items-center gap-2.5 w-fit">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                        <Siren className="size-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">FloodTrack</span>
                </Link>

                {/* Center content */}
                <div className="relative space-y-8">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-blue-100 ring-1 ring-white/10">
                            <MapPin className="size-3" />
                            Nasugbu, Batangas · MDRRMO
                        </div>
                        <h2 className="text-3xl font-bold leading-snug">
                            Community flood &<br />hazard reporting
                        </h2>
                        <p className="mt-3 text-base text-blue-100 leading-relaxed">
                            Report hazards from the field. Track status in real time.
                            Keep your community safe.
                        </p>
                    </div>

                    {/* Severity chips */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-blue-300">
                            Severity system
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {SEVERITY.map((s) => (
                                <div
                                    key={s.label}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                                    style={{ backgroundColor: s.color + '28', color: s.color }}
                                >
                                    {s.icon}
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2.5">
                        {[
                            'GPS-pinned reports with photo evidence',
                            'Real-time map & density heatmap',
                            'Instant MDRRMO dispatch',
                            'Live status updates to reporter',
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2.5 text-sm text-blue-100">
                                <Zap className="size-3.5 shrink-0 text-[#0FA896]" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bottom tagline */}
                <p className="relative text-xs text-blue-300">
                    © {new Date().getFullYear()} FloodTrack · MDRRMO Nasugbu, Batangas
                </p>
            </div>

            {/* ── Right form panel ───────────────────────────────────────── */}
            <div className="flex flex-1 flex-col">

                {/* Mobile top bar */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 lg:hidden">
                    <Link href={home()} className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-[#1F6FBF]">
                            <Siren className="size-4 text-white" />
                        </div>
                        <span className="font-bold text-[#0B2F52]">FloodTrack</span>
                    </Link>
                </div>

                {/* Form area */}
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">

                        {/* Desktop logo above form */}
                        <div className="mb-8 hidden lg:block">
                            <Link href={home()} className="inline-flex items-center gap-2 text-[#0B2F52]">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#1F6FBF]">
                                    <Siren className="size-4 text-white" />
                                </div>
                                <span className="font-bold">FloodTrack</span>
                            </Link>
                        </div>

                        {/* Title */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                            {description && (
                                <p className="mt-1.5 text-sm text-slate-500">{description}</p>
                            )}
                        </div>

                        {/* Form content */}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
