import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {/* Water drop */}
            <path
                d="M12 2C12 2 5.5 10.5 5.5 14.5C5.5 18.09 8.41 21 12 21C15.59 21 18.5 18.09 18.5 14.5C18.5 10.5 12 2 12 2Z"
                fill="currentColor"
                opacity="0.85"
            />
            {/* Wave line inside drop */}
            <path
                d="M8 15.5C8.5 14.8 9.3 14.5 10 14.5C10.7 14.5 11.3 15 12 15C12.7 15 13.3 14.5 14 14.5C14.7 14.5 15.5 14.8 16 15.5"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Second wave line */}
            <path
                d="M9 18C9.5 17.3 10 17 10.7 17C11.4 17 11.8 17.5 12.5 17.5C13.2 17.5 13.6 17 14.3 17C15 17 15.5 17.3 16 18"
                fill="none"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}
