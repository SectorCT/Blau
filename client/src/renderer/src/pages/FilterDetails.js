import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ArrowLeft, Download, Eye, Microscope, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { FilterStatusWithProgress, StatusBadge } from '@renderer/components/StatusBadge';
import { Button } from '@renderer/components/ui/button';
import { isFilterStatusWaiting } from '@renderer/hooks/usePollPendingFilterStatuses';
import { exportFilterCsv, getFilterDetails, getFilterStatus } from '@renderer/utils/api/endpoints';
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel';
import { buildFilterDetailsFromImportedJson, isImportedFilterRouteId, readImportedFilterSession, } from '@renderer/utils/importedFilterPayload';
const toSafeFileStem = (value) => {
    const normalized = value
        .trim()
        .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
        .replaceAll(/\s+/g, ' ')
        .replaceAll(/\.+$/g, '');
    return normalized || 'filter';
};
const METHOD_LABELS = {
    ionic_empirical: {
        label: 'Ionic (empirical)',
        tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-100',
        title: 'DFT-D3+U calibrated empirical model for charged pollutants.'
    },
    vdw_empirical: {
        label: 'vdW (empirical)',
        tone: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-100',
        title: 'DFT-D3 calibrated van der Waals model for neutral organics / microplastics.'
    },
    mixed_empirical: {
        label: 'Mixed empirical',
        tone: 'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100',
        title: 'Multiple empirical methods used across layers in this filter.'
    },
    vqe_ibm: {
        label: 'Real quantum (IBM)',
        tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100',
        title: 'VQE executed on IBM Quantum hardware.'
    }
};
function MethodChip({ method }) {
    if (!method)
        return null;
    const meta = METHOD_LABELS[method] ?? {
        label: method,
        tone: 'border-border bg-muted text-foreground',
        title: undefined
    };
    return (_jsx("span", { className: `inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`, title: meta.title, children: meta.label }));
}
export function FilterDetails() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isImported = isImportedFilterRouteId(id);
    const importedSession = useMemo(() => {
        if (!isImported)
            return null;
        return readImportedFilterSession(location);
    }, [isImported, location.state]);
    const [status, setStatus] = useState(null);
    const [progress, setProgress] = useState({});
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    useEffect(() => {
        if (!isImported || !id)
            return;
        if (!importedSession?.importedFilterJson) {
            setDetails(null);
            setStatus(null);
            setError('No imported filter data. Upload a JSON file from All Filters.');
            setIsLoading(false);
            return;
        }
        try {
            setDetails(buildFilterDetailsFromImportedJson(importedSession.importedFilterJson, importedSession.importedFileName));
            setStatus('Imported');
            setError(null);
        }
        catch (parseError) {
            setDetails(null);
            setStatus(null);
            setError(parseError instanceof Error ? parseError.message : 'Invalid filter JSON.');
        }
        finally {
            setIsLoading(false);
        }
    }, [isImported, id, importedSession]);
    useEffect(() => {
        if (isImported)
            return;
        let isMounted = true;
        setStatus(null);
        setProgress({});
        const loadStatus = async () => {
            if (!id)
                return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await getFilterStatus(id);
                if (!isMounted)
                    return;
                applyStatusResponse(response);
            }
            catch (fetchError) {
                if (!isMounted)
                    return;
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter status.');
            }
            finally {
                if (isMounted)
                    setIsLoading(false);
            }
        };
        const applyStatusResponse = (response) => {
            setStatus(response.status);
            setProgress({
                progressPercent: response.progressPercent,
                currentStep: response.currentStep,
                internalStatus: response.internalStatus
            });
        };
        void loadStatus();
        return () => {
            isMounted = false;
        };
    }, [id, isImported]);
    const statusPollingActive = id != null && !isImported && isFilterStatusWaiting(status);
    useEffect(() => {
        if (!id || !statusPollingActive)
            return;
        let cancelled = false;
        const poll = async () => {
            try {
                const response = await getFilterStatus(id);
                if (cancelled)
                    return;
                setStatus(response.status);
                setProgress({
                    progressPercent: response.progressPercent,
                    currentStep: response.currentStep,
                    internalStatus: response.internalStatus
                });
            }
            catch {
                // Transient poll errors: keep showing the last known status.
            }
        };
        const interval = window.setInterval(() => {
            void poll();
        }, 5000);
        void poll();
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [id, statusPollingActive]);
    useEffect(() => {
        let isMounted = true;
        const loadDetails = async () => {
            if (!id || isImported || status !== 'Success')
                return;
            try {
                const response = await getFilterDetails(id);
                if (!isMounted)
                    return;
                setDetails(response);
            }
            catch (fetchError) {
                if (!isMounted)
                    return;
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter details.');
            }
        };
        void loadDetails();
        return () => {
            isMounted = false;
        };
    }, [id, status, isImported]);
    const displayStatus = status ?? 'Pending';
    const dashboardReady = status === 'Success' || status === 'Imported';
    const createdAt = useMemo(() => (details?.createdAt ? new Date(details.createdAt).toISOString().slice(0, 10) : '-'), [details?.createdAt]);
    const view = useMemo(() => buildFilterInfoViewModel(details?.filterInfo), [details?.filterInfo]);
    const metricCards = useMemo(() => [
        { label: 'Material', value: view.metrics.materialType },
        { label: 'Pore Size', value: view.metrics.poreSize != null ? `${view.metrics.poreSize.toFixed(3)} nm` : '-' },
        {
            label: 'Binding Energy',
            value: view.metrics.bindingEnergy != null ? `${view.metrics.bindingEnergy.toFixed(4)} eV` : '-'
        },
        {
            label: 'Removal Efficiency',
            value: view.metrics.removalEfficiency != null ? `${view.metrics.removalEfficiency.toFixed(2)}%` : '-'
        },
        { label: 'Pollutant', value: view.metrics.pollutant },
        { label: 'Parameter Count', value: String(view.metrics.parameterCount) }
    ], [view]);
    const compositionData = useMemo(() => {
        if (view.parameterBarData.length > 0)
            return view.parameterBarData;
        const fallback = [
            { code: 'PH', name: 'pH', value: view.metrics.ph ?? 7, rawValue: view.metrics.ph ?? 7, unit: '' },
            { code: 'TMP', name: 'Temperature', value: view.metrics.temperature ?? 25, rawValue: view.metrics.temperature ?? 25, unit: 'C' },
            { code: 'PSE', name: 'Pore Size', value: view.metrics.poreSize ?? 1, rawValue: view.metrics.poreSize ?? 1, unit: 'nm' },
            { code: 'BND', name: 'Binding Energy', value: view.metrics.bindingEnergy ?? 1, rawValue: view.metrics.bindingEnergy ?? 1, unit: 'eV' },
            { code: 'EFF', name: 'Removal', value: view.metrics.removalEfficiency ?? 50, rawValue: view.metrics.removalEfficiency ?? 50, unit: '%' }
        ];
        const maxF = Math.max(...fallback.map((i) => Math.abs(Number(i.value)) || 0), 1e-9);
        return fallback.map((item) => ({
            ...item,
            value: Number(((Math.abs(Number(item.value)) / maxF) * 100).toFixed(2)),
            rawValue: Number(Number(item.rawValue).toFixed(4))
        }));
    }, [view]);
    const fingerprintData = useMemo(() => {
        if (view.parameterRadarData.length > 0)
            return view.parameterRadarData;
        const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
        return [
            { parameter: 'Efficiency', value: clamp(view.metrics.removalEfficiency ?? 50) },
            { parameter: 'Pore Fit', value: clamp(((view.metrics.poreSize ?? 1) / 3) * 100) },
            { parameter: 'Binding', value: clamp((Math.abs(view.metrics.bindingEnergy ?? 1) / 5) * 100) },
            { parameter: 'Neutral pH', value: clamp((1 - Math.min(1, Math.abs((view.metrics.ph ?? 7) - 7) / 7)) * 100) },
            {
                parameter: 'Thermal Stability',
                value: clamp((1 - Math.min(1, Math.abs((view.metrics.temperature ?? 25) - 25) / 50)) * 100)
            }
        ];
    }, [view]);
    const donutData = useMemo(() => {
        if (view.parameterDonutData.length > 0)
            return view.parameterDonutData;
        const sorted = compositionData
            .filter((item) => item.rawValue > 0 || item.value > 0)
            .map((item) => ({
            code: item.code,
            name: item.name,
            value: Math.max(item.rawValue, 1e-9),
            rawValue: item.rawValue,
            unit: item.unit
        }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        return sorted.length > 0 ? sorted : [{ code: 'N/A', name: 'No Data', value: 1, rawValue: 0, unit: '' }];
    }, [compositionData, view.parameterDonutData]);
    const donutColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    const handleExportCsv = async () => {
        if (!id || status !== 'Success' || isImported)
            return;
        setIsExporting(true);
        setError(null);
        try {
            const result = await exportFilterCsv(id);
            if (result.kind !== 'csvText') {
                throw new Error('Unexpected export response (expected CSV text).');
            }
            const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' });
            const href = URL.createObjectURL(blob);
            const preferredName = details?.measurementName?.trim() || details?.studyName?.trim() || 'filter';
            const fileStem = toSafeFileStem(preferredName);
            const link = document.createElement('a');
            link.href = href;
            link.setAttribute('download', `${fileStem}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
        }
        catch (exportError) {
            setError(exportError instanceof Error ? exportError.message : 'Failed to export CSV.');
        }
        finally {
            setIsExporting(false);
        }
    };
    const importedReady = !isImported || Boolean(importedSession?.importedFilterJson);
    const childNavState = isImported ? importedSession ?? undefined : undefined;
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsxs("div", { className: "mb-6 flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate('/filters'), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Filter Details" }), dashboardReady ? _jsx(MethodChip, { method: view.method }) : null] }), _jsx("p", { className: "font-mono text-xs text-muted-foreground", children: isImported && importedSession?.importedFileName ? (_jsxs(_Fragment, { children: ["Imported ", _jsx("span", { className: "text-foreground", children: importedSession.importedFileName }), " \u00B7 local preview (not saved) \u00B7 ", details?.filterId ?? id] })) : (_jsxs(_Fragment, { children: ["Filter ", id ?? '-', " \u00B7 Generated ", createdAt] })) })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => navigate(`/filters/${id}/analysis`, { state: childNavState }), disabled: !id || !importedReady, children: [_jsx(Microscope, { size: 16, strokeWidth: 1.5 }), "Analyze"] }), _jsxs(Button, { variant: "outline", onClick: () => navigate(`/filters/${id}/visualize`, { state: childNavState }), disabled: !id || !importedReady, children: [_jsx(Eye, { size: 16, strokeWidth: 1.5 }), "Visualize"] }), _jsxs(Button, { variant: "outline", onClick: () => navigate(`/filters/${id}/simulate`, { state: childNavState }), disabled: !id || !importedReady, children: [_jsx(Play, { size: 16, strokeWidth: 1.5 }), "Simulate"] }), _jsxs(Button, { variant: "outline", onClick: () => void handleExportCsv(), disabled: status !== 'Success' || isExporting || isImported, title: isImported ? 'Export is only available for saved filters.' : undefined, children: [_jsx(Download, { size: 16, strokeWidth: 1.5 }), isExporting ? 'Exporting...' : 'Export CSV'] })] })] }), error ? (_jsx("div", { className: "mb-6 rounded-[6px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive", children: error })) : null, _jsxs("div", { className: "mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", children: [_jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Status" }), _jsx(StatusBadge, { status: displayStatus })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Study ID" }), _jsx("p", { className: "text-sm font-medium font-mono", children: details?.studyId ?? '-' })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Measurement ID" }), _jsx("p", { className: "font-mono text-xs", children: details?.measurementId ?? '-' })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Created" }), _jsx("p", { className: "font-mono text-xs", children: createdAt })] })] }), isLoading ? (_jsx("div", { className: "rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground", children: "Loading filter status..." })) : null, !isLoading && !dashboardReady ? (_jsx("div", { className: "rounded-[6px] border border-border bg-card p-6 text-sm", children: isFilterStatusWaiting(status) ? (_jsxs("div", { className: "space-y-3", children: [_jsx(FilterStatusWithProgress, { status: displayStatus, progressPercent: progress.progressPercent, currentStep: progress.currentStep }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Details and export unlock when status becomes Success." })] })) : (_jsxs("div", { className: "text-muted-foreground", children: ["Filter is currently ", _jsx(StatusBadge, { status: displayStatus }), ". Details and export unlock when status becomes Success."] })) })) : null, !isLoading && dashboardReady ? (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", children: metricCards.map((card) => (_jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: card.label }), _jsx("p", { className: "font-mono text-sm", children: card.value })] }, card.label))) }), view.layerRows.length > 0 ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Filter Composition" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [view.layerRows.length, " layer", view.layerRows.length === 1 ? '' : 's', ' · ', view.layerRows.filter((r) => r.mode === 'filtration').length, " filtration", ' · ', view.layerRows.filter((r) => r.mode === 'enrichment').length, " enrichment"] })] }), view.enrichmentSummary?.enabled && (view.enrichmentSummary.minerals?.length ?? 0) > 0 ? (_jsxs("div", { className: "rounded-[6px] border border-emerald-300 bg-emerald-50/70 px-4 py-3 text-sm dark:border-emerald-500/40 dark:bg-emerald-500/10", children: [_jsx("span", { className: "font-medium text-emerald-900 dark:text-emerald-100", children: "Enriches with:" }), ' ', _jsx("span", { className: "text-emerald-900/80 dark:text-emerald-100/80", children: view.enrichmentSummary.minerals?.join(', ') }), _jsxs("span", { className: "ml-2 text-xs text-emerald-900/60 dark:text-emerald-100/60", children: ["\u00B7 ", view.enrichmentSummary.mineralCount ?? view.enrichmentSummary.minerals?.length ?? 0, ' ', "mineral", (view.enrichmentSummary.mineralCount ?? view.enrichmentSummary.minerals?.length ?? 0) === 1 ? '' : 's'] })] })) : null, _jsx("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3", children: view.layerRows.map((row, index) => {
                                    const isEnrichment = row.mode === 'enrichment';
                                    const cardTone = isEnrichment
                                        ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-500/40 dark:bg-emerald-500/5'
                                        : 'border-border bg-card';
                                    const modeChipTone = isEnrichment
                                        ? 'border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100'
                                        : 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-100';
                                    const fmtPct = (value) => value != null ? `${value.toFixed(2)}%` : '-';
                                    const fmtEv = (value) => value != null ? `${value.toFixed(4)} eV` : '-';
                                    const fmtNm = (value) => value != null ? `${value.toFixed(3)} nm` : '-';
                                    return (_jsxs("div", { className: `flex flex-col gap-3 rounded-[6px] border p-4 ${cardTone}`, children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: row.pollutant }), _jsx("p", { className: "font-mono text-xs text-muted-foreground", children: row.pollutantSymbol })] }), _jsx("span", { className: `inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${modeChipTone}`, children: isEnrichment ? 'Enrichment' : 'Filtration' })] }), row.mergedPollutants.length > 0 ? (_jsxs("p", { className: "text-xs text-muted-foreground", children: ["Also captures: ", row.mergedPollutants.join(', ')] })) : null, _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [isEnrichment ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { className: "scientific-label", children: "Target" }), _jsx("p", { className: "font-mono", children: row.targetConcentration ?? '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "scientific-label", children: "Release Rate" }), _jsx("p", { className: "font-mono", children: fmtPct(row.releaseRate) })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { className: "scientific-label", children: "Removal" }), _jsx("p", { className: "font-mono", children: fmtPct(row.removalEfficiency) })] }), _jsxs("div", { children: [_jsx("p", { className: "scientific-label", children: "Layer Thickness" }), _jsx("p", { className: "font-mono", children: fmtNm(row.layerThickness) })] })] })), _jsxs("div", { children: [_jsx("p", { className: "scientific-label", children: "Pore Size" }), _jsx("p", { className: "font-mono", children: fmtNm(row.poreSize) })] }), _jsxs("div", { children: [_jsx("p", { className: "scientific-label", children: "Binding Energy" }), _jsx("p", { className: "font-mono", children: fmtEv(row.bindingEnergy) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "scientific-label", children: "Material" }), _jsx("p", { className: "font-mono", children: row.materialType })] })] }), _jsx("div", { className: "flex flex-wrap items-center gap-1.5", children: _jsx(MethodChip, { method: row.method || null }) })] }, `${row.pollutantSymbol}-${index}`));
                                }) })] })) : null, _jsxs("div", { className: "grid grid-cols-1 gap-6 2xl:grid-cols-2", children: [_jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Parameter Composition" }), _jsx("div", { className: "h-72 w-full min-w-0", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: compositionData, margin: { top: 6, right: 12, left: 0, bottom: 8 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))" }), _jsx(XAxis, { dataKey: "code", tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }), _jsx(YAxis, { tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }), _jsx(Tooltip, { formatter: (_value, _name, item) => {
                                                            const p = item?.payload;
                                                            const raw = p?.rawValue;
                                                            const u = p?.unit ?? '';
                                                            return [`${raw != null ? String(raw) : '-'} ${u}`.trim(), 'Measured'];
                                                        }, contentStyle: {
                                                            borderRadius: 8,
                                                            borderColor: 'hsl(var(--border))',
                                                            background: 'hsl(var(--card))'
                                                        } }), _jsx(Bar, { dataKey: "value", fill: "#22c55e", radius: [4, 4, 0, 0] })] }) }) }), view.parameterBarData.length === 0 ? (_jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "Experimental parameter values unavailable; showing derived profile from filter metrics." })) : null] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Quality Fingerprint" }), _jsx("div", { className: "h-72 w-full min-w-0", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RadarChart, { data: fingerprintData, children: [_jsx(PolarGrid, { stroke: "hsl(var(--border))" }), _jsx(PolarAngleAxis, { dataKey: "parameter", tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }), _jsx(PolarRadiusAxis, { domain: [0, 100], tickCount: 6, tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }), _jsx(Radar, { dataKey: "value", stroke: "#3b82f6", fill: "#3b82f6", fillOpacity: 0.28 }), _jsx(Tooltip, { formatter: (value) => [`${String(value ?? '-')}%`, 'Normalized'], contentStyle: {
                                                            borderRadius: 8,
                                                            borderColor: 'hsl(var(--border))',
                                                            background: 'hsl(var(--card))'
                                                        } })] }) }) }), view.parameterRadarData.length === 0 ? (_jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "Fingerprint is estimated from efficiency, pore size, binding, pH, and temperature." })) : null] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4 2xl:col-span-2", children: [_jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Composition Share (Top Signals)" }), _jsx("div", { className: "h-64", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: donutData, dataKey: "value", nameKey: "code", innerRadius: 64, outerRadius: 92, paddingAngle: 2, children: donutData.map((entry, index) => (_jsx(Cell, { fill: donutColors[index % donutColors.length] }, `${entry.code}-${index}`))) }), _jsx(Legend, { formatter: (value, _entry, index) => {
                                                            const data = donutData[index];
                                                            if (!data)
                                                                return String(value);
                                                            return `${data.code}: ${data.rawValue} ${data.unit}`.trim();
                                                        } }), _jsx(Tooltip, { formatter: (value, _name, item) => {
                                                            const payload = item?.payload;
                                                            const total = donutData.reduce((s, d) => s + d.value, 0);
                                                            const pct = total > 0 && value != null ? ((Number(value) / total) * 100).toFixed(1) : '0';
                                                            const raw = payload?.rawValue;
                                                            return [
                                                                `${pct}% (${raw != null ? String(raw) : '-'} ${payload?.unit ?? ''})`.trim(),
                                                                'Share'
                                                            ];
                                                        }, contentStyle: {
                                                            borderRadius: 8,
                                                            borderColor: 'hsl(var(--border))',
                                                            background: 'hsl(var(--card))'
                                                        } })] }) }) })] })] })] })) : null] }));
}
