import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CheckCircle,
    ClipboardList,
    Map,
    MapPin,
    Radio,
    ShieldCheck,
    Siren,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { dashboard, login, register } from '@/routes';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScrolled(threshold = 24) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > threshold);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, [threshold]);
    return scrolled;
}

function useInView(options?: IntersectionObserverInit): [RefObject<HTMLDivElement | null>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
        }, { threshold: 0.15, ...options });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return [ref, inView];
}

function useCountUp(target: number, active: boolean, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!active || target === 0) return;
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) { setValue(target); clearInterval(timer); }
            else setValue(Math.round(current));
        }, duration / steps);
        return () => clearInterval(timer);
    }, [active, target, duration]);
    return value;
}

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (inView: boolean, delay = 0) => ({
    style: { transitionDelay: `${delay}ms` },
    className: `transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`,
});

const fadeIn = (inView: boolean, delay = 0) => ({
    style: { transitionDelay: `${delay}ms` },
    className: `transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage().props;
    const scrolled = useScrolled();

    const [statsRef, statsInView]     = useInView();
    const [featuresRef, featuresInView] = useInView();
    const [stepsRef, stepsInView]     = useInView();
    const [severityRef, severityInView] = useInView();
    const [rolesRef, rolesInView]     = useInView();
    const [ctaRef, ctaInView]         = useInView();

    const [activeSeverity, setActiveSeverity] = useState<string | null>(null);
    const [heroVisible, setHeroVisible]       = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setHeroVisible(true), 80);
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            <Head title="FloodTrack — Community Flood & Hazard Reporting">
                <meta
                    name="description"
                    content="FloodTrack helps residents of Nasugbu, Batangas report flood and road hazards in real time. MDRRMO dispatches responders faster."
                />
            </Head>

            <div className="min-h-screen overflow-x-hidden bg-white text-slate-900 antialiased">

                {/* ── Nav ──────────────────────────────────────────────────── */}
                <header
                    className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                        scrolled
                            ? 'border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md'
                            : 'bg-transparent'
                    }`}
                >
                    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-[#1F6FBF] transition-transform duration-200 group-hover:scale-110">
                                <Siren className="size-4 text-white" />
                            </div>
                            <span className={`text-lg font-bold tracking-tight transition-colors duration-300 ${scrolled ? 'text-[#0B2F52]' : 'text-white'}`}>
                                FloodTrack
                            </span>
                        </Link>

                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={auth.user.role === 'admin' ? '/admin' : dashboard()}
                                    className="rounded-lg bg-[#1F6FBF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#124577] transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="rounded-lg bg-[#1F6FBF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#124577] transition-all duration-200 hover:scale-105 active:scale-95"
                                        >
                                            Get started
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main>
                    {/* ── Hero ─────────────────────────────────────────────── */}
                    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0B2F52] via-[#124577] to-[#1F6FBF] px-6 pt-32 pb-24 text-white flex flex-col items-center justify-center">

                        {/* Animated dot grid */}
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.07]"
                            style={{
                                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                                backgroundSize: '32px 32px',
                            }}
                        />

                        {/* Floating blobs */}
                        <div className="pointer-events-none absolute left-1/4 top-1/4 size-72 rounded-full bg-[#0FA896]/10 blur-3xl animate-pulse" />
                        <div className="pointer-events-none absolute right-1/4 bottom-1/4 size-96 rounded-full bg-[#1F6FBF]/20 blur-3xl"
                            style={{ animation: 'pulse 4s ease-in-out 1s infinite' }} />

                        {/* Floating map pins */}
                        <FloatingPin color="#D32F2F" label="Critical" top="20%" left="8%"  delay={0}   visible={heroVisible} />
                        <FloatingPin color="#EA6A0C" label="High"     top="60%" left="5%"  delay={200} visible={heroVisible} />
                        <FloatingPin color="#F4B400" label="Moderate" top="25%" right="6%" delay={400} visible={heroVisible} />
                        <FloatingPin color="#2E9E5B" label="Low"      top="65%" right="8%" delay={600} visible={heroVisible} />

                        {/* Hero content */}
                        <div className="relative mx-auto max-w-4xl text-center">

                            <div {...fadeUp(heroVisible, 0)} className={`mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <Radio className="size-3.5 text-[#0FA896] animate-pulse" />
                                <span>Live hazard reporting · Nasugbu, Batangas</span>
                            </div>

                            <h1
                                className={`mb-6 text-4xl font-bold leading-tight tracking-tight transition-all duration-700 delay-100 sm:text-5xl lg:text-6xl ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                            >
                                Report floods &{' '}
                                <span className="relative inline-block">
                                    road hazards
                                    <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-[#0FA896]/60" />
                                </span>
                                <br />
                                <span className="text-[#0FA896]">in real time</span>
                            </h1>

                            <p
                                className={`mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-blue-100 transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                            >
                                FloodTrack connects Nasugbu residents directly with MDRRMO.
                                Submit a hazard report from your phone in seconds — with location,
                                photos, and severity level. Responders are dispatched faster.
                            </p>

                            <div
                                className={`flex flex-wrap items-center justify-center gap-4 transition-all duration-700 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                            >
                                {canRegister && !auth.user && (
                                    <Link
                                        href={register()}
                                        className="group relative overflow-hidden rounded-xl bg-[#0FA896] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#0FA896]/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-[#0FA896]/40 active:scale-95"
                                    >
                                        <span className="relative z-10">Create free account</span>
                                        <span className="absolute inset-0 translate-x-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0" />
                                    </Link>
                                )}
                                <Link
                                    href={auth.user ? (auth.user.role === 'admin' ? '/admin' : dashboard()) : login()}
                                    className="rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95"
                                >
                                    {auth.user ? 'Go to dashboard' : 'Log in'}
                                </Link>
                            </div>
                        </div>

                        {/* Stat strip */}
                        <div
                            ref={statsRef}
                            className={`relative mx-auto mt-20 w-full max-w-2xl transition-all duration-700 delay-500 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                        >
                            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                {[
                                    { target: 4,    suffix: ' levels', label: 'Severity system'   },
                                    { target: 0,    suffix: 'Real-time', label: 'Map & heatmap', isText: true },
                                    { target: 0,    suffix: 'MDRRMO',    label: 'Official dispatch', isText: true },
                                ].map((s, i) => (
                                    <StatCell key={s.label} {...s} inView={statsInView} delay={i * 150} />
                                ))}
                            </div>
                        </div>

                        {/* Scroll hint */}
                        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-all duration-700 delay-700 ${heroVisible ? 'opacity-60' : 'opacity-0'}`}>
                            <span className="text-xs text-white/60">Scroll to explore</span>
                            <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/30 p-1">
                                <div className="size-1.5 rounded-full bg-white/60" style={{ animation: 'scrollDot 1.5s ease-in-out infinite' }} />
                            </div>
                        </div>
                    </section>

                    {/* ── Features ─────────────────────────────────────────── */}
                    <section className="bg-slate-50 px-6 py-24">
                        <div className="mx-auto max-w-6xl" ref={featuresRef}>
                            <div {...fadeUp(featuresInView)} className={`mb-14 text-center transition-all duration-700 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <span className="mb-3 inline-block rounded-full bg-[#EAF2FB] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1F6FBF]">
                                    Features
                                </span>
                                <h2 className="text-3xl font-bold text-[#0B2F52] sm:text-4xl">
                                    Everything you need, in one app
                                </h2>
                                <p className="mt-3 text-slate-500">
                                    Built for residents, responders, and MDRRMO — all in one platform.
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    {
                                        icon: <MapPin className="size-5" />,
                                        color: 'bg-[#EAF2FB] text-[#1F6FBF]',
                                        glow: 'hover:shadow-blue-100',
                                        title: 'Location-pinned reports',
                                        body: 'Auto-detects your GPS position. Drag the pin to adjust before submitting.',
                                    },
                                    {
                                        icon: <Map className="size-5" />,
                                        color: 'bg-[#D6F2EC] text-[#0A6E64]',
                                        glow: 'hover:shadow-teal-100',
                                        title: 'Live GIS map & heatmap',
                                        body: 'See all active hazards on a real-time map. Density heatmap shows the worst-hit areas at a glance.',
                                    },
                                    {
                                        icon: <AlertTriangle className="size-5" />,
                                        color: 'bg-[#FEF3C7] text-[#92400E]',
                                        glow: 'hover:shadow-yellow-100',
                                        title: 'Severity classification',
                                        body: 'Four levels — Low, Moderate, High, Critical. Always shown with color, icon, and label for full accessibility.',
                                    },
                                    {
                                        icon: <ClipboardList className="size-5" />,
                                        color: 'bg-[#EAF2FB] text-[#1F6FBF]',
                                        glow: 'hover:shadow-blue-100',
                                        title: 'Photo & video evidence',
                                        body: 'Attach multiple photos or videos directly from your camera or gallery when filing a report.',
                                    },
                                    {
                                        icon: <Zap className="size-5" />,
                                        color: 'bg-[#D6F2EC] text-[#0A6E64]',
                                        glow: 'hover:shadow-teal-100',
                                        title: 'Instant dispatch',
                                        body: 'MDRRMO verifies and assigns responders directly from the admin dashboard. No phone calls needed.',
                                    },
                                    {
                                        icon: <Bell className="size-5" />,
                                        color: 'bg-[#FEE2E2] text-[#991B1B]',
                                        glow: 'hover:shadow-red-100',
                                        title: 'Alerts & advisories',
                                        body: 'Receive official MDRRMO advisories and real-time status updates on your submitted reports.',
                                    },
                                ].map((f, i) => (
                                    <div
                                        key={f.title}
                                        className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${f.glow} ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                        style={{ transitionDelay: `${i * 80}ms` }}
                                    >
                                        <div className={`mb-4 inline-flex rounded-xl p-3 transition-transform duration-200 group-hover:scale-110 ${f.color}`}>
                                            {f.icon}
                                        </div>
                                        <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
                                        <p className="text-sm leading-relaxed text-slate-500">{f.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── How it works ─────────────────────────────────────── */}
                    <section className="px-6 py-24">
                        <div className="mx-auto max-w-5xl" ref={stepsRef}>
                            <div className={`mb-16 text-center transition-all duration-700 ${stepsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <span className="mb-3 inline-block rounded-full bg-[#D6F2EC] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0A6E64]">
                                    Process
                                </span>
                                <h2 className="text-3xl font-bold text-[#0B2F52] sm:text-4xl">How it works</h2>
                                <p className="mt-3 text-slate-500">
                                    Three steps from hazard spotted to responder on scene.
                                </p>
                            </div>

                            <div className="relative grid gap-8 sm:grid-cols-3">
                                {/* Animated connector */}
                                <div className="absolute left-1/2 top-12 hidden h-0.5 -translate-x-1/2 bg-slate-100 sm:block" style={{ width: '66%' }}>
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#1F6FBF] via-[#0FA896] to-[#EA6A0C] transition-all duration-1000"
                                        style={{ width: stepsInView ? '100%' : '0%' }}
                                    />
                                </div>

                                {[
                                    {
                                        step: '01', delay: 0,
                                        icon: <MapPin className="size-7 text-[#1F6FBF]" />,
                                        ring: 'ring-[#EAF2FB]',
                                        title: 'Resident reports',
                                        body: 'Open the app, tap Report, choose hazard type and severity, attach photos, and submit. Under a minute.',
                                    },
                                    {
                                        step: '02', delay: 200,
                                        icon: <ShieldCheck className="size-7 text-[#0FA896]" />,
                                        ring: 'ring-[#D6F2EC]',
                                        title: 'MDRRMO verifies',
                                        body: 'Admin reviews photo evidence on the web dashboard, verifies the report, and assigns a responder.',
                                    },
                                    {
                                        step: '03', delay: 400,
                                        icon: <Zap className="size-7 text-[#EA6A0C]" />,
                                        ring: 'ring-orange-100',
                                        title: 'Responder acts',
                                        body: 'Responder navigates to the site, updates status — the reporter sees every change in real time.',
                                    },
                                ].map((s) => (
                                    <div
                                        key={s.step}
                                        className={`relative flex flex-col items-center text-center transition-all duration-700 ${stepsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                        style={{ transitionDelay: `${s.delay}ms` }}
                                    >
                                        <div className={`relative z-10 mb-5 flex size-24 flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-lg ring-8 ${s.ring} transition-transform duration-300 hover:scale-105`}>
                                            {s.icon}
                                            <span className="mt-1 text-xs font-bold text-slate-300">{s.step}</span>
                                        </div>
                                        <h3 className="mb-2 text-lg font-semibold text-slate-900">{s.title}</h3>
                                        <p className="text-sm leading-relaxed text-slate-500">{s.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── Severity system ──────────────────────────────────── */}
                    <section className="bg-[#0B2F52] px-6 py-24 text-white" ref={severityRef}>
                        <div className="mx-auto max-w-5xl">
                            <div className={`mb-12 text-center transition-all duration-700 ${severityInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <span className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
                                    Severity system
                                </span>
                                <h2 className="text-3xl font-bold sm:text-4xl">Four-level severity scale</h2>
                                <p className="mt-3 text-blue-200">
                                    Every report is tagged — always shown as color + icon + label, never color alone.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    {
                                        level: 'Low',      color: '#2E9E5B', bg: 'bg-green-900/20  border-green-700/30',
                                        icon: <CheckCircle  className="size-6" />, meaning: 'Passable. Monitor only.',
                                        detail: 'Area is accessible. Continuous monitoring recommended. No immediate action required.',
                                    },
                                    {
                                        level: 'Moderate', color: '#F4B400', bg: 'bg-yellow-900/20 border-yellow-700/30',
                                        icon: <AlertTriangle className="size-6" />, meaning: 'Caution — may worsen.',
                                        detail: 'Exercise caution. Situation may deteriorate. Prepare for possible response.',
                                    },
                                    {
                                        level: 'High',     color: '#EA6A0C', bg: 'bg-orange-900/20 border-orange-700/30',
                                        icon: <AlertTriangle className="size-6" />, meaning: 'Unsafe. Prompt action needed.',
                                        detail: 'Area is unsafe. Prompt dispatch required. Avoid unless responding.',
                                    },
                                    {
                                        level: 'Critical', color: '#D32F2F', bg: 'bg-red-900/30    border-red-700/30',
                                        icon: <Siren         className="size-6" />, meaning: 'Life-threatening. Dispatch now.',
                                        detail: 'Immediate threat to life. Emergency dispatch required now. All available units respond.',
                                    },
                                ].map((s, i) => (
                                    <div
                                        key={s.level}
                                        onClick={() => setActiveSeverity(activeSeverity === s.level ? null : s.level)}
                                        className={`cursor-pointer rounded-2xl border p-5 transition-all duration-500 ${s.bg} ${severityInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${activeSeverity === s.level ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                                        style={{
                                            transitionDelay: `${i * 100}ms`,
                                            ...(activeSeverity === s.level ? { ringColor: s.color } : {}),
                                        }}
                                    >
                                        <div
                                            className="mb-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"
                                            style={{ backgroundColor: s.color + '25', color: s.color }}
                                        >
                                            {s.icon}
                                            {s.level}
                                        </div>
                                        <p className="text-sm font-medium text-white">{s.meaning}</p>
                                        <div
                                            className="overflow-hidden transition-all duration-300"
                                            style={{ maxHeight: activeSeverity === s.level ? '80px' : '0px', opacity: activeSeverity === s.level ? 1 : 0 }}
                                        >
                                            <p className="mt-2 text-xs leading-relaxed text-blue-200">{s.detail}</p>
                                        </div>
                                        <p className="mt-3 text-xs text-blue-300/60">
                                            {activeSeverity === s.level ? 'Click to collapse ↑' : 'Click to expand ↓'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── Who is it for ────────────────────────────────────── */}
                    <section className="bg-slate-50 px-6 py-24" ref={rolesRef}>
                        <div className="mx-auto max-w-5xl">
                            <div className={`mb-14 text-center transition-all duration-700 ${rolesInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <span className="mb-3 inline-block rounded-full bg-[#EAF2FB] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1F6FBF]">
                                    For everyone
                                </span>
                                <h2 className="text-3xl font-bold text-[#0B2F52] sm:text-4xl">
                                    Built for all of Nasugbu
                                </h2>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-3">
                                {[
                                    {
                                        role: 'Residents', emoji: '🏘️',
                                        accent: 'border-t-[#1F6FBF]',
                                        points: [
                                            'Report hazards with GPS + photos',
                                            'Track your report status live',
                                            'Receive official MDRRMO alerts',
                                            'View all hazards on the map',
                                        ],
                                    },
                                    {
                                        role: 'Responders', emoji: '🚒',
                                        accent: 'border-t-[#0FA896]',
                                        points: [
                                            'Receive assigned incident queue',
                                            'Navigate directly to the hazard',
                                            'Update status en route / on scene',
                                            'Upload field evidence',
                                        ],
                                    },
                                    {
                                        role: 'MDRRMO Admin', emoji: '🛡️',
                                        accent: 'border-t-[#1F6FBF]',
                                        points: [
                                            'Verify & triage incoming reports',
                                            'Assign responders from dashboard',
                                            'Publish official public advisories',
                                            'Monitor all active incidents',
                                        ],
                                    },
                                ].map((r, i) => (
                                    <div
                                        key={r.role}
                                        className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-t-4 ${r.accent} transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${rolesInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                        style={{ transitionDelay: `${i * 120}ms` }}
                                    >
                                        <div className="mb-4 text-4xl">{r.emoji}</div>
                                        <h3 className="mb-4 text-lg font-bold text-slate-900">{r.role}</h3>
                                        <ul className="space-y-2.5">
                                            {r.points.map((p) => (
                                                <li key={p} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <CheckCircle className="mt-0.5 size-4 shrink-0 text-[#0FA896]" />
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── CTA ──────────────────────────────────────────────── */}
                    {!auth.user && canRegister && (
                        <section className="relative overflow-hidden px-6 py-28" ref={ctaRef}>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#EAF2FB] via-white to-[#D6F2EC]" />
                            <div className={`relative mx-auto max-w-2xl text-center transition-all duration-700 ${ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <div className="mb-4 inline-flex items-center justify-center size-16 rounded-2xl bg-[#1F6FBF] shadow-lg shadow-blue-200">
                                    <Siren className="size-8 text-white" />
                                </div>
                                <h2 className="mb-4 text-3xl font-bold text-[#0B2F52] sm:text-4xl">
                                    Ready to help keep Nasugbu safe?
                                </h2>
                                <p className="mb-10 text-slate-500">
                                    Join residents and responders already using FloodTrack. Free to use.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Link
                                        href={register()}
                                        className="group relative overflow-hidden rounded-xl bg-[#1F6FBF] px-9 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-200 transition-all duration-200 hover:scale-105 hover:bg-[#124577] hover:shadow-xl active:scale-95"
                                    >
                                        Create free account
                                    </Link>
                                    <Link
                                        href={login()}
                                        className="rounded-xl border-2 border-slate-200 px-9 py-3.5 text-base font-bold text-slate-700 transition-all duration-200 hover:border-[#1F6FBF] hover:text-[#1F6FBF] hover:scale-105 active:scale-95"
                                    >
                                        Log in
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}
                </main>

                {/* ── Footer ───────────────────────────────────────────────── */}
                <footer className="border-t border-slate-100 bg-white px-6 py-10">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-[#1F6FBF]">
                                <Siren className="size-3.5 text-white" />
                            </div>
                            <span className="font-semibold text-slate-600">FloodTrack</span>
                            <span className="text-slate-300">·</span>
                            <span>MDRRMO Nasugbu, Batangas</span>
                        </div>
                        <p>© {new Date().getFullYear()} FloodTrack. All rights reserved.</p>
                    </div>
                </footer>
            </div>

            {/* Global keyframes */}
            <style>{`
                @keyframes scrollDot {
                    0%, 100% { transform: translateY(0); opacity: 1; }
                    50%       { transform: translateY(10px); opacity: 0.3; }
                }
            `}</style>
        </>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FloatingPin({
    color, label, top, left, right, delay, visible,
}: {
    color: string; label: string; top: string;
    left?: string; right?: string; delay: number; visible: boolean;
}) {
    return (
        <div
            className={`absolute hidden transition-all duration-700 xl:flex flex-col items-center gap-1`}
            style={{
                top, left, right,
                transitionDelay: `${delay}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                animation: visible ? `float${delay} 3s ease-in-out infinite` : 'none',
            }}
        >
            <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg"
                style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
            >
                <MapPin className="size-3" />
                {label}
            </div>
            <div className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
            <style>{`
                @keyframes float${delay} {
                    0%, 100% { transform: translateY(0px); }
                    50%       { transform: translateY(-8px); }
                }
            `}</style>
        </div>
    );
}

function StatCell({
    target, suffix, label, isText, inView, delay,
}: {
    target: number; suffix: string; label: string;
    isText?: boolean; inView: boolean; delay: number;
}) {
    const count = useCountUp(target, inView);
    return (
        <div
            className={`px-6 py-6 text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <p className="text-2xl font-bold">
                {isText ? suffix : `${count}${suffix}`}
            </p>
            <p className="mt-1 text-sm text-blue-200">{label}</p>
        </div>
    );
}
