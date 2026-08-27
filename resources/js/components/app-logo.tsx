import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-7 shrink-0 rounded-lg shadow-md shadow-blue-900/30" />
            <div className="ml-1 grid flex-1 text-left leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[14px] font-bold tracking-tight text-sidebar-foreground">
                    FloodTrack
                </span>
                <span className="truncate text-[10px] font-medium text-sidebar-foreground/40 tracking-wide">
                    Flood Management
                </span>
            </div>
        </>
    );
}
