import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@renderer/components/ui/button';
import { WindowControls } from '@renderer/components/WindowControls';
import { setAccessToken, setRefreshToken } from '@renderer/utils/api/authTokenStore';
import { ApiError } from '@renderer/utils/api/makeAuthenticatedReq';
import { getAccessToken, login, signup } from '@renderer/utils/api';
export function Auth() {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const getAuthErrorMessage = (submitError) => {
        const normalizeAuthMessage = (rawMessage) => {
            const trimmed = rawMessage.trim();
            if (!trimmed)
                return trimmed;
            const lower = trimmed.toLowerCase();
            if (lower.includes('too common')) {
                return 'Password is too common. Use a more unique password.';
            }
            if (lower.includes('entirely numeric')) {
                return 'Password cannot be only numbers.';
            }
            if (lower.includes('too short') || lower.includes('at least 8')) {
                return 'Password must be at least 8 characters long.';
            }
            if (lower.includes('too similar')) {
                return 'Password is too similar to your personal information.';
            }
            return trimmed;
        };
        if (submitError instanceof ApiError) {
            const bodyText = submitError.responseBodyText;
            if (bodyText) {
                try {
                    const parsed = JSON.parse(bodyText);
                    if (parsed.message && parsed.message.trim().length > 0) {
                        return normalizeAuthMessage(parsed.message);
                    }
                    if (parsed.detail && parsed.detail.trim().length > 0) {
                        return normalizeAuthMessage(parsed.detail);
                    }
                }
                catch {
                    // Not JSON; fall back to HTTP status below.
                }
            }
            return `Authentication failed (HTTP ${submitError.status}).`;
        }
        if (submitError instanceof Error && submitError.message.trim().length > 0) {
            return submitError.message;
        }
        return 'Authentication failed. Check credentials and try again.';
    };
    const getPasswordRules = (value, userEmail) => {
        const trimmed = value.trim();
        const emailLocalPart = userEmail.trim().split('@')[0]?.toLowerCase() ?? '';
        const normalized = trimmed.toLowerCase();
        const commonPasswords = new Set([
            'password',
            'password123',
            '12345678',
            '123456789',
            'qwerty',
            'qwerty123',
            'admin123',
            'letmein',
        ]);
        return [
            {
                key: 'length',
                label: 'At least 8 characters',
                met: value.length >= 8,
            },
            {
                key: 'notNumeric',
                label: 'Not entirely numeric',
                met: value.length > 0 && !/^\d+$/.test(value),
            },
            {
                key: 'notCommon',
                label: 'Not a common password',
                met: !!trimmed && !commonPasswords.has(normalized),
            },
            {
                key: 'notSimilarToEmail',
                label: 'Not similar to your email',
                met: !emailLocalPart || !normalized.includes(emailLocalPart),
            },
        ];
    };
    const passwordRules = getPasswordRules(password, email);
    const incompletePasswordRules = passwordRules.filter((rule) => !rule.met);
    useEffect(() => {
        const existingToken = getAccessToken();
        if (existingToken) {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!email.trim() || !password) {
            setError('Email and password are required.');
            return;
        }
        if (mode === 'signup' && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (mode === 'signup') {
            const unmetRule = getPasswordRules(password, email).find((rule) => !rule.met);
            if (unmetRule) {
                setError(`Password requirement not met: ${unmetRule.label}.`);
                return;
            }
        }
        setIsSubmitting(true);
        try {
            if (mode === 'login') {
                await login({ email: email.trim(), password });
            }
            else {
                await signup({
                    email: email.trim(),
                    password,
                    password2: confirmPassword,
                });
            }
            navigate('/dashboard');
        }
        catch (submitError) {
            console.error(submitError);
            const msg = getAuthErrorMessage(submitError);
            setError(msg);
            toast.error(msg);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleSkipLogin = () => {
        setAccessToken('preview-access-token');
        setRefreshToken('preview-refresh-token');
        navigate('/dashboard');
    };
    return (_jsxs("div", { className: "flex min-h-screen flex-col bg-background", children: [_jsxs("header", { className: "drag-region flex h-12 items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur", children: [_jsxs("div", { className: "no-drag flex items-center gap-2", children: [_jsx("div", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-secondary text-xs font-semibold", children: "B" }), _jsx("span", { className: "text-sm font-semibold tracking-tight text-foreground", children: "Blau" })] }), _jsx(WindowControls, { compact: true })] }), _jsx("div", { className: "flex flex-1 items-center justify-center p-6", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Blau" }), _jsx("p", { className: "scientific-label mt-1", children: "Water Quality Analysis Platform" })] }), _jsxs("div", { className: "mb-4 flex border-b border-border", children: [_jsx("button", { onClick: () => setMode('login'), className: `flex-1 border-b-2 px-2 pb-2 text-sm transition-colors ${mode === 'login'
                                        ? 'border-foreground text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'}`, children: "Log In" }), _jsx("button", { onClick: () => setMode('signup'), className: `flex-1 border-b-2 px-2 pb-2 text-sm transition-colors ${mode === 'signup'
                                        ? 'border-foreground text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'}`, children: "Sign Up" })] }), _jsxs("form", { className: "space-y-3", onSubmit: (e) => {
                                void handleSubmit(e);
                            }, children: [_jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), disabled: isSubmitting, className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" }), _jsx("input", { type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), disabled: isSubmitting, className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" }), mode === 'signup' ? (_jsx("div", { className: "space-y-1 rounded-[6px] border border-border bg-muted/20 px-3 py-2", children: incompletePasswordRules.length > 0 ? (incompletePasswordRules.map((rule) => (_jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u2022 ", rule.label] }, rule.key)))) : (_jsx("p", { className: "text-xs text-emerald-600", children: "\u2713 All password requirements are met." })) })) : null, mode === 'signup' ? (_jsx("input", { type: "password", placeholder: "Confirm Password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), disabled: isSubmitting, className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" })) : null, error ? _jsx("p", { className: "text-xs text-destructive", children: error }) : null, _jsx(Button, { className: "w-full", disabled: isSubmitting, children: isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account' })] }), _jsx("p", { className: "mt-6 text-center text-xs text-muted-foreground", children: "Blau Platform" }), _jsx("button", { type: "button", onClick: handleSkipLogin, className: "mt-3 w-full rounded-[6px] border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground", children: "Skip login for UI preview" })] }) })] }));
}
