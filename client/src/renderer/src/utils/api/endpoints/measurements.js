import { makeAuthenticatedReq } from '../makeAuthenticatedReq';
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isMeasurementSource = (value) => value === 'manual' || value === 'lab_equipment' || value === 'gemstat' || value === 'csv_import';
const normalizeParameterArray = (value) => {
    if (!Array.isArray(value))
        return [];
    const normalized = value.map((item) => {
        const record = item;
        const code = typeof record.parameterCode === 'string' ? record.parameterCode : '';
        const val = record.value;
        if (!code || !isFiniteNumber(val))
            return null;
        return {
            parameterCode: code,
            value: val,
            file: typeof record.file === 'string' || record.file === null ? record.file : null,
            parameterName: typeof record.parameterName === 'string' || record.parameterName === null
                ? record.parameterName
                : null,
            unit: typeof record.unit === 'string' || record.unit === null ? record.unit : null
        };
    });
    return normalized.filter((item) => item !== null);
};
const normalizeParameterMap = (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return [];
    const entries = Object.values(value);
    return normalizeParameterArray(entries);
};
const extractDetailParameters = (raw) => {
    // v1 shape: top-level parameters array
    const topLevelArray = normalizeParameterArray(raw.parameters);
    if (topLevelArray.length > 0)
        return topLevelArray;
    // v2 shape: latestSnapshot.parameters map keyed by parameter code
    const latestSnapshot = typeof raw.latestSnapshot === 'object' && raw.latestSnapshot !== null
        ? raw.latestSnapshot
        : null;
    const latestSnapshotParameters = normalizeParameterMap(latestSnapshot?.parameters);
    if (latestSnapshotParameters.length > 0)
        return latestSnapshotParameters;
    // v2 fallback: rows[0].parameters may be either array or map
    const firstRow = Array.isArray(raw.rows) && raw.rows.length > 0 && typeof raw.rows[0] === 'object' && raw.rows[0] !== null
        ? raw.rows[0]
        : null;
    const rowParametersArray = normalizeParameterArray(firstRow?.parameters);
    if (rowParametersArray.length > 0)
        return rowParametersArray;
    return normalizeParameterMap(firstRow?.parameters);
};
const normalizeMeasurementListItem = (raw, endpoint, index) => {
    const record = (raw ?? {});
    const normalized = {
        measurementId: typeof record.measurementId === 'string' ? record.measurementId : `unknown-${index}`,
        name: typeof record.name === 'string' ? record.name : undefined,
        source: isMeasurementSource(record.source) ? record.source : 'manual',
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
        temperature: isFiniteNumber(record.temperature) ? record.temperature : Number.NaN,
        ph: isFiniteNumber(record.ph) ? record.ph : Number.NaN,
        // Backend list items typically provide parameters under `latestSnapshot.parameters` (map), not `parameters` (array).
        parameters: extractDetailParameters(record),
        sampleLocation: typeof record.sampleLocation === 'object' && record.sampleLocation !== null
            ? record.sampleLocation
            : undefined
    };
    if (!isFiniteNumber(record.temperature) || !isFiniteNumber(record.ph)) {
        console.error('[Backend Diagnostic] Invalid measurement payload shape', {
            endpoint,
            index,
            expected: {
                measurementId: 'string',
                source: 'manual|lab_equipment|gemstat|csv_import',
                createdAt: 'ISO-8601 string',
                temperature: 'number',
                ph: 'number'
            },
            received: {
                measurementId: record.measurementId,
                source: record.source,
                createdAt: record.createdAt,
                temperature: record.temperature,
                ph: record.ph
            }
        });
    }
    return normalized;
};
export const createMeasurement = async (request) => {
    return makeAuthenticatedReq({
        method: 'POST',
        path: '/api/measurements/',
        body: request,
        authRequired: true,
    });
};
export const getMeasurements = async () => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: '/api/measurements/',
        authRequired: true,
        parseResponse: async (response) => {
            const payload = (await response.json());
            const endpoint = '/api/measurements/';
            if (Array.isArray(payload)) {
                return payload.map((item, index) => normalizeMeasurementListItem(item, endpoint, index));
            }
            const results = Array.isArray(payload.results) ? payload.results : [];
            return {
                ...payload,
                results: results.map((item, index) => normalizeMeasurementListItem(item, endpoint, index))
            };
        },
    });
};
export const getMeasurementById = async (measurementId) => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: `/api/measurements/${measurementId}/`,
        authRequired: true,
        parseResponse: async (response) => {
            const endpoint = `/api/measurements/${measurementId}/`;
            const raw = (await response.json());
            const normalized = normalizeMeasurementListItem(raw, endpoint, 0);
            const parameters = extractDetailParameters(raw);
            if (!parameters.length) {
                console.error('[Backend Diagnostic] Missing detail parameters in measurement payload', {
                    endpoint,
                    expected: {
                        parameters: 'MeasurementParameter[] OR latestSnapshot.parameters map OR rows[].parameters'
                    },
                    received: {
                        parametersType: Array.isArray(raw.parameters) ? 'array' : typeof raw.parameters,
                        latestSnapshotKeys: typeof raw.latestSnapshot === 'object' && raw.latestSnapshot !== null
                            ? Object.keys(raw.latestSnapshot)
                            : null,
                        rowsType: Array.isArray(raw.rows) ? 'array' : typeof raw.rows
                    }
                });
            }
            return {
                ...normalized,
                parameters
            };
        },
    });
};
export const getMeasurementsMap = async () => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: '/api/measurements/map/',
        authRequired: true,
    });
};
export const importMeasurementCsv = async (request) => {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.name?.trim()) {
        formData.append('name', request.name.trim());
    }
    return makeAuthenticatedReq({
        method: 'POST',
        path: '/api/measurements/import/csv/',
        body: formData,
        authRequired: true,
    });
};
