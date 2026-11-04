import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Filter, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/hooks/use-locale';

interface Option {
    value: string;
    label: string;
    color?: string;
}

interface Props {
    label: string;
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

export function MultiSelectFilter({ label, options, selected, onChange }: Props) {
    const { t } = useLocale();
    const [search, setSearch] = useState('');
    const [local, setLocal] = useState<string[]>(selected);

    // Sync local state when prop changes
    useEffect(() => { setLocal(selected); }, [selected]);

    const filtered = search
        ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const allSelected = local.length === options.length;

    const toggleAll = useCallback(() => {
        setLocal(allSelected ? [] : options.map(o => o.value));
    }, [allSelected, options]);

    const toggle = useCallback((value: string) => {
        setLocal(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    }, []);

    const activeCount = selected.length > 0 && selected.length < options.length ? selected.length : 0;

    return (
        <Popover className="relative">
            <PopoverButton
                onClick={() => setSearch('')}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all outline-none ${
                    activeCount > 0
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900'
                        : 'border-neutral-200/80 bg-white text-neutral-600 shadow-sm hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
                }`}
            >
                <Filter className="size-2.5" />
                {label}
                {activeCount > 0 && (
                    <span className="ml-0.5 flex size-3.5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white">
                        {activeCount}
                    </span>
                )}
            </PopoverButton>

            <Transition
                enter="transition duration-100 ease-out"
                enterFrom="scale-95 opacity-0"
                enterTo="scale-100 opacity-100"
                leave="transition duration-75 ease-in"
                leaveFrom="scale-100 opacity-100"
                leaveTo="scale-95 opacity-0"
            >
                <PopoverPanel
                    anchor="bottom end"
                    className="z-50 mt-1 w-48 origin-top-right rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                >
                    {({ close }) => (
                        <>
                            {/* Search */}
                            <div className="border-b border-neutral-100 p-1.5 dark:border-neutral-700">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-2 top-1/2 size-2.5 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder={t('common.search') + '...'}
                                        autoFocus
                                        className="h-6 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-6 pr-2 text-[10px] outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-500/10 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
                                    />
                                </div>
                            </div>

                            {/* Select all */}
                            <div className="border-b border-neutral-100 px-1.5 py-1 dark:border-neutral-700">
                                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[10px] text-neutral-600 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700/50">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="size-3 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 dark:border-neutral-600 dark:text-white"
                                    />
                                    <span className="font-medium">{t('common.select_all')}</span>
                                </label>
                            </div>

                            {/* Options */}
                            <div className="max-h-40 overflow-y-auto px-1.5 py-1">
                                {filtered.length === 0 ? (
                                    <p className="py-2 text-center text-[10px] text-neutral-400">No results</p>
                                ) : (
                                    filtered.map(opt => (
                                        <label
                                            key={opt.value}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[10px] text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={local.includes(opt.value)}
                                                onChange={() => toggle(opt.value)}
                                                className="size-3 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 dark:border-neutral-600 dark:text-white"
                                            />
                                            {opt.color && (
                                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />
                                            )}
                                            <span>{opt.label}</span>
                                        </label>
                                    ))
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-between border-t border-neutral-100 px-2 py-1.5 dark:border-neutral-700">
                                <button
                                    onClick={() => {
                                        setLocal([]);
                                        onChange([]);
                                        close();
                                    }}
                                    className="rounded-md px-2 py-1 text-[10px] font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                                >
                                    {t('common.reset')}
                                </button>
                                <button
                                    onClick={() => {
                                        onChange(local.length === options.length ? [] : local);
                                        close();
                                    }}
                                    className="rounded-md bg-neutral-900 px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                                >
                                    {t('common.apply')}
                                </button>
                            </div>
                        </>
                    )}
                </PopoverPanel>
            </Transition>
        </Popover>
    );
}
