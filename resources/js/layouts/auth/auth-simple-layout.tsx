import { Form, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Globe,
    Lock,
    Mail,
    MapPin,
    Phone,
    Sparkles,
    User,
    Zap,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { home, register } from '@/routes';
import { store as loginStore } from '@/routes/login';
import { request } from '@/routes/password';
import { store as registerStore } from '@/routes/register';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const page = usePage();
    const isLogin = page.url.startsWith('/login');
    const isRegister = page.url.startsWith('/register');

    if (!isLogin && !isRegister) {
        return <MinimalLayout title={title} description={description}>{children}</MinimalLayout>;
    }

    return <SlidingAuth initialRegister={isRegister} />;
}

/* ─── Sliding Auth ─────────────────────────────────────────── */

function SlidingAuth({ initialRegister }: { initialRegister: boolean }) {
    const page = usePage();
    const pageProps = page.props as Record<string, unknown>;
    const [isSignUp, setIsSignUp] = useState(initialRegister);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

    const inputCls = 'h-12 rounded-xl border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20';
    const pwCls = 'h-12 rounded-xl border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20';
    const labelCls = 'text-sm font-semibold text-neutral-700 dark:text-neutral-300';
    const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 dark:text-neutral-500';

    return (
        <div className={`min-h-svh bg-white dark:bg-neutral-950 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative min-h-svh w-full overflow-hidden">

                {/* ── Form panels (both always rendered) ── */}
                <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">

                    {/* LEFT FORM — Register */}
                    <div className="flex items-center justify-center p-6 sm:p-12 order-2 lg:order-1">
                        <div className={`w-full max-w-[420px] transition-all duration-700 ${isSignUp ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4 pointer-events-none absolute lg:relative'}`}>

                            {/* Mobile header */}
                            <div className="mb-6 flex items-center justify-between lg:hidden">
                                <Link href={home()} className="inline-flex items-center gap-2.5">
                                    <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                                        <AppLogoIcon className="size-[18px] fill-current text-white" />
                                    </div>
                                    <span className="text-base font-bold text-neutral-900 dark:text-white">Flood<span className="text-blue-600 dark:text-cyan-400">Track</span></span>
                                </Link>
                                <button onClick={() => setIsSignUp(false)} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-cyan-400">
                                    Sign In
                                </button>
                            </div>

                            <div className="mb-8">
                                <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900 dark:text-white">Create your account</h1>
                                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">Fill in your details to get started</p>
                            </div>

                            <Form {...registerStore.form()} resetOnSuccess={['password', 'password_confirmation']} disableWhileProcessing className="flex flex-col gap-4">
                                {({ processing, errors }) => (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="r-name" className={labelCls}>Full name</Label>
                                            <div className="relative">
                                                <User className={iconCls} />
                                                <Input id="r-name" type="text" name="name" required autoComplete="name" placeholder="Juan Dela Cruz" className={inputCls} />
                                            </div>
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="r-email" className={labelCls}>Email address</Label>
                                            <div className="relative">
                                                <Mail className={iconCls} />
                                                <Input id="r-email" type="email" name="email" required autoComplete="email" placeholder="you@example.com" className={inputCls} />
                                            </div>
                                            <InputError message={errors.email} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="r-tel" className={labelCls}>
                                                Contact number <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                                            </Label>
                                            <div className="relative">
                                                <Phone className={iconCls} />
                                                <Input id="r-tel" type="tel" name="contact_number" autoComplete="tel" placeholder="09XX XXX XXXX" className={inputCls} />
                                            </div>
                                            <InputError message={(errors as Record<string, string>).contact_number} />
                                        </div>
                                        <input type="hidden" name="role" value="resident" />
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="r-pw" className={labelCls}>Password</Label>
                                            <PasswordInput id="r-pw" name="password" required autoComplete="new-password" placeholder="Min. 8 characters" className={pwCls} />
                                            <InputError message={errors.password} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="r-pw2" className={labelCls}>Confirm password</Label>
                                            <PasswordInput id="r-pw2" name="password_confirmation" required autoComplete="new-password" placeholder="Re-enter your password" className={pwCls} />
                                            <InputError message={errors.password_confirmation} />
                                        </div>
                                        <Button type="submit" disabled={processing} data-test="register-user-button" className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60">
                                            {processing ? <Spinner /> : <span className="flex items-center justify-center gap-2"><ArrowRight className="size-4" />Create my account</span>}
                                        </Button>
                                        <p className="text-center text-sm text-neutral-500 lg:hidden dark:text-neutral-400">
                                            Already have an account?{' '}
                                            <button type="button" onClick={() => setIsSignUp(false)} className="font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400">Log in</button>
                                        </p>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>

                    {/* RIGHT FORM — Login */}
                    <div className="flex items-center justify-center p-6 sm:p-12 order-1 lg:order-2">
                        <div className={`w-full max-w-[420px] transition-all duration-700 ${!isSignUp ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4 pointer-events-none absolute lg:relative'}`}>

                            {/* Mobile header */}
                            <div className="mb-6 flex items-center justify-between lg:hidden">
                                <Link href={home()} className="inline-flex items-center gap-2.5">
                                    <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                                        <AppLogoIcon className="size-[18px] fill-current text-white" />
                                    </div>
                                    <span className="text-base font-bold text-neutral-900 dark:text-white">Flood<span className="text-blue-600 dark:text-cyan-400">Track</span></span>
                                </Link>
                                <button onClick={() => setIsSignUp(true)} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-cyan-400">
                                    Create Account
                                </button>
                            </div>

                            <div className="mb-8">
                                <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900 dark:text-white">Log in to your account</h1>
                                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">Enter your credentials to continue</p>
                            </div>

                            {typeof pageProps.status === 'string' && pageProps.status && (
                                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    {pageProps.status}
                                </div>
                            )}

                            <Form {...loginStore.form()} resetOnSuccess={['password']} className="flex flex-col gap-5">
                                {({ processing, errors }) => (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="l-email" className={labelCls}>Email address</Label>
                                            <div className="relative">
                                                <Mail className={iconCls} />
                                                <Input id="l-email" type="email" name="email" required autoFocus={!isSignUp} autoComplete="email" placeholder="you@example.com" className={inputCls} />
                                            </div>
                                            <InputError message={errors.email} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="l-pw" className={labelCls}>Password</Label>
                                                {!!pageProps.canResetPassword && (
                                                    <Link href={request()} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300">Forgot password?</Link>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Lock className={`${iconCls} z-10`} />
                                                <PasswordInput id="l-pw" name="password" required autoComplete="current-password" placeholder="Enter your password" className={`${pwCls} pl-11 pr-10`} />
                                            </div>
                                            <InputError message={errors.password} />
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <Checkbox id="remember" name="remember" />
                                            <Label htmlFor="remember" className="text-sm text-neutral-600 cursor-pointer dark:text-neutral-400">Remember me</Label>
                                        </div>
                                        <Button type="submit" disabled={processing} data-test="login-button" className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60">
                                            {processing ? <Spinner /> : <span className="flex items-center justify-center gap-2"><ArrowRight className="size-4" />Log in</span>}
                                        </Button>
                                        <p className="text-center text-sm text-neutral-500 lg:hidden dark:text-neutral-400">
                                            Don't have an account?{' '}
                                            <button type="button" onClick={() => setIsSignUp(true)} className="font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400">Create one free</button>
                                        </p>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>
                </div>

                {/* ── SLIDING BRANDED OVERLAY (desktop) ─── */}
                <div
                    className="pointer-events-none absolute inset-y-0 hidden lg:block"
                    style={{
                        width: '50%',
                        left: isSignUp ? '50%' : '0%',
                        transition: 'left 0.9s cubic-bezier(.76, 0, .24, 1)',
                    }}
                >
                    <div className="pointer-events-auto relative flex size-full flex-col justify-between overflow-hidden">

                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1b3a] via-[#0e2a5c] to-[#0a1628]" />
                        <div className="absolute inset-0 brand-bg opacity-60" style={{
                            background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.2), rgba(99,102,241,0.15), rgba(59,130,246,0.2))',
                            backgroundSize: '400% 400%',
                        }} />

                        {/* Grid pattern */}
                        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
                            backgroundSize: '60px 60px',
                        }} />

                        {/* Orbs */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute -left-32 -top-32 size-[500px] rounded-full opacity-[0.08] blur-[120px] orb-slow" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
                            <div className="absolute -right-20 bottom-1/4 size-[400px] rounded-full opacity-[0.06] blur-[100px] orb-slow-alt" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
                        </div>

                        {/* Waves */}
                        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
                            <svg className="w-full" viewBox="0 0 500 120" preserveAspectRatio="none" style={{ height: '120px' }}>
                                <path className="wave-a" d="M0,60 C125,120 375,0 500,60 L500,120 L0,120 Z" fill="rgba(255,255,255,0.03)" />
                                <path className="wave-b" d="M0,80 C100,20 400,100 500,40 L500,120 L0,120 Z" fill="rgba(255,255,255,0.02)" />
                            </svg>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">

                            {/* Logo */}
                            <div>
                                <Link href={home()} className="group inline-flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/25 transition-all duration-300 group-hover:scale-110">
                                        <AppLogoIcon className="size-5 fill-current text-white" />
                                    </div>
                                    <span className="text-lg font-bold tracking-tight text-white">
                                        Flood<span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Track</span>
                                    </span>
                                </Link>
                            </div>

                            {/* Hero text — switches based on panel */}
                            <div className="max-w-md">
                                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-1.5 text-[12px] font-semibold text-cyan-300 backdrop-blur-sm">
                                    <Sparkles className="size-3.5" />
                                    Trusted by communities
                                </div>

                                {/* Shows when on login (overlay on left) — invite to sign up */}
                                <div className={`transition-all duration-600 ${!isSignUp ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 absolute inset-x-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}>
                                    <h1 className="mb-6 text-[2.5rem] font-extrabold leading-[1.12] tracking-tight text-white">
                                        Welcome back to a <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">safer community.</span>
                                    </h1>
                                    <p className="mb-10 text-[15px] leading-relaxed text-white/40 font-[350]">
                                        Log in to report hazards, track incidents, and connect directly with MDRRMO responders.
                                    </p>
                                </div>

                                {/* Shows when on register (overlay on right) — invite to sign in */}
                                <div className={`transition-all duration-600 ${isSignUp ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 absolute inset-x-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}>
                                    <h1 className="mb-6 text-[2.5rem] font-extrabold leading-[1.12] tracking-tight text-white">
                                        Already have an account? Welcome <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">back!</span>
                                    </h1>
                                    <p className="mb-10 text-[15px] leading-relaxed text-white/40 font-[350]">
                                        Sign in to continue tracking and reporting hazards in your community.
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="flex flex-col gap-4">
                                    {[
                                        { icon: MapPin, label: 'GPS-pinned hazard reporting', color: 'text-cyan-400' },
                                        { icon: Globe, label: 'Real-time live incident map', color: 'text-blue-400' },
                                        { icon: Zap, label: 'Instant MDRRMO dispatch', color: 'text-indigo-400' },
                                    ].map((f) => (
                                        <div key={f.label} className="flex items-center gap-3">
                                            <div className={`flex size-8 items-center justify-center rounded-xl bg-white/[0.06] ${f.color}`}>
                                                <f.icon className="size-4" />
                                            </div>
                                            <span className="text-sm text-white/50">{f.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom — switch button */}
                            <div className="flex items-center justify-between">
                                <p className="text-[13px] text-white/20">&copy; {new Date().getFullYear()} FloodTrack</p>

                                {/* Create Account button (when showing login) */}
                                <div className={`transition-all duration-500 ${!isSignUp ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute pointer-events-none'}`}>
                                    <button
                                        onClick={() => setIsSignUp(true)}
                                        className="group rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2.5 text-[13px] font-semibold text-white/60 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95"
                                    >
                                        <span className="flex items-center gap-2">
                                            Create Account
                                            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                                        </span>
                                    </button>
                                </div>

                                {/* Sign In button (when showing register) */}
                                <div className={`transition-all duration-500 ${isSignUp ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute pointer-events-none'}`}>
                                    <button
                                        onClick={() => setIsSignUp(false)}
                                        className="group rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2.5 text-[13px] font-semibold text-white/60 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95"
                                    >
                                        <span className="flex items-center gap-2">
                                            Sign In
                                            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile bottom features */}
            <div className="border-t border-neutral-100 px-6 py-5 lg:hidden dark:border-neutral-800">
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

            {/* ── Styles ── */}
            <style>{`
                .brand-bg { animation: brandGrad 12s ease infinite; }
                @keyframes brandGrad {
                    0%, 100% { background-position: 0% 50%; }
                    25% { background-position: 100% 0%; }
                    50% { background-position: 100% 100%; }
                    75% { background-position: 0% 100%; }
                }
                .orb-slow { animation: orbSlow 10s ease-in-out infinite; }
                .orb-slow-alt { animation: orbSlowAlt 12s ease-in-out infinite; }
                @keyframes orbSlow { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px, 20px); } }
                @keyframes orbSlowAlt { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-20px, -15px); } }
                .wave-a { animation: waveA 6s ease-in-out infinite; }
                .wave-b { animation: waveB 8s ease-in-out infinite; }
                @keyframes waveA { 0%,100% { d: path("M0,60 C125,120 375,0 500,60 L500,120 L0,120 Z"); } 50% { d: path("M0,80 C100,20 400,100 500,40 L500,120 L0,120 Z"); } }
                @keyframes waveB { 0%,100% { d: path("M0,80 C100,20 400,100 500,40 L500,120 L0,120 Z"); } 50% { d: path("M0,50 C200,100 300,20 500,70 L500,120 L0,120 Z"); } }
            `}</style>
        </div>
    );
}

/* ─── Minimal Layout (forgot password, etc.) ───────────────── */

function MinimalLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-6 py-12 dark:bg-neutral-950">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <Link href={home()} className="inline-flex items-center gap-2.5 mb-6">
                        <div className="flex size-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20">
                            <AppLogoIcon className="size-5 fill-current text-white" />
                        </div>
                        <span className="text-lg font-bold text-neutral-900 dark:text-white">
                            Flood<span className="text-blue-600 dark:text-cyan-400">Track</span>
                        </span>
                    </Link>
                    {title && <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h1>}
                    {description && <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                    {children}
                </div>
            </div>
        </div>
    );
}
