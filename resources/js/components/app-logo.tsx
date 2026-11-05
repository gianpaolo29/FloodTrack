import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <img
                src="/images/floodtrack-logo.png"
                alt="FloodTrack"
                className="h-auto w-32 shrink-0 object-contain group-data-[collapsible=icon]:hidden dark:brightness-[1.3] dark:drop-shadow-[0_0_6px_rgba(56,189,248,0.15)]"
            />
            <AppLogoIcon className="size-7 shrink-0 rounded-lg shadow-md shadow-blue-900/30 hidden group-data-[collapsible=icon]:block" />
        </>
    );
}
