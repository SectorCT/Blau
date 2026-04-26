import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { Button } from '@renderer/components/ui/button';
import { getFilterDetails } from '@renderer/utils/api/endpoints';
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel';
import { buildFilterDetailsFromImportedJson, isImportedFilterRouteId, readImportedFilterSession } from '@renderer/utils/importedFilterPayload';
import { buildEnrichmentConfigFromFilterInfo, DEFAULT_ENRICHMENT_CONFIG, EnrichmentEngine } from '@renderer/utils/enrichmentSimulation';
const EMPTY_STATS = {
    totalWaterSpawned: 0,
    totalReleased: 0,
    releasedByType: {},
    concentrationByType: {},
    coverageRatio: 0
};
const formatConcentration = (mgPerL, unit) => {
    if (!Number.isFinite(mgPerL))
        return '–';
    if (unit === 'µg/L') {
        return `${(mgPerL * 1000).toFixed(1)} µg/L`;
    }
    if (mgPerL < 1)
        return `${mgPerL.toFixed(2)} mg/L`;
    return `${mgPerL.toFixed(1)} mg/L`;
};
const statusForConcentration = (current, min, max) => {
    if (current < min)
        return 'below';
    if (current > max)
        return 'above';
    return 'in range';
};
const STATUS_STYLES = {
    below: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'in range': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    above: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
};
export function EnrichmentSimulation() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isImported = isImportedFilterRouteId(id);
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const rafRef = useRef(0);
    const [playing, setPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(DEFAULT_ENRICHMENT_CONFIG);
    const [filterInfo, setFilterInfo] = useState(null);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(EMPTY_STATS);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        if (!id) {
            setLoading(false);
            setError('Missing filter ID.');
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
                if (cancelled)
                    return;
                setFilterInfo(details.filterInfo);
                const next = buildEnrichmentConfigFromFilterInfo(details.filterInfo);
                setConfig(next);
                if (engineRef.current) {
                    engineRef.current.config = next;
                    engineRef.current.reset();
                }
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
            if (cancelled)
                return;
            setFilterInfo(resp.filterInfo);
            const next = buildEnrichmentConfigFromFilterInfo(resp.filterInfo);
            setConfig(next);
            if (engineRef.current) {
                engineRef.current.config = next;
                engineRef.current.reset();
            }
        })
            .catch((fetchError) => {
            if (!cancelled) {
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load simulation data.');
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
    const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo]);
    const enrichmentEnabled = vm.enrichmentSummary?.enabled === true || vm.enrichmentMinerals.length > 0;
    const getEngine = useCallback(() => {
        if (!engineRef.current) {
            engineRef.current = new EnrichmentEngine(config);
        }
        return engineRef.current;
    }, [config]);
    useEffect(() => {
        if (loading)
            return;
        if (!enrichmentEnabled)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const engine = getEngine();
        engine.config = config;
        engine.reset();
        const syncSize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            engine.resize(rect.width, rect.height);
        };
        syncSize();
        const observer = new ResizeObserver(syncSize);
        observer.observe(canvas);
        let lastTime = 0;
        let frameCount = 0;
        const loop = (time) => {
            const dt = lastTime === 0 ? 16 : Math.min(time - lastTime, 50);
            lastTime = time;
            engine.tick(dt / 16, performance.now());
            engine.draw(ctx);
            frameCount++;
            if (frameCount % 10 === 0) {
                setStats({
                    totalWaterSpawned: engine.stats.totalWaterSpawned,
                    totalReleased: engine.stats.totalReleased,
                    releasedByType: { ...engine.stats.releasedByType },
                    concentrationByType: { ...engine.stats.concentrationByType },
                    coverageRatio: engine.stats.coverageRatio
                });
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(rafRef.current);
            observer.disconnect();
        };
    }, [loading, enrichmentEnabled, getEngine, config]);
    useEffect(() => {
        const engine = engineRef.current;
        if (engine)
            engine.paused = !playing;
    }, [playing]);
    useEffect(() => {
        const engine = engineRef.current;
        if (engine)
            engine.setSpeed(speed);
    }, [speed]);
    const handleReset = () => {
        const engine = engineRef.current;
        if (engine) {
            engine.reset();
            setStats(EMPTY_STATS);
        }
    };
    const minerals = config.minerals;
    const coveragePct = Math.round(stats.coverageRatio * 100);
    if (loading) {
        return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx(Loader2, { size: 32, className: "animate-spin text-muted-foreground" }) }));
    }
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsx("div", { className: "mb-5 flex flex-wrap items-start justify-between gap-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate(`/filters/${id}`, {
                                state: isImported ? readImportedFilterSession(location) ?? undefined : undefined
                            }), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Enrichment Simulation" }), _jsxs("p", { className: "font-mono text-xs text-muted-foreground", children: ["Filter ", id ?? '-'] })] })] }) }), error ? (_jsx("div", { className: "mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive", children: error })) : null, !enrichmentEnabled ? (_jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsxs("div", { className: "max-w-md rounded-[8px] border border-border bg-card p-6 text-center text-sm text-muted-foreground", children: [_jsx("h2", { className: "mb-2 text-base font-semibold text-foreground", children: "No enrichment layers" }), _jsx("p", { children: "This filter has no enrichment layers configured. Generate a filter with enrichment enabled to view the release simulation." }), _jsx("button", { onClick: () => navigate(`/filters/${id ?? ''}`), className: "mt-4 rounded-[6px] border border-border px-3 py-1.5 text-xs hover:bg-secondary", children: "Back to Filter" })] }) })) : (_jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]", children: [_jsxs("section", { className: "flex min-h-0 flex-col gap-3 overflow-hidden", children: [_jsx("div", { className: "relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black", children: _jsx("canvas", { ref: canvasRef, className: "absolute inset-0 h-full w-full" }) }), _jsxs("div", { className: "flex shrink-0 items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-2.5", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setPlaying((prev) => !prev), className: "w-24", children: playing ? (_jsxs(_Fragment, { children: [_jsx(Pause, { size: 14, strokeWidth: 1.5 }), " Pause"] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 14, strokeWidth: 1.5 }), " Play"] })) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Speed" }), _jsx("input", { type: "range", min: 0.5, max: 3, step: 0.25, value: speed, onChange: (e) => setSpeed(Number(e.target.value)), className: "h-1 w-28 cursor-pointer accent-primary" }), _jsxs("span", { className: "w-10 text-right font-mono text-xs text-foreground", children: [speed.toFixed(2), "x"] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: handleReset, children: [_jsx(RotateCcw, { size: 14, strokeWidth: 1.5 }), " Reset"] })] })] }), _jsxs("aside", { className: "min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Filter Properties" }), _jsxs("div", { className: "mb-4 space-y-1.5 text-sm", children: [config.materialType && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Material" }), _jsx("span", { className: "font-mono text-xs", children: config.materialType })] })), config.poreSize != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Pore Size" }), _jsxs("span", { className: "font-mono text-xs", children: [config.poreSize.toFixed(3), " nm"] })] })), config.layerThickness != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Layer Thickness" }), _jsxs("span", { className: "font-mono text-xs", children: [config.layerThickness.toFixed(3), " nm"] })] })), config.bindingEnergy != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Binding Energy" }), _jsxs("span", { className: "font-mono text-xs", children: [config.bindingEnergy.toFixed(4), " eV"] })] })), config.temperature != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Temperature" }), _jsxs("span", { className: "font-mono text-xs", children: [config.temperature.toFixed(2), " \u00B0C"] })] })), config.ph != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "pH" }), _jsx("span", { className: "font-mono text-xs", children: config.ph.toFixed(2) })] }))] }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Mineral Targets" }), _jsx("div", { className: "mb-4 space-y-2", children: minerals.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No minerals configured." })) : (minerals.map((m) => {
                                    const current = stats.concentrationByType[m.mineral.key] ?? 0;
                                    const status = statusForConcentration(current, m.targetMin, m.targetMax);
                                    const inRange = status === 'in range';
                                    return (_jsxs("div", { className: `rounded-[6px] border p-2.5 ${inRange
                                            ? 'border-emerald-500/40 bg-emerald-500/5'
                                            : 'border-border/60 bg-background/40'}`, children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: m.mineral.color } }), _jsx("span", { className: "flex-1 truncate text-sm font-medium text-foreground", children: m.mineral.label }), _jsx("span", { className: `rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`, children: status })] }), _jsxs("div", { className: "space-y-0.5 text-xs text-muted-foreground", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Target band" }), _jsxs("span", { className: "font-mono text-foreground", children: [formatConcentration(m.targetMin, m.unit), " \u2013 ", formatConcentration(m.targetMax, m.unit)] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Current" }), _jsx("span", { className: "font-mono text-foreground", children: formatConcentration(current, m.unit) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Release rate" }), _jsxs("span", { className: "font-mono text-foreground", children: [m.releaseRate.toFixed(1), "%"] })] })] })] }, m.mineral.key));
                                })) }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Simulation Stats" }), _jsxs("div", { className: "mb-4 space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Water Spawned" }), _jsx("span", { className: "font-mono", children: stats.totalWaterSpawned })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Total Released" }), _jsx("span", { className: "font-mono text-emerald-400", children: stats.totalReleased })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Coverage in band" }), _jsxs("span", { className: "font-mono font-semibold text-emerald-400", children: [coveragePct, "%"] })] })] }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Released by Type" }), _jsx("div", { className: "space-y-1.5", children: minerals.map((m) => {
                                    const released = stats.releasedByType[m.mineral.key] ?? 0;
                                    const current = stats.concentrationByType[m.mineral.key] ?? 0;
                                    return (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: m.mineral.color } }), _jsxs("span", { className: "min-w-0 flex-1 truncate text-muted-foreground", children: [m.mineral.label, _jsxs("span", { className: "ml-1 font-mono text-[10px] text-muted-foreground/80", children: ["(", formatConcentration(current, m.unit), ")"] })] }), _jsx("span", { className: "font-mono text-xs", children: released })] }, m.mineral.key));
                                }) }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Legend" }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: '#3b82f6' } }), _jsx("span", { className: "text-muted-foreground", children: "H2O \u2014 Water" }), _jsx("span", { className: "ml-auto text-[10px] text-blue-400", children: "passes" })] }), minerals.map((m) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: m.mineral.color } }), _jsxs("span", { className: "text-muted-foreground", children: [m.mineral.symbol, " \u2014 ", m.mineral.label.replace(/\s*\(.*\)$/, '')] }), _jsx("span", { className: "ml-auto text-[10px] text-emerald-400", children: "released" })] }, `legend-${m.mineral.key}`)))] })] })] }))] }));
}
