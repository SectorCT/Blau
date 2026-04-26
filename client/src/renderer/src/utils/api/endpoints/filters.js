import { makeAuthenticatedReq } from '../makeAuthenticatedReq';
export const generateFilter = async (request) => {
    return makeAuthenticatedReq({
        method: 'POST',
        path: '/api/filters/generate/',
        body: request,
        authRequired: true,
    });
};
export const getFilterStatus = async (filterId) => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: `/api/filters/${filterId}/status/`,
        authRequired: true,
    });
};
export const getFilters = async () => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: '/api/filters/',
        authRequired: true,
    });
};
export const getFilterDetails = async (filterId) => {
    return makeAuthenticatedReq({
        method: 'GET',
        path: `/api/filters/${filterId}/`,
        authRequired: true,
    });
};
