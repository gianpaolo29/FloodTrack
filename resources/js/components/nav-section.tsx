import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

interface NavSectionProps {
    label: string;
    items: NavItem[];
}

export function NavSection({ label, items }: NavSectionProps) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const active = isCurrentUrl(item.href);
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={{ children: item.title }}
                                className={active ? 'bg-sky-500/10 text-sky-600 font-semibold dark:bg-sky-500/15 dark:text-sky-300' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon className={active ? 'text-sky-500 dark:text-sky-300' : ''} />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
