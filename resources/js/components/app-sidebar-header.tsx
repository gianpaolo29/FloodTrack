import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CheckCheck,
    FileText,
    Megaphone,
    Search,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

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
    const [searchFocused, setSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [localUnread, setLocalUnread] = useState(unreadNotifications as number);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync from server prop
    useEffect(() => {
        setLocalUnread(unreadNotifications as number);
    }, [unreadNotifications]);

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
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/40 bg-card/80 px-6 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            {/* Left — trigger + breadcrumbs */}
            <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
                <div className="hidden h-5 w-px bg-border/60 sm:block" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {/* Right — search, notifications, avatar */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className={`relative hidden transition-all duration-200 md:block ${searchFocused ? 'w-72' : 'w-56'}`}>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder="Search..."
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="h-9 w-full rounded-xl border-0 bg-muted/50 pl-9 pr-4 text-sm text-foreground shadow-sm ring-1 ring-border/40 placeholder:text-muted-foreground/50 focus:bg-background focus:shadow-md focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all duration-200"
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded-md border border-border/40 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 lg:inline-block">
                        /
                    </kbd>
                </div>

                {/* Mobile search button */}
                <button className="flex size-9 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-border/30 hover:bg-muted/50 hover:text-foreground transition-all md:hidden">
                    <Search className="size-4" />
                </button>

                {/* Divider */}
                <div className="hidden h-5 w-px bg-border/40 md:block" />

                {/* Notification bell */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleDropdown}
                        className="group relative flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:shadow-sm transition-all"
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
                        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl shadow-black/10 z-50">
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

                {/* Divider */}
                <div className="hidden h-5 w-px bg-border/40 sm:block" />

                {/* User avatar */}
                {auth.user && (
                    <div className="flex items-center gap-2.5 pl-1">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium leading-tight">{auth.user.name}</p>
                            <p className="text-[11px] leading-tight text-muted-foreground">{auth.user.role}</p>
                        </div>
                        <Avatar className="size-8 ring-2 ring-primary/10 transition-all hover:ring-primary/30">
                            <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-[11px] font-semibold text-primary-foreground">
                                {getInitials(auth.user.name)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
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
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${isUnread ? 'bg-primary/[0.03]' : ''}`}
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
