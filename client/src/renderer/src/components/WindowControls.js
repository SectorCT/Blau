import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Minus, Square, X } from 'lucide-react';
export function WindowControls({ compact = false }) {
    return (_jsxs("div", { className: "no-drag flex items-center", children: [_jsx(ControlButton, { compact: compact, onClick: () => window.api.window.minimize(), ariaLabel: "Minimize window", children: _jsx(Minus, { size: 14, strokeWidth: 1.5 }) }), _jsx(ControlButton, { compact: compact, onClick: () => window.api.window.toggleMaximize(), ariaLabel: "Maximize window", children: _jsx(Square, { size: 12, strokeWidth: 1.5 }) }), _jsx(ControlButton, { compact: compact, onClick: () => window.api.window.close(), ariaLabel: "Close window", children: _jsx(X, { size: 14, strokeWidth: 1.5 }) })] }));
}
function ControlButton({ children, onClick, ariaLabel, compact, }) {
    return (_jsx("button", { "aria-label": ariaLabel, onClick: onClick, className: `rounded-[6px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${compact ? 'p-1.5' : 'p-2'}`, children: children }));
}
