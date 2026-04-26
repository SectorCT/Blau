import { ENRICHMENT_MINERALS, findMineralByKey, findMineralByName } from '@renderer/data/enrichmentMinerals';
import { collectAtomPositions, collectConnections, getAggregateBindingEnergyEv, getAggregatePoreSizeNm, getAggregateRemovalEfficiencyPercent, getFilterLayers, getSummaryMetrics } from '@renderer/utils/normalizeFilterStructure';
import { buildExperimentParameterCharts } from '@renderer/utils/paramChartNormalization';
const safeNumber = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const safeString = (value, fallback = 'n/a') => typeof value === 'string' && value.trim().length > 0 ? value : fallback;
function normalizeLayerRows(layers) {
    return layers.map((row) => {
        const mode = typeof row.mode === 'string' && row.mode.toLowerCase() === 'enrichment' ? 'enrichment' : 'filtration';
        const merged = Array.isArray(row.mergedPollutants)
            ? row.mergedPollutants.filter((value) => typeof value === 'string' && value.length > 0)
            : [];
        const targetConcentration = typeof row.targetConcentration === 'string' && row.targetConcentration.trim().length > 0
            ? row.targetConcentration
            : null;
        return {
            pollutant: safeString(row.pollutant),
            pollutantSymbol: safeString(row.pollutantSymbol),
            removalEfficiency: safeNumber(row.removalEfficiency),
            bindingEnergy: safeNumber(row.bindingEnergy),
            poreSize: safeNumber(row.poreSize),
            layerThickness: safeNumber(row.layerThickness),
            materialType: safeString(row.materialType),
            method: safeString(row.method, ''),
            mode,
            releaseRate: safeNumber(row.releaseRate),
            targetConcentration,
            mergedPollutants: merged
        };
    });
}
function pickMethod(info, layerRows) {
    const top = info?.resultPayload?.method;
    if (typeof top === 'string' && top.trim().length > 0)
        return top;
    const counts = new Map();
    for (const row of layerRows) {
        if (!row.method)
            continue;
        counts.set(row.method, (counts.get(row.method) ?? 0) + 1);
    }
    if (counts.size === 0)
        return null;
    if (counts.size > 1)
        return 'mixed_empirical';
    return [...counts.keys()][0];
}
/**
 * Join enrichment layer rows + summary minerals to the catalog.
 * Layer rows carry releaseRate/targetConcentration; summary carries the user-selected mineral keys.
 * The summary is the source of truth for "which minerals" — layers may not 1:1 match if the runner
 * merged or split things. We iterate the summary first and look up the matching layer.
 */
