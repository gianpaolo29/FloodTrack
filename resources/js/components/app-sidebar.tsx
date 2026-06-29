import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Download,
    FileText,
    FolderGit2,
    Globe,
    History,
    LayoutDashboard,
    LayoutGrid,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
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
];

const managementItems: NavItem[] = [
    {
        title: 'Reports',
        href: '/admin/reports',
        icon: FileText,
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

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';

    return (
        <Sidebar collapsible="icon" variant="inset">
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
                        <NavSection label="Main" items={mainItems} />
                        <NavSection label="Management" items={managementItems} />
                        <NavSection label="Analytics" items={analyticsItems} />
                        <NavSection label="System" items={systemItems} />
                    </>
                ) : (
                    <NavMain items={defaultNavItems} />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
