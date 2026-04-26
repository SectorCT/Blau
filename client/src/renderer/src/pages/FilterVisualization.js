import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as $3Dmol from '3dmol';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { getFilterDetails } from '@renderer/utils/api/endpoints';
import { atomPositionsToXyz, buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel';
import { IMPORTED_FILTER_ROUTE_ID, normalizeImportedFilterInfo, readImportedFilterSession, writeImportedFilterSession, } from '@renderer/utils/importedFilterPayload';
const BASE_ELEMENTS = ['C', 'N', 'O', 'S', 'H'];
const BASE_STYLE = { stick: { radius: 0.06 }, sphere: { scale: 0.15 } };
const ELEMENT_LABELS = {
    C: 'Carbon (black)',
    O: 'Oxygen (red)',
    N: 'Nitrogen (blue)',
    S: 'Sulfur (yellow)',
    H: 'Hydrogen (white)'
};
function randomFrom(values) {
    return values[Math.floor(Math.random() * values.length)];
}
function buildRandomMoleculeXYZ(seed) {
    const atomCount = 240 + Math.floor((seed % 40) + Math.random() * 80);
    const atoms = [];
    for (let i = 0; i < atomCount; i++) {
        const chain = Math.floor(i / 22);
        const angle = i * 0.42 + Math.random() * 0.35;
        const radius = 2.4 + chain * 0.34 + Math.random() * 0.2;
        const x = Number((Math.cos(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4));
        const y = Number((Math.sin(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4));
        const z = Number(((i % 22) * 0.33 - 3.6 + (Math.random() - 0.5) * 0.6).toFixed(4));
        const element = i % 6 === 0 ? randomFrom(BASE_ELEMENTS) : 'C';
        atoms.push(`${element} ${x} ${y} ${z}`);
    }
    return `${atomCount}
Stress test random structure
${atoms.join('\n')}`;
}
function downsampleXyz(xyz, maxAtoms) {
    const lines = xyz.split('\n');
    const declaredCount = Number(lines[0] ?? 0);
    if (!Number.isFinite(declaredCount) || declaredCount <= 0)
        return xyz;
    if (declaredCount <= maxAtoms)
        return xyz;
    const headerLine = lines[1] ?? 'Generated structure';
    const atomLines = lines.slice(2);
    const step = Math.ceil(declaredCount / maxAtoms);
    const sampled = [];
    for (let i = 0; i < atomLines.length; i += step) {
        sampled.push(atomLines[i]);
    }
    return `${sampled.length}\n${headerLine} (downsampled)\n${sampled.join('\n')}`;
}
export function FilterVisualization() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const lastAtomClickRef = useRef(0);
    const [seed] = useState(() => Date.now());
    const [selectedAtom, setSelectedAtom] = useState(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [filterInfo, setFilterInfo] = useState(null);
    const [error, setError] = useState(null);
    const [loadedFromName, setLoadedFromName] = useState(null);
    const [zoomTransition, setZoomTransition] = useState(0);
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
        const legacyJson = state.importedFilterJson ?? state.uploadedFilterJson;
        const fileName = state.importedFileName ?? state.uploadedFileName;
        if (legacyJson !== undefined) {
            const next = { importedFilterJson: legacyJson, importedFileName: fileName };
            writeImportedFilterSession(next);
            navigate(`/filters/${IMPORTED_FILTER_ROUTE_ID}/visualize`, { replace: true, state: next });
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
    const filterStructure = filterInfo?.filterStructure;
    const experimentPayload = filterInfo?.experimentPayload;
    const resultPayload = filterInfo?.resultPayload;
    const usingRealStructure = vm.atomPositions.length > 0;
    const hasExplicitConnections = vm.atomConnections.length > 0;
    const rawXyz = useMemo(() => (usingRealStructure ? atomPositionsToXyz(vm.atomPositions) : buildRandomMoleculeXYZ(seed)), [seed, usingRealStructure, vm.atomPositions]);
    const rawAtomCount = useMemo(() => Number(rawXyz.split('\n')[0] ?? 0), [rawXyz]);
    const xyz = useMemo(() => (hasExplicitConnections ? rawXyz : downsampleXyz(rawXyz, 500)), [rawXyz, hasExplicitConnections]);
    useEffect(() => {
        setZoomTransition(0);
    }, [xyz]);
    const atomCount = useMemo(() => Number(xyz.split('\n')[0] ?? 0), [xyz]);
    const isDownsampled = rawAtomCount > atomCount;
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
        const source = vm.atomPositions;
        const counts = new Map();
        for (const atom of source) {
            const key = atom.element || 'Unknown';
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
    }, [vm.atomPositions]);
    const resetSelection = () => {
        setSelectedAtom(null);
        if (viewerRef.current) {
            viewerRef.current.setStyle({}, BASE_STYLE);
            viewerRef.current
                .setColorByElement?.({}, { C: '#424242' });
        }
        viewerRef.current?.removeAllLabels();
        viewerRef.current?.render();
    };
    useEffect(() => {
        if (loading)
            return;
        if (!containerRef.current)
            return;
        const viewer = $3Dmol.createViewer(containerRef.current, {
            backgroundColor: "#F9F8F6"
        });
        viewerRef.current = viewer;
        if (modelAtoms) {
            const model = viewer.addModel();
            model.addAtoms(modelAtoms);
        }
        else {
            viewer.addModel(xyz, 'xyz');
        }
        viewer.setStyle({}, BASE_STYLE);
        viewer
            .setColorByElement?.({}, { C: '#424242' });
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
            viewer.setStyle({}, BASE_STYLE);
            viewer
                .setColorByElement?.({}, { C: '#424242' });
            if (typeof atom?.serial === 'number') {
                viewer.setStyle({ serial: atom.serial }, {
                    sphere: { scale: 0.34 },
                    stick: { radius: 0.12 }
                });
            }
            else if (typeof atom?.index === 'number') {
                viewer.setStyle({ index: atom.index }, {
                    sphere: { scale: 0.34 },
                    stick: { radius: 0.12 }
                });
            }
            if (Array.isArray(atom?.bonds) && atom.bonds.length > 0) {
                viewer.setStyle({ index: atom.bonds }, {
                    sphere: { scale: 0.21 },
                    stick: { radius: 0.09 }
                });
            }
            viewer.addLabel(`${atom?.elem ?? 'X'} (#${atomIndex})`, {
                position: { x: atom.x, y: atom.y, z: atom.z },
                backgroundColor: '#111827',
                fontColor: '#e5e7eb',
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
    }, [xyz, loading, atomCount, modelAtoms]);
    const handleViewerClick = () => {
        if (!selectedAtom)
            return;
        if (Date.now() - lastAtomClickRef.current < 120)
            return;
        resetSelection();
    };
    useEffect(() => {
        const container = containerRef.current;
        if (!container || loading)
            return;
        const onWheel = (event) => {
            const direction = Math.sign(event.deltaY);
            if (direction === 0)
                return;
            // Positive deltaY = zoom out (pull back) in 3Dmol; negative = zoom in.
            // Scope / cylinder view should strengthen on zoom out, fade on zoom in.
            setZoomTransition((prev) => Math.min(1, Math.max(0, prev + direction * 0.07)));
        };
        container.addEventListener('wheel', onWheel, { passive: true });
        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, [loading]);
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsx("div", { className: "mb-5 flex flex-wrap items-start justify-between gap-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => id
                                ? navigate(`/filters/${id}`, {
                                    state: id === IMPORTED_FILTER_ROUTE_ID
                                        ? readImportedFilterSession(location) ?? undefined
                                        : undefined,
                                })
                                : navigate('/filters'), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Filter Visualization" }), _jsx("p", { className: "font-mono text-xs text-muted-foreground", children: loadedFromName ? `Imported JSON: ${loadedFromName}` : `Filter ${id ?? '-'}` })] })] }) }), error ? (_jsx("div", { className: "mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive", children: error })) : null, loading ? (_jsx("div", { className: "flex min-h-[240px] items-center justify-center rounded-[8px] border border-border bg-card", children: _jsx(Loader2, { size: 28, className: "animate-spin text-muted-foreground" }) })) : null, !loading ? (_jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]", children: [_jsxs("section", { className: "flex min-h-0 flex-col gap-4 overflow-hidden", children: [_jsxs("div", { className: "relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black", children: [_jsx("div", { ref: containerRef, className: "absolute inset-0 transition-opacity duration-500", style: { opacity: Math.max(0.2, 1 - zoomTransition * 0.78) }, onClick: handleViewerClick }), _jsxs("div", { className: "pointer-events-none absolute inset-0 transition-opacity duration-500", style: { opacity: zoomTransition }, children: [_jsx("div", { className: "absolute inset-0", style: {
                                                    background: 'radial-gradient(ellipse 85% 55% at 50% 48%, rgba(120,200,255,0.12), rgba(6,14,24,0.95) 55%, rgba(2,6,12,1))'
                                                } }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center p-6", children: _jsxs("svg", { className: "h-full max-h-[min(420px,55vh)] w-full max-w-[min(720px,92%)]", viewBox: "0 0 720 280", preserveAspectRatio: "xMidYMid meet", "aria-hidden": true, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "fv-cyl-body", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "#5a7a8e", stopOpacity: "0.95" }), _jsx("stop", { offset: "45%", stopColor: "#2d4150", stopOpacity: "1" }), _jsx("stop", { offset: "100%", stopColor: "#1a2833", stopOpacity: "1" })] }), _jsxs("linearGradient", { id: "fv-cyl-body-enrich", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "#2a5a4a", stopOpacity: "0.95" }), _jsx("stop", { offset: "45%", stopColor: "#1a3d30", stopOpacity: "1" }), _jsx("stop", { offset: "100%", stopColor: "#0f2820", stopOpacity: "1" })] }), _jsxs("linearGradient", { id: "fv-cyl-cap", x1: "0%", y1: "50%", x2: "100%", y2: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#7a9eb5", stopOpacity: "0.5" }), _jsx("stop", { offset: "100%", stopColor: "#3d5566", stopOpacity: "0.9" })] }), _jsxs("linearGradient", { id: "fv-water-in", x1: "0%", y1: "50%", x2: "100%", y2: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#38bdf8", stopOpacity: "0.15" }), _jsx("stop", { offset: "100%", stopColor: "#7dd3fc", stopOpacity: "0.55" })] }), _jsxs("linearGradient", { id: "fv-water-mid", x1: "0%", y1: "50%", x2: "100%", y2: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#7dd3fc", stopOpacity: "0.35" }), _jsx("stop", { offset: "100%", stopColor: "#6ee7b7", stopOpacity: "0.45" })] }), _jsxs("linearGradient", { id: "fv-water-out", x1: "0%", y1: "50%", x2: "100%", y2: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#6ee7b7", stopOpacity: "0.2" }), _jsx("stop", { offset: "100%", stopColor: "#a5f3fc", stopOpacity: "0.65" })] }), _jsxs("filter", { id: "fv-glow", x: "-20%", y: "-20%", width: "140%", height: "140%", children: [_jsx("feGaussianBlur", { stdDeviation: "2.2", result: "b" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "b" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("ellipse", { cx: "108", cy: "140", rx: "22", ry: "78", fill: "url(#fv-cyl-cap)", stroke: "#94a3b8", strokeOpacity: "0.35", strokeWidth: "1" }), _jsx("rect", { x: "108", y: "62", width: "504", height: "156", fill: "url(#fv-cyl-body)" }), _jsx("path", { d: "M108 62 Q360 42 612 62 L612 218 Q360 238 108 218 Z", fill: "url(#fv-cyl-body)", opacity: "0.92" }), vm.enrichmentSummary?.enabled && (_jsxs(_Fragment, { children: [_jsx("rect", { x: "440", y: "62", width: "172", height: "156", fill: "url(#fv-cyl-body-enrich)", opacity: "0.88" }), _jsx("path", { d: "M440 62 Q530 48 612 62 L612 218 Q530 232 440 218 Z", fill: "url(#fv-cyl-body-enrich)", opacity: "0.85" })] })), _jsx("ellipse", { cx: "612", cy: "140", rx: "22", ry: "78", fill: "url(#fv-cyl-cap)", stroke: "#94a3b8", strokeOpacity: "0.35", strokeWidth: "1" }), _jsx("rect", { x: "264", y: "58", width: "4", height: "164", fill: "#e2e8f0", opacity: "0.85", filter: "url(#fv-glow)" }), _jsx("rect", { x: "262", y: "56", width: "8", height: "168", fill: "none", stroke: "#f8fafc", strokeOpacity: "0.25", strokeWidth: "0.75", rx: "1" }), vm.enrichmentSummary?.enabled && (_jsx("line", { x1: "438", y1: "62", x2: "438", y2: "218", stroke: "#6ee7b7", strokeOpacity: "0.5", strokeWidth: "1.5", strokeDasharray: "6 7" })), _jsx("path", { d: "M 40 155 C 100 155, 140 135, 180 132 C 230 128, 255 138, 262 138", fill: "none", stroke: "url(#fv-water-in)", strokeWidth: "13", strokeLinecap: "round", opacity: "0.75" }), _jsx("path", { d: "M 40 155 C 100 155, 140 135, 180 132 C 230 128, 255 138, 262 138", fill: "none", stroke: "#7dd3fc", strokeWidth: "2", strokeLinecap: "round", strokeDasharray: "10 18", opacity: "0.9", children: _jsx("animate", { attributeName: "stroke-dashoffset", from: "0", to: "-260", dur: "2.2s", repeatCount: "indefinite" }) }), _jsx("path", { d: vm.enrichmentSummary?.enabled
                                                                ? "M 268 138 C 330 138, 390 128, 436 130"
                                                                : "M 268 138 C 360 138, 480 125, 560 128 C 600 130, 650 148, 688 152", fill: "none", stroke: "url(#fv-water-mid)", strokeWidth: "11", strokeLinecap: "round", opacity: "0.7" }), _jsx("path", { d: vm.enrichmentSummary?.enabled
                                                                ? "M 268 138 C 330 138, 390 128, 436 130"
                                                                : "M 268 138 C 360 138, 480 125, 560 128 C 600 130, 650 148, 688 152", fill: "none", stroke: "#a5f3fc", strokeWidth: "1.8", strokeLinecap: "round", strokeDasharray: "8 16", opacity: "0.85", children: _jsx("animate", { attributeName: "stroke-dashoffset", from: "0", to: "-220", dur: "2.0s", repeatCount: "indefinite" }) }), vm.enrichmentSummary?.enabled && (_jsxs(_Fragment, { children: [_jsx("path", { d: "M 440 130 C 490 128, 540 135, 580 138 C 620 142, 660 150, 688 152", fill: "none", stroke: "url(#fv-water-out)", strokeWidth: "12", strokeLinecap: "round", opacity: "0.72" }), _jsx("path", { d: "M 440 130 C 490 128, 540 135, 580 138 C 620 142, 660 150, 688 152", fill: "none", stroke: "#6ee7b7", strokeWidth: "2", strokeLinecap: "round", strokeDasharray: "8 14", opacity: "0.9", children: _jsx("animate", { attributeName: "stroke-dashoffset", from: "0", to: "-200", dur: "1.8s", repeatCount: "indefinite" }) })] })), _jsx("text", { x: "160", y: "54", textAnchor: "middle", fontSize: "10", fill: "#94a3b8", fillOpacity: "0.7", fontFamily: "ui-monospace, monospace", children: "FEED WATER" }), _jsx("text", { x: "350", y: "54", textAnchor: "middle", fontSize: "10", fill: "#7dd3fc", fillOpacity: "0.75", fontFamily: "ui-monospace, monospace", children: "FILTRATION" }), vm.enrichmentSummary?.enabled && (_jsx("text", { x: "526", y: "54", textAnchor: "middle", fontSize: "10", fill: "#6ee7b7", fillOpacity: "0.8", fontFamily: "ui-monospace, monospace", children: "ENRICHMENT" })), _jsx("ellipse", { cx: "360", cy: "72", rx: "200", ry: "14", fill: "none", stroke: "#64748b", strokeOpacity: "0.25", strokeWidth: "1" }), _jsx("ellipse", { cx: "360", cy: "208", rx: "200", ry: "14", fill: "none", stroke: "#0f172a", strokeOpacity: "0.5", strokeWidth: "1" })] }) }), _jsx("div", { className: "absolute bottom-3 left-3 rounded bg-black/45 px-2 py-1 text-[11px] text-slate-200", children: vm.enrichmentSummary?.enabled
                                                    ? 'Scope: feed water → filtration membrane → enrichment zone → enriched output'
                                                    : 'Scope: feed water (left) — filtration membrane — permeate (right)' })] })] }), _jsxs("div", { className: "h-36 shrink-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-2 text-sm font-semibold", children: "Structure Description" }), selectedAtom ? (_jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Selected atom: ", _jsx("span", { className: "font-medium text-foreground", children: selectedAtom.element }), " #", _jsx("span", { className: "font-mono text-foreground", children: selectedAtom.index })] }), _jsxs("p", { children: ["Connections: ", _jsx("span", { className: "font-mono text-foreground", children: selectedAtom.bonds })] }), _jsxs("p", { children: ["Bonded atom indexes: ", _jsx("span", { className: "font-mono text-foreground", children: selectedAtom.bondTargets })] }), _jsxs("p", { children: ["Position (A):", ' ', _jsxs("span", { className: "font-mono text-foreground", children: [selectedAtom.x.toFixed(3), ", ", selectedAtom.y.toFixed(3), ", ", selectedAtom.z.toFixed(3)] })] })] })) : (_jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsx("p", { children: usingRealStructure
                                                    ? hasExplicitConnections
                                                        ? 'Structure loaded from backend atom coordinates with explicit connection graph.'
                                                        : 'Structure loaded from backend atom coordinates with inferred connectivity.'
                                                    : 'Backend atom coordinates unavailable, so a generated fallback topology is shown.' }), _jsxs("p", { children: ["Material:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.materialType }), " | Pore Size:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a' }), ' ', "| Removal:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.removalEfficiency != null ? `${vm.metrics.removalEfficiency.toFixed(2)}%` : 'n/a' })] }), _jsx("p", { children: "Click an atom to inspect it. Click empty space to return to this summary." })] }))] })] }), _jsxs("aside", { className: "min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Legend" }), _jsx("div", { className: "space-y-2 text-sm", children: elementCounts.length > 0 ? (elementCounts.map(([element]) => (_jsxs("p", { className: "text-muted-foreground", children: [_jsx("span", { className: "font-medium text-foreground", children: element }), ' ', ELEMENT_LABELS[element] ?? 'Element'] }, `legend-${element}`)))) : (_jsx("p", { className: "text-muted-foreground", children: "No elements available." })) }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Graph Info" }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Atoms: ", _jsx("span", { className: "font-mono text-foreground", children: atomCount }), isDownsampled ? (_jsxs("span", { className: "ml-2 font-mono text-[11px] text-muted-foreground", children: ["(from ", rawAtomCount, ", perf mode)"] })) : null] }), _jsxs("p", { children: ["Connections:", ' ', _jsx("span", { className: "font-mono text-foreground", children: hasExplicitConnections ? vm.atomConnections.length : 'inferred' })] }), _jsxs("p", { children: ["Structure:", ' ', _jsx("span", { className: "text-foreground", children: usingRealStructure ? 'Atom coordinates from API payload' : 'Randomized test topology' })] }), _jsxs("p", { children: ["Purpose:", ' ', _jsx("span", { className: "text-foreground", children: usingRealStructure ? 'Real backend filter structure' : 'Renderer stress/perf fallback' })] })] }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Filter Metrics" }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Material: ", _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.materialType })] }), _jsxs("p", { children: ["Pore Size:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a' })] }), _jsxs("p", { children: ["Layer Thickness:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.layerThickness != null ? `${vm.metrics.layerThickness.toFixed(3)} nm` : 'n/a' })] }), _jsxs("p", { children: ["Lattice Spacing:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.latticeSpacing != null ? `${vm.metrics.latticeSpacing.toFixed(3)} A` : 'n/a' })] }), _jsxs("p", { children: ["Binding Energy:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.bindingEnergy != null ? `${vm.metrics.bindingEnergy.toFixed(4)} eV` : 'n/a' })] }), _jsxs("p", { children: ["Removal Efficiency:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.removalEfficiency != null ? `${vm.metrics.removalEfficiency.toFixed(2)}%` : 'n/a' })] }), _jsxs("p", { children: ["Pollutant: ", _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.pollutant })] })] }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Sample Conditions" }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["Temperature:", ' ', _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.temperature != null ? `${vm.metrics.temperature.toFixed(2)} C` : 'n/a' })] }), _jsxs("p", { children: ["pH: ", _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.ph != null ? vm.metrics.ph.toFixed(2) : 'n/a' })] }), _jsxs("p", { children: ["Parameters: ", _jsx("span", { className: "font-mono text-foreground", children: vm.metrics.parameterCount })] })] }), _jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Element Composition" }), _jsx("div", { className: "space-y-1 text-sm text-muted-foreground", children: elementCounts.length > 0 ? (elementCounts.map(([element, count]) => (_jsxs("p", { children: [element, ": ", _jsx("span", { className: "font-mono text-foreground", children: count })] }, element)))) : (_jsx("p", { children: "No atomic composition available." })) }), vm.enrichmentMinerals.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold text-emerald-400", children: "Enrichment Layers" }), _jsx("div", { className: "space-y-2 text-sm", children: vm.enrichmentMinerals.map((em) => (_jsxs("div", { className: "rounded-[6px] border border-border p-2", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 shrink-0 rounded-full", style: { backgroundColor: em.mineral.color } }), _jsxs("span", { className: "font-medium text-foreground", children: [em.mineral.symbol, " \u2014 ", em.mineral.label] })] }), _jsxs("div", { className: "space-y-0.5 pl-4 text-xs text-muted-foreground", children: [_jsxs("p", { children: ["Target: ", _jsx("span", { className: "font-mono text-foreground", children: em.targetConcentration ?? em.mineral.target })] }), em.releaseRate != null && (_jsxs("p", { children: ["Release rate: ", _jsxs("span", { className: "font-mono text-foreground", children: [em.releaseRate.toFixed(1), "%"] })] })), em.layerThickness != null && (_jsxs("p", { children: ["Layer: ", _jsxs("span", { className: "font-mono text-foreground", children: [em.layerThickness.toFixed(3), " nm"] })] }))] })] }, em.mineral.key))) })] })), (filterStructure || experimentPayload || resultPayload) ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "my-4 border-t border-border" }), _jsx("h3", { className: "mb-2 text-sm font-semibold", children: "Payload Availability" }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["filterStructure:", ' ', _jsx("span", { className: "font-mono text-foreground", children: filterStructure ? 'present' : 'missing' })] }), _jsxs("p", { children: ["experimentPayload:", ' ', _jsx("span", { className: "font-mono text-foreground", children: experimentPayload ? 'present' : 'missing' })] }), _jsxs("p", { children: ["resultPayload: ", _jsx("span", { className: "font-mono text-foreground", children: resultPayload ? 'present' : 'missing' })] })] })] })) : null] })] })) : null] }));
}
