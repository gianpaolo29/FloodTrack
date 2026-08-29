import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="!bg-sidebar overflow-x-hidden">
                <div className="mt-1 mr-1 ml-1 min-h-[calc(100svh-0.25rem)] rounded-tl-xl rounded-tr-xl sm:mt-2 sm:mr-2 sm:ml-2 sm:min-h-[calc(100svh-0.5rem)] sm:rounded-tl-2xl sm:rounded-tr-2xl bg-background shadow-sm">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
