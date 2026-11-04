import { Form, Head, Link, useForm, usePage } from '@inertiajs/react';
import { MapPin, Loader2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { swalSuccess } from '@/lib/swal';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { avatar as avatarRoute, edit, update as updateRoute } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const NASUGBU_BOUNDS = { north: 14.115, south: 14.010, east: 120.680, west: 120.565 };

function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Profile', href: edit() },
];

const inputCls =
    'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-violet-500 dark:focus:bg-neutral-900';

interface Props {
    mustVerifyEmail: boolean;
    status?: string;
}

export default function Profile({ mustVerifyEmail, status }: Props) {
    const { auth } = usePage().props;

    /* ── Avatar ── */
    const fileInputRef   = useRef<HTMLInputElement>(null);
    const avatarForm     = useForm<{ avatar: File | null }>({ avatar: null });
    const [avatarSizeError, setAvatarSizeError] = useState<string | null>(null);

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarSizeError('Image must be 5MB or smaller.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setAvatarSizeError(null);
        avatarForm.setData('avatar', file);
        avatarForm.post(avatarRoute.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { avatarForm.reset(); if (fileInputRef.current) fileInputRef.current.value = ''; },
        });
    }

    /* ── Profile form ── */
    const profileForm = useForm<{
        name:           string;
        email:          string;
        contact_number: string;
        home_address:   string;
        home_latitude:  string | null;
        home_longitude: string | null;
    }>({
        name:           auth.user.name          ?? '',
        email:          auth.user.email         ?? '',
        contact_number: auth.user.contact_number ?? '09',
        home_address:   auth.user.home_address  ?? '',
        home_latitude:  null,
        home_longitude: null,
    });

    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digits = e.target.value.replace(/\D/g, '');
        const val = (digits.startsWith('09') ? digits : '09').slice(0, 11);
        profileForm.setData('contact_number', val);
    }

    function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget;
        if (e.key === 'Backspace' && (input.selectionStart ?? 0) <= 2 && (input.selectionEnd ?? 0) <= 2) {
            e.preventDefault();
        }
    }

    function handleProfileSubmit(e: React.FormEvent) {
        e.preventDefault();
        profileForm.patch(updateRoute.url(), {
            preserveScroll: true,
            onSuccess: () => swalSuccess('Profile updated!', 'Your profile information has been saved.'),
        });
    }

    return (
        <>
            <Head title="Profile" />

            <div className="flex flex-col gap-6 p-4 sm:gap-8 sm:p-6 lg:p-8">

                {/* ── Page heading ── */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        My Profile
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Manage your profile picture, personal information, and password.
                    </p>
                </div>

                {/* ── Profile information card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Card header */}
                    <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <Heading
                            variant="small"
                            title="Profile information"
                            description="Update your profile picture, name, contact, and address"
                        />
                    </div>

                    {/* Card body */}
                    <div className="px-6 py-6 space-y-6">

                        {/* Avatar upload */}
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative size-20 shrink-0 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                                disabled={avatarForm.processing}
                                aria-label="Change profile picture"
                            >
                                {auth.user.avatar_url ? (
                                    <img src={auth.user.avatar_url} alt={auth.user.name} className="size-full object-cover" />
                                ) : (
                                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-2xl font-bold text-white">
                                        {auth.user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                    {avatarForm.processing
                                        ? <Loader2 className="size-5 animate-spin text-white" />
                                        : <Upload className="size-5 text-white" />
                                    }
                                </div>
                            </button>

                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Profile picture</p>
                                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    Click to upload · JPEG, PNG, WebP · Max 5MB
                                </p>
                                {(avatarSizeError || avatarForm.errors.avatar) && (
                                    <p className="mt-1 text-xs text-red-500">{avatarSizeError ?? avatarForm.errors.avatar}</p>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        <div className="border-t border-neutral-100 dark:border-neutral-800" />

                        {/* Profile fields */}
                        <form onSubmit={handleProfileSubmit} className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="name">Full name</Label>
                                    <Input
                                        id="name"
                                        value={profileForm.data.name}
                                        onChange={(e) => profileForm.setData('name', e.target.value)}
                                        placeholder="Full name"
                                        autoComplete="name"
                                        required
                                    />
                                    <InputError message={profileForm.errors.name} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profileForm.data.email}
                                        onChange={(e) => profileForm.setData('email', e.target.value)}
                                        placeholder="Email address"
                                        autoComplete="username"
                                        required
                                    />
                                    <InputError message={profileForm.errors.email} />
                                </div>
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Your email address is unverified.{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-current dark:decoration-neutral-500"
                                        >
                                            Click here to resend the verification email.
                                        </Link>
                                    </p>
                                    {status === 'verification-link-sent' && (
                                        <p className="mt-2 text-sm font-medium text-green-600">
                                            A new verification link has been sent to your email address.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="contact_number">Contact number</Label>
                                <input
                                    id="contact_number"
                                    type="text"
                                    inputMode="numeric"
                                    value={profileForm.data.contact_number}
                                    onChange={handlePhoneChange}
                                    onKeyDown={handlePhoneKeyDown}
                                    onFocus={(e) => { if (!e.target.value) profileForm.setData('contact_number', '09'); }}
                                    placeholder="09XXXXXXXXX"
                                    maxLength={11}
                                    className={inputCls}
                                />
                                <p className="text-[11px] text-neutral-400">Philippine mobile number · starts with 09 · 11 digits</p>
                                <InputError message={profileForm.errors.contact_number} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="home_address">Home address</Label>
                                <HomeAddressAutocomplete
                                    value={profileForm.data.home_address}
                                    onChange={(addr, lat, lng) => {
                                        profileForm.setData('home_address',   addr);
                                        profileForm.setData('home_latitude',  lat || null);
                                        profileForm.setData('home_longitude', lng || null);
                                    }}
                                    className={inputCls}
                                />
                                <InputError message={profileForm.errors.home_address} />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={profileForm.processing} data-test="update-profile-button">
                                    {profileForm.processing ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</> : 'Save changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* ── Change password card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    {/* Card header */}
                    <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <Heading
                            variant="small"
                            title="Change password"
                            description="Ensure your account is using a long, random password to stay secure"
                        />
                    </div>

                    {/* Card body */}
                    <div className="px-6 py-6">
                        <Form
                            {...SecurityController.update.form()}
                            options={{ preserveScroll: true }}
                            resetOnError={['password', 'password_confirmation', 'current_password']}
                            resetOnSuccess
                            onSuccess={() => swalSuccess('Password updated!', 'Your password has been changed successfully.')}
                            className="space-y-5"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid gap-5 sm:grid-cols-3">
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="current_password">Current password</Label>
                                            <PasswordInput
                                                id="current_password"
                                                name="current_password"
                                                autoComplete="current-password"
                                                placeholder="Current password"
                                            />
                                            <InputError message={errors.current_password} />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="password">New password</Label>
                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                autoComplete="new-password"
                                                placeholder="New password"
                                            />
                                            <InputError message={errors.password} />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="password_confirmation">Confirm password</Label>
                                            <PasswordInput
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                autoComplete="new-password"
                                                placeholder="Confirm new password"
                                            />
                                            <InputError message={errors.password_confirmation} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button disabled={processing} data-test="update-password-button">
                                            Update password
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>

            </div>
        </>
    );
}

Profile.layout = { breadcrumbs };

/* ── Home Address Autocomplete (Nasugbu-scoped) ── */

function HomeAddressAutocomplete({ value, onChange, className }: {
    value: string;
    onChange: (address: string, lat: string, lng: string) => void;
    className?: string;
}) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '',
        libraries: ['places'] as ('places')[],
    });

    const [inputVal,    setInputVal]    = useState(value);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [open,        setOpen]        = useState(false);
    const [fetching,    setFetching]    = useState(false);

    const acServiceRef  = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef     = useRef<google.maps.places.PlacesService | null>(null);
    const placesDivRef  = useRef<HTMLDivElement | null>(null);
    const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef    = useRef<HTMLDivElement>(null);

    useEffect(() => { setInputVal(value); }, [value]);

    useEffect(() => {
        if (!isLoaded) return;
        acServiceRef.current = new google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        document.body.appendChild(div);
        placesDivRef.current = div;
        placesRef.current = new google.maps.places.PlacesService(div);
        return () => { if (placesDivRef.current) document.body.removeChild(placesDivRef.current); };
    }, [isLoaded]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchPredictions = useCallback((q: string) => {
        if (!q || q.length < 2 || !acServiceRef.current) { setPredictions([]); setOpen(false); return; }
        const bounds = new google.maps.LatLngBounds(
            { lat: NASUGBU_BOUNDS.south, lng: NASUGBU_BOUNDS.west },
            { lat: NASUGBU_BOUNDS.north, lng: NASUGBU_BOUNDS.east },
        );
        setFetching(true);
        acServiceRef.current.getPlacePredictions(
            { input: q, bounds, strictBounds: true, componentRestrictions: { country: 'ph' } },
            (preds, status) => {
                setFetching(false);
                if (status === 'OK' && preds) {
                    const filtered = preds.filter((p) => p.description.toLowerCase().includes('nasugbu'));
                    setPredictions(filtered);
                    setOpen(filtered.length > 0);
                } else {
                    setPredictions([]); setOpen(false);
                }
            },
        );
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setInputVal(q);
        onChange(q, '', '');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchPredictions(q), 300);
    };

    const selectPrediction = (pred: google.maps.places.AutocompletePrediction) => {
        setOpen(false);
        if (!placesRef.current) return;
        placesRef.current.getDetails(
            { placeId: pred.place_id, fields: ['formatted_address', 'geometry', 'name'] },
            (place, status) => {
                if (status !== 'OK' || !place?.geometry?.location) return;
                const lat  = place.geometry.location.lat().toFixed(7);
                const lng  = place.geometry.location.lng().toFixed(7);
                const addr = cleanAddress(place.formatted_address ?? place.name ?? '');
                setInputVal(addr);
                onChange(addr, lat, lng);
            },
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                    id="home_address"
                    type="text"
                    value={inputVal}
                    onChange={handleInput}
                    onFocus={() => predictions.length > 0 && setOpen(true)}
                    placeholder="Search home address in Nasugbu…"
                    className={`${className} pl-9`}
                    autoComplete="off"
                />
                {fetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-violet-500" />
                    </div>
                )}
            </div>
            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30"
                        >
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {pred.structured_formatting.main_text}
                            </span>
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                {pred.structured_formatting.secondary_text}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
