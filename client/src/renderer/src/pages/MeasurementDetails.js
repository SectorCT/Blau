import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { getMeasurementById } from '@renderer/utils/api/endpoints';
const humanizeSource = (source) => source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
const formatFixed = (value, digits = 2) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return '-';
    return value.toFixed(digits);
};
export function MeasurementDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [measurement, setMeasurement] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let isMounted = true;
        const loadMeasurement = async () => {
            if (!id) {
                setError('Missing measurement ID.');
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const response = await getMeasurementById(id);
                if (!isMounted)
                    return;
                setMeasurement(response);
            }
            catch (fetchError) {
                if (!isMounted)
                    return;
                const message = fetchError instanceof Error ? fetchError.message : 'Failed to load measurement details.';
                setError(message);
            }
            finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        void loadMeasurement();
        return () => {
            isMounted = false;
        };
    }, [id]);
    const createdDate = useMemo(() => {
        if (!measurement?.createdAt)
            return '-';
        return new Date(measurement.createdAt).toISOString().slice(0, 10);
    }, [measurement?.createdAt]);
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsxs("div", { className: "mb-6 flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate('/measurements'), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: measurement?.name ?? 'Measurement Details' }), _jsx("p", { className: "font-mono text-xs text-muted-foreground", children: measurement ? `Measurement ${measurement.measurementId}` : 'Loading...' })] })] }), isLoading ? (_jsx("div", { className: "rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground", children: "Loading measurement details..." })) : null, !isLoading && error ? (_jsx("div", { className: "rounded-[6px] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive", children: error })) : null, !isLoading && !error && measurement ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", children: [_jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Source" }), _jsx("p", { className: "text-sm font-medium", children: humanizeSource(measurement.source ?? 'unknown') })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Temperature" }), _jsxs("p", { className: "font-mono text-sm", children: [formatFixed(measurement.temperature), " C"] })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "pH" }), _jsx("p", { className: "font-mono text-sm", children: formatFixed(measurement.ph) })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Created" }), _jsx("p", { className: "font-mono text-sm", children: createdDate })] })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card", children: [_jsx("div", { className: "border-b border-border px-4 py-3", children: _jsxs("h2", { className: "text-sm font-semibold", children: ["Parameters (", measurement.parameters?.length ?? 0, ")"] }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-[620px] w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-table-header text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Code" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Parameter" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium text-muted-foreground", children: "Value" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Unit" })] }) }), _jsxs("tbody", { children: [(measurement.parameters ?? []).map((parameter) => (_jsxs("tr", { className: "border-b border-border last:border-0", children: [_jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: parameter.parameterCode }), _jsx("td", { className: "px-4 py-3", children: parameter.parameterName ?? '-' }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs", children: parameter.value }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: parameter.unit ?? '-' })] }, `${parameter.parameterCode}-${parameter.value}-${parameter.unit ?? ''}`))), (measurement.parameters ?? []).length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-8 text-center text-sm text-muted-foreground", children: "No parameter values for this measurement." }) })) : null] })] }) })] })] })) : null] }));
}
