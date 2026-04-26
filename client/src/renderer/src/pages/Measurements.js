import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, Download, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@renderer/components/ui/button';
import { getMeasurementById, getMeasurements } from '@renderer/utils/api/endpoints';
const resolveMeasurements = (payload) => {
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
const csvEscape = (value) => {
    const text = value == null ? '' : String(value);
    return `"${text.replaceAll('"', '""')}"`;
};
const toSafeFileStem = (value) => {
    const normalized = value
        .trim()
        .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
        .replaceAll(/\s+/g, ' ')
        .replaceAll(/\.+$/g, '');
    return normalized || 'measurement';
};
const buildMeasurementCsv = (measurement) => {
    const lines = [];
    lines.push('section,key,value');
    lines.push(`measurement,measurementId,${csvEscape(measurement.measurementId)}`);
    lines.push(`measurement,name,${csvEscape(measurement.name ?? '')}`);
    lines.push(`measurement,source,${csvEscape(measurement.source)}`);
    lines.push(`measurement,createdAt,${csvEscape(measurement.createdAt ?? '')}`);
    lines.push(`measurement,sampleDate,${csvEscape(measurement.sampleDate ?? '')}`);
    lines.push(`measurement,sampleTime,${csvEscape(measurement.sampleTime ?? '')}`);
    lines.push(`measurement,temperature,${csvEscape(measurement.temperature)}`);
    lines.push(`measurement,ph,${csvEscape(measurement.ph)}`);
    lines.push('');
    lines.push('parameterCode,parameterName,unit,value');
    for (const parameter of measurement.parameters ?? []) {
        lines.push([
            csvEscape(parameter.parameterCode),
            csvEscape(parameter.parameterName ?? ''),
            csvEscape(parameter.unit ?? ''),
            csvEscape(parameter.value)
        ].join(','));
    }
    return lines.join('\n');
};
export function Measurements() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exportError, setExportError] = useState(null);
    const [exportingMeasurementId, setExportingMeasurementId] = useState(null);
    useEffect(() => {
        let isMounted = true;
        const loadMeasurements = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getMeasurements();
                if (!isMounted)
                    return;
                setItems(resolveMeasurements(response));
            }
            catch (err) {
                if (!isMounted)
                    return;
                const message = err instanceof Error ? err.message : 'Failed to load measurements.';
                setError(message);
            }
            finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        loadMeasurements();
        return () => {
            isMounted = false;
        };
    }, []);
    const measurementCount = useMemo(() => items.length, [items]);
    const onExportMeasurementCsv = async (measurementId) => {
        setExportingMeasurementId(measurementId);
        setExportError(null);
        try {
            const details = await getMeasurementById(measurementId);
            const csvText = buildMeasurementCsv(details);
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const href = URL.createObjectURL(blob);
            const fileStem = toSafeFileStem(details.name ?? 'measurement');
            const link = document.createElement('a');
            link.href = href;
            link.setAttribute('download', `${fileStem}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
        }
        catch (exportErr) {
            setExportError(exportErr instanceof Error ? exportErr.message : 'Failed to export measurement CSV.');
        }
        finally {
            setExportingMeasurementId(null);
        }
    };
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Water Measurements" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [measurementCount, " measurements"] })] }), _jsxs(Button, { onClick: () => navigate('/add-measurement'), children: [_jsx(Plus, { size: 16, strokeWidth: 1.5 }), "Add Measurement"] })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card", children: [exportError ? (_jsx("div", { className: "border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive", children: exportError })) : null, _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-[780px] w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-table-header text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Label" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Source" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium text-muted-foreground", children: "pH" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium text-muted-foreground", children: "Temp" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium text-muted-foreground", children: "Params" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Date" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium text-muted-foreground", children: "Export" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground" })] }) }), _jsxs("tbody", { children: [isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "Loading measurements..." }) })) : null, !isLoading && error ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-10 text-center text-sm text-destructive", children: error }) })) : null, !isLoading && !error && items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "No measurements yet. Add one to get started." }) })) : null, !isLoading &&
                                            !error &&
                                            items.map((item) => (_jsxs("tr", { onClick: () => navigate(`/measurements/${item.measurementId}`), className: "cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: item.name ?? 'Untitled measurement' }), _jsx("td", { className: "px-4 py-3", children: humanizeSource(item.source) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs", children: formatFixed(item.ph) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs", children: formatFixed(item.temperature) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-xs", children: item.parameters?.length ?? 0 }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: formatDateYmd(item.createdAt) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs(Button, { size: "sm", variant: "outline", disabled: exportingMeasurementId === item.measurementId, onClick: (event) => {
                                                                event.stopPropagation();
                                                                void onExportMeasurementCsv(item.measurementId);
                                                            }, children: [_jsx(Download, { size: 14, strokeWidth: 1.5 }), exportingMeasurementId === item.measurementId ? 'Exporting...' : 'CSV'] }) }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: _jsx(ArrowRight, { size: 14, strokeWidth: 1.5 }) })] }, item.measurementId)))] })] }) })] })] }));
}
