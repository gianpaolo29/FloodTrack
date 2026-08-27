import { Link } from '@inertiajs/react';
import {
    Globe,
    MapPin,
    Moon,
    Sparkles,
    Sun,
    Zap,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { useAppearance } from '@/hooks/use-appearance';
import Aurora from '@/components/reactbits/Aurora';
import GradientTextRB from '@/components/reactbits/GradientText';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return <SplitAuthLayout title={title} description={description}>{children}</SplitAuthLayout>;
}

/* ─── Split Auth Layout ───────────────────────────────────── */

function SplitAuthLayout({ children, title, description }: AuthLayoutProps) {
    const [mounted, setMounted] = useState(false);
    const [textIndex, setTextIndex] = useState(0);
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

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

                    {/* Dark overlay — lighter to let Aurora show through */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />

                    {/* Accent gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-blue-900/20 to-indigo-900/30" />

                    {/* Aurora effect */}
                    <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen">
                        <Aurora
                            colorStops={['#06b6d4', '#3b82f6', '#8b5cf6']}
                            amplitude={1.4}
                            blend={0.5}
                            speed={0.3}
                        />
                    </div>

                    {/* Grain texture */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    }} />

                    {/* Content */}
                    <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">

                        {/* Logo */}
                        <div>
                            <Link href={home()} className="group inline-flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center transition-all duration-300 group-hover:scale-110">
                                    <AppLogoIcon className="size-10 rounded-[14px] shadow-xl shadow-black/10" />
                                </div>
                                <span className="text-lg font-bold tracking-tight text-white drop-shadow-sm">
                                    Flood<GradientTextRB colors={['#67e8f9', '#60a5fa', '#67e8f9']} animationSpeed={4} className="text-lg font-bold tracking-tight">Track</GradientTextRB>
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
                                        <div className={`flex size-8 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06] backdrop-blur-sm ${f.color}`}>
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
                <div className="relative flex items-center justify-center overflow-y-auto bg-white p-6 sm:p-12 dark:bg-neutral-900">
                    {/* Vertical gradient separator — desktop only */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px lg:block"
                        style={{ background: 'linear-gradient(to bottom, transparent, rgba(56,189,248,0.15), rgba(99,102,241,0.1), transparent)' }}
                    />
                    {/* Subtle mesh gradient */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute -top-32 -right-32 size-[500px] rounded-full opacity-[0.04] blur-[100px] dark:opacity-[0.05]"
                            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
                        />
                        <div className="absolute -bottom-32 -left-32 size-[400px] rounded-full opacity-[0.03] blur-[80px] dark:opacity-[0.04]"
                            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }}
                        />
                    </div>
                    <div className="relative w-full max-w-[420px]">

                        {/* Mobile header */}
                        <div className="mb-6 flex items-center justify-center lg:hidden">
                            <Link href={home()} className="inline-flex items-center gap-2.5">
                                <AppLogoIcon className="size-9 rounded-[12px] shadow-lg shadow-blue-500/20" />
                                <span className="text-base font-bold text-neutral-900 dark:text-white">Flood<span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400">Track</span></span>
                            </Link>
                        </div>

                        {/* Page content (login.tsx or register.tsx) */}
                        {children}
                    </div>
                </div>
            </div>

            {/* Mobile bottom features */}
            <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-neutral-100/80 bg-white/90 px-6 py-4 backdrop-blur-xl lg:hidden dark:border-neutral-800/60 dark:bg-neutral-900/90">
                <div className="flex items-center justify-center gap-5 text-[11px] text-neutral-400 dark:text-neutral-500">
                    {[
                        { icon: MapPin, label: 'GPS Reports', color: 'text-cyan-500/60' },
                        { icon: Globe, label: 'Live Map', color: 'text-blue-500/60' },
                        { icon: Zap, label: 'Instant Dispatch', color: 'text-indigo-500/60' },
                    ].map((f) => (
                        <div key={f.label} className="flex items-center gap-1.5">
                            <f.icon className={`size-3 ${f.color}`} />
                            {f.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Dark/Light mode toggle */}
            <button
                onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`fixed bottom-20 right-6 z-50 flex size-10 items-center justify-center rounded-xl backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 lg:bottom-6 ${isDark ? 'border border-white/10 bg-white/[0.06] shadow-lg shadow-black/20' : 'border border-neutral-200/80 bg-white/80 shadow-sm ring-1 ring-neutral-100'}`}
            >
                {isDark ? (
                    <Sun className="size-4 text-amber-400" />
                ) : (
                    <Moon className="size-4 text-indigo-500" />
                )}
            </button>

            {/* Styles */}
            <style>{`
                .overlay-img {
                    animation: slowZoom 25s ease-in-out infinite alternate;
                }
                @keyframes slowZoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.08); }
                }
                .auth-cta {
                    background: linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1);
                    background-size: 200% 200%;
                    animation: authCtaShift 6s ease infinite;
                }
                .auth-cta:hover {
                    background-size: 200% 200%;
                }
                @keyframes authCtaShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
}
