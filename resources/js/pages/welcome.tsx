import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Bell,
    Camera,
    CheckCircle2,
    ChevronDown,
    Droplets,
    Layers,
    Map,
    MapPin,
    Navigation,
    Radio,
    Shield,
    ShieldCheck,
    Siren,
    Smartphone,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { dashboard, login, register } from '@/routes';

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

function useScrolled(threshold = 20) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const h = () => setScrolled(window.scrollY > threshold);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, [threshold]);
    return scrolled;
}

function useInView(opts?: IntersectionObserverInit): [RefObject<HTMLDivElement | null>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const o = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setInView(true); o.disconnect(); }
        }, { threshold: 0.12, ...opts });
        o.observe(el);
        return () => o.disconnect();
    }, []);
    return [ref, inView];
}

function useCountUp(target: number, active: boolean, duration = 1600) {
    const [v, setV] = useState(0);
    useEffect(() => {
        if (!active || !target) return;
        const steps = 60;
        const inc = target / steps;
        let cur = 0;
        const t = setInterval(() => {
            cur += inc;
            if (cur >= target) { setV(target); clearInterval(t); }
            else setV(Math.round(cur));
        }, duration / steps);
        return () => clearInterval(t);
    }, [active, target, duration]);
    return v;
}

function useMouse(strength = 0.012) {
    const [o, setO] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const h = (e: MouseEvent) => {
            setO({
                x: (e.clientX - window.innerWidth / 2) * strength,
                y: (e.clientY - window.innerHeight / 2) * strength,
            });
        };
        window.addEventListener('mousemove', h, { passive: true });
        return () => window.removeEventListener('mousemove', h);
    }, [strength]);
    return o;
}

/* ─── Particle Canvas ────────────────────────────────────────────────────── */

