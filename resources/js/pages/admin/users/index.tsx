import { swalDelete, swalSuccess } from '@/lib/swal';
import { Head, router, useForm } from '@inertiajs/react';
import { useJsApiLoader } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    MapPin,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Users2,
    X,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PrimaryStatCard } from '@/components/admin/kpi/PrimaryStatCard';
import { SecondaryStatCard } from '@/components/admin/kpi/SecondaryStatCard';
import { PeriodToggle } from '@/components/admin/kpi/PeriodToggle';
import type { InsightRow } from '@/lib/kpi-utils';
import type { BreadcrumbItem } from '@/types';
import type { AdminUser } from '@/types/admin';

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Filters {
    search?: string;
}

interface Props {
    users: Paginated<AdminUser>;
    filters: Filters;
    stats: { total: number; new: number; with_address: number; verified: number };
    trends: { total: number; new: number; label: string; period_label: string };
    period: string;
    custom_from: string | null;
    custom_to: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Residents', href: '/admin/users' },
];

const modalSpring = { type: 'spring' as const, stiffness: 400, damping: 28 };

const NASUGBU_BOUNDS = { north: 14.115, south: 14.010, east: 120.680, west: 120.565 };

function cleanAddress(raw: string): string {
    return raw.replace(/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3},?\s*/i, '').trim();
}

const PLUS_CODE_RE = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}$/i;

