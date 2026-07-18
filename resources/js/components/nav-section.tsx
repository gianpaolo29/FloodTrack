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

export function NavSection({ label, items }: NavSectionProps) {
    const { isCurrentUrl } = useCurrentUrl();
    const { url: pageUrl } = usePage();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/30">
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
                                            className={`h-9 w-full rounded-xl text-[13px] transition-all group-data-[collapsible=icon]:justify-center ${
                                                anyChildActive
                                                    ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/15 [&>svg]:text-primary'
                                                    : 'font-medium text-sidebar-foreground/60 hover:bg-sidebar-foreground/6 hover:text-sidebar-foreground [&>svg]:text-sidebar-foreground/50'
                                            }`}
                                        >
                                            {item.icon && <item.icon />}
                                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                            <ChevronRight className="ml-auto !size-3 opacity-40 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="mx-0 border-l-0 pl-0">
                                            <div className="ml-[22px] mt-0.5 mb-1 space-y-0.5 border-l border-sidebar-foreground/10 pl-3 py-0.5">
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
                                                                className={`h-7 rounded-lg text-[12px] transition-all ${
                                                                    childActive
                                                                        ? 'font-semibold text-primary'
                                                                        : 'font-medium text-sidebar-foreground/50 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground'
                                                                }`}
                                                            >
                                                                <a href={href} onClick={handleClick}>
                                                                    {childActive && (
                                                                        <span className="mr-1 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                                                                    )}
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
                                className={`h-9 rounded-xl text-[13px] transition-all group-data-[collapsible=icon]:justify-center ${
                                    active
                                        ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/15 [&>svg]:text-primary'
                                        : 'font-medium text-sidebar-foreground/60 hover:bg-sidebar-foreground/6 hover:text-sidebar-foreground [&>svg]:text-sidebar-foreground/50'
                                }`}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
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
