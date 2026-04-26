import { toast } from 'sonner';
import { apiUrl } from './config';
import { refreshAccessToken } from './refreshAccessToken';
import { clearAccessToken } from './authTokenStore';
export class ApiError extends Error {
    status;
    responseBodyText;
    constructor(message, status, responseBodyText) {
        super(message);
        this.status = status;
        this.responseBodyText = responseBodyText;
    }
}
export function formatApiErrorToastMessage(error) {
    if (error instanceof ApiError) {
        const raw = error.responseBodyText?.trim();
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const msg = typeof parsed.message === 'string' ? parsed.message.trim() : '';
                const detail = typeof parsed.detail === 'string' ? parsed.detail.trim() : '';
                if (msg)
                    return msg;
                if (detail)
                    return detail;
            }
            catch {
                if (raw.length > 0 && raw.length < 400)
                    return raw;
            }
        }
        if (error.status === 404)
            return 'Resource not found.';
        return error.message.trim() || 'Request failed';
    }
    if (error instanceof Error && error.message.trim())
        return error.message.trim();
    return 'Something went wrong';
}
const defaultParseJson = async (response) => {
    // Some backends return empty bodies for 204/etc. Those endpoints aren't in the contract yet.
    const data = (await response.json());
    return data;
};
const buildQuery = (query) => {
    if (!query)
        return '';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null)
            continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
};
const shouldForceLogoutFromUnauthorized = (status, bodyText) => {
    if (status !== 401 || !bodyText)
        return false;
    return (bodyText.includes('Given token not valid for any token type') ||
        bodyText.includes('token_not_valid') ||
        bodyText.includes('Token is invalid or expired'));
};
const loginHashPath = () => {
    const raw = window.location.hash.replace(/^#/, '').split('?')[0] || '/';
    return raw.startsWith('/') ? raw : `/${raw}`;
};
const forceLogoutAndRedirectToLogin = () => {
    clearAccessToken();
    if (typeof window === 'undefined')
        return;
    if (loginHashPath() === '/')
        return;
    window.location.hash = '/';
};
export const makeAuthenticatedReq = async (args) => {
    const { method, path, query, body, authRequired = true, parseResponse = (defaultParseJson), suppressErrorToast = false } = args;
    const url = `${apiUrl(path)}${buildQuery(query)}`;
    const headers = {
        Accept: 'application/json'
    };
    const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isFormDataBody) {
        headers['Content-Type'] = 'application/json';
    }
    if (authRequired) {
        try {
            const token = await refreshAccessToken();
            headers.Authorization = `Bearer ${token}`;
        }
        catch (tokenError) {
            if (!suppressErrorToast) {
                toast.error(formatApiErrorToastMessage(tokenError));
            }
            throw tokenError;
        }
    }
    let response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? (isFormDataBody ? body : JSON.stringify(body)) : undefined
        });
    }
    catch (networkError) {
        if (!suppressErrorToast) {
            toast.error(networkError instanceof Error && networkError.message
                ? networkError.message
                : 'Network request failed');
        }
        throw networkError;
    }
    const fail = async (bodyText) => {
        const err = new ApiError(`Request failed: ${method} ${path}`, response.status, bodyText);
        if (!suppressErrorToast) {
            toast.error(formatApiErrorToastMessage(err));
        }
        throw err;
    };
    if (!response.ok) {
        const bodyText = await response.text().catch(() => undefined);
        if (authRequired && shouldForceLogoutFromUnauthorized(response.status, bodyText)) {
            forceLogoutAndRedirectToLogin();
        }
        await fail(bodyText);
    }
    try {
        return await parseResponse(response);
    }
    catch (parseError) {
        if (!suppressErrorToast) {
            toast.error(formatApiErrorToastMessage(parseError));
        }
        throw parseError;
    }
};
