import { Link } from '@inertiajs/react';
import {
    Globe,
    MapPin,
    Sparkles,
    Zap,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return <SplitAuthLayout title={title} description={description}>{children}</SplitAuthLayout>;
}

/* ─── Split Auth Layout ───────────────────────────────────── */

function SplitAuthLayout({ children, title, description }: AuthLayoutProps) {
    const [mounted, setMounted] = useState(false);
    const [textIndex, setTextIndex] = useState(0);

    const rotatingTexts = [
        { heading: 'Report hazards in real time.', sub: 'Pin dangers on the map so your neighbors stay safe.' },
        { heading: 'Track floods as they happen.', sub: 'Live updates from sensors and community reports.' },
        { heading: 'Connect with MDRRMO instantly.', sub: 'One tap to alert responders when every second counts.' },
        { heading: 'Build a safer community.', sub: 'Your reports help protect the people around you.' },
    ];

    useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);
    useEffect(() => {
        const interval = setInterval(() => setTextIndex((i) => (i + 1) % rotatingTexts.length), 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`relative h-svh bg-neutral-50 dark:bg-neutral-950 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="grid h-svh grid-cols-1 lg:grid-cols-2">

                {/* ── LEFT — Branded Panel (hidden on mobile) ── */}
                <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">

                    {/* Background image */}
                    <div className="absolute inset-0">
                        <img
                            src="/images/auth-bg.jpg"
                            alt=""
                            className="size-full object-cover overlay-img"
                        />
                    </div>

                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

                    {/* Accent gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-blue-900/20 to-indigo-900/30" />

                    {/* Grain texture */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    }} />

                    {/* Content */}
                    <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">

                        {/* Logo */}
                        <div>
                            <Link href={home()} className="group inline-flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-[14px] bg-white/10 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-white/15">
                                    <AppLogoIcon className="size-5 fill-current text-white" />
                                </div>
                                <span className="text-lg font-bold tracking-tight text-white drop-shadow-sm">
                                    Flood<span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Track</span>
                                </span>
                            </Link>
                        </div>

                        {/* Center — rotating text */}
                        <div className="max-w-md">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[12px] font-semibold text-cyan-300 backdrop-blur-md">
                                <Sparkles className="size-3.5" />
                                Trusted by communities
                            </div>

                            {/* Rotating headlines */}
                            <div className="relative h-[160px]">
                                {rotatingTexts.map((item, i) => (
                                    <div
                                        key={i}
                                        className="absolute inset-0 transition-all duration-700"
                                        style={{
                                            opacity: textIndex === i ? 1 : 0,
                                            transform: textIndex === i ? 'translateY(0)' : 'translateY(20px)',
                                            transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
                                        }}
                                    >
                                        <h1 className="mb-4 text-[2.25rem] font-extrabold leading-[1.15] tracking-tight text-white drop-shadow-lg xl:text-[2.5rem]">
                                            {item.heading}
                                        </h1>
                                        <p className="text-[15px] leading-relaxed text-white/50 font-[350]">
                                            {item.sub}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Progress dots */}
                            <div className="mt-6 flex gap-2">
                                {rotatingTexts.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setTextIndex(i)}
                                        className={`h-1 rounded-full transition-all duration-500 ${textIndex === i ? 'w-8 bg-cyan-400' : 'w-2 bg-white/20 hover:bg-white/30'}`}
                                    />
                                ))}
                            </div>

                            {/* Features */}
                            <div className="mt-10 flex flex-col gap-3.5">
                                {[
                                    { icon: MapPin, label: 'GPS-pinned hazard reporting', color: 'text-cyan-400' },
                                    { icon: Globe, label: 'Real-time live incident map', color: 'text-blue-400' },
                                    { icon: Zap, label: 'Instant MDRRMO dispatch', color: 'text-indigo-400' },
                                ].map((f) => (
                                    <div key={f.label} className="flex items-center gap-3">
                                        <div className={`flex size-8 items-center justify-center rounded-xl bg-white/[0.06] backdrop-blur-sm ${f.color}`}>
                                            <f.icon className="size-4" />
                                        </div>
                                        <span className="text-sm text-white/50">{f.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom */}
                        <p className="text-[13px] text-white/20">&copy; {new Date().getFullYear()} FloodTrack</p>
                    </div>
                </div>

                {/* ── RIGHT — Form ── */}
                <div className="flex items-center justify-center overflow-y-auto bg-white p-6 sm:p-12 dark:bg-neutral-900">
                    <div className="w-full max-w-[420px]">

                        {/* Mobile header */}
                        <div className="mb-6 flex items-center justify-center lg:hidden">
                            <Link href={home()} className="inline-flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                                    <AppLogoIcon className="size-[18px] fill-current text-white" />
                                </div>
                                <span className="text-base font-bold text-neutral-900 dark:text-white">Flood<span className="text-blue-600 dark:text-cyan-400">Track</span></span>
                            </Link>
                        </div>

                        {/* Page content (login.tsx or register.tsx) */}
                        {children}
                    </div>
                </div>
            </div>

            {/* Mobile bottom features */}
            <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-neutral-100 bg-white/80 px-6 py-5 backdrop-blur-sm lg:hidden dark:border-neutral-800 dark:bg-neutral-900/80">
                <div className="flex items-center justify-center gap-6 text-[11px] text-neutral-400">
                    {[
                        { icon: MapPin, label: 'GPS Reports' },
                        { icon: Globe, label: 'Live Map' },
                        { icon: Zap, label: 'Instant Dispatch' },
                    ].map((f) => (
                        <div key={f.label} className="flex items-center gap-1.5">
                            <f.icon className="size-3 text-blue-500/50" />
                            {f.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Styles */}
            <style>{`
                .overlay-img {
                    animation: slowZoom 25s ease-in-out infinite alternate;
                }
                @keyframes slowZoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.08); }
                }
            `}</style>
        </div>
    );
}
