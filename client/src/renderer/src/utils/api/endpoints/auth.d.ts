import { type AuthResponse, type LoginRequest, type SignupRequest } from '../types';
export declare const login: (request: LoginRequest) => Promise<AuthResponse>;
export declare const signup: (request: SignupRequest) => Promise<AuthResponse>;
export declare const logout: () => Promise<void>;
