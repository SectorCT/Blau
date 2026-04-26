import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@renderer/components/AppSidebar';
import { AppTitleBar } from '@renderer/components/AppTitleBar';
export function AppLayout() {
    return (_jsxs("div", { className: "flex h-screen flex-col overflow-hidden bg-background", children: [_jsx(AppTitleBar, {}), _jsxs("div", { className: "flex min-h-0 flex-1 overflow-hidden", children: [_jsx(AppSidebar, {}), _jsx("main", { className: "min-w-0 flex-1 overflow-auto", children: _jsx(Outlet, {}) })] })] }));
}
