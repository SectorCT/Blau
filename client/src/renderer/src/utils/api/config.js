const joinUrl = (baseUrl, path) => {
    if (!baseUrl)
        return path;
    const trimmedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const baseHasApiSuffix = /\/api$/i.test(trimmedBase);
    const pathHasApiPrefix = /^\/api(\/|$)/i.test(normalizedPath);
    const finalPath = baseHasApiSuffix && pathHasApiPrefix ? normalizedPath.replace(/^\/api/i, '') : normalizedPath;
    return `${trimmedBase}${finalPath}`;
};
export const API_BASE_URL = 
// Vite exposes env vars as `import.meta.env.VITE_*`.
import.meta.env?.VITE_API_BASE_URL ?? '';
export const apiUrl = (path) => joinUrl(API_BASE_URL, path);
