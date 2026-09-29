import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    Building2,
    Clock,
    CloudSun,
    Download,
    FileText,
    Globe,
    History,
    LayoutDashboard,
    Settings,
    LayoutGrid,
    ShieldAlert,
    ShieldCheck,
    Users,
    UsersRound,
} from 'lucide-react';
import { useMemo } from 'react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavSection } from '@/components/nav-section';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { useLocale } from '@/hooks/use-locale';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const { t } = useLocale();

    const defaultNavItems: NavItem[] = useMemo(() => [
        { title: t('sidebar.dashboard'), href: dashboard(), icon: LayoutGrid },
    ], [t]);

    const mainItems: NavItem[] = useMemo(() => [
        { title: t('sidebar.dashboard'), href: '/admin', icon: LayoutDashboard },
        { title: t('sidebar.map_view'), href: '/admin/reports/map', icon: Globe },
        { title: t('sidebar.weather'), href: '/admin/weather', icon: CloudSun },
    ], [t]);

    const managementItems: NavItem[] = useMemo(() => [
        {
            title: t('sidebar.flood_reports'), href: '/admin/reports', icon: FileText,
            children: [
                { title: t('sidebar.all'), href: '/admin/reports' },
                { title: t('sidebar.to_be_reviewed'), href: '/admin/reports?status=pending' },
                { title: t('sidebar.verified'), href: '/admin/reports?status=verified' },
                { title: t('sidebar.assigned'), href: '/admin/reports?status=assigned' },
                { title: t('sidebar.resolved'), href: '/admin/reports?status=resolved' },
                { title: t('sidebar.rejected'), href: '/admin/reports?status=rejected' },
            ],
        },
        { title: t('sidebar.hazard_zones'), href: '/admin/hazards', icon: ShieldAlert },
        { title: t('sidebar.evacuation_centers'), href: '/admin/evacuation-centers', icon: Building2 },
        { title: t('sidebar.announcements'), href: '/admin/alerts', icon: AlertTriangle },
        { title: t('sidebar.residents'), href: '/admin/users', icon: Users },
        { title: t('sidebar.rescue_personnel'), href: '/admin/responders', icon: ShieldCheck },
        { title: t('sidebar.response_teams'), href: '/admin/teams', icon: UsersRound },
    ], [t]);

    const analyticsItems: NavItem[] = useMemo(() => [
        { title: t('sidebar.statistics'), href: '/admin/statistics', icon: BarChart3 },
        { title: t('sidebar.sla_rules'), href: '/admin/sla', icon: Clock },
        { title: t('sidebar.export'), href: '/admin/export', icon: Download },
    ], [t]);

    const systemItems: NavItem[] = useMemo(() => [
        { title: t('sidebar.activity_log'), href: '/admin/activity', icon: History },
        { title: t('sidebar.settings'), href: '/admin/settings', icon: Settings },
    ], [t]);

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            {/* Logo */}
            <SidebarHeader className="p-2 pb-2.5">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="rounded-xl transition-all duration-200 hover:bg-sidebar-foreground/[0.04] hover:shadow-sm active:scale-[0.97] group-data-[collapsible=icon]:justify-center">
                            <Link href={isAdmin ? '/admin' : dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="mx-4 opacity-30" />

            {/* Nav */}
            <SidebarContent className="py-2 gap-1">
                {isAdmin ? (
                    <>
                        <NavSection label={t('sidebar.overview')} items={mainItems} />
                        <SidebarSeparator className="mx-4 my-1 opacity-20" />
                        <NavSection label={t('sidebar.management')} items={managementItems} />
                        <SidebarSeparator className="mx-4 my-1 opacity-20" />
                        <NavSection label={t('sidebar.analytics')} items={analyticsItems} />
                        <SidebarSeparator className="mx-4 my-1 opacity-20" />
                        <NavSection label={t('sidebar.system')} items={systemItems} />
                    </>
                ) : (
                    <NavMain items={defaultNavItems} />
                )}
            </SidebarContent>

        </Sidebar>
    );
}
