import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Check, Lock, Mail, Phone, User, X } from 'lucide-react';
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

function formatPhoneNumber(value: string) {
    let digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits.startsWith('09')) digits = '09';
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

const fieldCls = 'flex flex-col gap-1.5';
const inputCls = 'h-11 rounded-xl border-neutral-200 bg-neutral-50/80 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20';
const pwInputCls = 'h-11 rounded-xl border-neutral-200 bg-neutral-50/80 pl-11 pr-10 text-sm text-neutral-900 transition-colors focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20';
const labelCls = 'text-[13px] font-medium text-neutral-600 dark:text-neutral-400';
const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500';

export default function Register() {
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('09');
    const strength = getStrength(password);

    return (
        <>
            <Head title="Create account" />

            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Create your account
                </h1>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    Start reporting and tracking hazards in your area.
                </p>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Name */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={fieldCls}>
                                <Label htmlFor="first_name" className={labelCls}>First name</Label>
                                <div className="relative">
                                    <User className={iconCls} />
                                    <Input id="first_name" type="text" required autoFocus tabIndex={1} autoComplete="given-name" name="first_name" placeholder="Juan" className={inputCls} />
                                </div>
                                <InputError message={(errors as Record<string, string>).first_name} />
                            </div>
                            <div className={fieldCls}>
                                <Label htmlFor="last_name" className={labelCls}>Last name</Label>
                                <div className="relative">
                                    <User className={iconCls} />
                                    <Input id="last_name" type="text" required tabIndex={2} autoComplete="family-name" name="last_name" placeholder="Dela Cruz" className={inputCls} />
                                </div>
                                <InputError message={(errors as Record<string, string>).last_name} />
                            </div>
                        </div>

                        {/* Email */}
                        <div className={fieldCls}>
                            <Label htmlFor="email" className={labelCls}>Email address</Label>
                            <div className="relative">
                                <Mail className={iconCls} />
                                <Input id="email" type="email" required tabIndex={3} autoComplete="email" name="email" placeholder="you@example.com" className={inputCls} />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Phone */}
                        <div className={fieldCls}>
                            <Label htmlFor="contact_number" className={labelCls}>
                                Phone number <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
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

                        <input type="hidden" name="role" value="resident" />

                        {/* Password */}
                        <div className={fieldCls}>
                            <Label htmlFor="password" className={labelCls}>Password</Label>
                            <div className="relative">
                                <Lock className={`${iconCls} z-10`} />
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={5}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Create a strong password"
                                    className={pwInputCls}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <InputError message={errors.password} />

                            {/* Strength indicator */}
                            <div className={`overflow-hidden transition-all duration-300 ${password ? 'max-h-16 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                <div className="flex items-center gap-2 mb-1.5">
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

                        {/* Confirm password */}
                        <div className={fieldCls}>
                            <Label htmlFor="password_confirmation" className={labelCls}>Confirm password</Label>
                            <div className="relative">
                                <Lock className={`${iconCls} z-10`} />
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={6}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Re-enter your password"
                                    className={pwInputCls}
                                />
                            </div>
                            <InputError message={errors.password_confirmation} />
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            tabIndex={7}
                            data-test="register-user-button"
                            className="mt-1 h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Create account
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
