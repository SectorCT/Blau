import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { Button } from '@renderer/components/ui/button';
export function NotFound() {
    const navigate = useNavigate();
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-background p-6", children: _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-6 text-center", children: [_jsx("h1", { className: "mb-2 text-xl font-semibold", children: "404" }), _jsx("p", { className: "mb-4 text-sm text-muted-foreground", children: "Page not found" }), _jsx(Button, { onClick: () => navigate('/'), children: "Go to Auth" })] }) }));
}
