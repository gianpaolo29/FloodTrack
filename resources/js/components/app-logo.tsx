import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">
                <AppLogoIcon className="size-4 fill-current text-white" />
            </div>
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
