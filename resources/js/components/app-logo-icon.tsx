import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/icon.jpg"
            alt="FloodTrack"
            className={`rounded-md object-contain ${className ?? ''}`}
            {...props}
        />
    );
}
