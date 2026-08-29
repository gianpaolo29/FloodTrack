import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    Building2,
    CheckCheck,
    FileText,
    Maximize,
    Megaphone,
    Minimize,
    Moon,
    Search,
    Shield,
    Sun,
    Users,
    UsersRound,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { UserMenuContent } from '@/components/user-menu-content';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

interface SearchItem {
    id: number;
    label: string;
    sub: string;
    url: string;
    meta?: string;
    badge?: string;
}

interface SearchGroup {
    category: string;
    icon: string;
    items: SearchItem[];
}

interface NotificationData {
    type: string;
    title: string;
    message: string;
    url?: string;
    severity?: string;
    [key: string]: unknown;
}

interface AppNotification {
    id: string;
    data: NotificationData;
    read_at: string | null;
    created_at: string;
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth, unreadNotifications } = usePage().props;
    const getInitials = useInitials();
    const { appearance, updateAppearance } = useAppearance();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [searchOpen, setSearchOpen]       = useState(false);
    const [searchQuery, setSearchQuery]     = useState('');
    const [searchResults, setSearchResults] = useState<SearchGroup[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchRef   = useRef<HTMLDivElement>(null);
    const searchInput = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [localUnread, setLocalUnread] = useState(unreadNotifications as number);
    const dropdownRef  = useRef<HTMLDivElement>(null);

    // Sync from server prop
    useEffect(() => {
        setLocalUnread(unreadNotifications as number);
    }, [unreadNotifications]);

    // Debounced search fetch
    useEffect(() => {
        if (!searchOpen) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }
        setSearchLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await apiFetch(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.results ?? []);
                }
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, searchOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        }
        if (showNotifications) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [showNotifications]);

    const closeSearch = useCallback(() => {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
    }, []);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                closeSearch();
            }
        }
        if (searchOpen) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [searchOpen, closeSearch]);

    const openSearch = useCallback(() => {
        setSearchOpen(true);
        setSearchQuery('');
        setSearchResults([]);
        setTimeout(() => searchInput.current?.focus(), 50);
    }, []);

    const handleSearchNavigate = useCallback((url: string) => {
        closeSearch();
        router.visit(url);
    }, [closeSearch]);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
        } else {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/admin/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
                setLocalUnread(data.unread_count);
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleDropdown = () => {
        if (!showNotifications) {
            fetchNotifications();
        }
        setShowNotifications(!showNotifications);
    };

    const markAsRead = async (id: string) => {
        try {
            await apiFetch(`/admin/notifications/${id}/read`, { method: 'POST' });
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            setLocalUnread((prev) => Math.max(0, prev - 1));
        } catch {}
    };

    const markAllAsRead = async () => {
        try {
            await apiFetch('/admin/notifications/mark-all-read', { method: 'POST' });
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
            setLocalUnread(0);
        } catch {}
    };

    const handleNotificationClick = (notification: AppNotification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        if (notification.data.url) {
            setShowNotifications(false);
            router.visit(notification.data.url);
        }
    };

    // Poll every 30s for new notifications
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await apiFetch('/admin/notifications');
                if (res.ok) {
                    const data = await res.json();
                    setLocalUnread(data.unread_count);
                    if (showNotifications) {
                        setNotifications(data.notifications);
                    }
                }
            } catch {}
        }, 30000);
        return () => clearInterval(interval);
    }, [showNotifications]);

    return (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 sm:gap-4 rounded-tl-xl rounded-tr-xl sm:rounded-tl-2xl sm:rounded-tr-2xl border-b border-border/[0.35] bg-background/90 px-3 sm:px-6 shadow-sm shadow-black/[0.025] backdrop-blur-2xl">
            {/* Left — trigger + breadcrumbs */}
            <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors" />
                <div className="hidden h-5 w-px bg-border/60 sm:block" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {/* Right — search, notifications, avatar */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <div ref={searchRef} className="relative">
                    {searchOpen ? (
                        <div className="relative w-48 sm:w-64">
                            {/* Input */}
                            <div className="relative flex items-center">
                                {searchLoading ? (
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                                        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
                                    </div>
                                ) : (
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                                )}
                                <input
                                    ref={searchInput}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                                    placeholder="Search…"
                                    className="h-9 w-full rounded-xl border-0 bg-muted/50 pl-9 pr-8 text-sm text-foreground shadow-sm ring-1 ring-border/40 placeholder:text-muted-foreground/40 focus:bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
                                />
                                <button
                                    onClick={closeSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>

                            {/* Dropdown — same width as input (w-full) */}
                            {searchQuery.trim().length >= 2 && (
                                <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border/50 bg-card shadow-xl shadow-black/10">
                                    {searchLoading ? (
                                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                            <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
                                            Searching…
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="flex flex-col items-center gap-1.5 py-8">
                                            <Search className="size-7 text-muted-foreground/20" />
                                            <p className="text-xs text-muted-foreground">No results for "<span className="font-medium text-foreground">{searchQuery}</span>"</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-80 overflow-y-auto">
                                            {searchResults.map((group, gi) => (
                                                <div key={group.category}>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 ${gi > 0 ? 'border-t border-border/30' : ''}`}>
                                                        <SearchCategoryIcon icon={group.icon} />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{group.category}</span>
                                                    </div>
                                                    {group.items.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            onMouseDown={(e) => { e.preventDefault(); handleSearchNavigate(item.url); }}
                                                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                                                                <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                                                            </div>
                                                            {item.meta && (
                                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${SEVERITY_BADGE[item.meta] ?? 'bg-muted text-muted-foreground'}`}>
                                                                    {item.meta}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={openSearch}
                            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground hover:shadow-sm active:scale-95"
                        >
                            <Search className="size-[18px]" />
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div className="hidden h-5 w-px bg-border/40 md:block" />

                {/* Notification bell */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleDropdown}
                        className="group relative flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground hover:shadow-sm active:scale-95"
                    >
                        <Bell className={`size-[18px] transition-transform group-hover:scale-105 ${showNotifications ? 'text-foreground' : ''}`} />
                        {localUnread > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-card">
                                    {localUnread > 9 ? '9+' : localUnread}
                                </span>
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-96 max-h-[28rem] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl shadow-black/10 z-50 animate-in slide-in-from-top-2 fade-in duration-200 sm:w-96">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                                <h3 className="text-sm font-semibold">Notifications</h3>
                                {localUnread > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                                    >
                                        <CheckCheck className="size-3.5" />
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* List */}
                            <div className="max-h-[22rem] overflow-y-auto">
                                {loading && notifications.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-12">
                                        <Bell className="size-8 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dark mode toggle */}
                <button
                    onClick={() => updateAppearance(appearance === 'dark' ? 'light' : 'dark')}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground hover:shadow-sm active:scale-95"
                    title={appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {appearance === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
                </button>

                {/* Fullscreen toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="hidden md:flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground hover:shadow-sm active:scale-95"
                    title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                    {isFullscreen ? <Minimize className="size-[18px]" /> : <Maximize className="size-[18px]" />}
                </button>

                {/* Divider */}
                <div className="hidden h-5 w-px bg-border/40 sm:block" />

                {/* User avatar dropdown */}
                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2.5 rounded-xl pl-1 pr-2 py-1 transition-all hover:bg-muted/60 hover:shadow-sm active:scale-[0.97] focus:outline-none">
                                <div className="hidden text-right sm:block">
                                    <p className="text-sm font-medium leading-tight">{auth.user.name}</p>
                                    <p className="text-[11px] leading-tight text-muted-foreground capitalize">{auth.user.role}</p>
                                </div>
                                <Avatar className="size-8 ring-2 ring-primary/15 transition-all duration-200 group-hover:ring-primary/35 group-hover:shadow-md group-hover:shadow-primary/10">
                                    <AvatarImage src={auth.user.avatar_url ?? undefined} alt={auth.user.name} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-[11px] font-semibold text-primary-foreground">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-48 sm:min-w-56 rounded-xl" align="end" sideOffset={8}>
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}

/* ─── Notification Item ─── */

function NotificationItem({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
    const isUnread = !notification.read_at;
    const data = notification.data;
    const timeAgo = getTimeAgo(notification.created_at);

    const iconMap: Record<string, React.ReactNode> = {
        new_report: <FileText className="size-4 text-blue-500" />,
        status_changed: <AlertTriangle className="size-4 text-amber-500" />,
        new_alert: <Megaphone className="size-4 text-rose-500" />,
    };

    const bgMap: Record<string, string> = {
        new_report: 'bg-blue-500/10',
        status_changed: 'bg-amber-500/10',
        new_alert: 'bg-rose-500/10',
    };

    return (
        <button
            onClick={onClick}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-muted/40 active:bg-muted/60 ${isUnread ? 'bg-primary/[0.03]' : ''}`}
        >
            <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${bgMap[data.type] ?? 'bg-muted'}`}>
                {iconMap[data.type] ?? <Bell className="size-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className={`text-sm leading-tight ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                        {data.title}
                    </p>
                    {isUnread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {data.message}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">{timeAgo}</p>
            </div>
        </button>
    );
}

/* ─── Search helpers ─── */

const SEVERITY_BADGE: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    high:     'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    low:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
};

function SearchCategoryIcon({ icon }: { icon: string }) {
    const cls = 'size-3.5 text-muted-foreground/60';
    switch (icon) {
        case 'file-text':   return <FileText className={cls} />;
        case 'users':       return <Users className={cls} />;
        case 'shield':      return <Shield className={cls} />;
        case 'users-round': return <UsersRound className={cls} />;
        case 'building2':   return <Building2 className={cls} />;
        default:            return <Search className={cls} />;
    }
}

/* ─── Helpers ─── */

function getCsrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function apiFetch(url: string, options: RequestInit = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': getCsrf(),
            ...options.headers,
        },
    });
}

function getTimeAgo(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
