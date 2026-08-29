import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Bell,
    Camera,
    CheckCircle2,
    ChevronDown,
    Download,
    Droplets,
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
    Building2,
    Activity,
    TrendingUp,
    PhoneCall,
    Home,
    Truck,
    Globe,
    Moon,
    Sun,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { dashboard, login } from '@/routes';
import { useAppearance } from '@/hooks/use-appearance';

/* ─── React Bits Components ─────────────────────────────────────────────── */
import BlurText from '@/components/reactbits/BlurText';
import ShinyText from '@/components/reactbits/ShinyText';
import CountUpRB from '@/components/reactbits/CountUp';
import GradientTextRB from '@/components/reactbits/GradientText';
import DecryptedText from '@/components/reactbits/DecryptedText';
import { ScrollVelocity } from '@/components/reactbits/ScrollVelocity';
import StarBorder from '@/components/reactbits/StarBorder';
import Magnet from '@/components/reactbits/Magnet';
import ClickSpark from '@/components/reactbits/ClickSpark';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import Aurora from '@/components/reactbits/Aurora';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WelcomeStats {
    total_reports: number;
    resolved_reports: number;
    active_responders: number;
    total_responders: number;
    active_incidents: number;
    evacuation_centers: number;
}

interface EvacuationCenterData {
    id: number;
    name: string;
    address: string;
    type: string;
    capacity: number;
    current_occupancy: number;
    latitude: number;
    longitude: number;
}

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

function useScrollProgress() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const h = () => {
            const el = document.documentElement;
            const total = el.scrollHeight - el.clientHeight;
            setProgress(total > 0 ? window.scrollY / total : 0);
        };
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);
    return progress;
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

/* ─── Scroll Progress Bar ────────────────────────────────────────────────── */

function ScrollProgressBar() {
    const progress = useScrollProgress();
    return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px]">
            <div
                className="h-full rounded-r-full"
                style={{
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #8b5cf6)',
                    boxShadow: '0 0 12px rgba(56,189,248,0.8), 0 0 30px rgba(99,102,241,0.4)',
                    transition: 'width 80ms linear',
                }}
            />
        </div>
    );
}

/* ─── Cursor Spotlight ───────────────────────────────────────────────────── */

