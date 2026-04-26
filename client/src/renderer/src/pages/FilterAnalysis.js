import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Microscope } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { Button } from '@renderer/components/ui/button';
import { getFilterDetails } from '@renderer/utils/api/endpoints';
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel';
import { buildFilterDetailsFromImportedJson, isImportedFilterRouteId, readImportedFilterSession, } from '@renderer/utils/importedFilterPayload';
import { buildMoleculeDefinitions, MolecularScene } from '@renderer/utils/molecularViz';
function formatValue(value) {
    if (value == null || Number.isNaN(value))
        return 'n/a';
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}
export function FilterAnalysis() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isImported = isImportedFilterRouteId(id);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const rafRef = useRef(0);
    const [loading, setLoading] = useState(Boolean(id));
    const [filterInfo, setFilterInfo] = useState(null);
    const [hover, setHover] = useState(null);
    const [error, setError] = useState(id ? null : 'Missing filter ID.');
    useEffect(() => {
        let cancelled = false;
        if (!id) {
            return;
        }
        if (isImported) {
            const session = readImportedFilterSession(location);
            if (!session?.importedFilterJson) {
                setFilterInfo(null);
                setError('No imported filter data. Open your JSON from All Filters first.');
                setLoading(false);
                return;
            }
            try {
                const details = buildFilterDetailsFromImportedJson(session.importedFilterJson, session.importedFileName);
                if (!cancelled)
                    setFilterInfo(details.filterInfo);
                setError(null);
            }
            catch (parseError) {
                if (!cancelled) {
                    setFilterInfo(null);
                    setError(parseError instanceof Error ? parseError.message : 'Failed to load imported filter.');
                }
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
            return () => {
                cancelled = true;
            };
        }
        getFilterDetails(id)
            .then((resp) => {
            if (!cancelled)
                setFilterInfo(resp.filterInfo);
        })
            .catch((fetchError) => {
            if (!cancelled) {
                setFilterInfo(null);
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter analysis data.');
            }
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id, isImported, location.state]);
    const moleculeDefs = useMemo(() => buildMoleculeDefinitions(filterInfo ?? {}), [filterInfo]);
    const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo]);
    const filterStructure = filterInfo?.filterStructure;
    const experimentPayload = filterInfo?.experimentPayload;
    const resultPayload = filterInfo?.resultPayload;
    const removalEfficiency = vm.metrics.removalEfficiency ?? resultPayload?.removalEfficiency ?? 90;
    const radarData = useMemo(() => {
        return vm.parameterRadarData;
    }, [vm.parameterRadarData]);
    const removalData = useMemo(() => {
        const eff = Math.max(0, Math.min(100, removalEfficiency)) / 100;
        return vm.params
            .map((item) => {
            const removed = item.value * eff;
            const remaining = Math.max(0, item.value - removed);
            return {
                name: item.code,
                concentration: Number(item.value.toFixed(3)),
                removed: Number(removed.toFixed(3)),
                remaining: Number(remaining.toFixed(3)),
                unit: item.unit
            };
        })
            .sort((a, b) => b.concentration - a.concentration)
            .slice(0, 8);
    }, [vm.params, removalEfficiency]);
    useEffect(() => {
        if (!filterInfo)
            return;
        const genericDefs = moleculeDefs.filter((m) => m.formula === 'n/a').map((m) => m.code);
        console.debug('[FilterAnalysis] molecule mapping', {
            filterId: id,
            totalParams: vm.params.length,
            molecularDefs: moleculeDefs.length,
            genericDefs
        });
    }, [filterInfo, id, moleculeDefs, vm.params.length]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || loading)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        if (!sceneRef.current) {
            sceneRef.current = new MolecularScene({
                definitions: moleculeDefs,
                poreSize: vm.metrics.poreSize ?? filterStructure?.poreSize,
                materialType: vm.metrics.materialType,
                layerThickness: vm.metrics.layerThickness ?? filterStructure?.layerThickness,
                removalEfficiency
            });
        }
        else {
            sceneRef.current.update({
                definitions: moleculeDefs,
                poreSize: vm.metrics.poreSize ?? filterStructure?.poreSize,
                materialType: vm.metrics.materialType,
                layerThickness: vm.metrics.layerThickness ?? filterStructure?.layerThickness,
                removalEfficiency
            });
        }
        const syncSize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            sceneRef.current?.setViewport(rect.width, rect.height);
        };
        syncSize();
        const observer = new ResizeObserver(syncSize);
        observer.observe(canvas);
        let lastTime = 0;
        const loop = (time) => {
            const dt = lastTime === 0 ? 16 : Math.min(34, time - lastTime);
            lastTime = time;
            sceneRef.current?.frame(dt);
            sceneRef.current?.draw(ctx);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(rafRef.current);
            observer.disconnect();
        };
    }, [loading, moleculeDefs, filterStructure, removalEfficiency, vm.metrics]);
    const handleMouseMove = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const info = sceneRef.current?.pick(x, y) ?? null;
        if (!info) {
            setHover(null);
            return;
        }
        setHover({ x, y, info });
    };
    if (loading) {
        return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx(Loader2, { size: 32, className: "animate-spin text-muted-foreground" }) }));
    }
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsxs("div", { className: "mb-5 flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate(`/filters/${id}`, {
                                    state: isImported ? readImportedFilterSession(location) ?? undefined : undefined,
                                }), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Molecular Analysis" }), _jsxs("p", { className: "font-mono text-xs text-muted-foreground", children: ["Filter ", id ?? '-'] })] })] }), _jsxs(Button, { variant: "outline", onClick: () => navigate(`/filters/${id}/simulate`, {
                            state: isImported ? readImportedFilterSession(location) ?? undefined : undefined,
                        }), children: [_jsx(Microscope, { size: 14, strokeWidth: 1.5 }), "Compare With Simulation"] })] }), error ? (_jsx("div", { className: "mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive", children: error })) : null, _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]", children: [_jsxs("section", { className: "flex min-h-0 flex-col gap-3 overflow-hidden", children: [_jsxs("div", { className: "relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black", children: [_jsx("canvas", { ref: canvasRef, className: "absolute inset-0 h-full w-full", onMouseMove: handleMouseMove, onMouseLeave: () => setHover(null) }), hover && (_jsxs("div", { className: "pointer-events-none absolute z-10 rounded-[6px] border border-border bg-card/95 px-2 py-1 text-xs shadow-md backdrop-blur-sm", style: {
                                            left: `${hover.x + 12}px`,
                                            top: `${hover.y + 12}px`
                                        }, children: [_jsxs("p", { className: "font-semibold text-foreground", children: [hover.info.name, " (", hover.info.formula, ")"] }), _jsxs("p", { className: "font-mono text-muted-foreground", children: [hover.info.concentration, " ", hover.info.unit, " (", hover.info.zone, ")"] })] }))] }), _jsx("div", { className: "rounded-[8px] border border-border bg-card p-3 text-sm text-muted-foreground", children: "Molecule density comes from `experimentPayload.params`. Membrane labels use aggregate filter geometry. Removal uses the summary removal efficiency for all species." })] }), _jsxs("aside", { className: "min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Water Quality Fingerprint" }), _jsx("div", { className: "h-56", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RadarChart, { data: radarData, children: [_jsx(PolarGrid, { stroke: "hsl(var(--border))" }), _jsx(PolarAngleAxis, { dataKey: "parameter", tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }), _jsx(PolarRadiusAxis, { domain: [0, 100], tickCount: 6, tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }), _jsx(Radar, { dataKey: "value", stroke: "#22c55e", fill: "#22c55e", fillOpacity: 0.28 }), _jsx(Tooltip, { formatter: (value) => [`${String(value ?? '-')}%`, 'Normalized'], contentStyle: { borderRadius: 8, borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' } })] }) }) }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Contaminant Removal" }), _jsx("div", { className: "h-64", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { layout: "vertical", data: removalData, margin: { top: 4, right: 8, left: 2, bottom: 4 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))" }), _jsx(XAxis, { type: "number", tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }), _jsx(YAxis, { dataKey: "name", type: "category", width: 42, tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }), _jsx(Tooltip, { formatter: (value, key) => [`${String(value ?? '-')}`, key === 'removed' ? 'Removed' : 'Remaining'], labelFormatter: (label) => `${label}`, contentStyle: { borderRadius: 8, borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' } }), _jsx(Bar, { dataKey: "removed", stackId: "a", fill: "#ef4444" }), _jsx(Bar, { dataKey: "remaining", stackId: "a", fill: "#3b82f6" })] }) }) }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Filter Properties" }), _jsxs("div", { className: "space-y-1.5 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Material" }), _jsx("span", { className: "font-mono text-xs", children: vm.metrics.materialType })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Pore Size" }), _jsxs("span", { className: "font-mono text-xs", children: [formatValue(vm.metrics.poreSize ?? undefined), " nm"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Layer Thickness" }), _jsxs("span", { className: "font-mono text-xs", children: [formatValue(vm.metrics.layerThickness ?? undefined), " nm"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Lattice Spacing" }), _jsxs("span", { className: "font-mono text-xs", children: [formatValue(vm.metrics.latticeSpacing ?? undefined), " A"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Binding Energy" }), _jsxs("span", { className: "font-mono text-xs", children: [formatValue(vm.metrics.bindingEnergy ?? undefined), " eV"] })] })] }), vm.layerRows.length > 1 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Per-layer (pollutant)" }), _jsx("div", { className: "max-h-48 space-y-2 overflow-y-auto text-xs", children: vm.layerRows.map((row, i) => (_jsxs("div", { className: "rounded-[6px] border border-border bg-background/50 p-2", children: [_jsxs("div", { className: "font-medium text-foreground", children: [row.pollutant !== 'n/a' ? row.pollutant : row.pollutantSymbol, row.pollutantSymbol !== 'n/a' ? (_jsxs("span", { className: "ml-1 font-mono text-muted-foreground", children: ["(", row.pollutantSymbol, ")"] })) : null] }), _jsxs("div", { className: "mt-1 grid grid-cols-2 gap-x-2 font-mono text-[10px] text-muted-foreground", children: [_jsxs("span", { children: ["Removal ", formatValue(row.removalEfficiency ?? undefined), "%"] }), _jsxs("span", { children: ["BE ", formatValue(row.bindingEnergy ?? undefined), " eV"] }), _jsxs("span", { children: ["Pore ", formatValue(row.poreSize ?? undefined), " nm"] }), _jsxs("span", { children: ["Thick ", formatValue(row.layerThickness ?? undefined), " nm"] }), _jsxs("span", { className: "col-span-2", children: ["Mat. ", row.materialType] })] })] }, `${row.pollutant}-${row.pollutantSymbol}-${i}`))) })] })) : null, _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Sample Conditions" }), _jsxs("div", { className: "space-y-1.5 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Temperature" }), _jsxs("span", { className: "font-mono text-xs", children: [formatValue(experimentPayload?.temperature), " C"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "pH" }), _jsx("span", { className: "font-mono text-xs", children: formatValue(experimentPayload?.ph) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Target Pollutant" }), _jsx("span", { className: "font-mono text-xs", children: vm.metrics.pollutant })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Removal Efficiency" }), _jsxs("span", { className: "font-mono text-xs", children: [formatValue(vm.metrics.removalEfficiency ?? undefined), "%"] })] })] }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Molecular Legend" }), _jsx("div", { className: "space-y-1.5", children: moleculeDefs.map((m) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: m.color } }), _jsxs("span", { className: "flex-1 text-muted-foreground", children: [m.code, " - ", m.formula] }), _jsx("span", { className: "font-mono text-[10px]", children: m.filterable ? 'capturable' : 'carrier' })] }, m.code))) })] })] })] }));
}
