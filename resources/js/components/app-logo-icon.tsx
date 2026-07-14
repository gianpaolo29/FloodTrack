import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {/* Shield */}
            <path
                d="M12 2L4 6V12C4 17.5 7.4 22 12 23.5C16.6 22 20 17.5 20 12V6L12 2Z"
                fill="currentColor"
                opacity="0.15"
            />
            {/* Water drop */}
            <path
                d="M12 7C12 7 8.5 12 8.5 14.5C8.5 16.43 10.07 18 12 18C13.93 18 15.5 16.43 15.5 14.5C15.5 12 12 7 12 7Z"
                fill="currentColor"
                opacity="0.9"
            />
            {/* Wave */}
            <path
                d="M10 15C10.4 14.5 10.8 14.3 11.3 14.3C11.8 14.3 12 14.7 12.5 14.7C13 14.7 13.2 14.3 13.7 14.3C14.2 14.3 14.6 14.5 15 15"
                fill="none"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}
