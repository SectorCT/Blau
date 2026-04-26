import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@renderer/components/ui/tooltip';
import { Toaster } from '@renderer/components/ui/toaster';
import { Toaster as Sonner } from '@renderer/components/ui/sonner';
import { AppLayout } from '@renderer/components/AppLayout';
import { Auth } from '@renderer/pages/Auth';
import { Dashboard } from '@renderer/pages/Dashboard';
import { Filters } from '@renderer/pages/Filters';
import { FilterDetails } from '@renderer/pages/FilterDetails';
import { FilterAnalysis } from '@renderer/pages/FilterAnalysis';
import { FilterVisualization } from '@renderer/pages/FilterVisualization';
import { FilterSimulation } from '@renderer/pages/FilterSimulation';
import { EnrichmentVisualization } from '@renderer/pages/EnrichmentVisualization';
import { EnrichmentSimulation } from '@renderer/pages/EnrichmentSimulation';
import { NewFilter } from '@renderer/pages/NewFilter';
import { Measurements } from '@renderer/pages/Measurements';
import { MeasurementDetails } from '@renderer/pages/MeasurementDetails';
import { AddMeasurement } from '@renderer/pages/AddMeasurement';
import { Studies } from '@renderer/pages/Studies';
import { NotFound } from '@renderer/pages/NotFound';
import { getGemstatLocations, hasGemstatLocationsCache } from '@renderer/utils/api/endpoints';
function App() {
    useEffect(() => {
        if (hasGemstatLocationsCache())
            return;
        void getGemstatLocations().catch(() => {
            // Warm-up cache is best-effort.
        });
    }, []);
    useEffect(() => {
        const preloadMapModule = () => {
            void import('@renderer/components/OpenStreetMapPointsCard');
        };
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(preloadMapModule);
            return () => {
                ;
                window.cancelIdleCallback?.(idleId);
            };
        }
        const timeoutId = globalThis.setTimeout(preloadMapModule, 1200);
        return () => globalThis.clearTimeout(timeoutId);
    }, []);
    return (_jsxs(TooltipProvider, { children: [_jsx(Toaster, {}), _jsx(Sonner, {}), _jsx(HashRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Auth, {}) }), _jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/filters", element: _jsx(Filters, {}) }), _jsx(Route, { path: "/filters/new", element: _jsx(NewFilter, {}) }), _jsx(Route, { path: "/filters/:id", element: _jsx(FilterDetails, {}) }), _jsx(Route, { path: "/filters/:id/analysis", element: _jsx(FilterAnalysis, {}) }), _jsx(Route, { path: "/filters/visualize", element: _jsx(FilterVisualization, {}) }), _jsx(Route, { path: "/filters/:id/visualize", element: _jsx(FilterVisualization, {}) }), _jsx(Route, { path: "/filters/:id/simulate", element: _jsx(FilterSimulation, {}) }), _jsx(Route, { path: "/filters/:id/enrich/visualize", element: _jsx(EnrichmentVisualization, {}) }), _jsx(Route, { path: "/filters/:id/enrich/simulate", element: _jsx(EnrichmentSimulation, {}) }), _jsx(Route, { path: "/measurements", element: _jsx(Measurements, {}) }), _jsx(Route, { path: "/measurements/:id", element: _jsx(MeasurementDetails, {}) }), _jsx(Route, { path: "/studies", element: _jsx(Studies, {}) }), _jsx(Route, { path: "/add-measurement", element: _jsx(AddMeasurement, {}) })] }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) })] }));
}
export default App;
