import { makeAuthenticatedReq } from '../makeAuthenticatedReq';
const isDownloadUrlJson = (value) => {
    if (typeof value !== 'object' || value === null)
        return false;
    if (!('downloadUrl' in value))
        return false;
    const record = value;
    return typeof record.downloadUrl === 'string';
};
const parseExportResponse = async (response) => {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/csv')) {
        const csvText = await response.text();
        return { kind: 'csvText', csvText };
    }
    // Alternative contract: JSON payload containing a temporary download URL.
    const json = (await response.json());
    if (isDownloadUrlJson(json)) {
        const downloadResponse = await fetch(json.downloadUrl);
        if (!downloadResponse.ok) {
            throw new Error(`Failed to fetch CSV from export URL (${downloadResponse.status})`);
        }
        const csvText = await downloadResponse.text();
        return { kind: 'csvText', csvText };
    }
    throw new Error('Unexpected export response shape');
};
export const exportFilterCsv = async (filterId) => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: `/api/filters/${filterId}/export/`,
        query: { format: 'csv' },
        authRequired: true,
        parseResponse: parseExportResponse,
    });
};
