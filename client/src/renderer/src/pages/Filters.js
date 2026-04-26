import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, Cpu, FlaskConical, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { FilterStatusWithProgress } from '@renderer/components/StatusBadge';
import { Button } from '@renderer/components/ui/button';
import { usePollPendingFilterStatuses } from '@renderer/hooks/usePollPendingFilterStatuses';
import { getFilters, getStudies } from '@renderer/utils/api/endpoints';
import { IMPORTED_FILTER_ROUTE_ID, writeImportedFilterSession, } from '@renderer/utils/importedFilterPayload';
const resolveFilters = (payload) => {
    if (Array.isArray(payload))
        return payload;
    return payload.results ?? [];
};
const resolveStudies = (payload) => {
    if (Array.isArray(payload))
        return payload;
    return payload.results ?? [];
};
export function Filters() {
    const navigate = useNavigate();
    const jsonInputRef = useRef(null);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [studies, setStudies] = useState([]);
    const [isLoadingStudies, setIsLoadingStudies] = useState(true);
    const [studyFilterId, setStudyFilterId] = useState(''); // '' means "All"
    useEffect(() => {
        let isMounted = true;
        const loadFilters = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getFilters();
                if (!isMounted)
                    return;
                setItems(resolveFilters(response));
            }
            catch (fetchError) {
                if (!isMounted)
                    return;
                const message = fetchError instanceof Error ? fetchError.message : 'Failed to load filters.';
                setError(message);
            }
            finally {
                if (isMounted)
                    setIsLoading(false);
            }
        };
        void loadFilters();
        return () => {
            isMounted = false;
        };
    }, []);
    usePollPendingFilterStatuses(items, setItems);
    useEffect(() => {
        let isMounted = true;
        const loadStudies = async () => {
            setIsLoadingStudies(true);
            try {
                const response = await getStudies();
                if (!isMounted)
                    return;
                setStudies(resolveStudies(response));
            }
            catch {
                if (!isMounted)
                    return;
                setStudies([]);
            }
            finally {
                if (isMounted)
                    setIsLoadingStudies(false);
            }
        };
        void loadStudies();
        return () => {
            isMounted = false;
        };
    }, []);
    const studyNameById = useMemo(() => {
        const map = new Map();
        for (const study of studies)
            map.set(study.id, study.name);
        return map;
    }, [studies]);
    const total = useMemo(() => items.length, [items]);
    const filteredItems = useMemo(() => {
        if (!studyFilterId)
            return items;
        return items.filter((item) => item.studyId === studyFilterId);
    }, [items, studyFilterId]);
    const handlePickJsonForVisualization = async (file) => {
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const state = {
                importedFilterJson: parsed,
                importedFileName: file.name,
            };
            writeImportedFilterSession(state);
            navigate(`/filters/${IMPORTED_FILTER_ROUTE_ID}`, { state });
        }
        catch (parseError) {
            const message = parseError instanceof Error ? parseError.message : 'Failed to parse JSON file.';
            toast.error(message);
        }
    };
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "All Filters" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [total, " generated filters"] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("input", { ref: jsonInputRef, type: "file", accept: ".json,application/json", className: "hidden", onChange: (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file)
                                        return;
                                    void handlePickJsonForVisualization(file);
                                    event.target.value = '';
                                } }), _jsxs("select", { value: studyFilterId, onChange: (e) => setStudyFilterId(e.target.value), className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm md:w-[240px]", disabled: isLoadingStudies, title: "Filter by study", children: [_jsx("option", { value: "", children: "All Studies" }), studies.map((study) => (_jsx("option", { value: study.id, children: study.name }, study.id)))] }), _jsxs(Button, { onClick: () => navigate('/filters/new'), className: "shrink-0", children: [_jsx(FlaskConical, { size: 16, strokeWidth: 1.5 }), "New Filter"] }), _jsxs(Button, { variant: "outline", onClick: () => jsonInputRef.current?.click(), className: "shrink-0", children: [_jsx(Upload, { size: 16, strokeWidth: 1.5 }), "Open JSON\u2026"] })] })] }), _jsx("div", { className: "rounded-[6px] border border-border bg-card", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-[720px] w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-table-header text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Study" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Measurement" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Date" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Status" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground" })] }) }), _jsxs("tbody", { children: [isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "Loading filters..." }) })) : null, !isLoading && error ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-sm text-destructive", children: error }) })) : null, !isLoading && !error && filteredItems.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: studyFilterId ? 'No filters for the selected study.' : 'No filters generated yet.' }) })) : null, !isLoading && !error && filteredItems.map((item) => (_jsxs("tr", { onClick: () => navigate(`/filters/${item.filterId}`), className: `cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover ${item.status === 'Generating' ? 'shimmer-row' : ''}`, children: [_jsx("td", { className: "px-4 py-3 font-medium", children: item.studyName?.trim() || studyNameById.get(item.studyId) || '—' }), _jsx("td", { className: "px-4 py-3 font-medium", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { children: item.measurementName?.trim() || '—' }), item.useQuantumComputer === true ? (_jsx(Cpu, { size: 14, strokeWidth: 1.7, className: "text-violet-600", "aria-label": "Quantum computer" })) : null] }) }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: new Date(item.createdAt).toISOString().slice(0, 10) }), _jsx("td", { className: "px-4 py-3", children: _jsx(FilterStatusWithProgress, { status: item.status, progressPercent: item.progressPercent, currentStep: item.currentStep }) }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: _jsx(ArrowRight, { size: 14, strokeWidth: 1.5 }) })] }, item.filterId)))] })] }) }) })] }));
}
