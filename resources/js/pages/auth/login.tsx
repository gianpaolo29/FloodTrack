import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

import { store } from '@/routes/login';

type Props = {
    status?: string;
    canRegister: boolean;
};

export default function Login({ status, canRegister }: Props) {
    return (
        <>
            <Head title="Log in" />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900 dark:text-white">
                    Log in to{' '}
                    <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400">your account</span>
                </h1>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    Enter your credentials to continue
                </p>
            </div>

            {status && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Email address
                            </Label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="h-12 rounded-xl border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 dark:text-neutral-500 z-10" />
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="h-12 rounded-xl border-neutral-200 bg-neutral-50 pl-11 pr-10 text-sm text-neutral-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                                />
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center gap-2.5">
                            <Checkbox id="remember" name="remember" tabIndex={3} />
                            <Label htmlFor="remember" className="text-sm text-neutral-600 cursor-pointer dark:text-neutral-400">
                                Remember me
                            </Label>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            tabIndex={4}
                            disabled={processing}
                            data-test="login-button"
                            className="auth-cta mt-1 h-12 w-full rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <ArrowRight className="size-4" />
                                    Log in
                                </span>
                            )}
                        </Button>

                        {/* Register link */}
                        {canRegister && (
                            <>
                                <div className="relative my-1">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-700" />
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-white px-3 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                                            or
                                        </span>
                                    </div>
                                </div>

                                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                                    Don't have an account?{' '}
                                    <TextLink
                                        href="/register"
                                        tabIndex={6}
                                        className="font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                                    >
                                        Create one free
                                    </TextLink>
                                </p>
                            </>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Welcome back',
    description: 'Log in to report hazards and track your community.',
};
