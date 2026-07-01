import { Form, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle,
    Droplets,
    Eye,
    EyeOff,
    Siren,
    Zap,
} from 'lucide-react';
import { useEffect, useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { home } from '@/routes';
import { store as loginStore } from '@/routes/login';
import { request } from '@/routes/password';
import { store as registerStore } from '@/routes/register';
import type { AuthLayoutProps } from '@/types';

/* ─── Password Input ─────────────────────────────────────────── */

function PwField({ className, ref, ...props }: Omit<ComponentProps<'input'>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Input type={show ? 'text' : 'password'} className={`pr-10 ${className ?? ''}`} ref={ref} {...props} />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 flex items-center px-3 text-white/30 hover:text-white/60 transition-colors" tabIndex={-1}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
}

/* ─── Main Export ────────────────────────────────────────────── */

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const page = usePage();
    const isAuthSlide = page.url.startsWith('/login') || page.url.startsWith('/register');
    if (!isAuthSlide) {
        return <FallbackAuthLayout title={title} description={description}>{children}</FallbackAuthLayout>;
    }
    return <SwitchingPanelAuth />;
}

function FallbackAuthLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-[#06090f] px-6 py-12 text-white antialiased">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <Link href={home()} className="inline-flex items-center gap-2 mb-6">
                        <div className="flex size-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20">
                            <Droplets className="size-5 text-white" />
                        </div>
                        <span className="text-lg font-bold"><span className="text-white">Flood</span><span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Track</span></span>
                    </Link>
                    {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
                    {description && <p className="mt-1.5 text-sm text-white/30">{description}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

/* ─── Switching Panel Auth ───────────────────────────────────── */

function SwitchingPanelAuth() {
    const page = usePage();
    const pageProps = page.props as Record<string, unknown>;
    const isRegisterRoute = page.url.startsWith('/register');

    const [isSignUp, setIsSignUp] = useState(isRegisterRoute);
    const [mounted, setMounted] = useState(false);
    const [isFlowing, setIsFlowing] = useState(false);

    useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

    const switchPanel = (toSignUp: boolean) => {
        if (toSignUp === isSignUp || isFlowing) return;
        setIsFlowing(true);
        setIsSignUp(toSignUp);
        setTimeout(() => setIsFlowing(false), 1200);
    };

    const inputCls = 'h-11 rounded-xl border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-cyan-500/20 transition-all duration-300';

    return (
        <div className={`min-h-svh bg-[#06090f] text-white antialiased transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

            {/* ── Main container — full screen ─────────────────── */}
            <div className="relative w-full min-h-svh overflow-hidden">

                {/* ── Form panels ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-svh">

                    {/* LEFT — Sign In */}
                    <div className="flex items-center justify-center p-8 sm:p-12">
                        <div className={`w-full max-w-sm transition-all duration-700 ${!isSignUp ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                            <div className="mb-8">
                                <Link href={home()} className="inline-flex items-center gap-2 mb-6 group">
                                    <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-110">
                                        <Droplets className="size-[18px] text-white" />
                                    </div>
                                    <span className="text-base font-bold"><span className="text-white">Flood</span><span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Track</span></span>
                                </Link>
                                <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
                                <p className="mt-1.5 text-sm text-white/30">Sign in to your account</p>
                            </div>

                            {pageProps.status && (
                                <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-400">
                                    {pageProps.status as string}
                                </div>
                            )}

                            <Form {...loginStore.form()} resetOnSuccess={['password']} className="flex flex-col gap-4">
                                {({ processing, errors }) => (
                                    <>
                                        <Field label="Email" htmlFor="l-email">
                                            <Input id="l-email" type="email" name="email" required autoComplete="email" placeholder="you@example.com" className={inputCls} />
                                            <InputError message={errors.email} />
                                        </Field>
                                        <Field label="Password" htmlFor="l-pw" extra={pageProps.canResetPassword ? <Link href={request()} className="text-xs text-cyan-400/60 hover:text-cyan-300 transition-colors">Forgot?</Link> : undefined}>
                                            <PwField id="l-pw" name="password" required autoComplete="current-password" placeholder="••••••••" className={inputCls} />
                                            <InputError message={errors.password} />
                                        </Field>
                                        <div className="flex items-center gap-2.5">
                                            <Checkbox id="remember" name="remember" />
                                            <Label htmlFor="remember" className="text-sm text-white/35 cursor-pointer">Keep me signed in</Label>
                                        </div>
                                        <GradientButton processing={processing}>{processing ? <Spinner /> : 'Sign in'}</GradientButton>
                                        <p className="text-center text-sm text-white/30 lg:hidden">
                                            No account?{' '}
                                            <button type="button" onClick={() => switchPanel(true)} className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">Sign up</button>
                                        </p>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>

                    {/* RIGHT — Sign Up */}
                    <div className="flex items-center justify-center p-8 sm:p-12">
                        <div className={`w-full max-w-sm transition-all duration-700 ${isSignUp ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                            <div className="mb-6">
                                <Link href={home()} className="inline-flex items-center gap-2 mb-5 group lg:hidden">
                                    <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                                        <Droplets className="size-[18px] text-white" />
                                    </div>
                                    <span className="text-base font-bold"><span className="text-white">Flood</span><span className="text-cyan-400">Track</span></span>
                                </Link>
                                <h1 className="text-2xl font-bold tracking-tight text-white">Create account</h1>
                                <p className="mt-1.5 text-sm text-white/30">Join FloodTrack for free</p>
                            </div>

                            <Form {...registerStore.form()} resetOnSuccess={['password', 'password_confirmation']} disableWhileProcessing className="flex flex-col gap-3.5">
                                {({ processing, errors }) => (
                                    <>
                                        <Field label="Full name" htmlFor="r-name">
                                            <Input id="r-name" type="text" name="name" required autoComplete="name" placeholder="Juan Dela Cruz" className={inputCls} />
                                            <InputError message={errors.name} />
                                        </Field>
                                        <Field label="Email" htmlFor="r-email">
                                            <Input id="r-email" type="email" name="email" required autoComplete="email" placeholder="you@example.com" className={inputCls} />
                                            <InputError message={errors.email} />
                                        </Field>
                                        <Field label="Contact" htmlFor="r-tel" optional>
                                            <Input id="r-tel" type="tel" name="contact_number" autoComplete="tel" placeholder="09XX XXX XXXX" className={inputCls} />
                                            <InputError message={(errors as Record<string, string>).contact_number} />
                                        </Field>
                                        <Field label="Password" htmlFor="r-pw">
                                            <PwField id="r-pw" name="password" required autoComplete="new-password" placeholder="Min. 8 characters" className={inputCls} />
                                            <InputError message={errors.password} />
                                        </Field>
                                        <Field label="Confirm password" htmlFor="r-pw2">
                                            <PwField id="r-pw2" name="password_confirmation" required autoComplete="new-password" placeholder="Re-enter password" className={inputCls} />
                                            <InputError message={errors.password_confirmation} />
                                        </Field>
                                        <GradientButton processing={processing}>{processing ? <Spinner /> : 'Create account'}</GradientButton>
                                        <p className="text-center text-sm text-white/30 lg:hidden">
                                            Have an account?{' '}
                                            <button type="button" onClick={() => switchPanel(false)} className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">Sign in</button>
                                        </p>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>
                </div>

                {/* ── SLIDING OVERLAY PANEL (desktop) ─────────── */}
                <div
                    className={`pointer-events-none absolute inset-y-0 hidden lg:block ${isFlowing ? 'overlay-flowing' : ''}`}
                    style={{
                        width: '50%',
                        left: isSignUp ? '0%' : '50%',
                        transition: 'left 1.1s cubic-bezier(.76, 0, .24, 1)',
                    }}
                >
                    {/* Water wave edge */}
                    <svg
                        className="absolute inset-y-0 z-10"
                        style={{
                            width: '80px',
                            [isSignUp ? 'right' : 'left']: '-40px',
                            transform: isSignUp ? 'scaleX(-1)' : 'none',
                            transition: 'left 1.1s cubic-bezier(.76,0,.24,1), right 1.1s cubic-bezier(.76,0,.24,1)',
                        }}
                        viewBox="0 0 80 800" preserveAspectRatio="none" fill="none"
                    >
                        <path className="water-edge" d="M80,0 L80,800 L80,800 L80,0Z" fill="url(#edgeGrad)" />
                        <defs>
                            <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#0e7490" stopOpacity="0" />
                                <stop offset="40%" stopColor="#1d4ed8" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Overlay content */}
                    <div className="pointer-events-auto relative flex size-full flex-col items-center justify-center overflow-hidden p-12 text-center">

                        {/* Gradient bg */}
                        <div className="absolute inset-0 overlay-bg" style={{ background: 'linear-gradient(135deg, #0e7490, #1d4ed8, #6d28d9, #1d4ed8, #0e7490)', backgroundSize: '400% 400%' }} />

                        {/* Bubbles during transition */}
                        {isFlowing && (
                            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="bubble absolute rounded-full bg-white/10"
                                        style={{ width: `${8 + Math.random() * 20}px`, height: `${8 + Math.random() * 20}px`, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.6}s`, animationDuration: `${0.6 + Math.random() * 0.6}s` }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Waves */}
                        <div className="absolute inset-0 overflow-hidden">
                            <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ height: '35%' }}>
                                <path className="wave-1" d="M0,75 C125,150 375,0 500,75 L500,150 L0,150 Z" fill="rgba(255,255,255,0.04)" />
                                <path className="wave-2" d="M0,100 C100,30 400,130 500,60 L500,150 L0,150 Z" fill="rgba(255,255,255,0.025)" />
                                <path className="wave-3" d="M0,110 C200,70 300,140 500,90 L500,150 L0,150 Z" fill="rgba(255,255,255,0.015)" />
                            </svg>
                            <svg className="absolute top-0 left-0 w-full rotate-180" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ height: '30%' }}>
                                <path className="wave-4" d="M0,80 C180,130 320,30 500,90 L500,150 L0,150 Z" fill="rgba(255,255,255,0.03)" />
                            </svg>
                        </div>

                        {/* Ripples on transition */}
                        {isFlowing && (
                            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                <div className="ripple-ring absolute size-40 rounded-full border border-white/10" />
                                <div className="ripple-ring absolute size-40 rounded-full border border-white/10" style={{ animationDelay: '0.2s' }} />
                                <div className="ripple-ring absolute size-40 rounded-full border border-white/10" style={{ animationDelay: '0.4s' }} />
                            </div>
                        )}

                        {/* Orbs */}
                        <div className={`absolute left-1/4 top-1/4 size-48 rounded-full opacity-20 blur-[80px] bg-cyan-300 orb-1 transition-all duration-1000 ${isFlowing ? 'scale-150 opacity-30' : ''}`} />
                        <div className={`absolute right-1/4 bottom-1/3 size-56 rounded-full opacity-15 blur-[100px] bg-indigo-400 orb-2 transition-all duration-1000 ${isFlowing ? 'scale-150 opacity-25' : ''}`} />

                        {/* Dot grid */}
                        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                        {/* Content */}
                        <div className="relative z-10 max-w-xs">
                            <div className={`mb-8 flex justify-center transition-transform duration-700 ${isFlowing ? 'scale-110 rotate-12' : ''}`}>
                                <div className="flex size-14 items-center justify-center rounded-[18px] bg-white/10 ring-1 ring-white/20 backdrop-blur-sm shadow-2xl">
                                    <Droplets className={`size-7 text-white drop-shadow-lg transition-transform duration-700 ${isFlowing ? 'rotate-[-20deg] scale-125' : ''}`} />
                                </div>
                            </div>

                            {/* Sign Up prompt */}
                            <div className={`transition-all ${!isSignUp ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-8 absolute inset-x-0 pointer-events-none'}`} style={{ transitionDuration: '0.6s', transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}>
                                <h2 className="text-3xl font-bold mb-3 tracking-tight">New here?</h2>
                                <p className="text-white/60 text-[15px] leading-relaxed mb-8">Create an account to report hazards and help keep Nasugbu safe.</p>
                                <button onClick={() => switchPanel(true)} className="group relative overflow-hidden rounded-2xl border-2 border-white/30 px-10 py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:border-white/60 hover:scale-105 active:scale-95">
                                    <span className="relative z-10 flex items-center gap-2">Sign up <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                                    <div className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/[0.08]" />
                                </button>
                            </div>

                            {/* Sign In prompt */}
                            <div className={`transition-all ${isSignUp ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-8 absolute inset-x-0 pointer-events-none'}`} style={{ transitionDuration: '0.6s', transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}>
                                <h2 className="text-3xl font-bold mb-3 tracking-tight">Welcome back!</h2>
                                <p className="text-white/60 text-[15px] leading-relaxed mb-8">Already have an account? Sign in to continue tracking and reporting.</p>
                                <button onClick={() => switchPanel(false)} className="group relative overflow-hidden rounded-2xl border-2 border-white/30 px-10 py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:border-white/60 hover:scale-105 active:scale-95">
                                    <span className="relative z-10 flex items-center gap-2">Sign in <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                                    <div className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/[0.08]" />
                                </button>
                            </div>

                            {/* Severity chips */}
                            <div className={`mt-10 flex flex-wrap justify-center gap-1.5 transition-all duration-700 ${isFlowing ? 'opacity-0 scale-90' : 'opacity-100 delay-500'}`}>
                                {[
                                    { label: 'Low', color: '#22c55e', icon: <CheckCircle className="size-3" /> },
                                    { label: 'Moderate', color: '#eab308', icon: <AlertTriangle className="size-3" /> },
                                    { label: 'High', color: '#f97316', icon: <AlertTriangle className="size-3" /> },
                                    { label: 'Critical', color: '#ef4444', icon: <Siren className="size-3" /> },
                                ].map((s) => (
                                    <div key={s.label} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold opacity-60" style={{ backgroundColor: s.color + '18', color: s.color }}>
                                        {s.icon}{s.label}
                                    </div>
                                ))}
                            </div>

                            <div className={`mt-6 space-y-2 transition-all duration-700 ${isFlowing ? 'opacity-0 scale-90' : 'opacity-100 delay-600'}`}>
                                {['GPS reports', 'Live map', 'Instant dispatch'].map((f) => (
                                    <div key={f} className="flex items-center justify-center gap-2 text-[12px] text-white/30">
                                        <Zap className="size-3 text-cyan-300/40" />{f}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="absolute bottom-6 text-[11px] text-white/20">&copy; {new Date().getFullYear()} FloodTrack</p>
                    </div>
                </div>
            </div>

            {/* ── Styles ── */}
            <style>{`
                .overlay-bg { animation: overlayGrad 12s ease infinite; }
                @keyframes overlayGrad {
                    0%, 100% { background-position: 0% 50%; }
                    25% { background-position: 100% 0%; }
                    50% { background-position: 100% 100%; }
                    75% { background-position: 0% 100%; }
                }
                .water-edge { transition: d 1.1s cubic-bezier(.76,0,.24,1); }
                .overlay-flowing .water-edge { animation: waterEdgeFlow 1.1s cubic-bezier(.76,0,.24,1); }
                @keyframes waterEdgeFlow {
                    0%   { d: path("M80,0 L80,800 L80,800 L80,0Z"); }
                    20%  { d: path("M80,0 C30,100 70,200 20,300 C-10,400 50,500 10,600 C40,700 20,750 80,800 L80,800 L80,0Z"); }
                    40%  { d: path("M80,0 C10,80 60,160 0,250 C-20,350 40,450 -10,550 C30,650 10,720 80,800 L80,800 L80,0Z"); }
                    60%  { d: path("M80,0 C20,90 50,180 10,280 C-10,380 45,480 5,580 C35,680 15,740 80,800 L80,800 L80,0Z"); }
                    80%  { d: path("M80,0 C50,60 70,140 40,240 C20,340 60,440 30,540 C55,660 40,730 80,800 L80,800 L80,0Z"); }
                    100% { d: path("M80,0 L80,800 L80,800 L80,0Z"); }
                }
                .bubble { animation: bubbleFloat 0.8s ease-out forwards; }
                @keyframes bubbleFloat {
                    0% { transform: scale(0) translateY(0); opacity: 0; }
                    30% { transform: scale(1.2) translateY(-10px); opacity: 0.3; }
                    100% { transform: scale(0) translateY(-60px); opacity: 0; }
                }
                .ripple-ring { animation: rippleExpand 1s ease-out forwards; }
                @keyframes rippleExpand {
                    0% { transform: scale(0.3); opacity: 0.4; }
                    100% { transform: scale(4); opacity: 0; }
                }
                .wave-1 { animation: w1 5s ease-in-out infinite; }
                .wave-2 { animation: w2 7s ease-in-out infinite; }
                .wave-3 { animation: w3 9s ease-in-out infinite; }
                .wave-4 { animation: w4 6s ease-in-out infinite; }
                @keyframes w1 { 0%,100% { d: path("M0,75 C125,150 375,0 500,75 L500,150 L0,150 Z"); } 50% { d: path("M0,100 C100,20 400,130 500,50 L500,150 L0,150 Z"); } }
                @keyframes w2 { 0%,100% { d: path("M0,100 C100,30 400,130 500,60 L500,150 L0,150 Z"); } 50% { d: path("M0,60 C200,130 300,20 500,100 L500,150 L0,150 Z"); } }
                @keyframes w3 { 0%,100% { d: path("M0,110 C200,70 300,140 500,90 L500,150 L0,150 Z"); } 50% { d: path("M0,90 C150,130 350,60 500,110 L500,150 L0,150 Z"); } }
                @keyframes w4 { 0%,100% { d: path("M0,80 C180,130 320,30 500,90 L500,150 L0,150 Z"); } 50% { d: path("M0,50 C150,110 350,40 500,70 L500,150 L0,150 Z"); } }
                .orb-1 { animation: orbA 8s ease-in-out infinite; }
                .orb-2 { animation: orbB 10s ease-in-out infinite; }
                @keyframes orbA { 0%,100% { transform: translate(0,0); } 33% { transform: translate(20px,-15px); } 66% { transform: translate(-10px,10px); } }
                @keyframes orbB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px,-20px); } }
                .auth-btn {
                    background: linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1);
                    background-size: 200% 200%;
                    animation: btnShift 6s ease infinite;
                    position: relative;
                    overflow: hidden;
                }
                .auth-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05), rgba(255,255,255,0.15));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                }
                .auth-btn .shimmer {
                    position: absolute; inset: 0;
                    transform: translateX(-100%) skewX(-20deg);
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
                    transition: transform 0.8s ease;
                    pointer-events: none;
                }
                .auth-btn:hover .shimmer { transform: translateX(100%) skewX(-20deg); }
                @keyframes btnShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
            `}</style>
        </div>
    );
}

/* ─── Shared ─────────────────────────────────────────────────── */

function Field({ label, htmlFor, optional, extra, children }: { label: string; htmlFor: string; optional?: boolean; extra?: ReactNode; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <Label htmlFor={htmlFor} className="text-sm font-medium text-white/50">
                    {label}
                    {optional && <span className="ml-1 text-white/20 font-normal">(optional)</span>}
                </Label>
                {extra}
            </div>
            {children}
        </div>
    );
}

function GradientButton({ processing, children }: { processing: boolean; children: ReactNode }) {
    return (
        <Button type="submit" disabled={processing}
            className="auth-btn mt-1 h-12 w-full rounded-xl text-sm font-bold text-white shadow-2xl shadow-blue-500/15 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border-0"
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
                {!processing && <ArrowRight className="size-4" />}
            </span>
            <div className="shimmer" />
        </Button>
    );
}