function buildEnrichmentMinerals(enrichmentLayers, summary) {
    const layerByMineralKey = new Map();
    for (const layer of enrichmentLayers) {
        const candidate = findMineralByName(layer.pollutant) ??
            findMineralByName(layer.pollutantSymbol);
        if (candidate && !layerByMineralKey.has(candidate.key)) {
            layerByMineralKey.set(candidate.key, layer);
        }
    }
    const seen = new Set();
    const ordered = [];
    const sourceKeys = summary?.minerals && summary.minerals.length > 0
        ? summary.minerals
        : Array.from(layerByMineralKey.keys());
    for (const raw of sourceKeys) {
        const mineral = findMineralByKey(raw) ?? findMineralByName(raw);
        if (!mineral || seen.has(mineral.key))
            continue;
        seen.add(mineral.key);
        ordered.push(mineral);
    }
    // Defensive fallback: include any catalog mineral that has a layer match but missed from summary
    for (const mineral of ENRICHMENT_MINERALS) {
        if (seen.has(mineral.key))
            continue;
        if (layerByMineralKey.has(mineral.key)) {
            seen.add(mineral.key);
            ordered.push(mineral);
        }
    }
    return ordered.map((mineral) => {
        const layer = layerByMineralKey.get(mineral.key) ?? null;
        return {
            mineral,
            releaseRate: layer?.releaseRate ?? null,
            targetConcentration: layer?.targetConcentration ?? mineral.target,
            layerThickness: layer?.layerThickness ?? null,
            bindingEnergy: layer?.bindingEnergy ?? null
        };
    });
}
function pickEnrichmentSummary(info) {
    const summary = info?.resultPayload?.enrichmentSummary;
    if (!summary || typeof summary !== 'object')
        return null;
    const minerals = Array.isArray(summary.minerals)
        ? summary.minerals.filter((value) => typeof value === 'string' && value.length > 0)
        : [];
    return {
        enabled: typeof summary.enabled === 'boolean' ? summary.enabled : minerals.length > 0,
        mineralCount: typeof summary.mineralCount === 'number' ? summary.mineralCount : minerals.length,
        minerals
    };
}
/** When top-level geometry is absent, use the first per-pollutant row for membrane labels (consistent with plan). */
function firstLayerGeometry(rows) {
    const first = rows[0];
    if (!first) {
        return { poreSize: null, layerThickness: null, materialType: 'n/a' };
    }
    return {
        poreSize: first.poreSize,
        layerThickness: first.layerThickness,
        materialType: first.materialType
    };
}
function multiPollutantLabels(rows) {
    if (rows.length === 0)
        return { pollutant: 'n/a', pollutantSymbol: 'n/a' };
    if (rows.length === 1) {
        return {
            pollutant: rows[0].pollutant !== 'n/a' ? rows[0].pollutant : 'n/a',
            pollutantSymbol: rows[0].pollutantSymbol !== 'n/a' ? rows[0].pollutantSymbol : 'n/a'
        };
    }
    const symbols = rows
        .map((r) => r.pollutantSymbol)
        .filter((s) => s !== 'n/a');
    const unique = [...new Set(symbols)];
    if (unique.length > 0) {
        const symLabel = unique.slice(0, 3).join(', ') + (unique.length > 3 ? '…' : '');
        return {
            pollutant: `${rows[0].pollutant !== 'n/a' ? rows[0].pollutant : unique[0]} +${rows.length - 1} more`,
            pollutantSymbol: symLabel
        };
    }
    return { pollutant: `${rows.length} targets`, pollutantSymbol: `${rows.length} layers` };
}
export const buildFilterInfoViewModel = (info) => {
    const rawParams = info?.experimentPayload?.params ?? [];
    const params = rawParams
        .map((p) => {
        const value = safeNumber(p.value);
        if (value === null)
            return null;
        const code = safeString(p.name, 'UNKNOWN');
        return {
            code,
            name: code,
            value,
            unit: p.unit ?? ''
        };
    })
        .filter((p) => p !== null);
    const paramCharts = buildExperimentParameterCharts(params);
    const parameterBarData = paramCharts.bar;
    const parameterRadarData = paramCharts.radar;
    const parameterDonutData = paramCharts.donut;
    const fs = info?.filterStructure;
    const rawAtoms = collectAtomPositions(fs);
    const atomPositions = rawAtoms
        .map((a, index) => {
        const x = safeNumber(a?.x);
        const y = safeNumber(a?.y);
        const z = safeNumber(a?.z);
        if (x === null || y === null || z === null || typeof a?.element !== 'string')
            return null;
        return {
            id: String(a.id ?? index),
            x,
            y,
            z,
            element: a.element
        };
    })
        .filter((a) => a !== null);
    const atomIdSet = new Set(atomPositions.map((a) => a.id));
    const rawConnections = collectConnections(fs);
    const atomConnections = rawConnections
        .map((connection) => {
        const from = String(connection.from);
        const to = String(connection.to);
        if (!atomIdSet.has(from) || !atomIdSet.has(to) || from === to)
            return null;
        const order = safeNumber(connection.order) ?? 1;
        return { from, to, order: Math.max(1, Math.round(order)) };
    })
        .filter((c) => c !== null);
    const layerSource = getFilterLayers(info);
    const layerRows = normalizeLayerRows(layerSource);
    const firstGeom = firstLayerGeometry(layerRows);
    const summaryBlock = getSummaryMetrics(info);
    const summaryBinding = safeNumber(summaryBlock?.bindingEnergy);
    const summaryRemoval = safeNumber(summaryBlock?.removalEfficiency);
    const summaryMaterial = safeString(summaryBlock?.materialType, '');
    const topPore = safeNumber(fs?.poreSize);
    const topThick = safeNumber(fs?.layerThickness);
    const topLattice = safeNumber(fs?.latticeSpacing);
    const topMaterial = safeString(fs?.materialType, '');
    let materialType = topMaterial !== 'n/a' ? topMaterial : summaryMaterial !== 'n/a' ? summaryMaterial : firstGeom.materialType;
    let poreSize = getAggregatePoreSizeNm(info) ?? topPore ?? firstGeom.poreSize;
    let layerThickness = topThick ?? firstGeom.layerThickness;
    const latticeSpacing = topLattice;
    if (layerRows.length > 1 && topMaterial === 'n/a' && summaryMaterial === 'n/a') {
        const mats = new Set(layerRows.map((r) => r.materialType).filter((m) => m !== 'n/a'));
        if (mats.size > 1) {
            materialType = 'multi';
        }
    }
    const bindingEnergy = getAggregateBindingEnergyEv(info) ??
        safeNumber(info?.resultPayload?.bindingEnergy) ??
        summaryBinding ??
        null;
    const removalEfficiency = getAggregateRemovalEfficiencyPercent(info) ??
        safeNumber(info?.resultPayload?.removalEfficiency) ??
        summaryRemoval ??
        null;
    let pollutant = safeString(info?.resultPayload?.pollutant);
    let pollutantSymbol = safeString(info?.resultPayload?.pollutantSymbol);
    if (layerRows.length > 0 && (pollutant === 'n/a' || pollutantSymbol === 'n/a' || layerRows.length > 1)) {
        const labels = multiPollutantLabels(layerRows);
        if (pollutant === 'n/a' || layerRows.length > 1)
            pollutant = labels.pollutant;
        if (pollutantSymbol === 'n/a' || layerRows.length > 1)
            pollutantSymbol = labels.pollutantSymbol;
    }
    const method = pickMethod(info, layerRows);
    const enrichmentSummary = pickEnrichmentSummary(info);
    const enrichmentLayers = layerRows.filter((row) => row.mode === 'enrichment');
    const enrichmentMinerals = buildEnrichmentMinerals(enrichmentLayers, enrichmentSummary);
    return {
        params,
        layerRows,
        method,
        enrichmentSummary,
        enrichmentLayers,
        enrichmentMinerals,
        parameterBarData,
        parameterRadarData,
        parameterDonutData,
        atomPositions,
        atomConnections,
        metrics: {
            materialType,
            poreSize,
            layerThickness,
            latticeSpacing,
            bindingEnergy,
            removalEfficiency,
            pollutant,
            pollutantSymbol,
            parameterCount: safeNumber(summaryBlock?.parameter_count) ?? (params.length > 0 ? params.length : 0),
            temperature: safeNumber(info?.experimentPayload?.temperature),
            ph: safeNumber(info?.experimentPayload?.ph)
        }
    };
};
export const atomPositionsToXyz = (atoms) => {
    const lines = atoms.map((atom) => `${atom.element} ${atom.x} ${atom.y} ${atom.z}`);
    return `${atoms.length}\nGenerated from filterInfo.atomPositions\n${lines.join('\n')}`;
};
