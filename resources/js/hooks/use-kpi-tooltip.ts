import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

let activeId: string | null = null;
let idCounter = 0;
const listeners = new Set<() => void>();
const btnElements = new Map<string, HTMLElement>();

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function getSnapshot() {
    return activeId;
}

function setActive(id: string | null) {
    if (activeId === id) return;
    activeId = id;
    listeners.forEach((cb) => cb());
}

// Close when clicking anywhere that isn't a registered help button
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (!activeId) return;
        const target = e.target as Node;
        for (const btn of btnElements.values()) {
            if (btn.contains(target)) return;
        }
        setActive(null);
    });
}

export function useKpiTooltip(btnRef: React.RefObject<HTMLButtonElement | null>) {
    const idRef = useRef<string | null>(null);
    if (idRef.current === null) idRef.current = `kpi-${++idCounter}`;
    const id = idRef.current;

    // Register/unregister the button element
    useEffect(() => {
        if (btnRef.current) btnElements.set(id, btnRef.current);
        return () => { btnElements.delete(id); };
    });

    const current = useSyncExternalStore(subscribe, getSnapshot, () => null);
    const open = current === id;

    const toggle = useCallback(() => {
        setActive(activeId === id ? null : id);
    }, [id]);

    return { open, toggle };
}
