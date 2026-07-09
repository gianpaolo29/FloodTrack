import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Mail, Phone, User } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    return (
        <>
            <Head title="Create account — FloodTrack" />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900 dark:text-white">
                    Create your account
                </h1>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    Fill in your details to get started
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
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="name" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Full name
                            </Label>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Juan Dela Cruz"
                                    className="h-12 rounded-xl border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                                />
                            </div>
                            <InputError message={errors.name} />
                        </div>

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
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    className="h-12 rounded-xl border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Contact number */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="contact_number" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Contact number{' '}
                                <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                            </Label>
                            <div className="relative">
                                <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                                <Input
                                    id="contact_number"
                                    type="tel"
                                    tabIndex={3}
                                    autoComplete="tel"
                                    name="contact_number"
                                    placeholder="09XX XXX XXXX"
                                    className="h-12 rounded-xl border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                                />
                            </div>
                            <InputError message={(errors as Record<string, string>).contact_number} />
                        </div>

                        {/* Hidden default role */}
                        <input type="hidden" name="role" value="resident" />

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                required
                                tabIndex={6}
                                autoComplete="new-password"
                                name="password"
                                placeholder="Min. 8 characters"
                                className="h-12 rounded-xl border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                            />
                            <InputError message={errors.password} />
                        </div>

                        {/* Confirm password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password_confirmation" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                required
                                tabIndex={7}
                                autoComplete="new-password"
                                name="password_confirmation"
                                placeholder="Re-enter your password"
                                className="h-12 rounded-xl border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:border-cyan-500 dark:focus:bg-neutral-800 dark:focus:ring-cyan-500/20"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            tabIndex={8}
                            data-test="register-user-button"
                            className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <ArrowRight className="size-4" />
                                    Create my account
                                </span>
                            )}
                        </Button>

                        {/* Login link */}
                        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                            Already have an account?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={9}
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
