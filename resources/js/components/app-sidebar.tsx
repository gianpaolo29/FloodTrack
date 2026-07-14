import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    Building2,
    CloudSun,
    Download,
    FileText,
    Globe,
    History,
    LayoutDashboard,
    LayoutGrid,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavSection } from '@/components/nav-section';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const defaultNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

// ─── Admin sidebar sections ─────────────────────────────────────────────────

const mainItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
    },
    {
        title: 'Map View',
        href: '/admin/reports/map',
        icon: Globe,
    },
    {
        title: 'Weather',
        href: '/admin/weather',
        icon: CloudSun,
    },
];

const managementItems: NavItem[] = [
    {
        title: 'Reports',
        href: '/admin/reports',
        icon: FileText,
    },
    {
        title: 'Hazards',
        href: '/admin/hazards',
        icon: ShieldAlert,
    },
    {
        title: 'Evacuation Centers',
        href: '/admin/evacuation-centers',
        icon: Building2,
    },
    {
        title: 'Alerts',
        href: '/admin/alerts',
        icon: AlertTriangle,
    },
    {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'Responders',
        href: '/admin/responders',
        icon: ShieldCheck,
    },
];

const analyticsItems: NavItem[] = [
    {
        title: 'Statistics',
        href: '/admin/statistics',
        icon: BarChart3,
    },
    {
        title: 'Export',
        href: '/admin/export',
        icon: Download,
    },
];

const systemItems: NavItem[] = [
    {
        title: 'Activity Log',
        href: '/admin/activity',
        icon: History,
    },
    {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={isAdmin ? '/admin' : dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {isAdmin ? (
                    <>
                        <NavSection label="Overview" items={mainItems} />
                        <SidebarSeparator className="mx-3 opacity-50" />
                        <NavSection label="Management" items={managementItems} />
                        <SidebarSeparator className="mx-3 opacity-50" />
                        <NavSection label="Analytics" items={analyticsItems} />
                        <SidebarSeparator className="mx-3 opacity-50" />
                        <NavSection label="System" items={systemItems} />
                    </>
                ) : (
                    <NavMain items={defaultNavItems} />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
