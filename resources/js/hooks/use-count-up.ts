import { useEffect, useState } from 'react';

export function useCountUp(target: number, active: boolean, delay = 0) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!active || !target) return;
        const timeout = setTimeout(() => {
            const duration = 900;
            let startTime: number | null = null;
            const step = (ts: number) => {
                if (!startTime) startTime = ts;
                const progress = Math.min((ts - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, delay);
        return () => clearTimeout(timeout);
    }, [active, target, delay]);
    return value;
}
