/// <reference lib="webworker" />
const normalizePollutantsToParameters = (pollutants) => {
    if (!Array.isArray(pollutants))
        return [];
    return pollutants
        .map((pollutant) => {
        const p = (pollutant ?? {});
        if (typeof p.parameterCode !== 'string')
            return null;
        if (typeof p.value !== 'number' || !Number.isFinite(p.value))
            return null;
        return {
            parameterCode: p.parameterCode,
            parameterName: typeof p.parameterName === 'string' && p.parameterName.trim().length > 0
                ? p.parameterName
                : undefined,
            unit: typeof p.unit === 'string' && p.unit.trim().length > 0
                ? p.unit
                : undefined,
            value: p.value
        };
    })
        .filter((x) => x !== null);
};
const normalizeStationRows = (_locationId, payload) => {
    // Legacy shape: { rows: GemstatLocationRow[] }
    if (Array.isArray(payload.rows)) {
        // Worker side is defensive: map the minimal fields we rely on in UI.
        return payload.rows.map((row, index) => {
            const r = (row ?? {});
            const dateKey = typeof r.dateKey === 'string' ? r.dateKey : '-';
            const sampleTime = typeof r.sampleTime === 'string' ? r.sampleTime : '00:00:00';
            const depth = typeof r.depth === 'number' && Number.isFinite(r.depth) ? r.depth : null;
            const temperature = typeof r.temperature === 'number' && Number.isFinite(r.temperature) ? r.temperature : null;
            const ph = typeof r.ph === 'number' && Number.isFinite(r.ph) ? r.ph : null;
            const parameters = Array.isArray(r.parameters) ? r.parameters : [];
            return {
                dateKey,
                snapshotIndex: typeof r.snapshotIndex === 'number' ? r.snapshotIndex : index,
                label: `${dateKey} ${sampleTime}`,
                sampleTime,
                depth,
                volume: null,
                temperature,
                ph,
                parameterCount: typeof r.parameterCount === 'number' && Number.isFinite(r.parameterCount) ? r.parameterCount : parameters.length,
                summary: typeof r.summary === 'string' ? r.summary : null,
                parameters
            };
        });
    }
    // Current shape: { measurements: [{ sampleDate, sampleTime, depth, temperature, ph, pollutants: [] }] }
    const measurements = Array.isArray(payload.measurements) ? payload.measurements : [];
    return measurements
        .map((entry, index) => {
        const record = (entry ?? {});
        const sampleDate = typeof record.sampleDate === 'string' && record.sampleDate.trim().length > 0
            ? record.sampleDate
            : null;
        if (!sampleDate)
            return null;
        const sampleTimeRaw = typeof record.sampleTime === 'string' && record.sampleTime.trim().length > 0
            ? record.sampleTime
            : '00:00:00';
        const sampleTime = sampleTimeRaw.length >= 5 ? sampleTimeRaw.slice(0, 5) : sampleTimeRaw;
        const depth = typeof record.depth === 'number' && Number.isFinite(record.depth) ? record.depth : null;
        const temperature = typeof record.temperature === 'number' && Number.isFinite(record.temperature) ? record.temperature : null;
        const ph = typeof record.ph === 'number' && Number.isFinite(record.ph) ? record.ph : null;
        const parameters = normalizePollutantsToParameters(record.pollutants);
        const parameterCount = typeof record.parameterCount === 'number' && Number.isFinite(record.parameterCount)
            ? record.parameterCount
            : parameters.length;
        return {
            dateKey: sampleDate,
            snapshotIndex: index,
            label: `${sampleDate} ${sampleTime}`,
            sampleTime,
            depth,
            volume: null,
            temperature,
            ph,
            parameterCount,
            summary: typeof record.name === 'string' ? record.name : null,
            parameters
        };
    })
        .filter((row) => row !== null);
};
const flattenStationRowsToMeasurements = (rows) => {
    const out = [];
    for (const row of rows) {
        for (const parameter of row.parameters ?? []) {
            out.push({
                sampleDate: row.dateKey,
                sampleTime: row.sampleTime,
                depth: row.depth,
                parameterCode: parameter.parameterCode,
                analysisMethodCode: null,
                valueFlags: null,
                value: parameter.value,
                unit: parameter.unit ?? '',
                dataQuality: null
            });
        }
    }
    return out;
};
self.onmessage = (event) => {
    const id = event.data?.id;
    const locationId = event.data?.locationId;
    const payload = event.data?.payload;
    if (typeof locationId !== 'string' || !payload)
        return;
    try {
        const measurementId = typeof payload.measurementId === 'string' ? payload.measurementId : `station-${locationId}`;
        const stationName = (typeof payload.name === 'string' && payload.name) ||
            (typeof payload.stationId === 'string' && payload.stationId) ||
            null;
        const source = typeof payload.source === 'string' ? payload.source : 'gemstat';
        const rows = normalizeStationRows(locationId, payload);
        const measurements = flattenStationRowsToMeasurements(rows);
        const resp = {
            ok: true,
            locationId,
            measurementId,
            stationName,
            source,
            rows,
            measurements
        };
        self.postMessage({ id, data: resp });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : 'unknown worker error';
        const resp = { ok: false, locationId, error: message };
        self.postMessage({ id, data: resp });
    }
};
export {};
