import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Check, Lock, Mail, Phone, Shield, User, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

const pwRules = [
    { test: (pw: string) => pw.length >= 8, label: '8+ characters' },
    { test: (pw: string) => /[A-Z]/.test(pw), label: 'Uppercase' },
    { test: (pw: string) => /[a-z]/.test(pw), label: 'Lowercase' },
    { test: (pw: string) => /\d/.test(pw), label: 'Number' },
    { test: (pw: string) => /[^A-Za-z0-9]/.test(pw), label: 'Special char' },
];

function getStrength(pw: string) {
    if (!pw) return { score: 0, label: '', color: '', textColor: '' };
    const passed = pwRules.filter((r) => r.test(pw)).length;
    if (passed <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
    if (passed <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-500' };
    if (passed <= 3) return { score: 3, label: 'Good', color: 'bg-amber-500', textColor: 'text-amber-500' };
    if (passed <= 4) return { score: 4, label: 'Strong', color: 'bg-blue-500', textColor: 'text-blue-500' };
    return { score: 5, label: 'Excellent', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
}

const inputCls = 'h-11 rounded-xl border-neutral-200 bg-neutral-50/80 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20';
const pwInputCls = 'h-11 rounded-xl border-neutral-200 bg-neutral-50/80 pl-11 pr-10 text-sm text-neutral-900 transition-colors focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20';
const labelCls = 'text-[13px] font-medium text-neutral-600 dark:text-neutral-400';
const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 size-[16px] -translate-y-1/2 text-neutral-400 dark:text-neutral-500';

function formatPhoneNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export default function Register() {
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const strength = getStrength(password);

    return (
        <>
            <Head title="Create account" />

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Create your account
                </h1>
                <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                    Fill in your details to get started
                </p>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Name row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="first_name" className={labelCls}>First name</Label>
                                <div className="relative">
                                    <User className={iconCls} />
                                    <Input id="first_name" type="text" required autoFocus tabIndex={1} autoComplete="given-name" name="first_name" placeholder="Juan" className={inputCls} />
                                </div>
                                <InputError message={(errors as Record<string, string>).first_name} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="last_name" className={labelCls}>Last name</Label>
                                <div className="relative">
                                    <User className={iconCls} />
                                    <Input id="last_name" type="text" required tabIndex={2} autoComplete="family-name" name="last_name" placeholder="Dela Cruz" className={inputCls} />
                                </div>
                                <InputError message={(errors as Record<string, string>).last_name} />
                            </div>
                        </div>

                        {/* Email & Phone row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="email" className={labelCls}>Email address</Label>
                                <div className="relative">
                                    <Mail className={iconCls} />
                                    <Input id="email" type="email" required tabIndex={3} autoComplete="email" name="email" placeholder="you@example.com" className={inputCls} />
                                </div>
                                <InputError message={errors.email} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="contact_number" className={labelCls}>
                                    Phone <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
                                </Label>
                                <div className="relative">
                                    <Phone className={iconCls} />
                                    <input type="hidden" name="contact_number" value={phone.replace(/\D/g, '')} />
                                    <Input
                                        id="contact_number"
                                        type="tel"
                                        tabIndex={4}
                                        autoComplete="tel"
                                        placeholder="0917 123 4567"
                                        value={phone}
                                        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                                        maxLength={13}
                                        className={inputCls}
                                    />
                                </div>
                                <InputError message={(errors as Record<string, string>).contact_number} />
                            </div>
                        </div>

                        <input type="hidden" name="role" value="resident" />

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-neutral-100 dark:border-neutral-800" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="flex items-center gap-1.5 bg-white px-3 text-[11px] font-medium text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                                    <Shield className="size-3" />
                                    Secure your account
                                </span>
                            </div>
                        </div>

                        {/* Password row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="password" className={labelCls}>Password</Label>
                                <div className="relative">
                                    <Lock className={`${iconCls} z-10`} />
                                    <PasswordInput
                                        id="password"
                                        required
                                        tabIndex={5}
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Create password"
                                        className={pwInputCls}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="password_confirmation" className={labelCls}>Confirm password</Label>
                                <div className="relative">
                                    <Lock className={`${iconCls} z-10`} />
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        tabIndex={6}
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Re-enter password"
                                        className={pwInputCls}
                                    />
                                </div>
                                <InputError message={errors.password_confirmation} />
                            </div>
                        </div>

                        {/* Strength bar + validation */}
                        <div className={`overflow-hidden transition-all duration-300 ${password ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                                {/* Bar */}
                                <div className="mb-2 flex items-center gap-2">
                                    <div className="flex flex-1 gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${i < strength.score ? strength.color : 'bg-neutral-200 dark:bg-neutral-700'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className={`min-w-[52px] text-right text-[10px] font-semibold uppercase tracking-wide ${strength.textColor}`}>
                                        {strength.label}
                                    </span>
                                </div>
                                {/* Rules inline */}
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                    {pwRules.map((rule) => {
                                        const passed = rule.test(password);
                                        return (
                                            <span key={rule.label} className="inline-flex items-center gap-1">
                                                {passed ? (
                                                    <Check className="size-2.5 text-emerald-500" />
                                                ) : (
                                                    <X className="size-2.5 text-neutral-300 dark:text-neutral-600" />
                                                )}
                                                <span className={`text-[10px] leading-none ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                                    {rule.label}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            tabIndex={7}
                            data-test="register-user-button"
                            className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Create my account
                                    <ArrowRight className="size-4" />
                                </span>
                            )}
                        </Button>

                        {/* Login link */}
                        <p className="text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                            Already have an account?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={8}
                                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                            >
                                Log in
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Join FloodTrack',
    description: 'Create your account to start reporting and tracking hazards.',
};
