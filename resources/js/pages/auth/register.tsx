import { Form, Head } from '@inertiajs/react';
import { ShieldCheck, Users } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

const ROLES = [
    {
        value: 'resident',
        label: 'Resident',
        description: 'Report hazards and track status',
        icon: <Users className="size-4" />,
    },
    {
        value: 'responder',
        label: 'Responder',
        description: 'Receive and act on assigned incidents',
        icon: <ShieldCheck className="size-4" />,
    },
] as const;

export default function Register() {
    return (
        <>
            <Head title="Create account — FloodTrack" />

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
                            <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                                Full name
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                name="name"
                                placeholder="Juan Dela Cruz"
                                className="h-11 rounded-lg border-slate-200 bg-slate-50 px-4 text-sm placeholder:text-slate-400 focus:border-[#1F6FBF] focus:bg-white focus:ring-[#1F6FBF]/20"
                            />
                            <InputError message={errors.name} />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                                Email address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                tabIndex={2}
                                autoComplete="email"
                                name="email"
                                placeholder="you@example.com"
                                className="h-11 rounded-lg border-slate-200 bg-slate-50 px-4 text-sm placeholder:text-slate-400 focus:border-[#1F6FBF] focus:bg-white focus:ring-[#1F6FBF]/20"
                            />
                            <InputError message={errors.email} />
                        </div>

                        {/* Contact number */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="contact_number" className="text-sm font-medium text-slate-700">
                                Contact number{' '}
                                <span className="font-normal text-slate-400">(optional)</span>
                            </Label>
                            <Input
                                id="contact_number"
                                type="tel"
                                tabIndex={3}
                                autoComplete="tel"
                                name="contact_number"
                                placeholder="09XX XXX XXXX"
                                className="h-11 rounded-lg border-slate-200 bg-slate-50 px-4 text-sm placeholder:text-slate-400 focus:border-[#1F6FBF] focus:bg-white focus:ring-[#1F6FBF]/20"
                            />
                            <InputError message={(errors as Record<string, string>).contact_number} />
                        </div>

                        {/* Role selector */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-sm font-medium text-slate-700">I am a</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {ROLES.map((role, i) => (
                                    <label key={role.value} className="cursor-pointer">
                                        <input
                                            type="radio"
                                            name="role"
                                            value={role.value}
                                            defaultChecked={role.value === 'resident'}
                                            tabIndex={4 + i}
                                            className="peer sr-only"
                                            required
                                        />
                                        <div className="flex flex-col gap-1 rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 transition-all peer-checked:border-[#1F6FBF] peer-checked:bg-[#EAF2FB]">
                                            <div className="flex items-center gap-2 text-slate-600 peer-checked:text-[#1F6FBF]">
                                                <span className="text-[#1F6FBF]">{role.icon}</span>
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {role.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-snug">
                                                {role.description}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <InputError message={(errors as Record<string, string>).role} />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                required
                                tabIndex={6}
                                autoComplete="new-password"
                                name="password"
                                placeholder="Min. 8 characters"
                                className="h-11 rounded-lg border-slate-200 bg-slate-50 px-4 text-sm focus:border-[#1F6FBF] focus:bg-white focus:ring-[#1F6FBF]/20"
                            />
                            <InputError message={errors.password} />
                        </div>

                        {/* Confirm password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password_confirmation" className="text-sm font-medium text-slate-700">
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                required
                                tabIndex={7}
                                autoComplete="new-password"
                                name="password_confirmation"
                                placeholder="Re-enter your password"
                                className="h-11 rounded-lg border-slate-200 bg-slate-50 px-4 text-sm focus:border-[#1F6FBF] focus:bg-white focus:ring-[#1F6FBF]/20"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            tabIndex={8}
                            data-test="register-user-button"
                            className="mt-1 h-11 w-full rounded-lg bg-[#1F6FBF] text-sm font-semibold text-white hover:bg-[#124577] disabled:opacity-60"
                        >
                            {processing ? <Spinner /> : 'Create my account'}
                        </Button>

                        <p className="text-center text-sm text-slate-500">
                            Already have an account?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={9}
                                className="font-medium text-[#1F6FBF] hover:text-[#124577]"
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
