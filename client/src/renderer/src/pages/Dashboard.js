import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, Clock, Cpu, Droplets, FlaskConical, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { FilterStatusWithProgress } from '@renderer/components/StatusBadge';
import { Button } from '@renderer/components/ui/button';
import { usePollPendingFilterStatuses } from '@renderer/hooks/usePollPendingFilterStatuses';
import { getFilters, getMeasurements } from '@renderer/utils/api/endpoints';
const resolveMeasurements = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }
    return payload.results ?? [];
};
const resolveFilters = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }
    return payload.results ?? [];
};
const humanizeSource = (source) => source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
const formatFixed = (value, digits = 2) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return '-';
    return value.toFixed(digits);
};
const formatDateYmd = (value) => {
    if (typeof value !== 'string')
        return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return '-';
    return parsed.toISOString().slice(0, 10);
};
export function Dashboard() {
    const navigate = useNavigate();
    const [measurements, setMeasurements] = useState([]);
    const [filters, setFilters] = useState([]);
    useEffect(() => {
        let isMounted = true;
        const loadMeasurements = async () => {
            try {
                const response = await getMeasurements();
                if (!isMounted)
                    return;
                setMeasurements(resolveMeasurements(response));
            }
            catch {
                if (!isMounted)
                    return;
                setMeasurements([]);
            }
        };
        loadMeasurements();
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        let isMounted = true;
        const loadFilters = async () => {
            try {
                const response = await getFilters();
                if (!isMounted)
                    return;
                setFilters(resolveFilters(response));
            }
            catch {
                if (!isMounted)
                    return;
                setFilters([]);
            }
        };
        void loadFilters();
        return () => {
            isMounted = false;
        };
    }, []);
    usePollPendingFilterStatuses(filters, setFilters);
    const measurementCount = useMemo(() => measurements.length, [measurements]);
    const filterCount = useMemo(() => filters.length, [filters]);
    const generatingCount = useMemo(() => filters.filter((item) => item.status === 'Generating' || item.status === 'Pending').length, [filters]);
    const completedCount = useMemo(() => filters.filter((item) => item.status === 'Success').length, [filters]);
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Dashboard" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Overview of filter generation and water measurements" })] }), _jsxs(Button, { onClick: () => navigate('/add-measurement'), children: [_jsx(Plus, { size: 16, strokeWidth: 1.5 }), "New Measurement"] })] }), _jsx("div", { className: "mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", children: [
                    { label: 'Total Filters', value: String(filterCount), trend: '', Icon: FlaskConical },
                    {
                        label: 'Measurements',
                        value: String(measurementCount),
                        trend: '',
                        Icon: Droplets
                    },
                    { label: 'In Progress', value: String(generatingCount), trend: '', Icon: Clock },
                    { label: 'Completed', value: String(completedCount), trend: '', Icon: FlaskConical }
                ].map(({ label, value, trend, Icon }) => (_jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "scientific-label", children: label }), _jsx(Icon, { size: 14, strokeWidth: 1.5, className: "text-muted-foreground" })] }), _jsx("p", { className: "text-2xl font-semibold tabular-nums", children: value }), trend ? _jsx("p", { className: "mt-1 font-mono text-xs text-muted-foreground", children: trend }) : null] }, label))) }), _jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-5", children: [_jsxs("div", { className: "rounded-[6px] border border-border bg-card xl:col-span-3", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Recent Filters" }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => navigate('/filters'), children: ["View All ", _jsx(ArrowRight, { size: 14, strokeWidth: 1.5 })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-[720px] w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-table-header text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Study" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Measurement" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Date" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Status" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground" })] }) }), _jsx("tbody", { children: filters.slice(0, 5).map((item) => (_jsxs("tr", { onClick: () => navigate(`/filters/${item.filterId}`), className: `cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover ${item.status === 'Generating' ? 'shimmer-row' : ''}`, children: [_jsx("td", { className: "px-4 py-3 font-medium", children: item.studyName?.trim() || '—' }), _jsx("td", { className: "px-4 py-3 font-medium", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { children: item.measurementName?.trim() || '—' }), item.useQuantumComputer === true ? (_jsx(Cpu, { size: 14, strokeWidth: 1.7, className: "text-violet-600", "aria-label": "Quantum computer" })) : null] }) }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: formatDateYmd(item.createdAt) }), _jsx("td", { className: "px-4 py-3", children: _jsx(FilterStatusWithProgress, { status: item.status, progressPercent: item.progressPercent, currentStep: item.currentStep, compact: true }) }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: _jsx(ArrowRight, { size: 14, strokeWidth: 1.5 }) })] }, item.filterId))) })] }) })] }), _jsx("div", { className: "xl:col-span-2", children: _jsxs("div", { className: "rounded-[6px] border border-border bg-card", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Measurements" }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => navigate('/measurements'), children: ["View All ", _jsx(ArrowRight, { size: 14, strokeWidth: 1.5 })] })] }), _jsx("div", { className: "divide-y divide-border", children: measurements.slice(0, 4).map((item) => (_jsx("div", { className: "cursor-pointer px-4 py-3 transition-colors hover:bg-table-row-hover", onClick: () => navigate('/measurements'), children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: item.name ?? 'Untitled measurement' }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["pH ", formatFixed(item.ph), " \u00B7 ", formatFixed(item.temperature), " C \u00B7", ' ', humanizeSource(item.source)] })] }), _jsx("span", { className: "font-mono text-xs text-muted-foreground", children: formatDateYmd(item.createdAt) })] }) }, item.measurementId))) })] }) })] })] }));
}
