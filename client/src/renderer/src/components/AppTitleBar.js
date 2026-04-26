import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { WindowControls } from '@renderer/components/WindowControls';
import { getFilters, getMeasurements, getStudies } from '@renderer/utils/api/endpoints';
function normalizeList(payload) {
    if (Array.isArray(payload))
        return payload;
    return Array.isArray(payload.results) ? payload.results : [];
}
function scoreText(query, candidate) {
    const q = query.trim().toLowerCase();
    const c = candidate.trim().toLowerCase();
    if (!q || !c)
        return 0;
    if (c === q)
        return 120;
    if (c.startsWith(q))
        return 90;
    if (c.includes(q))
        return 60;
    const qTokens = q.split(/\s+/).filter(Boolean);
    const allTokensPresent = qTokens.length > 0 && qTokens.every((token) => c.includes(token));
    return allTokensPresent ? 40 : 0;
}
export function AppTitleBar() {
    const navigate = useNavigate();
    const [dark, setDark] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return window.localStorage.getItem('blau-theme-dark') === '1';
    });
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined')
            return 'default';
        const saved = window.localStorage.getItem('blau-theme-name');
        if (saved === 'ocean' || saved === 'sky' || saved === 'default')
            return saved;
        return 'default';
    });
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isOpen, setIsOpen] = useState(false);
    const [searchSnapshot, setSearchSnapshot] = useState(null);
    const [hasLoadedSnapshot, setHasLoadedSnapshot] = useState(false);
    const searchRef = useRef(null);
    const searchContainerRef = useRef(null);
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('blau-theme-dark', dark ? '1' : '0');
        }
    }, [dark]);
    useEffect(() => {
        if (theme === 'default') {
            document.documentElement.removeAttribute('data-theme');
        }
        else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('blau-theme-name', theme);
        }
    }, [theme]);
    useEffect(() => {
        const onPointerDown = (event) => {
            const target = event.target;
            if (!target)
                return;
            if (searchContainerRef.current?.contains(target))
                return;
            setIsOpen(false);
            setActiveIndex(-1);
        };
        window.addEventListener('mousedown', onPointerDown);
        return () => window.removeEventListener('mousedown', onPointerDown);
    }, []);
    const fetchSearchSnapshot = async () => {
        const [filtersResponse, measurementsResponse, studiesResponse] = await Promise.all([
            getFilters(),
            getMeasurements(),
            getStudies()
        ]);
        return {
            filters: normalizeList(filtersResponse),
            measurements: normalizeList(measurementsResponse),
            studies: normalizeList(studiesResponse)
        };
    };
    const buildResults = (rawQuery, data) => {
        const q = rawQuery.trim().toLowerCase();
        if (!q)
            return [];
        const built = [];
        for (const filter of data.filters) {
            const score = Math.max(scoreText(q, filter.filterId), scoreText(q, filter.studyId), scoreText(q, filter.measurementId), scoreText(q, filter.status));
            if (score <= 0)
                continue;
            built.push({
                id: `filter-${filter.filterId}`,
                kind: 'filter',
                title: `Filter ${filter.filterId}`,
                subtitle: `${filter.status} · Study ${filter.studyId}`,
                route: `/filters/${filter.filterId}`,
                score
            });
        }
        for (const measurement of data.measurements) {
            const paramLabel = (measurement.parameters ?? [])
                .slice(0, 3)
                .map((p) => p.parameterName ?? p.parameterCode)
                .join(', ');
            const score = Math.max(scoreText(q, measurement.measurementId), scoreText(q, measurement.name ?? ''), scoreText(q, measurement.source), scoreText(q, paramLabel));
            if (score > 0) {
                built.push({
                    id: `measurement-${measurement.measurementId}`,
                    kind: 'measurement',
                    title: `Measurement ${measurement.measurementId}`,
                    subtitle: `${measurement.name ?? 'Unnamed'} · ${measurement.source}`,
                    route: `/measurements/${measurement.measurementId}`,
                    score
                });
            }
            for (const parameter of measurement.parameters ?? []) {
                const paramCode = parameter.parameterCode ?? '';
                const paramName = parameter.parameterName ?? '';
                const contaminantScore = Math.max(scoreText(q, paramCode), scoreText(q, paramName));
                if (contaminantScore <= 0)
                    continue;
                built.push({
                    id: `contaminant-${measurement.measurementId}-${paramCode}`,
                    kind: 'contaminant',
                    title: `${paramName || paramCode}`,
                    subtitle: `in Measurement ${measurement.measurementId}`,
                    route: `/measurements/${measurement.measurementId}`,
                    score: contaminantScore + 6
                });
            }
        }
        for (const study of data.studies) {
            const score = Math.max(scoreText(q, study.id), scoreText(q, study.name), scoreText(q, study.description ?? ''));
            if (score <= 0)
                continue;
            built.push({
                id: `study-${study.id}`,
                kind: 'study',
                title: `Study ${study.name}`,
                subtitle: study.id,
                route: `/filters?studyId=${encodeURIComponent(study.id)}`,
                score
            });
        }
        return built
            .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
            .slice(0, 9);
    };
    const runSearch = async (rawQuery) => {
        const trimmed = rawQuery.trim();
        if (!trimmed) {
            setResults([]);
            setIsOpen(false);
            setActiveIndex(-1);
            return;
        }
        setIsSearching(true);
        setIsOpen(true);
        try {
            const data = searchSnapshot ?? (await fetchSearchSnapshot());
            if (!hasLoadedSnapshot) {
                setSearchSnapshot(data);
                setHasLoadedSnapshot(true);
            }
            const nextResults = buildResults(trimmed, data);
            setResults(nextResults);
            setActiveIndex(nextResults.length > 0 ? 0 : -1);
        }
        catch (searchError) {
            setResults([]);
            setActiveIndex(-1);
            console.error(searchError);
        }
        finally {
            setIsSearching(false);
        }
    };
    const selectResult = (result) => {
        navigate(result.route);
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setActiveIndex(-1);
    };
    const submitSearch = () => {
        const trimmed = query.trim();
        if (!trimmed)
            return;
        if (activeIndex >= 0 && results[activeIndex]) {
            selectResult(results[activeIndex]);
            return;
        }
        if (results.length > 0) {
            selectResult(results[0]);
            return;
        }
        toast.info(`No matches found for "${trimmed}"`);
    };
    return (_jsxs("header", { className: "drag-region flex h-12 items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur", children: [_jsxs("div", { className: "no-drag flex items-center gap-2", children: [_jsx("div", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-secondary text-xs font-semibold", children: "B" }), _jsx("span", { className: "hidden text-sm font-semibold tracking-tight text-foreground sm:inline", children: "Blau" }), _jsxs(Menu, { title: "File", children: [_jsx(MenuItem, { onClick: () => navigate('/add-measurement'), children: "New Measurement" }), _jsx(MenuItem, { onClick: () => window.api.window.close(), children: "Exit" })] }), _jsxs(Menu, { title: "View", children: [_jsxs(MenuItem, { onClick: () => setTheme('default'), children: ["Theme: Classic Sand ", theme === 'default' ? '✓' : ''] }), _jsxs(MenuItem, { onClick: () => setTheme('ocean'), children: ["Theme: Ocean Mist ", theme === 'ocean' ? '✓' : ''] }), _jsxs(MenuItem, { onClick: () => setTheme('sky'), children: ["Theme: Sky Blue ", theme === 'sky' ? '✓' : ''] }), _jsx(MenuItem, { onClick: () => {
                                    setDark((prev) => !prev);
                                    toast.success('Theme toggled');
                                }, children: "Toggle Dark/Light Mode" })] })] }), _jsx("div", { className: "no-drag mx-4 hidden max-w-xl flex-1 lg:flex", children: _jsxs("div", { ref: searchContainerRef, className: "relative w-full", children: [_jsxs("div", { className: "flex h-8 w-full items-center gap-2 rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-muted-foreground", children: [_jsx(Search, { size: 14, strokeWidth: 1.5 }), _jsx("input", { ref: searchRef, placeholder: "Search Filters, Samples, or Contaminants...", value: query, onChange: (event) => {
                                        const next = event.target.value;
                                        setQuery(next);
                                        void runSearch(next);
                                    }, onFocus: () => {
                                        if (results.length > 0)
                                            setIsOpen(true);
                                    }, onKeyDown: (event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            submitSearch();
                                            return;
                                        }
                                        if (event.key === 'Escape') {
                                            setIsOpen(false);
                                            setActiveIndex(-1);
                                            return;
                                        }
                                        if (event.key === 'ArrowDown') {
                                            event.preventDefault();
                                            if (!isOpen && results.length > 0) {
                                                setIsOpen(true);
                                                setActiveIndex(0);
                                                return;
                                            }
                                            if (results.length === 0)
                                                return;
                                            setActiveIndex((prev) => (prev + 1) % results.length);
                                            return;
                                        }
                                        if (event.key === 'ArrowUp') {
                                            event.preventDefault();
                                            if (results.length === 0)
                                                return;
                                            setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
                                        }
                                    }, className: "h-full w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" })] }), isOpen ? (_jsx("div", { className: "absolute left-0 top-10 z-50 w-full rounded-[8px] border border-border bg-card p-1 shadow-sm", children: isSearching ? (_jsx("p", { className: "px-2 py-2 text-xs text-muted-foreground", children: "Searching..." })) : results.length === 0 ? (_jsx("p", { className: "px-2 py-2 text-xs text-muted-foreground", children: "No results" })) : (_jsx("div", { className: "max-h-80 overflow-y-auto", children: results.map((result, index) => (_jsxs("button", { onClick: () => selectResult(result), className: `block w-full rounded-[6px] px-2 py-1.5 text-left transition-colors ${index === activeIndex ? 'bg-secondary' : 'hover:bg-secondary'}`, children: [_jsx("p", { className: "text-sm text-foreground", children: result.title }), _jsxs("p", { className: "text-[11px] text-muted-foreground", children: [result.kind, " \u00B7 ", result.subtitle] })] }, result.id))) })) })) : null] }) }), _jsx(WindowControls, {})] }));
}
function Menu({ title, children }) {
    return (_jsxs("div", { className: "group relative", children: [_jsx("button", { className: "rounded-[6px] px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground", children: title }), _jsx("div", { className: "pointer-events-none absolute left-0 top-full h-2 w-full" }), _jsx("div", { className: "invisible absolute left-0 top-full z-50 min-w-56 pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100", children: _jsx("div", { className: "rounded-[6px] border border-border bg-card p-1 shadow-sm", children: children }) })] }));
}
function MenuItem({ onClick, children }) {
    return (_jsx("button", { onClick: onClick, className: "block w-full rounded-[6px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-secondary", children: children }));
}
