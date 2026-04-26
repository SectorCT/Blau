import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Shuffle } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import * as $3Dmol from '3dmol';
const BASE_ELEMENTS = ['C', 'N', 'O', 'S'];
function randomFrom(values) {
    return values[Math.floor(Math.random() * values.length)];
}
function buildRandomMoleculeXYZ(seed) {
    const atomCount = 120 + Math.floor((seed % 20) + Math.random() * 40);
    const atoms = [];
    for (let i = 0; i < atomCount; i++) {
        const layer = Math.floor(i / 18);
        const angle = i * 0.48 + Math.random() * 0.35;
        const radius = 2.2 + layer * 0.42 + Math.random() * 0.25;
        const x = Number((Math.cos(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4));
        const y = Number((Math.sin(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4));
        const z = Number(((i % 18) * 0.42 - 3.8 + (Math.random() - 0.5) * 0.5).toFixed(4));
        const element = i % 3 === 0 ? randomFrom(BASE_ELEMENTS) : 'C';
        atoms.push(`${element} ${x} ${y} ${z}`);
    }
    return `${atomCount}
Random test molecule
${atoms.join('\n')}`;
}
export function MoleculeViewerModal({ open, onClose }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [seed, setSeed] = useState(() => Date.now());
    const [selectedAtomInfo, setSelectedAtomInfo] = useState('Click an atom to inspect.');
    const xyz = useMemo(() => buildRandomMoleculeXYZ(seed), [seed]);
    useEffect(() => {
        if (!open)
            return;
        if (!containerRef.current)
            return;
        const viewer = $3Dmol.createViewer(containerRef.current, {
            backgroundColor: '#0b0f17'
        });
        viewerRef.current = viewer;
        const model = viewer.addModel(xyz, 'xyz');
        viewer.setStyle({}, { stick: { radius: 0.2 }, sphere: { scale: 0.35 } });
        viewer.setClickable({}, true, (atom) => {
            const bonded = Array.isArray(atom?.bonds) ? atom.bonds.length : 0;
            const index = typeof atom?.serial === 'number' ? atom.serial : atom?.index;
            setSelectedAtomInfo(`Atom ${index ?? '?'}: ${atom?.elem ?? 'Unknown'} | Bonds: ${bonded}`);
            viewer.removeAllLabels();
            viewer.addLabel(`${atom?.elem ?? 'X'} (#${index ?? '?'})`, {
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
        viewer.zoom(1.1, 250);
        viewer.render();
        model.setFrame?.(0);
        const onResize = () => {
            viewer.resize();
        };
        window.addEventListener('resize', onResize);
        // 3Dmol canvas uses absolute positioning; this ensures correct fit after mount.
        window.setTimeout(() => {
            viewer.resize();
        }, 0);
        return () => {
            window.removeEventListener('resize', onResize);
            viewer.clear();
            viewerRef.current = null;
            setSelectedAtomInfo('Click an atom to inspect.');
        };
    }, [open, xyz]);
    useEffect(() => {
        if (!open)
            return;
        const onEsc = (event) => {
            if (event.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6", children: _jsxs("div", { className: "h-[75vh] w-[75vw] rounded-[8px] border border-border bg-card shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold", children: "3D Molecule Viewer (Test)" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Random stress-test structure rendered with 3Dmol.js" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => setSeed(Date.now()), children: [_jsx(Shuffle, { size: 14, strokeWidth: 1.5 }), "Randomize"] }), _jsx(Button, { variant: "outline", size: "icon", onClick: onClose, "aria-label": "Close modal", children: _jsx(X, { size: 14, strokeWidth: 1.5 }) })] })] }), _jsxs("div", { className: "flex h-[calc(75vh-58px)] w-full flex-col gap-2 p-2", children: [_jsx("div", { className: "rounded-[6px] border border-border bg-muted px-3 py-2 text-xs text-muted-foreground", children: selectedAtomInfo }), _jsx("div", { ref: containerRef, className: "relative h-full w-full overflow-hidden rounded-[6px] border border-border" })] })] }) }));
}
