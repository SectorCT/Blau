import { makeAuthenticatedReq } from '../makeAuthenticatedReq';
const normalizeStudy = (raw) => {
    const record = (raw ?? {});
    return {
        id: typeof record.id === 'string' ? record.id : '',
        name: typeof record.name === 'string' ? record.name : 'Untitled Study',
        description: typeof record.description === 'string' ? record.description : undefined,
        createdAt: typeof record.createdAt === 'string'
            ? record.createdAt
            : typeof record.created_at === 'string'
                ? record.created_at
                : undefined,
        updatedAt: typeof record.updatedAt === 'string'
            ? record.updatedAt
            : typeof record.updated_at === 'string'
                ? record.updated_at
                : undefined
    };
};
export const getStudies = async () => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: '/api/studies/',
        authRequired: true,
        parseResponse: async (response) => {
            const payload = (await response.json());
            if (Array.isArray(payload)) {
                return payload.map((study) => normalizeStudy(study));
            }
            const results = Array.isArray(payload.results) ? payload.results : [];
            return {
                ...payload,
                results: results.map((study) => normalizeStudy(study))
            };
        },
    });
};
export const createStudy = async (request) => {
    return makeAuthenticatedReq({
        method: 'POST',
        path: '/api/studies/',
        body: request,
        authRequired: true,
        parseResponse: async (response) => normalizeStudy(await response.json()),
    });
};
export const getStudyById = async (id) => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: `/api/studies/${id}/`,
        authRequired: true,
        parseResponse: async (response) => normalizeStudy(await response.json()),
    });
};
export const updateStudy = async (id, request) => {
    return makeAuthenticatedReq({
        method: 'PUT',
        path: `/api/studies/${id}/`,
        body: request,
        authRequired: true,
        parseResponse: async (response) => normalizeStudy(await response.json()),
    });
};
export const deleteStudy = async (id) => {
    return makeAuthenticatedReq({
        method: 'DELETE',
        path: `/api/studies/${id}/`,
        authRequired: true,
        parseResponse: async (response) => {
            const text = (await response.text()).trim();
            if (!text)
                return { success: true };
            try {
                return JSON.parse(text);
            }
            catch {
                return { success: true };
            }
        },
    });
};
