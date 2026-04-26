import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FlaskConical, Droplets, LayoutDashboard, LogOut, Plus, FolderKanban } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@renderer/lib/utils';
import { clearAccessToken } from '@renderer/utils/api/authTokenStore';
const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/filters', label: 'All Filters', icon: FlaskConical },
    { to: '/studies', label: 'Studies', icon: FolderKanban },
    { to: '/measurements', label: 'Measurements', icon: Droplets },
    { to: '/add-measurement', label: 'New Measurement', icon: Plus }
];
export function AppSidebar() {
    const navigate = useNavigate();
    return (_jsxs("aside", { className: "flex w-14 shrink-0 flex-col border-r border-border bg-card md:w-56", children: [_jsxs("div", { className: "flex h-14 items-center justify-center border-b border-border px-2 md:justify-between md:px-4", children: [_jsx("h2", { className: "hidden text-base font-semibold tracking-tight md:block", children: "Blau" }), _jsx("h2", { className: "text-sm font-semibold tracking-tight md:hidden", children: "Blau" }), _jsx("span", { className: "hidden rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex", children: "v1.0" })] }), _jsxs("div", { className: "flex-1 px-2 py-4 md:px-3", children: [_jsx("p", { className: "scientific-label mb-2 hidden md:block", children: "Navigation" }), _jsx("nav", { className: "space-y-1", children: navItems.map(({ to, label, icon: Icon }) => (_jsxs(NavLink, { to: to, className: ({ isActive }) => cn('flex items-center justify-center rounded-[6px] px-2 py-2 text-sm transition-colors md:justify-start md:gap-2 md:px-3', isActive
                                ? 'bg-secondary font-medium text-foreground'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'), title: label, children: [_jsx(Icon, { size: 16, strokeWidth: 1.5 }), _jsx("span", { className: "hidden md:inline", children: label })] }, to))) })] }), _jsx("div", { className: "border-t border-border p-2 md:p-3", children: _jsxs("button", { onClick: () => {
                        clearAccessToken();
                        navigate('/', { replace: true });
                    }, title: "Sign Out", className: "flex w-full items-center justify-center rounded-[6px] px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:justify-start md:gap-2 md:px-3", children: [_jsx(LogOut, { size: 16, strokeWidth: 1.5 }), _jsx("span", { className: "hidden md:inline", children: "Sign Out" })] }) })] }));
}
