/**
 * Refresh access token infrastructure.
 *
 * For now this is a no-op that returns the currently stored token.
 * Later, this can call a dedicated refresh endpoint and update the token store.
 */
export declare const refreshAccessToken: () => Promise<string>;
