import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { Button } from '@renderer/components/ui/button';
import { getFilterDetails } from '@renderer/utils/api/endpoints';
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel';
import { buildFilterDetailsFromImportedJson, isImportedFilterRouteId, readImportedFilterSession, } from '@renderer/utils/importedFilterPayload';
import { SimulationEngine, buildSimulationConfig, DEFAULT_CONFIG } from '@renderer/utils/simulation';
export function FilterSimulation() {
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
    const [simConfig, setSimConfig] = useState(DEFAULT_CONFIG);
    const [filterInfo, setFilterInfo] = useState(null);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalSpawned: 0,
        totalPassed: 0,
        totalContaminantsSpawned: 0,
        capturedByType: {},
        mineralsByType: {},
        mineralConcentrationByType: {},
        mineralCoverageRatio: 0
    });
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
                const config = buildSimulationConfig(details.filterInfo);
                setSimConfig(config);
                if (engineRef.current) {
                    engineRef.current.config = config;
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
            const config = buildSimulationConfig(resp.filterInfo);
            setSimConfig(config);
            if (engineRef.current) {
                engineRef.current.config = config;
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
    const getEngine = useCallback(() => {
        if (!engineRef.current) {
            engineRef.current = new SimulationEngine(simConfig);
        }
        return engineRef.current;
    }, [simConfig]);
    useEffect(() => {
        if (loading)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const engine = getEngine();
        engine.config = simConfig;
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
            engine.tick(dt / 16);
            engine.draw(ctx);
            frameCount++;
            if (frameCount % 10 === 0) {
                setStats({
                    ...engine.stats,
                    capturedByType: { ...engine.stats.capturedByType },
                    mineralsByType: { ...engine.stats.mineralsByType },
                    mineralConcentrationByType: { ...engine.stats.mineralConcentrationByType }
                });
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(rafRef.current);
            observer.disconnect();
        };
    }, [loading, getEngine, simConfig]);
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
            setStats({
                totalSpawned: 0, totalPassed: 0, totalContaminantsSpawned: 0, capturedByType: {},
                mineralsByType: {}, mineralConcentrationByType: {}, mineralCoverageRatio: 0
            });
        }
    };
    const totalCaptured = Object.values(stats.capturedByType).reduce((a, b) => a + b, 0);
    const efficiency = stats.totalContaminantsSpawned > 0
        ? Math.min(100, Math.round((totalCaptured / stats.totalContaminantsSpawned) * 100))
        : 0;
    const moleculeTypes = simConfig.moleculeTypes;
    if (loading) {
        return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx(Loader2, { size: 32, className: "animate-spin text-muted-foreground" }) }));
    }
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsx("div", { className: "mb-5 flex flex-wrap items-start justify-between gap-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate(`/filters/${id}`, {
                                state: isImported ? readImportedFilterSession(location) ?? undefined : undefined,
                            }), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Filtration Simulation" }), _jsxs("p", { className: "font-mono text-xs text-muted-foreground", children: ["Filter ", id ?? '-'] })] })] }) }), error ? (_jsx("div", { className: "mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive", children: error })) : null, _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]", children: [_jsxs("section", { className: "flex min-h-0 flex-col gap-3 overflow-hidden", children: [_jsx("div", { className: "relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black", children: _jsx("canvas", { ref: canvasRef, className: "absolute inset-0 h-full w-full" }) }), _jsxs("div", { className: "flex shrink-0 items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-2.5", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setPlaying((prev) => !prev), className: "w-24", children: playing ? (_jsxs(_Fragment, { children: [_jsx(Pause, { size: 14, strokeWidth: 1.5 }), " Pause"] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 14, strokeWidth: 1.5 }), " Play"] })) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Speed" }), _jsx("input", { type: "range", min: 0.5, max: 3, step: 0.25, value: speed, onChange: (e) => setSpeed(Number(e.target.value)), className: "h-1 w-28 cursor-pointer accent-primary" }), _jsxs("span", { className: "w-10 text-right font-mono text-xs text-foreground", children: [speed.toFixed(2), "x"] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: handleReset, children: [_jsx(RotateCcw, { size: 14, strokeWidth: 1.5 }), " Reset"] })] })] }), _jsxs("aside", { className: "min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Filter Properties" }), _jsxs("div", { className: "mb-4 space-y-1.5 text-sm", children: [vm.metrics.materialType !== 'n/a' && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Material" }), _jsx("span", { className: "font-mono text-xs", children: vm.metrics.materialType })] })), vm.metrics.poreSize != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Pore Size" }), _jsxs("span", { className: "font-mono text-xs", children: [vm.metrics.poreSize.toFixed(3), " nm"] })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Target capture efficiency" }), _jsxs("span", { className: "font-mono text-xs", children: [simConfig.removalEfficiency, "%"] })] }), vm.metrics.pollutant !== 'n/a' && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Target Pollutant" }), _jsx("span", { className: "font-mono text-xs", children: vm.metrics.pollutant })] })), vm.metrics.bindingEnergy != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Binding Energy" }), _jsxs("span", { className: "font-mono text-xs", children: [vm.metrics.bindingEnergy.toFixed(4), " eV"] })] })), vm.metrics.temperature != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Temperature" }), _jsxs("span", { className: "font-mono text-xs", children: [vm.metrics.temperature.toFixed(2), " \u00B0C"] })] })), vm.metrics.ph != null && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "pH" }), _jsx("span", { className: "font-mono text-xs", children: vm.metrics.ph.toFixed(2) })] }))] }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Simulation Stats" }), _jsxs("div", { className: "mb-4 space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Total Spawned" }), _jsx("span", { className: "font-mono", children: stats.totalSpawned })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Passed Through" }), _jsx("span", { className: "font-mono text-blue-400", children: stats.totalPassed })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Total Captured" }), _jsx("span", { className: "font-mono text-red-400", children: totalCaptured })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Observed Efficiency" }), _jsxs("span", { className: "font-mono font-semibold text-green-400", children: [efficiency, "%"] })] })] }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Captured by Type" }), _jsx("div", { className: "space-y-1.5", children: moleculeTypes.filter((m) => m.filterable).map((m) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: m.color } }), _jsxs("span", { className: "min-w-0 flex-1 truncate text-muted-foreground", children: [m.name, _jsxs("span", { className: "ml-1 font-mono text-[10px] text-muted-foreground/80", children: ["(", Math.round(simConfig.removalEfficiency), "% tgt)"] })] }), _jsx("span", { className: "font-mono text-xs", children: stats.capturedByType[m.code] ?? 0 })] }, m.code))) }), _jsx("div", { className: "my-3 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Legend" }), _jsx("div", { className: "space-y-1.5", children: moleculeTypes.map((m) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: m.color } }), _jsxs("span", { className: "text-muted-foreground", children: [m.code, " \u2014 ", m.name] }), !m.filterable && (_jsx("span", { className: "ml-auto text-[10px] text-blue-400", children: "passes" }))] }, m.code))) }), (simConfig.enrichmentMinerals?.length ?? 0) > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "my-3 border-t border-border" }), _jsx("h2", { className: "mb-3 text-sm font-semibold text-emerald-400", children: "Enrichment" }), _jsx("div", { className: "mb-3 space-y-2 text-sm", children: _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Target coverage" }), _jsxs("span", { className: "font-mono font-semibold text-emerald-400", children: [Math.round(stats.mineralCoverageRatio * 100), "%"] })] }) }), _jsx("div", { className: "space-y-2", children: (simConfig.enrichmentMinerals ?? []).map((em) => {
                                            const conc = stats.mineralConcentrationByType[em.mineral.key] ?? 0;
                                            const inRange = conc >= em.targetMin && conc <= em.targetMax;
                                            return (_jsxs("div", { className: "rounded-[6px] border border-border p-2 text-sm", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 shrink-0 rounded-full", style: { backgroundColor: em.mineral.color } }), _jsxs("span", { className: "font-medium", children: [em.mineral.symbol, " \u2014 ", em.mineral.label] })] }), _jsxs("div", { className: "space-y-0.5 pl-4 text-xs text-muted-foreground", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Concentration" }), _jsxs("span", { className: `font-mono ${inRange ? 'text-emerald-400' : 'text-amber-400'}`, children: [conc.toFixed(3), " ", em.unit] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Target" }), _jsx("span", { className: "font-mono text-foreground", children: em.mineral.target })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Released" }), _jsx("span", { className: "font-mono text-foreground", children: stats.mineralsByType[em.mineral.key] ?? 0 })] })] })] }, em.mineral.key));
                                        }) })] }))] })] })] }));
}
