import { Link, usePage } from '@inertiajs/react';
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
    ShieldAlert,
    ShieldCheck,
    Users,
} from 'lucide-react';
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
        children: [
            { title: 'All',      href: '/admin/reports' },
            { title: 'Pending',  href: '/admin/reports?status=pending' },
            { title: 'Verified', href: '/admin/reports?status=verified' },
            { title: 'Assigned', href: '/admin/reports?status=assigned' },
            { title: 'Resolved', href: '/admin/reports?status=resolved' },
            { title: 'Rejected', href: '/admin/reports?status=rejected' },
        ],
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
        title: 'Residents',
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
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            {/* Logo */}
            <SidebarHeader className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-foreground/5 rounded-xl group-data-[collapsible=icon]:justify-center">
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
                        <NavSection label="Overview" items={mainItems} />
                        <SidebarSeparator className="mx-4 my-1 opacity-20" />
                        <NavSection label="Management" items={managementItems} />
                        <SidebarSeparator className="mx-4 my-1 opacity-20" />
                        <NavSection label="Analytics" items={analyticsItems} />
                        <SidebarSeparator className="mx-4 my-1 opacity-20" />
                        <NavSection label="System" items={systemItems} />
                    </>
                ) : (
                    <NavMain items={defaultNavItems} />
                )}
            </SidebarContent>

        </Sidebar>
    );
}