function ParticleField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let w = 0, h = 0;

        const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; }[] = [];

        const resize = () => {
            w = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            h = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        const init = () => {
            resize();
            const count = Math.min(Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 18000), 80);
            particles.length = 0;
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.offsetWidth,
                    y: Math.random() * canvas.offsetHeight,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    r: Math.random() * 1.5 + 0.5,
                    a: Math.random() * 0.3 + 0.05,
                });
            }
        };

        const draw = () => {
            const cw = canvas.offsetWidth;
            const ch = canvas.offsetHeight;
            ctx.clearRect(0, 0, cw, ch);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = cw;
                if (p.x > cw) p.x = 0;
                if (p.y < 0) p.y = ch;
                if (p.y > ch) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(148, 210, 255, ${p.a})`;
                ctx.fill();
            }

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(148, 210, 255, ${0.04 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };

        init();
        draw();
        window.addEventListener('resize', init);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', init);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 size-full" />;
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage().props;
    const scrolled = useScrolled();
    const mouse = useMouse();

    const [featRef, featIn]     = useInView();
    const [stepsRef, stepsIn]   = useInView();
    const [sevRef, sevIn]       = useInView();
    const [rolesRef, rolesIn]   = useInView();
    const [ctaRef, ctaIn]       = useInView();
    const [bentoRef, bentoIn]   = useInView();

    const [heroVis, setHeroVis] = useState(false);
    const [activeSev, setActiveSev] = useState<number | null>(null);

    useEffect(() => { setTimeout(() => setHeroVis(true), 120); }, []);

    // Mouse-tracking glow on feature cards
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            document.querySelectorAll<HTMLElement>('.feat-card').forEach((card) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
            });
        };
        window.addEventListener('mousemove', handler, { passive: true });
        return () => window.removeEventListener('mousemove', handler);
    }, []);

    const ani = useCallback((visible: boolean, delay = 0) =>
        `transition-all duration-[800ms] ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`
        + (delay ? ` [transition-delay:${delay}ms]` : ''),
    []);

    return (
        <>
            <Head title="FloodTrack — Community Flood & Hazard Reporting">
                <meta name="description" content="FloodTrack helps residents of Nasugbu, Batangas report flood and road hazards in real time." />
            </Head>

            <div className="min-h-screen overflow-x-hidden bg-[#06090f] text-white antialiased selection:bg-cyan-500/30">

                {/* Noise texture overlay */}
                <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.018]"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}
                />

                {/* ── Navbar ─────────────────────────────────────────── */}
                <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
                    scrolled
                        ? 'bg-[#06090f]/70 border-b border-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150'
                        : 'bg-transparent'
                }`}>
                    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                        <Link href="/" className="group flex items-center gap-3">
                            <div className="relative flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 transition-all duration-300 group-hover:shadow-blue-500/40 group-hover:scale-110">
                                <Droplets className="size-5 text-white drop-shadow-sm" />
                                <div className="absolute inset-[1px] rounded-[13px] bg-gradient-to-b from-white/25 to-transparent" />
                            </div>
                            <span className="text-[1.15rem] font-bold tracking-tight">
                                <span className="text-white">Flood</span><span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Track</span>
                            </span>
                        </Link>

                        <div className="flex items-center gap-2">
                            {auth.user ? (
                                <PremiumButton href={auth.user.role === 'admin' ? '/admin' : dashboard()}>
                                    Dashboard
                                </PremiumButton>
                            ) : (
                                <>
                                    <Link href={login()} className="px-5 py-2.5 text-sm font-medium text-white/50 transition-colors duration-200 hover:text-white rounded-xl hover:bg-white/[0.04]">
                                        Sign in
                                    </Link>
                                    {canRegister && <PremiumButton href={register()}>Get started</PremiumButton>}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main>

                    {/* ── HERO ─────────────────────────────────────────── */}
                    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-20">

                        {/* Canvas particles */}
                        <div className="pointer-events-none absolute inset-0 opacity-60">
                            <ParticleField />
                        </div>

                        {/* Gradient orbs — parallax */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute -left-40 -top-40 size-[700px] rounded-full opacity-[0.12] blur-[140px]"
                                style={{ background: 'conic-gradient(from 200deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)', transform: `translate(${mouse.x * 4}px, ${mouse.y * 4}px)`, transition: 'transform 0.6s cubic-bezier(.22,1,.36,1)' }}
                            />
                            <div className="absolute -right-40 top-20 size-[600px] rounded-full opacity-[0.08] blur-[120px]"
                                style={{ background: 'conic-gradient(from 40deg, #22d3ee, #3b82f6, #22d3ee)', transform: `translate(${-mouse.x * 3}px, ${-mouse.y * 3}px)`, transition: 'transform 0.8s cubic-bezier(.22,1,.36,1)' }}
                            />
                            <div className="absolute left-1/3 bottom-0 size-[500px] rounded-full opacity-[0.06] blur-[100px]"
                                style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }}
                            />
                        </div>

                        {/* Grid */}
                        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
                            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '72px 72px', transform: `translate(${mouse.x * 0.5}px, ${mouse.y * 0.5}px)`, transition: 'transform 1s ease-out' }}
                        />

                        {/* Radial vignette */}
                        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, #06090f 100%)' }} />

                        {/* Content */}
                        <div className="relative z-10 mx-auto max-w-5xl text-center">

                            {/* Badge */}
                            <div className={`mb-10 inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2 backdrop-blur-md transition-all duration-1000 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                                <span className="relative flex size-[6px]">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex size-[6px] rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                                </span>
                                <span className="text-[13px] font-medium text-white/40">Live hazard reporting</span>
                                <span className="h-3 w-px bg-white/[0.08]" />
                                <span className="text-[13px] font-semibold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Nasugbu, Batangas</span>
                            </div>

                            {/* Heading */}
                            <h1 className={`mb-8 text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[1.08] tracking-[-0.035em] transition-all duration-1000 delay-150 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14'}`}>
                                <span className="block bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
                                    Report floods & hazards
                                </span>
                                <span className="relative mt-1 inline-block">
                                    <span className="hero-gradient-text bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent bg-[length:200%_auto]">
                                        in real time
                                    </span>
                                    <span className="absolute -bottom-2 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-cyan-500/60 via-blue-500/60 to-violet-500/60 blur-sm" />
                                </span>
                            </h1>

                            {/* Sub */}
                            <p className={`mx-auto mb-14 max-w-[38rem] text-[1.1rem] leading-relaxed text-white/35 font-[350] transition-all duration-1000 delay-300 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14'}`}>
                                Connect directly with MDRRMO. Submit a hazard report from your phone in seconds — with GPS location, photo evidence, and severity level. Responders are dispatched faster.
                            </p>

                            {/* CTA */}
                            <div className={`flex flex-wrap items-center justify-center gap-4 transition-all duration-1000 delay-500 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14'}`}>
                                {canRegister && !auth.user && (
                                    <Link href={register()} className="hero-cta group relative overflow-hidden rounded-2xl px-10 py-4 text-[15px] font-bold text-white shadow-2xl transition-all duration-300 hover:scale-[1.04] hover:shadow-cyan-500/25 active:scale-[0.97]">
                                        <span className="relative z-10 flex items-center gap-2.5">
                                            Create free account
                                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                                        </span>
                                    </Link>
                                )}
                                <Link
                                    href={auth.user ? (auth.user.role === 'admin' ? '/admin' : dashboard()) : login()}
                                    className="group flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-10 py-4 text-[15px] font-semibold text-white/60 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:text-white/90 hover:border-white/[0.12] hover:scale-[1.04] active:scale-[0.97]"
                                >
                                    {auth.user ? 'Go to dashboard' : 'Sign in'}
                                    <ArrowUpRight className="size-4 opacity-40 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Scroll cue */}
                        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 transition-all duration-1000 delay-[900ms] ${heroVis ? 'opacity-30' : 'opacity-0'}`}>
                            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30">Scroll</span>
                            <ChevronDown className="size-4 text-white/20 animate-[bounce-soft_2.5s_ease-in-out_infinite]" />
                        </div>
                    </section>

                    {/* ── BENTO STATS ────────────────────────────────────── */}
                    <section className="relative px-6 py-10" ref={bentoRef}>
                        <div className="mx-auto max-w-5xl">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {([
                                    { value: 4, suffix: '', label: 'Severity Levels', sub: 'Classification', icon: Layers, color: 'from-amber-500/10 to-orange-500/5', accent: 'text-amber-400' },
                                    { value: 0, suffix: 'Real-time', label: 'Live Map', sub: 'GIS & Heatmap', icon: Map, color: 'from-cyan-500/10 to-blue-500/5', accent: 'text-cyan-400', isText: true },
                                    { value: 0, suffix: 'Instant', label: 'Dispatch', sub: 'MDRRMO Response', icon: Zap, color: 'from-emerald-500/10 to-green-500/5', accent: 'text-emerald-400', isText: true },
                                    { value: 0, suffix: 'Official', label: 'MDRRMO', sub: 'Verified Platform', icon: Shield, color: 'from-violet-500/10 to-purple-500/5', accent: 'text-violet-400', isText: true },
                                ] as const).map((s, i) => {
                                    const Icon = s.icon;
                                    const count = useCountUp(s.value, bentoIn);
                                    return (
                                        <div
                                            key={s.label}
                                            className={`group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-gradient-to-b ${s.color} p-6 transition-all duration-500 hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 ${bentoIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                                            style={{ transitionDelay: `${i * 80}ms` }}
                                        >
                                            {/* Shimmer sweep */}
                                            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-[-20deg]" />
                                            <Icon className={`size-5 ${s.accent} mb-4 opacity-60 transition-all duration-500 group-hover:opacity-100 group-hover:scale-125 group-hover:rotate-12`} />
                                            <p className="text-2xl font-bold tracking-tight text-white">
                                                {s.isText ? s.suffix : `${count}${s.suffix}`}
                                            </p>
                                            <p className="mt-0.5 text-sm font-medium text-white/50">{s.label}</p>
                                            <p className="text-[11px] text-white/20">{s.sub}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── FEATURES ───────────────────────────────────────── */}
                    <section className="relative px-6 py-32" ref={featRef}>
                        <GlowDivider />

                        <div className="mx-auto max-w-7xl">
                            <SectionHead
                                visible={featIn}
                                badge="Features"
                                badgeIcon={<Sparkles className="size-3" />}
                                badgeColor="border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-400"
                                title={<>Everything you need, <Gradient>in one platform</Gradient></>}
                                sub="Built for residents, responders, and MDRRMO — simple, fast, and reliable."
                            />

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {([
                                    { icon: MapPin,    grad: 'from-sky-500 to-blue-600',    title: 'Location-pinned reports',  body: 'Auto-detects GPS position. Drag the pin to adjust. Accurate to meters.' },
                                    { icon: Map,       grad: 'from-cyan-500 to-teal-600',   title: 'Live GIS map & heatmap',   body: 'All active hazards on a real-time map. Density heatmap reveals hotspots.' },
                                    { icon: AlertTriangle, grad: 'from-amber-500 to-orange-600', title: 'Severity classification', body: 'Four levels — Low to Critical. Color + icon + label for accessibility.' },
                                    { icon: Camera,    grad: 'from-violet-500 to-indigo-600', title: 'Photo & video evidence', body: 'Attach multiple photos or videos from camera or gallery with every report.' },
                                    { icon: Zap,       grad: 'from-emerald-500 to-green-600', title: 'Instant dispatch',       body: 'MDRRMO verifies and assigns responders directly from the admin dashboard.' },
                                    { icon: Bell,      grad: 'from-rose-500 to-pink-600',    title: 'Alerts & advisories',     body: 'Official MDRRMO advisories and real-time status updates on your reports.' },
                                ] as const).map((f, i) => {
                                    const Icon = f.icon;
                                    return (
                                        <div
                                            key={f.title}
                                            className={`feat-card group relative overflow-hidden rounded-[20px] border border-white/[0.04] bg-[#0a0e17] p-8 transition-all duration-500 hover:border-white/[0.1] hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/30 ${featIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                            style={{ transitionDelay: `${i * 70}ms` }}
                                        >
                                            {/* Mouse-follow glow */}
                                            <div className="feat-glow pointer-events-none absolute -inset-px rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                                                style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(56,189,248,0.06), transparent 40%)' }}
                                            />

                                            {/* Shimmer sweep on hover */}
                                            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-[-20deg]" />

                                            {/* Animated border glow */}
                                            <div className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                                style={{ boxShadow: 'inset 0 0 0 1px rgba(56,189,248,0.08)' }}
                                            />

                                            <div className={`relative mb-6 inline-flex rounded-2xl bg-gradient-to-br ${f.grad} p-3.5 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-2xl`}>
                                                <Icon className="size-[22px] text-white transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                                            </div>
                                            <h3 className="relative mb-2 text-[17px] font-semibold text-white/90 transition-colors duration-300 group-hover:text-white">{f.title}</h3>
                                            <p className="relative text-[14px] leading-relaxed text-white/35 font-[350] transition-colors duration-300 group-hover:text-white/50">{f.body}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── HOW IT WORKS ───────────────────────────────────── */}
                    <section className="relative px-6 py-32" ref={stepsRef}>
                        <GlowDivider />

                        <div className="mx-auto max-w-5xl">
                            <SectionHead
                                visible={stepsIn}
                                badge="Process"
                                badgeIcon={<Radio className="size-3" />}
                                badgeColor="border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
                                title={<>Three steps to <GradientAlt>safety</GradientAlt></>}
                                sub="From hazard spotted to responder on scene — under a minute."
                            />

                            <div className="relative grid gap-6 sm:grid-cols-3">
                                {/* Connector */}
                                <div className="absolute left-[16.6%] right-[16.6%] top-[72px] hidden h-px sm:block">
                                    <div className="h-full bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03]" />
                                    <div className="absolute inset-0 h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 rounded-full transition-all ease-out"
                                        style={{ width: stepsIn ? '100%' : '0%', transition: 'width 2s cubic-bezier(.22,1,.36,1) 0.3s', opacity: 0.6 }}
                                    />
                                </div>

                                {([
                                    { n: '01', icon: Smartphone, grad: 'from-sky-400 to-blue-600', ring: 'shadow-sky-500/10', title: 'Resident reports', body: 'Open the app, choose hazard type & severity, attach photos, submit. Under 60 seconds.' },
                                    { n: '02', icon: ShieldCheck, grad: 'from-cyan-400 to-teal-600', ring: 'shadow-cyan-500/10', title: 'MDRRMO verifies', body: 'Admin reviews photo evidence on the dashboard, verifies the report, assigns a responder.' },
                                    { n: '03', icon: Navigation, grad: 'from-emerald-400 to-green-600', ring: 'shadow-emerald-500/10', title: 'Responder acts', body: 'Responder navigates to the site, updates status live — the reporter sees every change.' },
                                ] as const).map((s, i) => {
                                    const Icon = s.icon;
                                    return (
                                        <div key={s.n} className={`relative flex flex-col items-center text-center transition-all duration-[800ms] ease-out ${stepsIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                                            style={{ transitionDelay: `${i * 200 + 200}ms` }}
                                        >
                                            <div className={`group/step relative z-10 mb-8 flex size-36 flex-col items-center justify-center rounded-[28px] border border-white/[0.05] bg-[#0a0e17] shadow-2xl ${s.ring} transition-all duration-500 hover:scale-110 hover:border-white/[0.1] hover:shadow-3xl cursor-pointer`}>
                                                {/* Pulse ring on hover */}
                                                <div className="absolute inset-0 rounded-[28px] opacity-0 group-hover/step:opacity-100 transition-opacity duration-500 group-hover/step:animate-[ringPulse_1.5s_ease-out_infinite]"
                                                    style={{ boxShadow: `0 0 0 0 ${s.grad.includes('sky') ? 'rgba(56,189,248,0.3)' : s.grad.includes('cyan') ? 'rgba(6,182,212,0.3)' : 'rgba(52,211,153,0.3)'}` }}
                                                />
                                                <div className={`rounded-2xl bg-gradient-to-br ${s.grad} p-4 shadow-xl transition-all duration-500 group-hover/step:-translate-y-1 group-hover/step:shadow-2xl`}>
                                                    <Icon className="size-7 text-white transition-transform duration-500 group-hover/step:scale-125 group-hover/step:rotate-6" />
                                                    <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                                                </div>
                                                <span className="mt-3 text-[11px] font-bold tracking-[0.15em] text-white/15 uppercase transition-colors duration-300 group-hover/step:text-white/30">{s.n}</span>
                                            </div>
                                            <h3 className="mb-2 text-[1.15rem] font-bold text-white/90">{s.title}</h3>
                                            <p className="max-w-[260px] text-[14px] leading-relaxed text-white/35 font-[350]">{s.body}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── SEVERITY ───────────────────────────────────────── */}
                    <section className="relative px-6 py-32" ref={sevRef}>
                        <GlowDivider />

                        {/* Background warmth */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] rounded-full opacity-[0.06] blur-[120px]"
                                style={{ background: 'radial-gradient(ellipse, #ef4444, #f59e0b, transparent 70%)' }}
                            />
                        </div>

                        <div className="relative mx-auto max-w-5xl">
                            <SectionHead
                                visible={sevIn}
                                badge="Severity"
                                badgeIcon={<AlertTriangle className="size-3" />}
                                badgeColor="border-red-500/20 bg-red-500/[0.06] text-red-400"
                                title={<>Four-level <GradientWarm>severity scale</GradientWarm></>}
                                sub="Every report is tagged with color + icon + label. Never color alone."
                            />

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {([
                                    { level: 'Low', color: '#22c55e', icon: CheckCircle2, meaning: 'Passable. Monitor only.', detail: 'Accessible area. Continuous monitoring recommended. No immediate action.' },
                                    { level: 'Moderate', color: '#eab308', icon: AlertTriangle, meaning: 'Caution — may worsen.', detail: 'Exercise caution. May deteriorate. Prepare for possible response.' },
                                    { level: 'High', color: '#f97316', icon: AlertTriangle, meaning: 'Unsafe. Prompt action.', detail: 'Area is unsafe. Prompt dispatch required. Avoid unless responding.' },
                                    { level: 'Critical', color: '#ef4444', icon: Siren, meaning: 'Life-threatening.', detail: 'Immediate threat to life. Emergency dispatch now. All units respond.' },
                                ] as const).map((s, i) => {
                                    const Icon = s.icon;
                                    const open = activeSev === i;
                                    return (
                                        <div
                                            key={s.level}
                                            onClick={() => setActiveSev(open ? null : i)}
                                            className={`group cursor-pointer relative overflow-hidden rounded-[20px] border border-white/[0.04] bg-[#0a0e17] p-7 transition-all duration-500 hover:border-white/[0.1] hover:-translate-y-2 hover:shadow-2xl ${sevIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${open ? 'scale-[1.03] border-white/[0.12] shadow-2xl' : ''}`}
                                            style={{ transitionDelay: `${i * 100}ms` }}
                                        >
                                            {/* Colored top glow on hover */}
                                            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                                style={{ backgroundColor: s.color + '10' }}
                                            />

                                            {/* Shimmer sweep */}
                                            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skew-x-[-20deg]" />

                                            <div className="relative mb-5 inline-flex items-center gap-2.5 rounded-[14px] px-3.5 py-2 text-sm font-bold transition-all duration-500 group-hover:scale-105"
                                                style={{ backgroundColor: s.color + '12', color: s.color, boxShadow: open ? `0 0 24px ${s.color}20` : `0 0 0 ${s.color}00` }}
                                            >
                                                <Icon className="size-[18px] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                                                {s.level}
                                            </div>
                                            <p className="relative text-[14px] font-medium text-white/70 transition-colors duration-300 group-hover:text-white/85">{s.meaning}</p>
                                            <div className="overflow-hidden transition-all duration-500"
                                                style={{ maxHeight: open ? '80px' : '0', opacity: open ? 1 : 0 }}
                                            >
                                                <p className="mt-3 text-[13px] leading-relaxed text-white/30">{s.detail}</p>
                                            </div>
                                            <div className="relative mt-4 h-[2px] rounded-full overflow-hidden transition-all duration-700"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.03)', width: '100%' }}
                                            >
                                                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                                    style={{ backgroundColor: s.color + '50', width: open ? '100%' : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── ROLES ──────────────────────────────────────────── */}
                    <section className="relative px-6 py-32" ref={rolesRef}>
                        <GlowDivider />

                        <div className="mx-auto max-w-6xl">
                            <SectionHead
                                visible={rolesIn}
                                badge="For Everyone"
                                badgeIcon={<Users className="size-3" />}
                                badgeColor="border-violet-500/20 bg-violet-500/[0.06] text-violet-400"
                                title={<>Built for all of <GradientPurple>Nasugbu</GradientPurple></>}
                                sub="Every stakeholder has a purpose-built experience."
                            />

                            <div className="grid gap-4 sm:grid-cols-3">
                                {([
                                    { role: 'Residents',     emoji: '🏘️', grad: 'from-sky-500/40 to-blue-600/40', accent: 'bg-sky-500',    points: ['Report hazards with GPS + photos', 'Track your report status live', 'Receive official MDRRMO alerts', 'View all hazards on the map'] },
                                    { role: 'Responders',    emoji: '🚒', grad: 'from-cyan-500/40 to-teal-600/40', accent: 'bg-cyan-500',   points: ['Receive assigned incident queue', 'Navigate directly to hazard', 'Update status en route / on scene', 'Upload field evidence'] },
                                    { role: 'MDRRMO Admin',  emoji: '🛡️', grad: 'from-violet-500/40 to-indigo-600/40', accent: 'bg-violet-500', points: ['Verify & triage incoming reports', 'Assign responders from dashboard', 'Publish official public advisories', 'Monitor all active incidents'] },
                                ] as const).map((r, i) => (
                                    <div
                                        key={r.role}
                                        className={`group relative overflow-hidden rounded-[20px] border border-white/[0.04] bg-[#0a0e17] p-9 transition-all duration-500 hover:border-white/[0.1] hover:-translate-y-3 hover:shadow-2xl hover:shadow-black/30 ${rolesIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                        style={{ transitionDelay: `${i * 120}ms` }}
                                    >
                                        {/* Shimmer sweep */}
                                        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-[-20deg]" />

                                        <div className="mb-6 text-5xl drop-shadow-lg transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6 group-hover:drop-shadow-2xl">{r.emoji}</div>
                                        <h3 className="mb-1.5 text-xl font-bold text-white/90 transition-colors duration-300 group-hover:text-white">{r.role}</h3>
                                        <div className={`mb-6 h-[3px] w-10 rounded-full ${r.accent} opacity-50 transition-all duration-700 group-hover:w-24 group-hover:opacity-100`} />
                                        <ul className="space-y-3.5">
                                            {r.points.map((p, pi) => (
                                                <li key={p} className="flex items-start gap-3 text-[14px] text-white/40 font-[350] transition-all duration-500 group-hover:text-white/55"
                                                    style={{ transitionDelay: `${pi * 50}ms` }}
                                                >
                                                    <CheckCircle2 className="mt-[3px] size-4 shrink-0 text-emerald-500/50 transition-all duration-500 group-hover:text-emerald-400/80 group-hover:scale-110" />
                                                    <span>{p}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Corner gradient glow */}
                                        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full opacity-0 blur-[80px] transition-all duration-700 group-hover:opacity-100 group-hover:scale-110"
                                            style={{ background: `linear-gradient(135deg, ${r.grad.includes('sky') ? 'rgba(14,165,233,0.1)' : r.grad.includes('cyan') ? 'rgba(6,182,212,0.1)' : 'rgba(139,92,246,0.1)'}, transparent)` }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── CTA ────────────────────────────────────────────── */}
                    {!auth.user && canRegister && (
                        <section className="relative overflow-hidden px-6 py-40" ref={ctaRef}>
                            <GlowDivider />

                            {/* CTA glow */}
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full opacity-[0.08] blur-[120px]"
                                    style={{ background: 'conic-gradient(from 180deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)' }}
                                />
                            </div>

                            <div className={`relative mx-auto max-w-3xl text-center transition-all duration-[800ms] ${ctaIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <div className="mb-8 inline-flex items-center justify-center size-24 rounded-[28px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/20">
                                    <Droplets className="size-12 text-white drop-shadow-lg" />
                                    <div className="absolute inset-[1px] rounded-[27px] bg-gradient-to-b from-white/20 to-transparent" />
                                </div>
                                <h2 className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl">
                                    <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">Ready to help keep </span>
                                    <Gradient>Nasugbu safe?</Gradient>
                                </h2>
                                <p className="mx-auto mb-14 max-w-md text-lg text-white/35 font-[350]">
                                    Join residents and responders already using FloodTrack. Free to use, forever.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Link href={register()} className="hero-cta group relative overflow-hidden rounded-2xl px-12 py-4.5 text-[15px] font-bold text-white shadow-2xl transition-all duration-300 hover:scale-[1.04] hover:shadow-cyan-500/25 active:scale-[0.97]">
                                        <span className="relative z-10 flex items-center gap-2.5">
                                            Create free account
                                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                                        </span>
                                    </Link>
                                    <Link href={login()} className="group flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-12 py-4.5 text-[15px] font-bold text-white/50 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:text-white/80 hover:scale-[1.04] active:scale-[0.97]">
                                        Sign in
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}
                </main>

                {/* ── Footer ─────────────────────────────────────────── */}
                <footer className="border-t border-white/[0.03] px-6 py-14">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/15">
                                <Droplets className="size-[18px] text-white" />
                            </div>
                            <span className="text-sm font-semibold text-white/40">FloodTrack</span>
                            <span className="text-white/[0.06]">|</span>
                            <span className="text-sm text-white/20">MDRRMO Nasugbu, Batangas</span>
                        </div>
                        <p className="text-sm text-white/15">&copy; {new Date().getFullYear()} FloodTrack. All rights reserved.</p>
                    </div>
                </footer>
            </div>

            {/* ── Global styles ──────────────────────────────────── */}
            <style>{`
                /* Premium CTA button */
                .hero-cta {
                    background: linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1);
                    background-size: 200% 200%;
                    animation: ctaShift 6s ease infinite;
                }
                .hero-cta::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05), rgba(255,255,255,0.1));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                }
                .hero-cta::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%);
                    opacity: 0;
                    transition: opacity 0.5s;
                }
                .hero-cta:hover::after { opacity: 1; }

                @keyframes ctaShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }

                /* Gradient text animation */
                .hero-gradient-text {
                    animation: gradShift 5s ease-in-out infinite;
                }
                @keyframes gradShift {
                    0%, 100% { background-position: 0% center; }
                    50% { background-position: 100% center; }
                }

                /* Bounce */
                @keyframes bounce-soft {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(5px); }
                }

                /* Feature card mouse glow */
                .feat-card {
                    --mouse-x: 50%;
                    --mouse-y: 50%;
                }

                /* Step card ring pulse */
                @keyframes ringPulse {
                    0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.25); }
                    70% { box-shadow: 0 0 0 12px rgba(56,189,248,0); }
                    100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
                }
            `}</style>
        </>
    );
}

/* ─── Shared Components ──────────────────────────────────────────────────── */

function PremiumButton({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link href={href} className="group relative overflow-hidden rounded-[14px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-xl shadow-blue-500/15 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-105 active:scale-95">
            <span className="relative z-10">{children}</span>
            <div className="absolute inset-[1px] rounded-[13px] bg-gradient-to-b from-white/15 to-transparent opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {/* Shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
        </Link>
    );
}

function GlowDivider() {
    return <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />;
}

function Gradient({ children }: { children: ReactNode }) {
    return <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">{children}</span>;
}

function GradientAlt({ children }: { children: ReactNode }) {
    return <span className="bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-transparent">{children}</span>;
}

function GradientWarm({ children }: { children: ReactNode }) {
    return <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent">{children}</span>;
}

function GradientPurple({ children }: { children: ReactNode }) {
    return <span className="bg-gradient-to-r from-violet-300 to-blue-400 bg-clip-text text-transparent">{children}</span>;
}

function SectionHead({ visible, badge, badgeIcon, badgeColor, title, sub }: {
    visible: boolean; badge: string; badgeIcon: ReactNode; badgeColor: string; title: ReactNode; sub: string;
}) {
    return (
        <div className={`mb-20 text-center transition-all duration-[800ms] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] ${badgeColor}`}>
                {badgeIcon}
                {badge}
            </span>
            <h2 className="mt-5 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight">
                <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{title}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[1.05rem] text-white/30 font-[350]">{sub}</p>
        </div>
    );
}
