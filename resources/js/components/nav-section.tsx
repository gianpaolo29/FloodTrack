import { Link, router, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

interface NavSectionProps {
    label: string;
    items: NavItem[];
}

function isHrefActive(href: string, fullPageUrl: string): boolean {
    const base = 'http://localhost';
    const pageUrl = new URL(fullPageUrl, base);

    if (href.includes('?')) {
        const [hrefPath, hrefSearch] = href.split('?');
        if (pageUrl.pathname !== hrefPath) return false;
        const hrefParams = new URLSearchParams(hrefSearch);
        for (const [key, val] of hrefParams.entries()) {
            if (pageUrl.searchParams.get(key) !== val) return false;
        }
        return true;
    }

    return pageUrl.pathname === href && pageUrl.search === '';
}

const ACTIVE_CLASS = [
    'h-8 border border-neutral-200 bg-white px-3 font-semibold text-neutral-900 shadow-sm',
    'dark:border-neutral-700 dark:bg-neutral-800 dark:text-white',
    '[&>svg]:text-neutral-900 dark:[&>svg]:text-white',
].join(' ');

const INACTIVE_CLASS = [
    'h-8 border border-transparent px-3',
    'font-medium text-sidebar-foreground/55',
    'hover:border-neutral-200/60 hover:bg-white/60 hover:text-sidebar-foreground/90 hover:shadow-sm',
    'dark:hover:border-neutral-700/60 dark:hover:bg-neutral-800/40',
    '[&>svg]:text-sidebar-foreground/35 hover:[&>svg]:text-sidebar-foreground/70',
].join(' ');

export function NavSection({ label, items }: NavSectionProps) {
    const { isCurrentUrl } = useCurrentUrl();
    const { url: pageUrl } = usePage();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="mb-1.5 px-2 text-[8px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/20">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
                {items.map((item) => {
                    if (item.children && item.children.length > 0) {
                        const anyChildActive = item.children.some((c) => isHrefActive(c.href as string, pageUrl));

                        return (
                            <Collapsible key={item.title} defaultOpen={anyChildActive} className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={{ children: item.title }}
                                            isActive={anyChildActive}
                                            className={`w-full rounded-lg text-[10px] transition-all duration-200 group-data-[collapsible=icon]:justify-center ${
                                                anyChildActive ? ACTIVE_CLASS : INACTIVE_CLASS
                                            }`}
                                        >
                                            {item.icon && <item.icon className="size-3.5 shrink-0" />}
                                            <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.title}</span>
                                            <ChevronRight className={`!size-2.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden ${anyChildActive ? 'opacity-40' : 'opacity-25'}`} />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="mx-0 border-l-0 pl-0">
                                            <div className="ml-3 mt-0.5 mb-0.5 space-y-0.5 border-l border-neutral-200/60 pl-3 dark:border-neutral-700/60">
                                                {item.children.map((child) => {
                                                    const childActive = isHrefActive(child.href as string, pageUrl);
                                                    const href = child.href as string;

                                                    const handleClick = (e: React.MouseEvent) => {
                                                        e.preventDefault();
                                                        const url = new URL(href, 'http://localhost');
                                                        const params: Record<string, string> = {};
                                                        url.searchParams.forEach((val, key) => { params[key] = val; });
                                                        router.visit(url.pathname, {
                                                            data: Object.keys(params).length ? params : undefined,
                                                            preserveState: false,
                                                        });
                                                    };

                                                    return (
                                                        <SidebarMenuSubItem key={child.title}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={childActive}
                                                                className={`h-6 rounded-md text-[9px] transition-all duration-150 ${
                                                                    childActive
                                                                        ? 'border border-neutral-200 bg-white font-semibold text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
                                                                        : 'border border-transparent font-medium text-sidebar-foreground/40 hover:border-neutral-200/50 hover:bg-white/50 hover:text-sidebar-foreground/80 dark:hover:border-neutral-700/50 dark:hover:bg-neutral-800/30'
                                                                }`}
                                                            >
                                                                <a href={href} onClick={handleClick}>
                                                                    {child.title}
                                                                </a>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    );
                                                })}
                                            </div>
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    }

                    const active = isCurrentUrl(item.href);
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={{ children: item.title }}
                                className={`rounded-lg text-[10px] transition-all duration-200 group-data-[collapsible=icon]:justify-center ${
                                    active ? ACTIVE_CLASS : INACTIVE_CLASS
                                }`}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon className="size-3.5 shrink-0" />}
                                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