export default function AdminUsersIndex({ users, filters, stats, trends, period, custom_from, custom_to }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const filtered = users.data.filter((u) => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.contact_number ?? '').toLowerCase().includes(q) || (u.home_address ?? '').toLowerCase().includes(q);
    });

    const hasFilters = !!searchValue;

    const allOnPageSelected = filtered.length > 0 && filtered.every((u) => selected.includes(u.id));
    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(selected.filter((id) => !filtered.some((u) => u.id === id)));
        } else {
            setSelected([...new Set([...selected, ...filtered.map((u) => u.id)])]);
        }
    };
    const toggleOne = (id: number) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const runBulkAction = async (action: string) => {
        if (selected.length === 0) return;
        if (action === 'delete') {
            const confirmed = await swalDelete(`${selected.length} selected resident(s)`);
            if (!confirmed) return;
        }
        setBulkProcessing(true);
        router.post('/admin/users/bulk', { ids: selected, action }, {
            preserveState: false,
            onFinish: () => { setBulkProcessing(false); setSelected([]); },
            onSuccess: () => swalSuccess('Done', `Bulk ${action} completed successfully.`),
        });
    };

    const handleDelete = async (id: number) => {
        const confirmed = await swalDelete('this resident');
        if (!confirmed) return;
        router.delete(`/admin/users/${id}`, {
            preserveState: false,
            onSuccess: () => swalSuccess('Deleted', 'Resident has been deleted.'),
        });
    };

    const tl = trends.label;
    const addressPct = stats.total > 0 ? Math.round((stats.with_address / stats.total) * 100) : 0;
    const verifiedPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
    const newPct = stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0;

    function smartDesc(key: string): string {
        switch (key) {
            case 'total': {
                if (stats.total === 0) return 'No residents registered yet — promote the platform to increase adoption.';
                const t = trends.total;
                const parts: string[] = [];
                if (t > 20) parts.push(`User base growing rapidly (${Math.abs(t)}% ${tl}) — great adoption momentum.`);
                else if (t > 0) parts.push(`User base growing steadily (${Math.abs(t)}% ${tl}) — adoption is healthy.`);
                else if (t === 0) parts.push(`User count stable ${tl} — consider outreach to drive more signups.`);
                if (verifiedPct >= 80) parts.push('High email verification rate — communications are reliable.');
                else if (verifiedPct >= 50) parts.push('Moderate verification — encourage unverified users to confirm their emails.');
                else parts.push('Low verification rate — many residents may miss critical flood alerts.');
                if (addressPct < 50) parts.push('Most residents lack home addresses — location-based alerts won\'t reach them.');
                return parts.join(' ');
            }
            case 'new': {
                if (stats.new === 0) return 'No new registrations this period — consider running awareness campaigns to attract more residents.';
                const t = trends.new;
                const parts: string[] = [];
                if (t > 30) parts.push(`Registration surge (${Math.abs(t)}% ${tl}) — possibly driven by recent flood events. Ensure onboarding is smooth.`);
                else if (t > 0) parts.push(`Registrations increasing (${Math.abs(t)}% ${tl}) — platform awareness is growing.`);
                else if (t < -20) parts.push(`Registrations dropping (${Math.abs(t)}% ${tl}) — interest may be fading, consider outreach campaigns.`);
                else if (t < 0) parts.push(`Registrations slowing slightly (${Math.abs(t)}% ${tl}) — normal fluctuation.`);
                else parts.push(`Registration pace steady ${tl}.`);
                if (verifiedPct < 60) parts.push('Encourage new users to verify emails for reliable alert delivery.');
                if (addressPct < 50) parts.push('Prompt new users to add home addresses for location-based notifications.');
                return parts.join(' ');
            }
            case 'with_address': {
                if (stats.with_address === 0) return 'No residents have home addresses set — location-based flood alerts cannot be delivered. Run a campaign to collect addresses.';
                const parts: string[] = [];
                if (addressPct >= 80) parts.push('Excellent address coverage — most residents can receive location-based flood alerts.');
                else if (addressPct >= 50) parts.push('Moderate address coverage — push notifications can reach most residents but gaps remain.');
                else parts.push('Low address coverage — many residents won\'t receive location-specific flood warnings.');
                if (addressPct < verifiedPct) parts.push('More users verified email than added addresses — address collection needs focus.');
                else if (addressPct > verifiedPct) parts.push('Address coverage exceeds email verification — prioritize email verification next.');
                return parts.join(' ');
            }
            case 'verified': {
                if (stats.verified === 0) return 'No verified emails — residents won\'t receive email alerts. Send verification reminders urgently.';
                const parts: string[] = [];
                if (verifiedPct >= 90) parts.push('Outstanding verification rate — email communication is highly reliable.');
                else if (verifiedPct >= 70) parts.push('Good verification rate — most residents are reachable via email.');
                else if (verifiedPct >= 50) parts.push('Moderate verification — a significant portion may miss email-based alerts.');
                else parts.push('Low verification rate — critical alerts via email won\'t reach most residents. Send reminders.');
                if (verifiedPct > addressPct) parts.push('Email verification leads address coverage — focus on collecting home addresses next.');
                else if (addressPct > verifiedPct) parts.push('Address coverage is higher — push email verification to match.');
                return parts.join(' ');
            }
            default: return '';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Residents" />

            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                            <Users2 className="size-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Residents
                            </h1>
                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                Manage resident accounts and their information
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PeriodToggle period={period} customFrom={custom_from} customTo={custom_to} baseUrl="/admin/users" />
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:brightness-110 active:scale-[0.97]"
                        >
                            <Plus className="size-4" />
                            Add Resident
                        </button>
                    </div>
                </div>

                {/* ── KPI Stats ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <PrimaryStatCard
                        label="Total Residents"
                        value={stats.total}
                        trend={trends.total}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('total')}
                        insights={[{ label: 'With Address', value: stats.with_address }, { label: 'Verified', value: stats.verified }]}
                        icon={Users2}
                        grad="from-blue-500 via-indigo-500 to-violet-500"
                        shadow="shadow-blue-500/40"
                        alert={false}
                        index={0}
                        mounted={mounted}
                    />
                    <PrimaryStatCard
                        label="New This Period"
                        value={stats.new}
                        trend={trends.new}
                        trendLabel={`${trends.label}, ${trends.period_label}`}
                        desc={smartDesc('new')}
                        insights={[]}
                        icon={Sparkles}
                        grad="from-cyan-500 via-sky-500 to-blue-500"
                        shadow="shadow-cyan-500/40"
                        alert={false}
                        index={1}
                        mounted={mounted}
                    />
                    <SecondaryStatCard
                        icon={MapPin}
                        grad="from-violet-500 to-purple-500"
                        shadow="shadow-violet-500/25"
                        value={stats.with_address}
                        label="With Address"
                        trend={undefined}
                        desc={smartDesc('with_address')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={400}
                    />
                    <SecondaryStatCard
                        icon={CheckCircle2}
                        grad="from-emerald-500 to-teal-500"
                        shadow="shadow-emerald-500/25"
                        value={stats.verified}
                        label="Verified Email"
                        trend={undefined}
                        desc={smartDesc('verified')}
                        insights={[]}
                        trendLabel={trends.label}
                        periodLabel={trends.period_label}
                        mounted={mounted}
                        delay={500}
                    />
                </div>

                {/* ── Bulk action bar ── */}
                <AnimatePresence>
                    {selected.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.99 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 to-purple-50/60 px-5 py-3.5 dark:border-violet-800/40 dark:from-violet-950/30 dark:to-purple-950/20"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                                    {selected.length} selected
                                </span>
                                <div className="h-4 w-px bg-violet-300/60 dark:bg-violet-700/60" />
                                <button
                                    onClick={() => runBulkAction('delete')}
                                    disabled={bulkProcessing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5" /> Delete
                                </button>
                                <button
                                    onClick={() => setSelected([])}
                                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/40"
                                >
                                    Clear selection
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Table Card ── */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                            All Residents
                            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                {users.total}
                            </span>
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search residents..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-8 text-xs outline-none transition-all placeholder:text-neutral-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-800"
                                />
                                {searchValue && (
                                    <button onClick={() => setSearchValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile card view */}
                    <div className="block sm:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                        {filtered.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.name} className="size-9 shrink-0 rounded-full object-cover shadow-sm" />
                                ) : (
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
                                        {user.email_verified_at ? (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700/40">
                                                <CheckCircle2 className="size-2.5" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-700/40">
                                                <XCircle className="size-2.5" />
                                                Unverified
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{user.email}</p>
                                    {user.contact_number && (
                                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{user.contact_number}</p>
                                    )}
                                    {user.home_address && (
                                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                                            <MapPin className="size-3 shrink-0" />
                                            {user.home_address}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        onClick={() => setEditingUser(user)}
                                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                                    >
                                        <Pencil className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-800/40">
                                    <th className="w-10 px-5 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="size-3.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500/20 dark:border-neutral-600"
                                        />
                                    </th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Resident</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Contact</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Home Address</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/80 dark:divide-neutral-800/80">
                                {filtered.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group transition-colors ${
                                            selected.includes(user.id)
                                                ? 'bg-violet-50/60 dark:bg-violet-950/20'
                                                : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30'
                                        }`}
                                    >
                                        <td className="w-10 px-5 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(user.id)}
                                                onChange={() => toggleOne(user.id)}
                                                className="size-3.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500/20 dark:border-neutral-600"
                                            />
                                        </td>

                                        {/* Resident */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.name} className="size-9 shrink-0 rounded-full object-cover shadow-sm" />
                                                ) : (
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
                                                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-5 py-4">
                                            {user.contact_number ? (
                                                <span className="text-xs text-neutral-600 dark:text-neutral-400">{user.contact_number}</span>
                                            ) : (
                                                <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Home Address */}
                                        <td className="max-w-[200px] px-5 py-4">
                                            {user.home_address ? (
                                                <div className="flex items-start gap-1.5">
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                                                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={user.home_address}>
                                                        {user.home_address}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4 text-center">
                                            {user.email_verified_at ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700/40">
                                                    <CheckCircle2 className="size-3" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-700/40">
                                                    <XCircle className="size-3" />
                                                    Unverified
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                                                    title="Edit resident"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                    title="Delete resident"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20">
                                <Users2 className="size-8 text-violet-400 dark:text-violet-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No residents found</p>
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                    {hasFilters ? 'Try adjusting your search.' : 'No residents have registered yet.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Page{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{users.current_page}</span>
                                {' '}of{' '}
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{users.last_page}</span>
                                <span className="ml-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="ml-2">{users.total} total</span>
                            </span>
                            <div className="flex items-center gap-1">
                                {users.links.map((link, i) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next')     || link.label.includes('&raquo;');
                                    if (isPrev || isNext) {
                                        return link.url ? (
                                            <button key={i} onClick={() => router.get(link.url!)}
                                                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-violet-700/40 dark:hover:bg-violet-950/20 dark:hover:text-violet-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                        ) : (
                                            <span key={i} className="flex size-8 items-center justify-center rounded-lg opacity-30 text-neutral-400">
                                                {isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                            </span>
                                        );
                                    }
                                    return link.url ? (
                                        <button key={i} onClick={() => router.get(link.url!)}
                                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm'
                                                    : 'border border-neutral-200 text-neutral-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-violet-700/40 dark:hover:bg-violet-950/20'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span key={i} className="flex size-8 items-center justify-center rounded-lg text-xs opacity-30 text-neutral-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }} />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <UserFormModal
                        title="Add Resident"
                        onClose={() => setShowCreate(false)}
                    />
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <UserFormModal
                        title="Edit Resident"
                        user={editingUser}
                        onClose={() => setEditingUser(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}

/* ─── User Form Modal (Create / Edit) ─── */

function UserFormModal({
    title,
    user,
    onClose,
}: {
    title: string;
    user?: AdminUser;
    onClose: () => void;
}) {
    const isEdit = !!user;
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm({
        name:           user?.name           ?? '',
        email:          user?.email          ?? '',
        role:           'resident',
        contact_number: user?.contact_number ?? '09',
        password:       '',
        home_address:   user?.home_address   ?? '',
        home_latitude:  user?.home_latitude?.toString()  ?? '',
        home_longitude: user?.home_longitude?.toString() ?? '',
    });

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '');
        const val = (digits.startsWith('09') ? digits : '09').slice(0, 11);
        form.setData('contact_number', val);
    };

    const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        if (e.key === 'Backspace' && (input.selectionStart ?? 0) <= 2 && (input.selectionEnd ?? 0) <= 2) {
            e.preventDefault();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/users/${user!.id}`, { preserveState: false, onSuccess: () => { onClose(); swalSuccess('Success', 'Resident updated successfully.'); } });
        } else {
            form.post('/admin/users', { preserveState: false, onSuccess: () => { form.reset(); onClose(); swalSuccess('Success', 'Resident added successfully.'); } });
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const inputClassName =
        'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-sky-500 dark:focus:bg-neutral-900';

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900"
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={modalSpring}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center gap-3 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-700/60">
                    {isEdit && user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="size-9 shrink-0 rounded-xl object-cover shadow-sm" />
                    ) : (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                            {isEdit ? <Pencil className="size-4 text-white" /> : <Plus className="size-4 text-white" />}
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isEdit ? 'Update resident details' : 'Add a new resident account'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Modal body */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField label="Full Name" error={form.errors.name}>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className={inputClassName}
                                placeholder="John Doe"
                                required
                            />
                        </FormField>
                        <FormField label="Email" error={form.errors.email}>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className={inputClassName}
                                placeholder="john@example.com"
                                required
                            />
                        </FormField>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField label="Contact Number" error={form.errors.contact_number}>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.data.contact_number}
                                onChange={handlePhoneChange}
                                onKeyDown={handlePhoneKeyDown}
                                onFocus={(e) => { if (!e.target.value) form.setData('contact_number', '09'); }}
                                className={inputClassName}
                                placeholder="09XXXXXXXXX"
                                maxLength={11}
                            />
                        </FormField>
                        <FormField label={isEdit ? 'New Password' : 'Password'} error={form.errors.password}>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className={inputClassName + ' pr-10'}
                                    placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
                                    required={!isEdit}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                        </FormField>
                    </div>

                    {isEdit ? (
                        <FormField label="Home Address">
                            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100/60 px-3.5 py-2.5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-400">
                                <MapPin className="size-3.5 shrink-0 text-neutral-400" />
                                {user?.home_address || <span className="italic text-neutral-400 dark:text-neutral-500">Not set by resident</span>}
                            </div>
                        </FormField>
                    ) : (
                        <FormField label="Home Address" error={form.errors.home_address}>
                            <HomeAddressAutocomplete
                                value={form.data.home_address}
                                onChange={(addr, lat, lng) => {
                                    form.setData('home_address', addr);
                                    form.setData('home_latitude', lat);
                                    form.setData('home_longitude', lng);
                                }}
                                className={inputClassName}
                            />
                        </FormField>
                    )}

                    {/* Modal footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-neutral-200/60 pt-5 dark:border-neutral-700/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                        >
                            {isEdit ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                            {form.processing ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Resident'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ─── Form Field ─── */

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/* ─── Home Address Autocomplete (Nasugbu-scoped) ─── */

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

    const acServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesRef    = useRef<google.maps.places.PlacesService | null>(null);
    const placesDivRef = useRef<HTMLDivElement | null>(null);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef   = useRef<HTMLDivElement>(null);

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
                        <div className="size-3.5 animate-spin rounded-full border-2 border-neutral-200 border-t-sky-500" />
                    </div>
                )}
            </div>
            {open && predictions.length > 0 && (
                <ul className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                            className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/30"
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