function CursorSpotlight({ isDark }: { isDark: boolean }) {
    const spotRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (spotRef.current) {
                spotRef.current.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
            }
            setVisible(true);
        };
        const leave = () => setVisible(false);
        window.addEventListener('mousemove', move, { passive: true });
        document.addEventListener('mouseleave', leave);
        return () => {
            window.removeEventListener('mousemove', move);
            document.removeEventListener('mouseleave', leave);
        };
    }, []);
    return (
        <div
            ref={spotRef}
            className={`pointer-events-none fixed left-0 top-0 z-[80] hidden lg:block size-[600px] rounded-full transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{
                background: isDark
                    ? 'radial-gradient(circle, rgba(56,189,248,0.032) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(56,189,248,0.055) 0%, transparent 70%)',
            }}
        />
    );
}

/* ─── Floating Hero Cards ────────────────────────────────────────────────── */

function FloatingHeroCards({ isDark, heroVis }: { isDark: boolean; heroVis: boolean }) {
    const base = `absolute hidden xl:flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all duration-1000`;
    const glass = isDark
        ? 'border-white/[0.07] bg-[#0c1019]/85'
        : 'border-neutral-200/90 bg-white/90';
    const shadow = isDark
        ? { boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }
        : { boxShadow: '0 12px 40px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' };
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Card 1 — Report Verified (left) */}
            <div
                className={`${base} left-[3%] top-[34%] delay-700 ${heroVis ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'} ${glass}`}
                style={{ ...shadow, animation: heroVis ? 'floatCard1 8s ease-in-out infinite' : 'none' }}
            >
                <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span className="absolute -top-1 -right-1 flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                    </span>
                </div>
                <div>
                    <p className={`text-[12px] font-semibold ${isDark ? 'text-white/80' : 'text-neutral-700'}`}>Report Verified</p>
                    <p className={`text-[10px] ${isDark ? 'text-white/25' : 'text-neutral-400'}`}>FT-B3M7P2 · just now</p>
                </div>
            </div>

            {/* Card 2 — Responder Dispatched (right top) */}
            <div
                className={`${base} right-[3%] top-[28%] delay-1000 ${heroVis ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'} ${glass}`}
                style={{ ...shadow, animation: heroVis ? 'floatCard2 10s ease-in-out infinite 1.5s' : 'none' }}
            >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/15">
                    <Truck className="size-4 text-blue-400" />
                </div>
                <div>
                    <p className={`text-[12px] font-semibold ${isDark ? 'text-white/80' : 'text-neutral-700'}`}>Responder Dispatched</p>
                    <p className={`text-[10px] ${isDark ? 'text-white/25' : 'text-neutral-400'}`}>En route · 2 min ago</p>
                </div>
            </div>

            {/* Card 3 — Active Incidents (right bottom) */}
            <div
                className={`${base} right-[5%] bottom-[26%] delay-[1300ms] ${heroVis ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'} ${glass}`}
                style={{ ...shadow, animation: heroVis ? 'floatCard3 9s ease-in-out infinite 3s' : 'none' }}
            >
                <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/15">
                    <Activity className="size-4 text-amber-400" />
                    <span className="absolute -top-1 -right-1 flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                    </span>
                </div>
                <div>
                    <p className={`text-[12px] font-semibold ${isDark ? 'text-white/80' : 'text-neutral-700'}`}>3 Active Incidents</p>
                    <p className={`text-[10px] ${isDark ? 'text-white/25' : 'text-neutral-400'}`}>Being monitored live</p>
                </div>
            </div>
        </div>
    );
}

/* ─── Marquee Ticker ─────────────────────────────────────────────────────── */

function MarqueeTicker({ isDark }: { isDark: boolean }) {
    const items = ['LIVE REPORTING', 'REAL-TIME ALERTS', 'GPS TRACKING', 'PHOTO EVIDENCE', 'MDRRMO NASUGBU', 'AI VERIFIED', 'INSTANT DISPATCH', '24/7 MONITORING', 'COMMUNITY DRIVEN', 'FLOOD TRACKING'];
    const doubled = [...items, ...items];
    return (
        <div className={`relative overflow-hidden border-y ${isDark ? 'border-white/[0.04] bg-white/[0.01]' : 'border-neutral-100/80 bg-neutral-50/60'}`}>
            {/* Fade edges */}
            <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-24 ${isDark ? 'bg-gradient-to-r from-[#06090f]' : 'bg-gradient-to-r from-[#fafbfc]'} to-transparent`} />
            <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-24 ${isDark ? 'bg-gradient-to-l from-[#06090f]' : 'bg-gradient-to-l from-[#fafbfc]'} to-transparent`} />
            <div className="flex animate-[marquee_45s_linear_infinite] whitespace-nowrap py-3">
                {doubled.map((item, i) => (
                    <div key={i} className="flex shrink-0 items-center gap-5 px-5">
                        <span className={`text-[10px] font-bold tracking-[0.25em] ${isDark ? 'text-white/[0.10]' : 'text-neutral-300'}`}>{item}</span>
                        <div className={`size-[3px] rounded-full ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-400/40'}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Welcome({ canRegister = true, stats, evacuationCenters = [] }: {
    canRegister?: boolean;
    stats?: WelcomeStats;
    evacuationCenters?: EvacuationCenterData[];
}) {
    const { auth } = usePage().props;
    const scrolled = useScrolled();
    const mouse = useMouse();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const [featRef, featIn]     = useInView();
    const [stepsRef, stepsIn]   = useInView();
    const [sevRef, sevIn]       = useInView();
    const [rolesRef, rolesIn]   = useInView();
    const [ctaRef, ctaIn]       = useInView();
    const [bentoRef, bentoIn]   = useInView();
    const [evacRef, evacIn]     = useInView();

    const [demoRef, demoIn]     = useInView();

    const [heroVis, setHeroVis] = useState(false);
    const [activeSev, setActiveSev] = useState<number | null>(null);
    const [themeFlash, setThemeFlash] = useState<{ key: number; toLight: boolean; x: number; y: number } | null>(null);
    const themeBtnRef = useRef<HTMLButtonElement>(null);
    const flashKeyRef = useRef(0);

    function handleThemeToggle() {
        const toLight = isDark;
        let x = 94, y = 92;
        if (themeBtnRef.current) {
            const r = themeBtnRef.current.getBoundingClientRect();
            x = ((r.left + r.width / 2) / window.innerWidth) * 100;
            y = ((r.top + r.height / 2) / window.innerHeight) * 100;
        }
        flashKeyRef.current++;
        setThemeFlash({ key: flashKeyRef.current, toLight, x, y });
        // Change theme once the overlay fully covers the screen (~45% into 1.1s = ~500ms)
        setTimeout(() => updateAppearance(toLight ? 'light' : 'dark'), 500);
        setTimeout(() => setThemeFlash(null), 1150);
    }

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

    return (
        <>
            <Head title="Community Flood & Hazard Reporting">
                <meta name="description" content="FloodTrack helps residents of Nasugbu, Batangas report flood and road hazards in real time." />
            </Head>

            <ScrollProgressBar />
            <CursorSpotlight isDark={isDark} />

            <ClickSpark sparkColor={isDark ? '#38bdf8' : '#6366f1'} sparkSize={8} sparkRadius={20} sparkCount={6} duration={500} extraScale={1.5}>
            <div className={`min-h-screen overflow-x-hidden antialiased selection:bg-cyan-500/30 ${isDark ? 'bg-[#06090f] text-white' : 'bg-[#fafbfc] text-neutral-900'}`}>

                {/* Noise texture overlay */}
                <div className={`pointer-events-none fixed inset-0 z-[100] ${isDark ? 'opacity-[0.018]' : 'opacity-[0.006]'}`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}
                />

                {/* ── Navbar ─────────────────────────────────────────── */}
                <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
                    scrolled
                        ? isDark
                            ? 'bg-[#06090f]/80 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150'
                            : 'bg-white/85 shadow-lg shadow-neutral-200/40 backdrop-blur-2xl backdrop-saturate-150'
                        : 'bg-transparent'
                }`}>
                    {/* Animated gradient border bottom — visible when scrolled */}
                    <div className={`absolute inset-x-0 bottom-0 h-px transition-opacity duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="h-full w-full animated-border" />
                    </div>

                    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
                        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3">
                            <div className="relative transition-all duration-300 group-hover:scale-110">
                                <AppLogoIcon className={`size-9 sm:size-10 rounded-[13px] sm:rounded-[14px] shadow-xl transition-all duration-300 ${scrolled ? 'shadow-blue-900/30' : 'shadow-blue-900/20'} group-hover:shadow-blue-900/40`} />
                            </div>
                            <span className="text-[1.05rem] sm:text-[1.15rem] font-bold tracking-tight">
                                <span className={isDark ? 'text-white' : 'text-slate-900'}>Flood</span>
                                <GradientTextRB
                                    colors={isDark ? ['#67e8f9', '#60a5fa', '#67e8f9'] : ['#0891b2', '#2563eb', '#0891b2']}
                                    animationSpeed={4}
                                    className="text-[1.05rem] sm:text-[1.15rem] font-bold tracking-tight"
                                >
                                    Track
                                </GradientTextRB>
                            </span>
                        </Link>

                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* Theme toggle */}
                            <button
                                ref={themeBtnRef}
                                onClick={handleThemeToggle}
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                className={`flex size-9 items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isDark ? 'text-amber-400 hover:bg-white/[0.06]' : 'text-indigo-500 hover:bg-neutral-100'}`}
                            >
                                {isDark ? <Sun className="size-[18px] sm:size-4" /> : <Moon className="size-[18px] sm:size-4" />}
                            </button>

                            <a
                                href="https://expo.dev/artifacts/eas/t5gy1gi0K96Ltczy4xeLlMcLFCZ8k7X0en-YrTqccoo.apk"
                                className={`group flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-300 hover:scale-105 active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${isDark ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20' : 'bg-gradient-to-r from-cyan-50 to-blue-50 text-blue-600 hover:from-cyan-100 hover:to-blue-100'}`}
                            >
                                <Download className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                                <span className="hidden sm:inline">Download App</span>
                                <span className="sm:hidden">App</span>
                            </a>

                            <div className={`hidden sm:block h-5 w-px mx-1 ${isDark ? 'bg-white/[0.06]' : 'bg-neutral-200'}`} />

                            {auth.user ? (
                                <Magnet padding={40} magnetStrength={4}>
                                    <PremiumButton href={auth.user.role === 'admin' ? '/admin' : dashboard.url()}>
                                        Dashboard
                                    </PremiumButton>
                                </Magnet>
                            ) : (
                                <>
                                    <Link href={login()} className={`hidden sm:inline-flex px-5 py-2.5 text-sm font-medium transition-colors duration-200 rounded-xl ${isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.04]' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}>
                                        Sign in
                                    </Link>
                                    {canRegister && (
                                        <Magnet padding={40} magnetStrength={4}>
                                            <PremiumButton href="/register">Get started</PremiumButton>
                                        </Magnet>
                                    )}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main>

                    {/* ── HERO ─────────────────────────────────────────── */}
                    <section className={`relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 ${!isDark ? 'bg-gradient-to-b from-slate-50 via-white to-[#fafbfc]' : ''}`}>

                        {/* Light mode subtle top gradient wash */}
                        {!isDark && (
                            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full opacity-[0.35] blur-[120px]"
                                    style={{ background: 'radial-gradient(ellipse, rgba(56,189,248,0.15), rgba(99,102,241,0.08), transparent 70%)' }}
                                />
                            </div>
                        )}

                        {/* Aurora background — primary hero visual */}
                        <div className={`pointer-events-none absolute inset-0 ${isDark ? 'opacity-50' : 'opacity-25'}`}>
                            <Aurora
                                colorStops={isDark ? ['#06b6d4', '#3b82f6', '#8b5cf6'] : ['#0891b2', '#2563eb', '#7c3aed']}
                                amplitude={1.4}
                                blend={0.5}
                                speed={0.4}
                            />
                        </div>

                        {/* Canvas particles — subtle depth layer */}
                        <div className={`pointer-events-none absolute inset-0 ${isDark ? 'opacity-40' : 'opacity-15'}`}>
                            <ParticleField />
                        </div>

                        {/* Gradient orb — parallax accent */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className={`absolute -left-40 -top-40 size-[800px] rounded-full blur-[160px] ${isDark ? 'opacity-[0.07]' : 'opacity-[0.05]'}`}
                                style={{ background: 'conic-gradient(from 200deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)', transform: `translate(${mouse.x * 3}px, ${mouse.y * 3}px)`, transition: 'transform 0.8s cubic-bezier(.22,1,.36,1)' }}
                            />
                        </div>

                        {/* Grid */}
                        <div className={`pointer-events-none absolute inset-0 ${isDark ? 'opacity-[0.025]' : 'opacity-[0.035]'}`}
                            style={{ backgroundImage: isDark ? 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)' : 'linear-gradient(rgba(99,102,241,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.07) 1px, transparent 1px)', backgroundSize: '72px 72px', transform: `translate(${mouse.x * 0.5}px, ${mouse.y * 0.5}px)`, transition: 'transform 1s ease-out' }}
                        />

                        {/* Radial vignette — less aggressive to let Aurora shine */}
                        <div className="pointer-events-none absolute inset-0" style={{ background: isDark ? 'radial-gradient(ellipse 85% 75% at 50% 40%, transparent 0%, #06090f 100%)' : 'radial-gradient(ellipse 90% 80% at 50% 40%, transparent 0%, rgba(250,251,252,0.88) 100%)' }} />

                        {/* Content */}
                        <div className="relative z-10 mx-auto max-w-5xl text-center">

                            {/* Badge */}
                            <div className={`mb-6 sm:mb-10 inline-flex items-center gap-2 sm:gap-3 rounded-full border px-3.5 sm:px-5 py-1.5 sm:py-2 backdrop-blur-md transition-all duration-1000 ${isDark ? 'border-white/[0.06] bg-white/[0.03]' : 'border-blue-100/80 bg-white/70 shadow-lg shadow-blue-500/[0.04]'} ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                                <span className="relative flex size-[6px]">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex size-[6px] rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                                </span>
                                <ShinyText
                                    text="Live hazard reporting"
                                    speed={3}
                                    className={`text-[11px] sm:text-[13px] font-medium ${isDark ? 'text-white/40' : 'text-neutral-500'}`}
                                    color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(100,116,139,0.6)'}
                                    shineColor={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(6,182,212,0.9)'}
                                />
                                <span className={`hidden sm:block h-3 w-px ${isDark ? 'bg-white/[0.08]' : 'bg-neutral-300'}`} />
                                <span className="hidden sm:inline-flex">
                                    <GradientTextRB
                                        colors={isDark ? ['#67e8f9', '#60a5fa', '#67e8f9'] : ['#0891b2', '#2563eb', '#0891b2']}
                                        animationSpeed={4}
                                        className="text-[13px] font-semibold"
                                    >
                                        Nasugbu, Batangas
                                    </GradientTextRB>
                                </span>
                            </div>

                            {/* Heading */}
                            <h1 className={`mb-5 sm:mb-8 text-[clamp(1.85rem,5.5vw,5rem)] font-extrabold leading-[1.1] tracking-[-0.035em] transition-all duration-1000 delay-150 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14'}`}>
                                <span className={`block bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-b from-white via-white to-white/60' : 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-500'}`}>
                                    Report floods & hazards
                                </span>
                                <span className="relative mt-1 inline-block">
                                    <GradientTextRB
                                        colors={isDark ? ['#67e8f9', '#60a5fa', '#a78bfa', '#67e8f9'] : ['#06b6d4', '#3b82f6', '#6366f1', '#06b6d4']}
                                        animationSpeed={5}
                                        className="text-[clamp(1.85rem,5.5vw,5rem)] font-extrabold leading-[1.1] tracking-[-0.035em]"
                                    >
                                        in real time
                                    </GradientTextRB>
                                    <span className="absolute -bottom-1 sm:-bottom-2 left-0 right-0 h-[2px] sm:h-[3px] rounded-full bg-gradient-to-r from-cyan-500/60 via-blue-500/60 to-violet-500/60 blur-sm" />
                                </span>
                            </h1>

                            {/* Sub */}
                            <div className={`mx-auto mb-8 sm:mb-14 max-w-[38rem] transition-all duration-1000 delay-300 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14'}`}>
                                {heroVis && (
                                    <BlurText
                                        text="Connect directly with MDRRMO. Submit a hazard report from your phone in seconds — with GPS location, photo evidence, and severity level. Responders are dispatched faster."
                                        delay={30}
                                        animateBy="words"
                                        direction="bottom"
                                        className={`text-[0.95rem] sm:text-[1.1rem] leading-relaxed font-[350] justify-center ${isDark ? 'text-white/35' : 'text-slate-500'}`}
                                    />
                                )}
                            </div>

                            {/* CTA */}
                            <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto transition-all duration-1000 delay-500 ${heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14'}`}>
                                {canRegister && !auth.user && (
                                    <div className="w-full sm:w-auto">
                                        <Magnet padding={60} magnetStrength={3}>
                                            <StarBorder color={isDark ? 'rgba(56,189,248,0.6)' : 'rgba(59,130,246,0.5)'} speed="5s" thickness={1} className="rounded-2xl">
                                                <Link href={'/register'} className="hero-cta group relative overflow-hidden rounded-2xl px-7 py-3.5 text-sm font-bold text-white shadow-2xl text-center transition-all duration-300 sm:px-10 sm:py-4 sm:text-[15px] hover:shadow-cyan-500/25 active:scale-[0.97]">
                                                    <span className="relative z-10 flex items-center justify-center gap-2.5">
                                                        Create free account
                                                        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                                                    </span>
                                                </Link>
                                            </StarBorder>
                                        </Magnet>
                                    </div>
                                )}
                                <div className="w-full sm:w-auto">
                                    <Magnet padding={50} magnetStrength={4}>
                                        <Link
                                            href={auth.user ? (auth.user.role === 'admin' ? '/admin' : dashboard()) : login()}
                                            className={`group flex items-center justify-center gap-2 rounded-2xl border px-7 py-3.5 text-sm font-semibold backdrop-blur-md transition-all duration-300 sm:px-10 sm:py-4 sm:text-[15px] hover:scale-[1.04] active:scale-[0.97] ${isDark ? 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/90 hover:border-white/[0.12]' : 'border-neutral-200/80 bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 hover:border-blue-200/60 shadow-lg shadow-blue-500/[0.04] ring-1 ring-neutral-100 hover:ring-blue-100/50'}`}
                                        >
                                            {auth.user ? 'Go to dashboard' : 'Sign in'}
                                            <ArrowUpRight className="size-4 opacity-40 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                        </Link>
                                    </Magnet>
                                </div>
                            </div>
                        </div>

                        {/* Floating accent cards — xl only */}
                        <FloatingHeroCards isDark={isDark} heroVis={heroVis} />

                        {/* Scroll cue */}
                        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 transition-all duration-1000 delay-[900ms] ${heroVis ? 'opacity-30' : 'opacity-0'}`}>
                            <span className={`text-[10px] font-semibold tracking-[0.2em] uppercase ${isDark ? 'text-white/30' : 'text-neutral-300'}`}>Scroll</span>
                            <ChevronDown className={`size-4 animate-[bounce-soft_2.5s_ease-in-out_infinite] ${isDark ? 'text-white/20' : 'text-neutral-300'}`} />
                        </div>
                    </section>

                    {/* ── SCROLL VELOCITY TICKER ──────────────────────────── */}
                    <div className={`relative overflow-hidden border-y py-3 ${isDark ? 'border-white/[0.04] bg-white/[0.01]' : 'border-neutral-100/80 bg-neutral-50/60'}`}>
                        {/* Fade edges */}
                        <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-32 ${isDark ? 'bg-gradient-to-r from-[#06090f]' : 'bg-gradient-to-r from-[#fafbfc]'} to-transparent`} />
                        <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-32 ${isDark ? 'bg-gradient-to-l from-[#06090f]' : 'bg-gradient-to-l from-[#fafbfc]'} to-transparent`} />
                        <ScrollVelocity
                            texts={['LIVE REPORTING  ·  REAL-TIME ALERTS  ·  GPS TRACKING  ·  PHOTO EVIDENCE  ·  MDRRMO NASUGBU  ·  AI VERIFIED  ·  INSTANT DISPATCH  ·  24/7 MONITORING  ·  COMMUNITY DRIVEN  ·  FLOOD TRACKING  ·  ']}
                            velocity={30}
                            className={`text-[10px] font-bold tracking-[0.25em] ${isDark ? 'text-white/[0.10]' : 'text-neutral-300'}`}
                            numCopies={4}
                        />
                    </div>

                    {/* ── LIVE STATS ──────────────────────────────────────── */}
                    <section className="relative px-3 py-10 sm:px-6 sm:py-16" ref={bentoRef}>
                        <div className="mx-auto max-w-6xl">
                            {/* Glass container */}
                            <div className={`relative overflow-hidden rounded-2xl sm:rounded-[28px] border p-1 backdrop-blur-xl transition-all duration-[1000ms] ${isDark ? 'border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01]' : 'border-neutral-200/80 bg-white/80 shadow-2xl shadow-blue-500/[0.04] ring-1 ring-neutral-100'} ${bentoIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                {/* Animated top border glow */}
                                <div className="absolute inset-x-0 top-0 h-px animated-border" />

                                <div className={`grid grid-cols-2 sm:grid-cols-4 sm:divide-x ${isDark ? 'divide-white/[0.04]' : 'divide-neutral-100'}`}>
                                    {([
                                        { value: stats?.total_reports ?? 0, label: 'Reports Filed', sub: 'Community submissions', icon: TrendingUp, accentColor: '#22d3ee', gradient: 'from-cyan-400 to-blue-500' },
                                        { value: stats?.resolved_reports ?? 0, label: 'Resolved', sub: 'Hazards addressed', icon: CheckCircle2, accentColor: '#34d399', gradient: 'from-emerald-400 to-teal-500' },
                                        { value: stats?.active_incidents ?? 0, label: 'Active Now', sub: 'Being monitored', icon: Activity, accentColor: '#fbbf24', gradient: 'from-amber-400 to-orange-500', pulse: true },
                                        { value: stats?.evacuation_centers ?? 0, label: 'Evacuation Centers', sub: 'Ready & active', icon: Building2, accentColor: '#a78bfa', gradient: 'from-violet-400 to-purple-500' },
                                    ] as const).map((s, i) => {
                                        const Icon = s.icon;
                                        return (
                                            <div
                                                key={s.label}
                                                className={`group relative flex flex-col items-center justify-center px-4 py-8 text-center transition-all duration-500 sm:py-10 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-neutral-50'} ${bentoIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${i < 2 ? `border-b sm:border-b-0 ${isDark ? 'border-white/[0.04]' : 'border-neutral-100'}` : ''} ${i % 2 === 0 ? `border-r sm:border-r-0 ${isDark ? 'border-white/[0.04]' : 'border-neutral-100'}` : ''}`}
                                                style={{ transitionDelay: `${i * 100}ms` }}
                                            >
                                                {/* Hover glow */}
                                                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                                                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${s.accentColor}0a, transparent 70%)` }}
                                                />
                                                <div className={`relative mb-4 inline-flex rounded-2xl bg-gradient-to-br ${s.gradient} p-3 shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl`}>
                                                    <Icon className="size-5 text-white" />
                                                    <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/25 to-transparent" />
                                                </div>
                                                <div className="relative flex items-center gap-1.5">
                                                    <CountUpRB
                                                        to={s.value}
                                                        from={0}
                                                        separator=","
                                                        duration={2.5}
                                                        className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${isDark ? 'text-white' : 'text-neutral-900'}`}
                                                        startWhen={bentoIn}
                                                    />
                                                    {'pulse' in s && s.pulse && s.value > 0 && (
                                                        <span className="relative flex size-2">
                                                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-50" />
                                                            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`mt-1.5 text-[13px] font-semibold ${isDark ? 'text-white/50' : 'text-neutral-500'}`}>
                                                    <DecryptedText
                                                        text={s.label}
                                                        speed={40}
                                                        maxIterations={15}
                                                        sequential={true}
                                                        revealDirection="center"
                                                        animateOn="view"
                                                        className={isDark ? 'text-white/50' : 'text-neutral-500'}
                                                        encryptedClassName={isDark ? 'text-white/20' : 'text-neutral-300'}
                                                    />
                                                </p>
                                                <p className={`mt-0.5 text-[11px] ${isDark ? 'text-white/20' : 'text-neutral-400'}`}>{s.sub}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── FEATURES ───────────────────────────────────────── */}
                    <section className={`relative px-4 py-10 sm:px-6 sm:py-32 ${!isDark ? 'bg-gradient-to-b from-white via-slate-50/50 to-white' : ''}`} ref={featRef}>
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
                                        <SpotlightCard
                                            key={f.title}
                                            className={`feat-card group rounded-2xl sm:rounded-[20px] border p-5 transition-all duration-500 sm:p-8 hover:-translate-y-2 ${isDark ? 'border-white/[0.04] bg-[#0a0e17] hover:border-white/[0.1] hover:shadow-2xl hover:shadow-black/30' : 'border-neutral-200/70 bg-white/80 backdrop-blur-sm hover:border-blue-200/60 hover:shadow-2xl hover:shadow-blue-500/[0.06] ring-1 ring-transparent hover:ring-blue-100/50'} ${featIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                            spotlightColor={isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(59, 130, 246, 0.06)'}
                                        >
                                            {/* Shimmer sweep on hover */}
                                            <div className={`pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent to-transparent skew-x-[-20deg] ${isDark ? 'via-white/[0.03]' : 'via-blue-500/[0.03]'}`} />

                                            <div className={`relative mb-6 inline-flex rounded-2xl bg-gradient-to-br ${f.grad} p-3.5 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-2xl`}>
                                                <Icon className="size-[22px] text-white transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                                            </div>
                                            <h3 className={`relative mb-2 text-[17px] font-semibold transition-colors duration-300 ${isDark ? 'text-white/90 group-hover:text-white' : 'text-neutral-800 group-hover:text-neutral-900'}`}>
                                                <DecryptedText
                                                    text={f.title}
                                                    animateOn="hover"
                                                    speed={30}
                                                    maxIterations={8}
                                                    sequential={true}
                                                    revealDirection="start"
                                                    className={isDark ? 'text-white/90' : 'text-neutral-800'}
                                                    encryptedClassName={isDark ? 'text-cyan-400/40' : 'text-blue-400/50'}
                                                />
                                            </h3>
                                            <p className={`relative text-[14px] leading-relaxed font-[350] transition-colors duration-300 ${isDark ? 'text-white/35 group-hover:text-white/50' : 'text-neutral-500 group-hover:text-neutral-600'}`}>{f.body}</p>
                                        </SpotlightCard>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── HOW IT WORKS ───────────────────────────────────── */}
                    <section className="relative px-4 py-10 sm:px-6 sm:py-32" ref={stepsRef}>
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

                            <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
                                {/* Connector */}
                                <div className="absolute left-[16.6%] right-[16.6%] top-[72px] hidden h-px sm:block">
                                    <div className={`h-full bg-gradient-to-r ${isDark ? 'from-white/[0.03] via-white/[0.06] to-white/[0.03]' : 'from-neutral-200/30 via-neutral-200/60 to-neutral-200/30'}`} />
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
                                            <div className={`group/step relative z-10 mb-6 sm:mb-8 flex size-24 sm:size-36 flex-col items-center justify-center rounded-[22px] sm:rounded-[28px] border shadow-2xl ${s.ring} transition-all duration-500 hover:scale-110 cursor-pointer ${isDark ? 'border-white/[0.05] bg-[#0a0e17] hover:border-white/[0.1] hover:shadow-3xl' : 'border-neutral-200/70 bg-white hover:border-blue-200/60 hover:shadow-2xl hover:shadow-blue-500/[0.06]'}`}>
                                                {/* Pulse ring on hover */}
                                                <div className="absolute inset-0 rounded-[28px] opacity-0 group-hover/step:opacity-100 transition-opacity duration-500 group-hover/step:animate-[ringPulse_1.5s_ease-out_infinite]"
                                                    style={{ boxShadow: `0 0 0 0 ${s.grad.includes('sky') ? 'rgba(56,189,248,0.3)' : s.grad.includes('cyan') ? 'rgba(6,182,212,0.3)' : 'rgba(52,211,153,0.3)'}` }}
                                                />
                                                <div className={`rounded-xl sm:rounded-2xl bg-gradient-to-br ${s.grad} p-3 sm:p-4 shadow-xl transition-all duration-500 group-hover/step:-translate-y-1 group-hover/step:shadow-2xl`}>
                                                    <Icon className="size-6 sm:size-7 text-white transition-transform duration-500 group-hover/step:scale-125 group-hover/step:rotate-6" />
                                                    <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                                                </div>
                                                <span className={`mt-3 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors duration-300 ${isDark ? 'text-white/15 group-hover/step:text-white/30' : 'text-neutral-400 group-hover/step:text-neutral-500'}`}>{s.n}</span>
                                            </div>
                                            <h3 className={`mb-2 text-base sm:text-[1.15rem] font-bold ${isDark ? 'text-white/90' : 'text-neutral-800'}`}>{s.title}</h3>
                                            <p className={`max-w-[260px] text-[13px] sm:text-[14px] leading-relaxed font-[350] ${isDark ? 'text-white/35' : 'text-neutral-500'}`}>{s.body}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── PHONE DEMO ────────────────────────────────────── */}
                    <section className="relative px-4 py-10 sm:px-6 sm:py-32 overflow-hidden" ref={demoRef}>
                        <GlowDivider />

                        {/* Background orbs */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className={`absolute right-[-10%] top-[20%] w-[700px] h-[700px] rounded-full blur-[140px] ${isDark ? 'opacity-[0.06]' : 'opacity-[0.04]'}`}
                                style={{ background: 'conic-gradient(from 120deg, #8b5cf6, #3b82f6, #06b6d4, #8b5cf6)' }}
                            />
                            <div className={`absolute left-[-10%] bottom-[10%] w-[500px] h-[500px] rounded-full blur-[100px] ${isDark ? 'opacity-[0.04]' : 'opacity-[0.03]'}`}
                                style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }}
                            />
                        </div>

                        <div className="relative mx-auto max-w-6xl">
                            <SectionHead
                                visible={demoIn}
                                badge="See it in action"
                                badgeIcon={<Smartphone className="size-3" />}
                                badgeColor="border-blue-500/20 bg-blue-500/[0.06] text-blue-400"
                                title={<>Report a hazard <Gradient>in seconds</Gradient></>}
                                sub="Four taps from your phone to a verified report on the MDRRMO dashboard."
                            />

                            <PhoneDemo visible={demoIn} />
                        </div>
                    </section>

                    {/* ── SEVERITY ───────────────────────────────────────── */}
                    <section className={`relative px-4 py-10 sm:px-6 sm:py-32 ${!isDark ? 'bg-gradient-to-b from-white via-slate-50/50 to-white' : ''}`} ref={sevRef}>
                        <GlowDivider />

                        {/* Background warmth */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] rounded-full blur-[120px] ${isDark ? 'opacity-[0.06]' : 'opacity-[0.04]'}`}
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

                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {([
                                    { level: 'Low', color: '#22c55e', icon: CheckCircle2, meaning: 'Passable. Monitor only.', detail: 'Accessible area. Continuous monitoring recommended. No immediate action.' },
                                    { level: 'Moderate', color: '#eab308', icon: AlertTriangle, meaning: 'Caution — may worsen.', detail: 'Exercise caution. May deteriorate. Prepare for possible response.' },
                                    { level: 'High', color: '#f97316', icon: AlertTriangle, meaning: 'Unsafe. Prompt action.', detail: 'Area is unsafe. Prompt dispatch required. Avoid unless responding.' },
                                    { level: 'Critical', color: '#ef4444', icon: Siren, meaning: 'Life-threatening.', detail: 'Immediate threat to life. Emergency dispatch now. All units respond.' },
                                ] as const).map((s, i) => {
                                    const Icon = s.icon;
                                    const open = activeSev === i;
                                    return (
                                        <SpotlightCard
                                            key={s.level}
                                            className={`group cursor-pointer rounded-2xl sm:rounded-[20px] border p-4 transition-all duration-500 sm:p-7 hover:-translate-y-2 ${isDark ? 'border-white/[0.04] bg-[#0a0e17] hover:border-white/[0.1] hover:shadow-2xl' : 'border-neutral-200/70 bg-white/80 backdrop-blur-sm hover:border-blue-200/60 hover:shadow-2xl hover:shadow-blue-500/[0.06]'} ${sevIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${open ? isDark ? 'scale-[1.03] border-white/[0.12] shadow-2xl' : 'scale-[1.03] border-blue-200/80 shadow-2xl shadow-blue-500/[0.06] ring-1 ring-blue-100/50' : ''}`}
                                            spotlightColor={`${s.color}15`}
                                        >
                                            <div onClick={() => setActiveSev(open ? null : i)} className="relative"
                                            >

                                            {/* Shimmer sweep */}
                                            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skew-x-[-20deg]" />

                                            <div className="relative mb-3 sm:mb-5 inline-flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-[14px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-all duration-500 group-hover:scale-105"
                                                style={{ backgroundColor: s.color + '12', color: s.color, boxShadow: open ? `0 0 24px ${s.color}20` : `0 0 0 ${s.color}00` }}
                                            >
                                                <Icon className="size-4 sm:size-[18px] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                                                {s.level}
                                            </div>
                                            <p className={`relative text-[14px] font-medium transition-colors duration-300 ${isDark ? 'text-white/70 group-hover:text-white/85' : 'text-neutral-600 group-hover:text-neutral-800'}`}>{s.meaning}</p>
                                            <div className="overflow-hidden transition-all duration-500"
                                                style={{ maxHeight: open ? '80px' : '0', opacity: open ? 1 : 0 }}
                                            >
                                                <p className={`mt-3 text-[13px] leading-relaxed ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>{s.detail}</p>
                                            </div>
                                            <div className="relative mt-4 h-[2px] rounded-full overflow-hidden transition-all duration-700"
                                                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', width: '100%' }}
                                            >
                                                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                                    style={{ backgroundColor: s.color + '50', width: open ? '100%' : '0%' }}
                                                />
                                            </div>
                                            </div>
                                        </SpotlightCard>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── ROLES ──────────────────────────────────────────── */}
                    <section className="relative px-4 py-10 sm:px-6 sm:py-32" ref={rolesRef}>
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

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {([
                                    { role: 'Residents',     icon: Home, grad: 'from-sky-500 to-blue-600', accent: 'bg-sky-500', accentColor: '#38bdf8', points: ['Report hazards with GPS + photos', 'Track your report status live', 'Receive official MDRRMO alerts', 'View all hazards on the map'] },
                                    { role: 'Responders',    icon: Truck, grad: 'from-cyan-500 to-teal-600', accent: 'bg-cyan-500', accentColor: '#06b6d4', points: ['Receive assigned incident queue', 'Navigate directly to hazard', 'Update status en route / on scene', 'Upload field evidence'] },
                                    { role: 'MDRRMO Admin',  icon: Shield, grad: 'from-violet-500 to-indigo-600', accent: 'bg-violet-500', accentColor: '#a78bfa', points: ['Verify & triage incoming reports', 'Assign responders from dashboard', 'Publish official public advisories', 'Monitor all active incidents'] },
                                ] as const).map((r, i) => {
                                    const Icon = r.icon;
                                    return (
                                    <SpotlightCard
                                        key={r.role}
                                        className={`group rounded-2xl sm:rounded-[20px] border p-5 transition-all duration-500 sm:p-9 hover:-translate-y-3 ${isDark ? 'border-white/[0.04] bg-[#0a0e17] hover:border-white/[0.1] hover:shadow-2xl hover:shadow-black/30' : 'border-neutral-200/70 bg-white/80 backdrop-blur-sm hover:border-blue-200/60 hover:shadow-2xl hover:shadow-blue-500/[0.06] ring-1 ring-transparent hover:ring-blue-100/50'} ${rolesIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                        spotlightColor={isDark ? `rgba(${r.role === 'Residents' ? '56,189,248' : r.role === 'Responders' ? '6,182,212' : '167,139,250'}, 0.1)` : `rgba(${r.role === 'Residents' ? '56,189,248' : r.role === 'Responders' ? '6,182,212' : '167,139,250'}, 0.08)`}
                                    >
                                        {/* Shimmer sweep */}
                                        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-[-20deg]" />

                                        <div className={`relative mb-4 sm:mb-6 inline-flex rounded-[18px] sm:rounded-[22px] bg-gradient-to-br ${r.grad} p-3 sm:p-4 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-2xl`}>
                                            <Icon className="size-6 sm:size-7 text-white transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-[1px] rounded-[17px] sm:rounded-[21px] bg-gradient-to-b from-white/20 to-transparent" />
                                        </div>
                                        <h3 className={`mb-1.5 text-xl font-bold transition-colors duration-300 ${isDark ? 'text-white/90 group-hover:text-white' : 'text-neutral-800 group-hover:text-neutral-900'}`}>{r.role}</h3>
                                        <div className={`mb-6 h-[3px] w-10 rounded-full ${r.accent} opacity-50 transition-all duration-700 group-hover:w-24 group-hover:opacity-100`} />
                                        <ul className="space-y-3.5">
                                            {r.points.map((p, pi) => (
                                                <li key={p} className={`flex items-start gap-3 text-[14px] font-[350] transition-all duration-500 ${isDark ? 'text-white/40 group-hover:text-white/55' : 'text-neutral-500 group-hover:text-neutral-600'}`}
                                                    style={{ transitionDelay: `${pi * 50}ms` }}
                                                >
                                                    <CheckCircle2 className="mt-[3px] size-4 shrink-0 text-emerald-500/50 transition-all duration-500 group-hover:text-emerald-400/80 group-hover:scale-110" />
                                                    <span>{p}</span>
                                                </li>
                                            ))}
                                        </ul>

                                    </SpotlightCard>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── EVACUATION CENTERS MAP ─────────────────────────── */}
                    {evacuationCenters.length > 0 && (
                        <section className={`relative px-4 py-10 sm:px-6 sm:py-32 ${!isDark ? 'bg-gradient-to-b from-white via-slate-50/50 to-white' : ''}`} ref={evacRef}>
                            <GlowDivider />

                            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                <div className={`absolute left-1/2 top-1/3 -translate-x-1/2 w-[1000px] h-[500px] rounded-full blur-[140px] ${isDark ? 'opacity-[0.05]' : 'opacity-[0.03]'}`}
                                    style={{ background: 'conic-gradient(from 240deg, #06b6d4, #22c55e, #06b6d4)' }}
                                />
                            </div>

                            <div className="relative mx-auto max-w-6xl">
                                <SectionHead
                                    visible={evacIn}
                                    badge="Safety"
                                    badgeIcon={<Building2 className="size-3" />}
                                    badgeColor="border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
                                    title={<>Evacuation centers <GradientAlt>near you</GradientAlt></>}
                                    sub="Know where to go before disaster strikes. All centers are verified by MDRRMO."
                                />

                                <div className={`transition-all duration-[800ms] ${evacIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                    {/* Map — glass frame */}
                                    <div className="relative group/map">
                                        <div className={`absolute -inset-px rounded-2xl sm:rounded-[24px] bg-gradient-to-b to-transparent opacity-0 transition-opacity duration-700 group-hover/map:opacity-100 ${isDark ? 'from-white/[0.08] via-white/[0.02]' : 'from-neutral-200/40 via-neutral-100/20'}`} />
                                        <div className={`relative overflow-hidden rounded-2xl sm:rounded-[24px] border shadow-2xl ${isDark ? 'border-white/[0.06] bg-[#080c14] shadow-black/40' : 'border-neutral-200/70 bg-white ring-1 ring-neutral-100 shadow-blue-500/[0.04]'}`}>
                                            {/* Map header bar */}
                                            <div className={`flex items-center gap-3 border-b px-5 py-3 ${isDark ? 'border-white/[0.04] bg-white/[0.02]' : 'border-neutral-100 bg-neutral-50'}`}>
                                                <div className="flex gap-1.5">
                                                    <div className="size-[10px] rounded-full bg-red-500/40" />
                                                    <div className="size-[10px] rounded-full bg-amber-500/40" />
                                                    <div className="size-[10px] rounded-full bg-emerald-500/40" />
                                                </div>
                                                <div className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-1 ${isDark ? 'bg-white/[0.03]' : 'bg-neutral-100'}`}>
                                                    <MapPin className="size-3 text-emerald-400/60" />
                                                    <span className={`text-[10px] font-medium tracking-wide ${isDark ? 'text-white/25' : 'text-neutral-400'}`}>Nasugbu, Batangas</span>
                                                </div>
                                                <div className="w-[52px]" />
                                            </div>
                                            <EvacuationMap centers={evacuationCenters} />
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency contact strip — glass */}
                                <div className={`mt-10 relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-[800ms] delay-300 ${isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-neutral-200/70 bg-white/60 ring-1 ring-neutral-100'} ${evacIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-4 sm:px-6 py-4 sm:py-5">
                                        {([
                                            { icon: PhoneCall, color: 'text-red-400', label: 'Emergency', value: '911', bg: 'bg-red-500/[0.06]' },
                                            { icon: Shield, color: 'text-cyan-400', label: 'MDRRMO Nasugbu', value: '', bg: 'bg-cyan-500/[0.06]' },
                                            { icon: Siren, color: 'text-amber-400', label: 'Red Cross', value: '143', bg: 'bg-amber-500/[0.06]' },
                                        ] as const).map((c, i) => {
                                            const Icon = c.icon;
                                            return (
                                                <div key={c.label} className="flex items-center gap-3">
                                                    {i > 0 && <div className={`hidden sm:block h-5 w-px -ml-4 mr-1 ${isDark ? 'bg-white/[0.05]' : 'bg-neutral-200'}`} />}
                                                    <div className={`flex size-8 items-center justify-center rounded-lg ${c.bg}`}>
                                                        <Icon className={`size-3.5 ${c.color}`} />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[13px] font-medium ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>{c.label}</span>
                                                        {c.value && <span className={`text-[13px] font-bold ${isDark ? 'text-white/70' : 'text-neutral-700'}`}>{c.value}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ── CTA ────────────────────────────────────────────── */}
                    {!auth.user && canRegister && (
                        <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-40" ref={ctaRef}>
                            <GlowDivider />

                            {/* CTA glow */}
                            <div className="pointer-events-none absolute inset-0">
                                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full blur-[120px] ${isDark ? 'opacity-[0.08]' : 'opacity-[0.05]'}`}
                                    style={{ background: 'conic-gradient(from 180deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)' }}
                                />
                            </div>

                            <div className={`relative mx-auto max-w-3xl text-center transition-all duration-[800ms] ${ctaIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                <div className="water-ripple logo-float glow-pulse mb-6 sm:mb-8 inline-flex">
                                    <AppLogoIcon className="size-16 sm:size-24 rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-blue-900/20" />
                                </div>
                                <h2 className="mb-4 sm:mb-5 text-3xl font-bold tracking-tight sm:text-5xl">
                                    <span className={`bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-b from-white to-white/70' : 'bg-gradient-to-b from-slate-900 to-slate-500'}`}>Ready to help keep </span>
                                    <Gradient>Nasugbu safe?</Gradient>
                                </h2>
                                <p className={`mx-auto mb-8 sm:mb-14 max-w-md text-base sm:text-lg font-[350] ${isDark ? 'text-white/35' : 'text-neutral-500'}`}>
                                    Join residents and responders already using FloodTrack. Free to use, forever.
                                </p>
                                <ClickSpark sparkColor={isDark ? '#38bdf8' : '#3b82f6'} sparkSize={12} sparkRadius={25} sparkCount={10} duration={500}>
                                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
                                        <div className="w-full sm:w-auto"><Magnet padding={60} magnetStrength={3}>
                                            <StarBorder color={isDark ? 'rgba(56,189,248,0.6)' : 'rgba(59,130,246,0.5)'} speed="5s" thickness={1} className="rounded-2xl">
                                                <Link href={'/register'} className="hero-cta group relative overflow-hidden rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-2xl transition-all duration-300 sm:px-12 sm:py-4.5 sm:text-[15px] hover:shadow-cyan-500/25 active:scale-[0.97]">
                                                    <span className="relative z-10 flex items-center gap-2.5">
                                                        Create free account
                                                        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                                                    </span>
                                                </Link>
                                            </StarBorder>
                                        </Magnet></div>
                                        <div className="w-full sm:w-auto"><Magnet padding={50} magnetStrength={4}>
                                            <Link href={login()} className={`group flex items-center justify-center gap-2 rounded-2xl border px-8 py-3.5 text-sm font-bold backdrop-blur-md transition-all duration-300 sm:px-12 sm:py-4.5 sm:text-[15px] hover:scale-[1.04] active:scale-[0.97] ${isDark ? 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/80' : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 shadow-sm'}`}>
                                                Sign in
                                            </Link>
                                        </Magnet></div>
                                    </div>
                                </ClickSpark>
                            </div>
                        </section>
                    )}
                </main>

                {/* ── Footer ─────────────────────────────────────────── */}
                <footer className={`relative border-t px-4 py-10 sm:px-6 sm:py-20 ${isDark ? 'border-white/[0.04] bg-gradient-to-b from-transparent to-[#040609]' : 'border-neutral-100 bg-gradient-to-b from-[#fafbfc] to-white'}`}>
                    {/* Top gradient line */}
                    <div className="absolute inset-x-0 top-0 h-px animated-border" />

                    {/* Subtle background glow */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className={`absolute left-1/2 bottom-0 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-[120px] ${isDark ? 'opacity-[0.03]' : 'opacity-[0.02]'}`}
                            style={{ background: 'radial-gradient(ellipse, #3b82f6, transparent 70%)' }}
                        />
                    </div>

                    <div className="relative mx-auto max-w-7xl">
                        <div className="grid grid-cols-1 gap-8 text-center sm:gap-10 sm:grid-cols-3 sm:text-left">
                            {/* Brand */}
                            <div>
                                <div className="flex items-center justify-center gap-3 mb-5 sm:justify-start">
                                    <AppLogoIcon className="size-10 rounded-[14px] shadow-lg shadow-blue-900/15" />
                                    <span className="text-[1.05rem] font-bold tracking-tight">
                                        <span className={isDark ? 'text-white/70' : 'text-neutral-700'}>Flood</span>
                                        <GradientTextRB
                                            colors={isDark ? ['#67e8f9', '#60a5fa', '#67e8f9'] : ['#0891b2', '#2563eb', '#0891b2']}
                                            animationSpeed={4}
                                            className="text-[1.05rem] font-bold tracking-tight"
                                        >
                                            Track
                                        </GradientTextRB>
                                    </span>
                                </div>
                                <p className={`text-[13px] leading-relaxed max-w-[280px] mx-auto sm:mx-0 ${isDark ? 'text-white/25' : 'text-neutral-400'}`}>
                                    Community-driven flood and hazard reporting for Nasugbu, Batangas. In partnership with MDRRMO.
                                </p>
                            </div>

                            {/* Quick links */}
                            <div>
                                <h4 className={`text-[11px] font-bold tracking-[0.15em] uppercase mb-5 ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>Quick Links</h4>
                                <ul className="space-y-3">
                                    {([
                                        { label: 'Sign in', href: login() },
                                        ...(canRegister ? [{ label: 'Create account', href: '/register' }] : []),
                                    ]).map(l => (
                                        <li key={l.label}>
                                            <Link href={l.href} className={`group inline-flex items-center justify-center gap-2 text-[13px] transition-colors duration-200 sm:justify-start ${isDark ? 'text-white/30 hover:text-white/60' : 'text-neutral-400 hover:text-neutral-600'}`}>
                                                <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 hidden sm:block" />
                                                {l.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Emergency */}
                            <div>
                                <h4 className={`text-[11px] font-bold tracking-[0.15em] uppercase mb-5 ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>Emergency</h4>
                                <ul className="space-y-3">
                                    <li className="flex items-center justify-center gap-2.5 sm:justify-start">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-red-500/[0.08]">
                                            <PhoneCall className="size-3.5 text-red-400/60" />
                                        </div>
                                        <span className={`text-[13px] ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>Emergency: <span className={`font-bold ${isDark ? 'text-white/50' : 'text-neutral-600'}`}>911</span></span>
                                    </li>
                                    <li className="flex items-center justify-center gap-2.5 sm:justify-start">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/[0.08]">
                                            <Shield className="size-3.5 text-cyan-400/60" />
                                        </div>
                                        <span className={`text-[13px] ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>MDRRMO Nasugbu</span>
                                    </li>
                                    <li className="flex items-center justify-center gap-2.5 sm:justify-start">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/[0.08]">
                                            <Siren className="size-3.5 text-amber-400/60" />
                                        </div>
                                        <span className={`text-[13px] ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>Red Cross: <span className={`font-bold ${isDark ? 'text-white/50' : 'text-neutral-600'}`}>143</span></span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom bar */}
                        <div className={`mt-8 sm:mt-12 pt-5 sm:pt-6 border-t flex flex-col items-center justify-between gap-2 sm:gap-3 sm:flex-row ${isDark ? 'border-white/[0.04]' : 'border-neutral-200/60'}`}>
                            <p className={`text-[11px] sm:text-[12px] ${isDark ? 'text-white/15' : 'text-neutral-400'}`}>&copy; {new Date().getFullYear()} FloodTrack. All rights reserved.</p>
                            <p className={`text-[11px] sm:text-[12px] ${isDark ? 'text-white/10' : 'text-neutral-300'}`}>Built for the community of Nasugbu, Batangas</p>
                        </div>
                    </div>
                </footer>
            </div>
            </ClickSpark>

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

                /* Floating logo animation */
                .logo-float {
                    animation: logoFloat 6s ease-in-out infinite;
                }
                @keyframes logoFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    33% { transform: translateY(-6px) rotate(2deg); }
                    66% { transform: translateY(3px) rotate(-1deg); }
                }

                /* Glow pulse for CTA icon */
                .glow-pulse {
                    animation: glowPulse 3s ease-in-out infinite;
                }
                @keyframes glowPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(56,189,248,0.15), 0 0 60px rgba(99,102,241,0.08); }
                    50% { box-shadow: 0 0 30px rgba(56,189,248,0.25), 0 0 80px rgba(99,102,241,0.15); }
                }

                /* Stagger reveal for lists */
                .stagger-item {
                    animation: staggerIn 0.6s ease-out both;
                }
                @keyframes staggerIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Animated border gradient */
                .animated-border {
                    background: linear-gradient(90deg, transparent, rgba(56,189,248,0.15), transparent);
                    background-size: 200% 100%;
                    animation: borderSlide 3s linear infinite;
                }
                @keyframes borderSlide {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }

                /* Phone float */
                .phone-float {
                    animation: phoneFloat 8s ease-in-out infinite;
                }
                @keyframes phoneFloat {
                    0%, 100% { transform: rotateY(-4deg) rotateX(2deg) translateY(0); }
                    50% { transform: rotateY(-4deg) rotateX(2deg) translateY(-10px); }
                }

                /* Pin bounce */
                .phone-pin-bounce {
                    animation: pinBounce 2s ease-in-out infinite;
                }
                @keyframes pinBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }

                /* Ping ring for map */
                @keyframes pingRing {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
                    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                }

                /* Custom scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

                /* Leaflet popup override */
                .evac-popup .leaflet-popup-content-wrapper {
                    background: #0f1420;
                    color: #e2e8f0;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                .evac-popup .leaflet-popup-tip { background: #0f1420; }
                .evac-popup .leaflet-popup-close-button { color: rgba(255,255,255,0.3); }
                .evac-popup .leaflet-popup-close-button:hover { color: white; }

                /* Evacuation marker */
                .custom-evac-marker { background: none !important; border: none !important; }

                /* Floating hero cards */
                @keyframes floatCard1 {
                    0%, 100% { transform: translateY(0px) rotate(-1deg); }
                    50% { transform: translateY(-12px) rotate(0.5deg); }
                }
                @keyframes floatCard2 {
                    0%, 100% { transform: translateY(0px) rotate(1deg); }
                    50% { transform: translateY(-16px) rotate(-0.5deg); }
                }
                @keyframes floatCard3 {
                    0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
                    50% { transform: translateY(-10px) rotate(1deg); }
                }

                /* Marquee ticker */
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }

                /* Water ripple effect */
                .water-ripple::before {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: inherit;
                    border: 2px solid rgba(56,189,248,0.1);
                    animation: waterRipple 3s ease-out infinite;
                }
                .water-ripple::after {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: inherit;
                    border: 2px solid rgba(56,189,248,0.1);
                    animation: waterRipple 3s ease-out infinite 1.5s;
                }
                @keyframes waterRipple {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(1.15); opacity: 0; }
                }

                /* Star border animations */
                @keyframes star-movement-bottom {
                    0% { transform: translate(0%, 0%); opacity: 1; }
                    100% { transform: translate(-100%, 0%); opacity: 0; }
                }
                @keyframes star-movement-top {
                    0% { transform: translate(0%, 0%); opacity: 1; }
                    100% { transform: translate(100%, 0%); opacity: 0; }
                }

                /* Theme toggle burst */
                @keyframes themeBurst {
                    0%   { clip-path: circle(0% at var(--bx) var(--by)); opacity: 1; animation-timing-function: cubic-bezier(0.4, 0, 0.4, 1); }
                    45%  { clip-path: circle(160% at var(--bx) var(--by)); opacity: 1; animation-timing-function: linear; }
                    58%  { clip-path: circle(160% at var(--bx) var(--by)); opacity: 1; animation-timing-function: cubic-bezier(0.4, 0, 1, 1); }
                    100% { clip-path: circle(160% at var(--bx) var(--by)); opacity: 0; }
                }
            `}</style>

            {/* Theme transition burst */}
            {themeFlash && (
                <div
                    key={themeFlash.key}
                    className="pointer-events-none fixed inset-0 z-[500]"
                    style={{
                        background: themeFlash.toLight
                            ? 'radial-gradient(circle at center, #fffef0 0%, #ffffff 40%, #f0f9ff 100%)'
                            : 'radial-gradient(circle at center, #010204 0%, #06090f 55%, #06090f 100%)',
                        '--bx': `${themeFlash.x}%`,
                        '--by': `${themeFlash.y}%`,
                        animation: `themeBurst 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    } as React.CSSProperties}
                />
            )}
        </>
    );
}

/* ─── Phone Demo (synced phone + timeline) ─────────────────────────────── */

const DEMO_STEPS = [
    { icon: MapPin, gradient: 'from-sky-500 to-blue-600', color: '#38bdf8', title: 'Pin your location', desc: 'GPS auto-detects where you are. Drag the marker to fine-tune the exact position.' },
    { icon: Camera, gradient: 'from-violet-500 to-indigo-600', color: '#a78bfa', title: 'Snap photo evidence', desc: 'Take a photo or pick from gallery. AI verifies it matches a real hazard scene.' },
    { icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', color: '#fbbf24', title: 'Set severity level', desc: 'Choose from Low to Critical. Each level triggers different response priorities.' },
    { icon: Zap, gradient: 'from-emerald-500 to-green-600', color: '#34d399', title: 'Submit & track', desc: 'Your report goes live instantly. Track verification and resolution in real time.' },
] as const;

function PhoneDemo({ visible }: { visible: boolean }) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const [active, setActive] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const t = setInterval(() => setActive(p => (p + 1) % 4), 3500);
        return () => clearInterval(t);
    }, [visible]);

    return (
        <div className={`grid items-center gap-8 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] transition-all duration-[800ms] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Left — Timeline steps */}
            <div className="relative order-2 lg:order-1">
                {/* Vertical connector line */}
                <div className="absolute left-[23px] top-8 bottom-8 hidden lg:block">
                    <div className={`h-full w-px bg-gradient-to-b ${isDark ? 'from-white/[0.04] via-white/[0.06] to-white/[0.04]' : 'from-neutral-200/30 via-neutral-200/60 to-neutral-200/30'}`} />
                    {/* Animated fill */}
                    <div className="absolute top-0 left-0 w-px transition-all duration-700 ease-out rounded-full"
                        style={{ height: `${(active / 3) * 100}%`, background: `linear-gradient(to bottom, ${DEMO_STEPS[0].color}60, ${DEMO_STEPS[active].color}80)` }}
                    />
                </div>

                <div className="space-y-3 sm:space-y-4">
                    {DEMO_STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = active === i;
                        const isPast = i < active;
                        return (
                            <button
                                key={i}
                                onClick={() => setActive(i)}
                                className={`group relative flex w-full items-start gap-5 rounded-2xl border p-4 text-left transition-all duration-500 sm:p-5 ${
                                    isActive
                                        ? isDark
                                            ? 'border-white/[0.08] bg-white/[0.03] scale-[1.02] shadow-xl shadow-black/20'
                                            : 'border-neutral-200 bg-white scale-[1.02] shadow-xl shadow-neutral-200/50'
                                        : isDark
                                            ? 'border-transparent hover:border-white/[0.04] hover:bg-white/[0.01]'
                                            : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50'
                                } ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
                                style={{ transitionDelay: `${i * 100 + 200}ms` }}
                            >
                                {/* Active indicator glow */}
                                {isActive && (
                                    <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-60"
                                        style={{ background: `radial-gradient(ellipse at 0% 50%, ${s.color}08, transparent 60%)` }}
                                    />
                                )}

                                {/* Icon node */}
                                <div className={`relative z-10 flex size-[46px] shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${
                                    isActive
                                        ? `bg-gradient-to-br ${s.gradient} shadow-lg`
                                        : isPast
                                            ? isDark ? 'bg-white/[0.06]' : 'bg-neutral-100'
                                            : isDark ? 'bg-white/[0.03]' : 'bg-neutral-50'
                                }`} style={isActive ? { boxShadow: `0 8px 24px ${s.color}25` } : {}}>
                                    {isActive && <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />}
                                    <Icon className={`size-5 transition-all duration-500 ${isActive ? 'text-white scale-110' : isPast ? isDark ? 'text-white/40' : 'text-neutral-400' : isDark ? 'text-white/20' : 'text-neutral-300'}`} />
                                    {/* Step number */}
                                    <span className={`absolute -top-1 -right-1 flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold transition-all duration-300 ${
                                        isActive ? isDark ? 'bg-white text-[#06090f] shadow-md' : 'bg-neutral-900 text-white shadow-md' : isPast ? isDark ? 'bg-white/10 text-white/40' : 'bg-neutral-200 text-neutral-500' : isDark ? 'bg-white/[0.05] text-white/20' : 'bg-neutral-100 text-neutral-400'
                                    }`}>{i + 1}</span>
                                </div>

                                {/* Text */}
                                <div className="relative min-w-0 pt-0.5">
                                    <h4 className={`text-[15px] font-semibold transition-colors duration-300 ${isActive ? isDark ? 'text-white' : 'text-neutral-900' : isDark ? 'text-white/40' : 'text-neutral-400'}`}>{s.title}</h4>
                                    <p className={`mt-1 text-[13px] leading-relaxed font-[350] transition-all duration-500 overflow-hidden ${
                                        isActive ? isDark ? 'text-white/45 max-h-20 opacity-100' : 'text-neutral-500 max-h-20 opacity-100' : isDark ? 'text-white/20 max-h-0 sm:max-h-20 opacity-0 sm:opacity-100' : 'text-neutral-300 max-h-0 sm:max-h-20 opacity-0 sm:opacity-100'
                                    }`}>{s.desc}</p>
                                </div>

                                {/* Active arrow indicator */}
                                <ArrowRight className={`hidden lg:block ml-auto mt-3 size-4 shrink-0 transition-all duration-300 ${isActive ? isDark ? 'text-white/30 translate-x-0 opacity-100' : 'text-neutral-400 translate-x-0 opacity-100' : 'text-transparent -translate-x-2 opacity-0'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right — Phone */}
            <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end" style={{ perspective: '1200px' }}>
                <div className={`phone-float relative transition-all duration-[1200ms] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                    style={{ transform: visible ? 'rotateY(-4deg) rotateX(2deg)' : 'rotateY(-4deg) rotateX(2deg) translateY(40px)', transitionDelay: '300ms' }}
                >
                    {/* Ambient glow */}
                    <div className="absolute -inset-12 rounded-[60px] opacity-50 blur-[80px] transition-colors duration-700"
                        style={{ background: `radial-gradient(circle, ${DEMO_STEPS[active].color}12, transparent 70%)` }}
                    />

                    {/* Phone body */}
                    <div className="relative w-[280px] sm:w-[300px]">
                        {/* Side buttons */}
                        <div className="absolute -left-[3px] top-[100px] h-8 w-[3px] rounded-l-sm bg-[#1a1f2e]" />
                        <div className="absolute -left-[3px] top-[150px] h-14 w-[3px] rounded-l-sm bg-[#1a1f2e]" />
                        <div className="absolute -left-[3px] top-[175px] h-14 w-[3px] rounded-l-sm bg-[#1a1f2e]" />
                        <div className="absolute -right-[3px] top-[130px] h-16 w-[3px] rounded-r-sm bg-[#1a1f2e]" />

                        {/* Frame */}
                        <div className="relative rounded-[44px] bg-[#0c1019] p-[6px] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_60px_-12px_rgba(0,0,0,0.7)]">
                            {/* Edge highlight */}
                            <div className="pointer-events-none absolute inset-0 rounded-[44px] bg-gradient-to-b from-white/[0.08] via-transparent to-white/[0.02] p-px">
                                <div className="size-full rounded-[43px] bg-[#0c1019]" />
                            </div>

                            {/* Screen */}
                            <div className="relative overflow-hidden rounded-[38px] bg-[#080c14]">
                                {/* Dynamic Island */}
                                <div className="absolute left-1/2 top-[10px] z-30 -translate-x-1/2 flex h-[28px] w-[100px] items-center justify-center rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                                    <div className="mr-3 size-[8px] rounded-full bg-[#1a1f2e] ring-1 ring-white/[0.03]" />
                                </div>

                                {/* Status bar */}
                                <div className="relative z-20 flex items-center justify-between px-7 pt-[14px] pb-1">
                                    <span className="text-[11px] font-semibold text-white/40 tabular-nums">9:41</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex gap-px">
                                            <div className="h-[10px] w-[3px] rounded-[1px] bg-white/30" />
                                            <div className="h-[10px] w-[3px] rounded-[1px] bg-white/30" />
                                            <div className="h-[10px] w-[3px] rounded-[1px] bg-white/25" />
                                            <div className="h-[10px] w-[3px] rounded-[1px] bg-white/15" />
                                        </div>
                                        <div className="h-[11px] w-[22px] rounded-[3px] border border-white/25 flex items-center p-[2px]">
                                            <div className="h-full w-[65%] rounded-[1.5px] bg-emerald-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* App chrome */}
                                <div className="relative z-20 mx-3 mb-2 mt-1 flex items-center gap-2.5 rounded-2xl bg-white/[0.03] px-3 py-2.5 border border-white/[0.04]">
                                    <AppLogoIcon className="size-8 rounded-xl shadow-md" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-white/80 transition-all duration-300">{DEMO_STEPS[active].title}</p>
                                        <p className="text-[9px] text-white/25 font-medium">Step {active + 1} of 4</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className={`h-[4px] rounded-full transition-all duration-500 ${i <= active ? 'w-3' : 'w-[4px]'}`}
                                                style={{ backgroundColor: i <= active ? DEMO_STEPS[Math.min(i, 3)].color : 'rgba(255,255,255,0.06)' }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Screen content */}
                                <div className="relative h-[380px] sm:h-[410px]">
                                    {/* Screen 0: Location */}
                                    <div className={`absolute inset-0 transition-all duration-500 ${active === 0 ? 'opacity-100 translate-y-0' : active > 0 ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                        <div className="relative h-full bg-[#070b12] overflow-hidden">
                                            {/* Map grid */}
                                            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                                            {/* Roads */}
                                            <div className="absolute left-0 right-0 top-[45%] h-px bg-white/[0.06]" />
                                            <div className="absolute top-0 bottom-0 left-[35%] w-px bg-white/[0.06]" />
                                            <div className="absolute top-0 bottom-0 left-[70%] w-px bg-white/[0.04]" />
                                            {/* Gradient fade */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070b12]/90" />
                                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#070b12_100%)]" />
                                            {/* Pin */}
                                            <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                                <div className="phone-pin-bounce">
                                                    <MapPin className="size-9 text-red-500 fill-red-500 drop-shadow-[0_4px_12px_rgba(239,68,68,0.4)]" />
                                                </div>
                                                <div className="mt-0.5 h-[6px] w-5 rounded-full bg-red-500/15 blur-[3px]" />
                                            </div>
                                            {/* Ripple rings around pin */}
                                            <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 size-20 rounded-full border border-sky-400/10 animate-[pingRing_3s_ease-out_infinite]" />
                                            <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 size-20 rounded-full border border-sky-400/10 animate-[pingRing_3s_ease-out_infinite_1s]" />
                                            {/* GPS bar */}
                                            <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2.5 rounded-2xl bg-[#0c1019]/90 px-4 py-3 backdrop-blur-xl border border-white/[0.06] shadow-xl">
                                                <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15">
                                                    <Navigation className="size-3.5 text-sky-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white/70">Nasugbu, Batangas</p>
                                                    <p className="text-[9px] text-white/25 font-mono tabular-nums">14.0714, 120.6328</p>
                                                </div>
                                                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-500/15">
                                                    <CheckCircle2 className="size-3 text-cyan-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Screen 1: Evidence */}
                                    <div className={`absolute inset-0 transition-all duration-500 ${active === 1 ? 'opacity-100 translate-y-0' : active > 1 ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                        <div className="flex flex-col h-full p-3.5 gap-2.5">
                                            <div className="grid grid-cols-2 gap-2 flex-1">
                                                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-950/50 to-cyan-950/30 border border-white/[0.06] flex items-center justify-center">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.03] to-transparent" />
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Droplets className="size-8 text-cyan-400/30" />
                                                        <span className="text-[9px] font-medium text-white/20">flood_01.jpg</span>
                                                    </div>
                                                    {/* Checkmark badge */}
                                                    <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-emerald-500/20">
                                                        <CheckCircle2 className="size-3 text-emerald-400" />
                                                    </div>
                                                </div>
                                                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950/40 to-violet-950/20 border border-white/[0.06] flex items-center justify-center">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Droplets className="size-8 text-violet-400/30" />
                                                        <span className="text-[9px] font-medium text-white/20">flood_02.jpg</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Upload area */}
                                            <div className="flex items-center justify-center gap-2.5 rounded-2xl bg-white/[0.02] py-3.5 border border-dashed border-white/[0.06] transition-colors hover:border-white/[0.1]">
                                                <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04]">
                                                    <Camera className="size-3.5 text-white/25" />
                                                </div>
                                                <span className="text-[11px] font-medium text-white/25">Add more photos</span>
                                            </div>
                                            {/* AI banner */}
                                            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/[0.05] px-4 py-3 border border-emerald-500/[0.08]">
                                                <div className="relative flex size-6 items-center justify-center">
                                                    <Sparkles className="size-4 text-emerald-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-emerald-400/80">AI Verified</p>
                                                    <p className="text-[9px] text-emerald-400/40">Flood pattern detected with high confidence</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Screen 2: Severity */}
                                    <div className={`absolute inset-0 transition-all duration-500 ${active === 2 ? 'opacity-100 translate-y-0' : active > 2 ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                        <div className="flex flex-col h-full p-3.5 gap-2">
                                            <p className="text-[11px] font-semibold text-white/30 px-1 mb-1">Select severity level</p>
                                            {([
                                                { level: 'Low', color: '#22c55e', sub: 'Passable, monitor only', selected: false },
                                                { level: 'Moderate', color: '#eab308', sub: 'Caution, may worsen', selected: false },
                                                { level: 'High', color: '#f97316', sub: 'Unsafe, prompt action', selected: true },
                                                { level: 'Critical', color: '#ef4444', sub: 'Life-threatening', selected: false },
                                            ] as const).map((s) => (
                                                <div
                                                    key={s.level}
                                                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all duration-300 ${
                                                        s.selected
                                                            ? 'border-white/[0.1] bg-white/[0.04] shadow-lg'
                                                            : 'border-white/[0.03] bg-white/[0.01]'
                                                    }`}
                                                >
                                                    <div className={`relative size-4 rounded-full border-2 transition-all duration-300 ${s.selected ? 'border-transparent' : 'border-white/10'}`}
                                                        style={s.selected ? { backgroundColor: s.color, boxShadow: `0 0 12px ${s.color}50` } : {}}
                                                    >
                                                        {!s.selected && <div className="absolute inset-1 rounded-full bg-white/[0.04]" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`text-[12px] font-semibold transition-colors ${s.selected ? 'text-white/85' : 'text-white/30'}`}>{s.level}</span>
                                                        <p className={`text-[9px] ${s.selected ? 'text-white/30' : 'text-white/15'}`}>{s.sub}</p>
                                                    </div>
                                                    {s.selected && (
                                                        <div className="flex size-5 items-center justify-center rounded-full" style={{ backgroundColor: s.color + '20' }}>
                                                            <CheckCircle2 className="size-3" style={{ color: s.color }} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {/* Description field */}
                                            <div className="mt-1 flex-1 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3">
                                                <p className="text-[10px] text-white/15 leading-relaxed">Road flooding near barangay hall. Water level approximately knee-deep...</p>
                                                <div className="mt-2 h-px bg-white/[0.03] w-8 animate-pulse" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Screen 3: Success */}
                                    <div className={`absolute inset-0 transition-all duration-500 ${active === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                        <div className="flex flex-col h-full items-center justify-center p-5 text-center">
                                            {/* Success icon */}
                                            <div className="relative mb-5">
                                                <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/15">
                                                    <CheckCircle2 className="size-10 text-emerald-400" />
                                                </div>
                                                <div className="absolute inset-0 rounded-full animate-[pingRing_2s_ease-out_infinite] border-2 border-emerald-400/20" />
                                            </div>

                                            <p className="text-[16px] font-bold text-white/85">Report submitted!</p>
                                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1 border border-white/[0.05]">
                                                <span className="text-[10px] text-white/30">Ref:</span>
                                                <span className="text-[11px] font-mono font-bold text-cyan-400/70">FT-A7X2K9M1</span>
                                            </div>

                                            {/* Status timeline */}
                                            <div className="w-full mt-6 space-y-0">
                                                {([
                                                    { label: 'Submitted', done: true },
                                                    { label: 'Under MDRRMO review', done: true },
                                                    { label: 'Responder dispatched', done: false },
                                                    { label: 'Resolved', done: false },
                                                ] as const).map((st, i) => (
                                                    <div key={st.label} className="flex items-center gap-3 relative">
                                                        {/* Connector */}
                                                        {i > 0 && (
                                                            <div className={`absolute left-[11px] -top-2 h-2 w-px ${st.done ? 'bg-emerald-500/30' : 'bg-white/[0.04]'}`} />
                                                        )}
                                                        <div className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ${st.done ? 'bg-emerald-500/15' : 'bg-white/[0.03]'}`}>
                                                            {st.done ? <CheckCircle2 className="size-3.5 text-emerald-400" /> : <div className="size-1.5 rounded-full bg-white/[0.08]" />}
                                                        </div>
                                                        <span className={`text-[11px] py-2 ${st.done ? 'text-white/50 font-medium' : 'text-white/20'}`}>{st.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom home bar */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-[4px] w-[100px] rounded-full bg-white/[0.12]" />

                                {/* Screen glass reflection */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Evacuation Map ────────────────────────────────────────────────────── */

function EvacuationMap({ centers }: { centers: EvacuationCenterData[] }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    useEffect(() => {
        if (!mapRef.current || mapInstance.current || centers.length === 0) return;

        // Dynamically import Leaflet to avoid SSR issues
        const initMap = async () => {
            const L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');

            // Nasugbu, Batangas center coordinates
            const nasugbuCenter: [number, number] = [14.0714, 120.6328];

            // Find center from evacuation centers if available
            const avgLat = centers.reduce((s, c) => s + Number(c.latitude), 0) / centers.length;
            const avgLng = centers.reduce((s, c) => s + Number(c.longitude), 0) / centers.length;
            const center: [number, number] = avgLat && avgLng ? [avgLat, avgLng] : nasugbuCenter;

            const map = L.map(mapRef.current!, {
                center,
                zoom: 13,
                zoomControl: false,
                attributionControl: false,
                scrollWheelZoom: false,
            });

            L.control.zoom({ position: 'bottomright' }).addTo(map);

            // Map tiles — dark or light
            const tileUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            L.tileLayer(tileUrl, {
                maxZoom: 19,
            }).addTo(map);

            // Custom marker icon
            const createIcon = (occupancyRatio: number) => {
                const color = occupancyRatio > 0.8 ? '#ef4444' : occupancyRatio > 0.5 ? '#eab308' : '#22c55e';
                return L.divIcon({
                    className: 'custom-evac-marker',
                    html: `<div style="
                        width: 32px; height: 32px;
                        background: ${color}20;
                        border: 2px solid ${color};
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 0 12px ${color}40;
                    ">
                        <div style="width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></div>
                    </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -18],
                });
            };

            centers.forEach((c) => {
                const ratio = c.capacity > 0 ? c.current_occupancy / c.capacity : 0;
                const marker = L.marker([Number(c.latitude), Number(c.longitude)], {
                    icon: createIcon(ratio),
                }).addTo(map);

                const status = ratio > 0.8 ? 'Near Full' : ratio > 0.5 ? 'Moderate' : 'Available';
                const statusColor = ratio > 0.8 ? '#ef4444' : ratio > 0.5 ? '#eab308' : '#22c55e';

                marker.bindPopup(`
                    <div style="font-family: system-ui; min-width: 180px;">
                        <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${c.name}</div>
                        <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${c.address}</div>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                            <span style="color: ${statusColor}; font-weight: 600;">${status}</span>
                            <span style="color: #666;">${c.current_occupancy}/${c.capacity}</span>
                        </div>
                    </div>
                `, { className: 'evac-popup' });
            });

            mapInstance.current = map;
        };

        initMap();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [centers]);

    return (
        <div ref={mapRef} className="h-[420px] w-full" style={{ background: isDark ? '#0a0e17' : '#f0f0f0' }} />
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
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    return (
        <div className="absolute inset-x-0 top-0">
            <div className={`h-px bg-gradient-to-r from-transparent to-transparent ${isDark ? 'via-white/[0.05]' : 'via-neutral-200/60'}`} />
            <div className="h-px animated-border" />
        </div>
    );
}

function Gradient({ children }: { children: ReactNode }) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    return (
        <GradientTextRB
            colors={isDark ? ['#67e8f9', '#60a5fa', '#818cf8', '#67e8f9'] : ['#06b6d4', '#3b82f6', '#6366f1', '#06b6d4']}
            animationSpeed={6}
        >
            {children}
        </GradientTextRB>
    );
}

function GradientAlt({ children }: { children: ReactNode }) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    return (
        <GradientTextRB
            colors={isDark ? ['#6ee7b7', '#22d3ee', '#6ee7b7'] : ['#10b981', '#0891b2', '#10b981']}
            animationSpeed={5}
        >
            {children}
        </GradientTextRB>
    );
}

function GradientWarm({ children }: { children: ReactNode }) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    return (
        <GradientTextRB
            colors={isDark ? ['#fcd34d', '#fb923c', '#f87171', '#fcd34d'] : ['#f59e0b', '#f97316', '#ef4444', '#f59e0b']}
            animationSpeed={5}
        >
            {children}
        </GradientTextRB>
    );
}

function GradientPurple({ children }: { children: ReactNode }) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    return (
        <GradientTextRB
            colors={isDark ? ['#c4b5fd', '#60a5fa', '#c4b5fd'] : ['#8b5cf6', '#3b82f6', '#8b5cf6']}
            animationSpeed={5}
        >
            {children}
        </GradientTextRB>
    );
}

function SectionHead({ visible, badge, badgeIcon, badgeColor, title, sub }: {
    visible: boolean; badge: string; badgeIcon: ReactNode; badgeColor: string; title: ReactNode; sub: string;
}) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    return (
        <div className={`mb-8 text-center transition-all duration-[800ms] sm:mb-20 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className={`mb-4 sm:mb-5 inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] ${isDark ? badgeColor : badgeColor.replace(/\/20/g, '/30').replace(/\/\[0\.06\]/g, '/[0.08]')}`}>
                {badgeIcon}
                {badge}
            </span>
            <h2 className="mt-4 sm:mt-5 text-[clamp(1.5rem,4vw,3rem)] font-bold tracking-tight">
                <span className={`bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-b from-white to-white/60' : 'bg-gradient-to-b from-slate-900 to-slate-400'}`}>{title}</span>
            </h2>
            <p className={`mx-auto mt-3 sm:mt-4 max-w-xl text-[0.95rem] sm:text-[1.05rem] font-[350] ${isDark ? 'text-white/30' : 'text-neutral-500'}`}>{sub}</p>
        </div>
    );
}
