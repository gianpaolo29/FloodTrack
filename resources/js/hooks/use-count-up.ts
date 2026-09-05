import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, active: boolean, delay = 0) {
    const [value, setValue] = useState(0);
    const hasAnimated = useRef(false);
    const prevTarget = useRef(0);

    useEffect(() => {
        if (!active) return;

        if (target === 0) {
            setValue(0);
            prevTarget.current = 0;
            return;
        }

        const from = prevTarget.current;
        prevTarget.current = target;

        // Only use delay on first animation
        const animDelay = hasAnimated.current ? 0 : delay;
        hasAnimated.current = true;

        const timeout = setTimeout(() => {
            const duration = 700;
            let startTime: number | null = null;
            let cancelled = false;

            const step = (ts: number) => {
                if (cancelled) return;
                if (!startTime) startTime = ts;
                const progress = Math.min((ts - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(from + eased * (target - from)));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);

            return () => { cancelled = true; };
        }, animDelay);

        return () => clearTimeout(timeout);
    }, [active, target, delay]);

    return value;
}
