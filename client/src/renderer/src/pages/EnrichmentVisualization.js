import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as $3Dmol from '3dmol';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { getFilterDetails } from '@renderer/utils/api/endpoints';
import { atomPositionsToXyz, buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel';
import { MINERAL_ELEMENTS, ENRICHMENT_MINERALS } from '@renderer/data/enrichmentMinerals';
import { IMPORTED_FILTER_ROUTE_ID, normalizeImportedFilterInfo, readImportedFilterSession, writeImportedFilterSession, } from '@renderer/utils/importedFilterPayload';
const BASE_STYLE = { stick: { radius: 0.06 }, sphere: { scale: 0.15 } };
const DIM_STYLE = { stick: { radius: 0.05, opacity: 0.35 }, sphere: { scale: 0.13, opacity: 0.35 } };
const HIGHLIGHT_STYLE = { stick: { radius: 0.1 }, sphere: { scale: 0.45 } };
const ELEMENT_LABELS = {
    C: 'Carbon (scaffold)',
    O: 'Oxygen (scaffold)',
    N: 'Nitrogen (scaffold)',
    S: 'Sulfur (scaffold)',
    H: 'Hydrogen (scaffold)'
};
const MINERAL_COLOR_BY_ELEMENT = ENRICHMENT_MINERALS.reduce((acc, mineral) => {
    acc[mineral.element] = mineral.color;
    return acc;
}, {});
const MINERAL_LABEL_BY_ELEMENT = ENRICHMENT_MINERALS.reduce((acc, mineral) => {
    acc[mineral.element] = `${mineral.label}`;
    return acc;
}, {});
export function EnrichmentVisualization() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const lastAtomClickRef = useRef(0);
    const [selectedAtom, setSelectedAtom] = useState(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [filterInfo, setFilterInfo] = useState(null);
    const [error, setError] = useState(null);
    const [loadedFromName, setLoadedFromName] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const loadImported = (session) => {
            try {
                const importedInfo = normalizeImportedFilterInfo(session.importedFilterJson);
                if (cancelled)
                    return;
                setFilterInfo(importedInfo);
                setLoadedFromName(session.importedFileName ?? null);
                setError(null);
            }
            catch (importError) {
                if (!cancelled) {
                    setFilterInfo(null);
                    setError(importError instanceof Error ? importError.message : 'Failed to parse filter JSON.');
                }
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        if (id === IMPORTED_FILTER_ROUTE_ID) {
            const session = readImportedFilterSession(location);
            if (!session?.importedFilterJson) {
                setFilterInfo(null);
                setError('No imported filter data. Open a JSON file from All Filters.');
                setLoading(false);
                return () => {
                    cancelled = true;
                };
            }
            loadImported(session);
            return () => {
                cancelled = true;
            };
        }
        if (id) {
            getFilterDetails(id)
                .then((resp) => {
                if (!cancelled)
                    setFilterInfo(resp.filterInfo);
            })
                .catch((fetchError) => {
                if (!cancelled) {
                    setFilterInfo(null);
                    setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter structure.');
                }
            })
                .finally(() => {
                if (!cancelled)
                    setLoading(false);
            });
            return () => {
                cancelled = true;
            };
        }
        const state = (location.state ?? {});
        if (state.importedFilterJson !== undefined) {
            writeImportedFilterSession(state);
            navigate(`/filters/${IMPORTED_FILTER_ROUTE_ID}/enrich/visualize`, { replace: true, state });
            return () => {
                cancelled = true;
            };
        }
        navigate('/filters', { replace: true });
        return () => {
            cancelled = true;
        };
    }, [id, location.state, navigate]);
    const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo]);
    const enrichmentEnabled = vm.enrichmentSummary?.enabled === true || vm.enrichmentMinerals.length > 0;
    const usingRealStructure = vm.atomPositions.length > 0;
    const hasExplicitConnections = vm.atomConnections.length > 0;
    const xyz = useMemo(() => (usingRealStructure ? atomPositionsToXyz(vm.atomPositions) : ''), [usingRealStructure, vm.atomPositions]);
    const atomCount = vm.atomPositions.length;
    const modelAtoms = useMemo(() => {
        if (!hasExplicitConnections)
            return null;
        const indexById = new Map(vm.atomPositions.map((atom, index) => [atom.id, index]));
        const atoms = vm.atomPositions.map((atom) => ({
            elem: atom.element,
            x: atom.x,
            y: atom.y,
            z: atom.z,
            bonds: [],
            bondOrder: []
        }));
        for (const connection of vm.atomConnections) {
            const fromIndex = indexById.get(connection.from);
            const toIndex = indexById.get(connection.to);
            if (fromIndex == null || toIndex == null)
                continue;
            atoms[fromIndex].bonds.push(toIndex);
            atoms[fromIndex].bondOrder.push(connection.order);
            atoms[toIndex].bonds.push(fromIndex);
            atoms[toIndex].bondOrder.push(connection.order);
        }
        return atoms;
    }, [hasExplicitConnections, vm.atomConnections, vm.atomPositions]);
    const elementCounts = useMemo(() => {
        const counts = new Map();
        for (const atom of vm.atomPositions) {
            const key = atom.element || 'Unknown';
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    }, [vm.atomPositions]);
    const presentMineralElements = useMemo(() => elementCounts.filter(([element]) => MINERAL_ELEMENTS.has(element)), [elementCounts]);
    const presentScaffoldElements = useMemo(() => elementCounts.filter(([element]) => !MINERAL_ELEMENTS.has(element)).slice(0, 8), [elementCounts]);
    const hasMineralAtoms = presentMineralElements.length > 0;
    const applyHighlightStyles = (viewer) => {
        if (hasMineralAtoms) {
            viewer.setStyle({}, DIM_STYLE);
            for (const element of MINERAL_ELEMENTS) {
                viewer.setStyle({ elem: element }, HIGHLIGHT_STYLE);
            }
        }
        else {
            viewer.setStyle({}, BASE_STYLE);
        }
        viewer.setColorByElement?.({}, { C: '#424242', ...MINERAL_COLOR_BY_ELEMENT });
    };
    const resetSelection = () => {
        setSelectedAtom(null);
        if (viewerRef.current) {
            const v = viewerRef.current;
            applyHighlightStyles(v);
        }
        viewerRef.current?.removeAllLabels();
        viewerRef.current?.render();
    };
    useEffect(() => {
        if (loading)
            return;
        if (!containerRef.current)
            return;
        if (!usingRealStructure)
            return;
        const viewer = $3Dmol.createViewer(containerRef.current, {
            backgroundColor: '#F9F8F6'
        });
        viewerRef.current = viewer;
        if (modelAtoms) {
            const model = viewer.addModel();
            model.addAtoms(modelAtoms);
        }
        else if (xyz) {
            viewer.addModel(xyz, 'xyz');
        }
        const v = viewer;
        applyHighlightStyles(v);
        viewer.setClickable({}, true, (atom) => {
            lastAtomClickRef.current = Date.now();
            const atomIndex = typeof atom?.serial === 'number' ? atom.serial : (atom?.index ?? '?');
            const targets = Array.isArray(atom?.bonds) ? atom.bonds.slice(0, 8).join(', ') : 'None';
            setSelectedAtom({
                index: atomIndex,
                element: atom?.elem ?? 'Unknown',
                bonds: Array.isArray(atom?.bonds) ? atom.bonds.length : 0,
                bondTargets: targets.length > 0 ? targets : 'None',
                x: atom.x,
                y: atom.y,
                z: atom.z
            });
            viewer.removeAllLabels();
            applyHighlightStyles(v);
            if (typeof atom?.serial === 'number') {
                viewer.setStyle({ serial: atom.serial }, { sphere: { scale: 0.55 }, stick: { radius: 0.14 } });
            }
            else if (typeof atom?.index === 'number') {
                viewer.setStyle({ index: atom.index }, { sphere: { scale: 0.55 }, stick: { radius: 0.14 } });
            }
            if (Array.isArray(atom?.bonds) && atom.bonds.length > 0) {
                viewer.setStyle({ index: atom.bonds }, { sphere: { scale: 0.3 }, stick: { radius: 0.1 } });
            }
            viewer.addLabel(`${atom?.elem ?? 'X'} (#${atomIndex})`, {
                position: { x: atom.x, y: atom.y, z: atom.z },
                backgroundColor: '#064e3b',
                fontColor: '#d1fae5',
                borderThickness: 0,
                inFront: true,
                showBackground: true
            });
            viewer.render();
        });
        viewer.zoomTo();
        viewer.render();
        const onResize = () => {
            viewer.resize();
        };
        window.addEventListener('resize', onResize);
        window.setTimeout(() => {
            viewer.resize();
        }, 0);
        return () => {
            window.removeEventListener('resize', onResize);
            viewer.clear();
            viewerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [xyz, loading, atomCount, modelAtoms, hasMineralAtoms]);
    const handleViewerClick = () => {
        if (!selectedAtom)
            return;
        if (Date.now() - lastAtomClickRef.current < 120)
            return;
        resetSelection();
    };
    const renderEmptyState = () => (_jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsxs("div", { className: "max-w-md rounded-[8px] border border-border bg-card p-6 text-center text-sm text-muted-foreground", children: [_jsx("h2", { className: "mb-2 text-base font-semibold text-foreground", children: "No enrichment layers" }), _jsx("p", { children: "This filter has no enrichment layers configured. Generate a filter with enrichment enabled to view it here." }), _jsx("button", { onClick: () => navigate(`/filters/${id ?? ''}`), className: "mt-4 rounded-[6px] border border-border px-3 py-1.5 text-xs hover:bg-secondary", children: "Back to Filter" })] }) }));
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsx("div", { className: "mb-5 flex flex-wrap items-start justify-between gap-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => id
                                ? navigate(`/filters/${id}`, {
                                    state: id === IMPORTED_FILTER_ROUTE_ID
                                        ? readImportedFilterSession(location) ?? undefined
                                        : undefined,
                                })
                                : navigate('/filters'), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Enrichment Visualization" }), _jsx("p", { className: "font-mono text-xs text-muted-foreground", children: loadedFromName ? `Imported JSON: ${loadedFromName}` : `Filter ${id ?? '-'}` })] })] }) }), error ? (_jsx("div", { className: "mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive", children: error })) : null, loading ? (_jsx("div", { className: "flex min-h-[240px] items-center justify-center rounded-[8px] border border-border bg-card", children: _jsx(Loader2, { size: 28, className: "animate-spin text-muted-foreground" }) })) : null, !loading && !enrichmentEnabled ? renderEmptyState() : null, !loading && enrichmentEnabled ? (_jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]", children: [_jsxs("section", { className: "flex min-h-0 flex-col gap-4 overflow-hidden", children: [_jsx("div", { className: "relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black", children: usingRealStructure ? (_jsx("div", { ref: containerRef, className: "absolute inset-0", onClick: handleViewerClick })) : (_jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-muted-foreground", children: "Backend atom coordinates unavailable for this filter." })) }), _jsxs("div", { className: "h-36 shrink-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Structure Description" }), selectedAtom ? (_jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Selected atom:", ' ', _jsx("span", { className: "font-medium text-foreground", children: selectedAtom.element }), " #", _jsx("span", { className: "font-mono text-foreground", children: selectedAtom.index })] }), _jsxs("p", { children: ["Connections:", ' ', _jsx("span", { className: "font-mono text-foreground", children: selectedAtom.bonds })] }), _jsxs("p", { children: ["Bonded atom indexes:", ' ', _jsx("span", { className: "font-mono text-foreground", children: selectedAtom.bondTargets })] }), _jsxs("p", { children: ["Position (A):", ' ', _jsxs("span", { className: "font-mono text-foreground", children: [selectedAtom.x.toFixed(3), ", ", selectedAtom.y.toFixed(3), ", ", selectedAtom.z.toFixed(3)] })] })] })) : (_jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsx("p", { children: hasMineralAtoms
                                                    ? 'Highlighted atoms are mineral release sites bound to the filter scaffold. Scaffold atoms are dimmed for contrast.'
                                                    : 'Filter scaffold structure shown. Mineral release sites are tracked in the simulation; the bound species are not present in the static atom list.' }), _jsxs("p", { children: ["Material: ", _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.materialType }), ' ', "| Pore Size:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a' })] }), _jsx("p", { children: "Click an atom to inspect it. Click empty space to return to this summary." })] }))] })] }), _jsxs("aside", { className: "min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Legend" }), _jsxs("div", { className: "space-y-2 text-sm", children: [presentMineralElements.map(([element]) => (_jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: MINERAL_COLOR_BY_ELEMENT[element] ?? '#888' } }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-foreground", children: element }), ' ', MINERAL_LABEL_BY_ELEMENT[element] ?? 'Mineral'] })] }, `legend-${element}`))), presentScaffoldElements.map(([element]) => (_jsxs("p", { className: "text-muted-foreground", children: [_jsx("span", { className: "font-medium text-foreground", children: element }), ' ', ELEMENT_LABELS[element] ?? 'Scaffold element'] }, `legend-${element}`)))] }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Enrichment Targets" }), _jsx("div", { className: "space-y-3 text-sm", children: vm.enrichmentMinerals.length === 0 ? (_jsx("p", { className: "text-muted-foreground", children: "No enrichment minerals reported." })) : (vm.enrichmentMinerals.map((view) => (_jsxs("div", { className: "rounded-[6px] border border-border/60 bg-background/40 p-2.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3 w-3 shrink-0 rounded-full", style: { backgroundColor: view.mineral.color } }), _jsx("span", { className: "font-medium text-foreground", children: view.mineral.label })] }), _jsxs("div", { className: "mt-1.5 space-y-1 text-muted-foreground", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Target band" }), _jsx("span", { className: "font-mono text-foreground", children: view.targetConcentration ?? view.mineral.target })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Release rate" }), _jsx("span", { className: "font-mono text-foreground", children: view.releaseRate != null ? `${view.releaseRate.toFixed(1)}%` : 'n/a' })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Layer thickness" }), _jsx("span", { className: "font-mono text-foreground", children: view.layerThickness != null ? `${view.layerThickness.toFixed(3)} nm` : 'n/a' })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Binding energy" }), _jsx("span", { className: "font-mono text-foreground", children: view.bindingEnergy != null ? `${view.bindingEnergy.toFixed(4)} eV` : 'n/a' })] })] })] }, view.mineral.key)))) }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Filter Scaffold" }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Material: ", _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.materialType })] }), _jsxs("p", { children: ["Pore Size:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a' })] }), _jsxs("p", { children: ["Layer Thickness:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.layerThickness != null ? `${vm.metrics.layerThickness.toFixed(3)} nm` : 'n/a' })] }), _jsxs("p", { children: ["Lattice Spacing:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.latticeSpacing != null ? `${vm.metrics.latticeSpacing.toFixed(3)} A` : 'n/a' })] }), _jsxs("p", { children: ["Atoms: ", _jsx("span", { className: "font-mono text-foreground", children: atomCount })] }), _jsxs("p", { children: ["Connections:", ' ', _jsx("span", { className: "font-mono text-foreground", children: hasExplicitConnections ? vm.atomConnections.length : 'inferred' })] })] }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Sample Conditions" }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Temperature:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.temperature != null ? `${vm.metrics.temperature.toFixed(2)} C` : 'n/a' })] }), _jsxs("p", { children: ["pH:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.ph != null ? vm.metrics.ph.toFixed(2) : 'n/a' })] })] })] })] })) : null] }));
}
