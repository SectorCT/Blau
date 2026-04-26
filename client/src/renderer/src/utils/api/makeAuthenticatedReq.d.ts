export declare class ApiError extends Error {
    readonly status: number;
    readonly responseBodyText?: string;
    constructor(message: string, status: number, responseBodyText?: string);
}
type QueryValue = string | number | boolean | undefined | null;
export declare function formatApiErrorToastMessage(error: unknown): string;
export type MakeAuthenticatedReqArgs<Req, Res> = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    query?: Record<string, QueryValue>;
    body?: Req;
    authRequired?: boolean;
    /**
     * Converts the fetch Response into the expected return type.
     * (For JSON APIs, use the default parser.)
     */
    parseResponse?: (response: Response) => Promise<Res>;
    /**
     * When true, failed requests still throw but do not open a toast
     * (e.g. login/signup forms show inline errors).
     */
    suppressErrorToast?: boolean;
};
export declare const makeAuthenticatedReq: <Req, Res>(args: MakeAuthenticatedReqArgs<Req, Res>) => Promise<Res>;
export {};
