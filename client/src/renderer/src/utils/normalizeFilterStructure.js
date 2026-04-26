/** Graph-only slices are skipped; rows with pollutant metadata are kept. */
export function filterToPollutantLayerRows(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter(isPollutantLayerRowLike);
}
function isPollutantLayerRowLike(entry) {
    if (entry === null || typeof entry !== 'object')
        return false;
    const o = entry;
    return typeof o.pollutant === 'string' || typeof o.pollutantSymbol === 'string';
}
/** Prefer `filterInfo.summaryMetrics`; accept the same object nested under `filterStructure` (new API bundles). */
export function getSummaryMetrics(info) {
    if (!info)
        return undefined;
    const top = info.summaryMetrics;
    if (top && typeof top === 'object' && Object.keys(top).length > 0)
        return top;
    const nested = info.filterStructure?.summaryMetrics;
    if (nested && typeof nested === 'object' && Object.keys(nested).length > 0)
        return nested;
    return undefined;
}
/** Prefer top-level connections; otherwise concatenate nested `filterStructure.layers[].connections`. */
export function collectConnections(fs) {
    const direct = fs?.connections;
    if (Array.isArray(direct) && direct.length > 0)
        return direct;
    const layers = fs?.layers;
    if (!Array.isArray(layers))
        return [];
    const out = [];
    for (const layer of layers) {
        if (layer && Array.isArray(layer.connections)) {
            out.push(...layer.connections);
        }
    }
    return out;
}
/** Prefer top-level atomPositions; otherwise concatenate nested layers (re-index atom ids). */
export function collectAtomPositions(fs) {
    const direct = fs?.atomPositions;
    if (Array.isArray(direct) && direct.length > 0) {
        return direct.filter((a) => typeof a?.element === 'string' &&
            typeof a.x === 'number' &&
            typeof a.y === 'number' &&
            typeof a.z === 'number');
    }
    const layers = fs?.layers;
    if (!Array.isArray(layers))
        return [];
    const out = [];
    let idx = 0;
    for (const layer of layers) {
        const atoms = layer?.atomPositions;
        if (!Array.isArray(atoms))
            continue;
        for (const a of atoms) {
            if (typeof a?.element !== 'string' ||
                typeof a.x !== 'number' ||
                typeof a.y !== 'number' ||
                typeof a.z !== 'number') {
                continue;
            }
            out.push({ id: idx, x: a.x, y: a.y, z: a.z, element: a.element });
            idx += 1;
        }
    }
    return out;
}
/**
 * Per-pollutant rows: `filterInfo.layers`, or entries inside `filterStructure.layers` that carry
 * `pollutant` / `pollutantSymbol` (graph-only slices with `connections` are ignored here).
 */
export function getFilterLayers(info) {
    if (!info)
        return [];
    if (Array.isArray(info.layers) && info.layers.length > 0)
        return info.layers;
    const structLayers = info.filterStructure?.layers;
    if (!Array.isArray(structLayers))
        return [];
    return structLayers.filter(isPollutantLayerRowLike);
}
function averageLayerNumericField(info, key) {
    const layers = getFilterLayers(info).filter(
        (row) => typeof row.mode !== 'string' || row.mode.toLowerCase() !== 'enrichment'
    );
    const values = [];
    for (const row of layers) {
        const v = row[key];
        if (typeof v === 'number' && Number.isFinite(v))
            values.push(v);
    }
    if (values.length === 0)
        return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
export function getAggregateRemovalEfficiencyPercent(info) {
    return averageLayerNumericField(info, 'removalEfficiency');
}
export function getAggregatePoreSizeNm(info) {
    return averageLayerNumericField(info, 'poreSize');
}
export function getAggregateBindingEnergyEv(info) {
    return averageLayerNumericField(info, 'bindingEnergy');
}
