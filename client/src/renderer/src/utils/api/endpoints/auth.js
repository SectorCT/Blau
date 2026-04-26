import { makeAuthenticatedReq } from '../makeAuthenticatedReq';
import { clearAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../authTokenStore';
const parseAuthResponse = async (response) => {
    const raw = (await response.json());
    const token = raw.token ?? raw.access;
    const refreshToken = raw.refreshToken ?? raw.refresh;
    if (!token || !refreshToken || !raw.user) {
        throw new Error('Unexpected auth response shape');
    }
    return {
        token,
        refreshToken,
        user: raw.user,
    };
};
export const login = async (request) => {
    const response = await makeAuthenticatedReq({
        method: 'POST',
        path: '/api/auth/login/',
        body: request,
        authRequired: false,
        parseResponse: parseAuthResponse,
        suppressErrorToast: true,
    });
    setAccessToken(response.token);
    setRefreshToken(response.refreshToken);
    return response;
};
export const signup = async (request) => {
    const response = await makeAuthenticatedReq({
        method: 'POST',
        path: '/api/auth/signup/',
        body: request,
        authRequired: false,
        parseResponse: parseAuthResponse,
        suppressErrorToast: true,
    });
    setAccessToken(response.token);
    setRefreshToken(response.refreshToken);
    return response;
};
export const logout = async () => {
    const refresh = getRefreshToken();
    await makeAuthenticatedReq({
        method: 'POST',
        path: '/api/auth/logout/',
        body: { refresh: refresh ?? '' },
        authRequired: true,
    });
    clearAccessToken();
};
