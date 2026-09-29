import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { en } from '@/locales/en';
import { fil } from '@/locales/fil';

type Locale = 'en' | 'fil';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const dictionaries: Record<Locale, Record<string, string>> = { en, fil };

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = 'floodtrack-locale';

function getInitialLocale(): Locale {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fil') return stored;
    return 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem(STORAGE_KEY, newLocale);
    }, []);

    // Sync on mount in case localStorage changed in another tab
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'fil')) {
                setLocaleState(e.newValue);
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const t = useCallback(
        (key: string): string => {
            return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
        },
        [locale],
    );

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale(): LocaleContextType {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error('useLocale must be used within a LocaleProvider');
    }
    return context;
}
