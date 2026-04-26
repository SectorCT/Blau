import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { createMeasurement, getGemstatLocations, getGemstatStationMeasurements, } from '@renderer/utils/api';
const OpenStreetMapPointsCard = lazy(() => import('@renderer/components/OpenStreetMapPointsCard'));
const formatStationTitle = (station) => {
    return (station.waterBodyName ??
        station.stationNarrative ??
        station.stationIdentifier ??
        station.localStationNumber ??
        'Unnamed station');
};
const toDateRows = (stationRows, flattenedRows) => {
    if (stationRows.length > 0) {
        return stationRows
            .map((row) => ({
            rowKey: `${row.dateKey}-${row.sampleTime}-${row.snapshotIndex}`,
            stamp: `${row.dateKey} ${row.sampleTime}`,
            sampleDate: row.dateKey,
            sampleTime: row.sampleTime,
            depth: row.depth,
            temperature: row.temperature,
            ph: row.ph,
            parameters: (row.parameters ?? []).filter((parameter) => typeof parameter.value === 'number' && Number.isFinite(parameter.value)),
            valuesByParameter: Object.fromEntries((row.parameters ?? [])
                .filter((parameter) => typeof parameter.value === 'number' && Number.isFinite(parameter.value))
                .map((parameter) => [parameter.parameterCode, parameter.value])),
        }))
            .sort((a, b) => `${a.sampleDate} ${a.sampleTime}`.localeCompare(`${b.sampleDate} ${b.sampleTime}`));
    }
    const grouped = new Map();
    for (const row of flattenedRows) {
        const rowKey = `${row.sampleDate}-${row.sampleTime}`;
        const stamp = `${row.sampleDate} ${row.sampleTime}`;
        if (!grouped.has(rowKey)) {
            grouped.set(rowKey, {
                rowKey,
                stamp,
                sampleDate: row.sampleDate,
                sampleTime: row.sampleTime,
                depth: row.depth,
                temperature: null,
                ph: null,
                parameters: [],
                valuesByParameter: {},
            });
        }
        const existing = grouped.get(rowKey);
        if (!existing)
            continue;
        existing.valuesByParameter[row.parameterCode] = row.value;
        existing.parameters.push({
            parameterCode: row.parameterCode,
            parameterName: null,
            unit: row.unit,
            value: row.value,
        });
    }
    return Array.from(grouped.values()).sort((a, b) => `${a.sampleDate} ${a.sampleTime}`.localeCompare(`${b.sampleDate} ${b.sampleTime}`));
};
const toSampleTimeWithSeconds = (sampleTime) => {
    if (/^\d{2}:\d{2}:\d{2}$/.test(sampleTime))
        return sampleTime;
    if (/^\d{2}:\d{2}$/.test(sampleTime))
        return `${sampleTime}:00`;
    return sampleTime;
};
function renderProbeValueChips(parameters) {
    const MAX_VISIBLE = 8;
    const visible = parameters.filter((p) => typeof p.value === 'number' && Number.isFinite(p.value));
    const shown = visible.slice(0, MAX_VISIBLE);
    const remaining = Math.max(0, visible.length - shown.length);
    if (visible.length === 0) {
        return _jsx("span", { className: "text-xs text-muted-foreground", children: "No values" });
    }
    const normalizeSymbolText = (text) => {
        // Some Electron environments render certain unicode symbols as '?' (or show U+FFFD "replacement char").
        // Normalize them to ASCII so the UI stays readable.
        const normalized = text
            .replaceAll('µ', 'u')
            .replaceAll('μ', 'u')
            .replaceAll('°', 'deg ')
            .replaceAll('�', 'u');
        // Heuristic: if unit looks like micrograms and the leading glyph was corrupted,
        // convert `?g/l` -> `ug/l` (and similar).
        if (normalized.includes('g/l') && normalized.includes('?')) {
            // Common corruption patterns we see in unit prefixes:
            //   ?g/l  -> ug/l
            //   ?g    -> ug
            // We'll do a conservative replacement only when the unit contains both g and l.
            const replaced = normalized.replaceAll('?g/l', 'ug/l').replaceAll('?g', 'ug').replaceAll('?l', 'l');
            return replaced.includes('ug/l') ? replaced : replaced.replaceAll('?', 'u');
        }
        // If the backend/client already contains a literal `?` (common with corrupted unicode),
        // remove it so the UI doesn't show placeholder glyphs.
        return normalized.replaceAll('?', '');
    };
    return (_jsxs("div", { className: "flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5", children: [shown.map((parameter) => {
                const unitText = parameter.unit?.trim();
                const unit = unitText ? ` ${normalizeSymbolText(unitText)}` : '';
                const label = normalizeSymbolText(parameter.parameterCode ?? parameter.parameterName ?? 'Parameter');
                const valueText = Number.isFinite(parameter.value)
                    ? normalizeSymbolText(parameter.value.toString())
                    : normalizeSymbolText(String(parameter.value));
                return (_jsxs("span", { className: "rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] leading-tight text-foreground", title: `${label}: ${valueText}${unit}`, children: [label, ": ", valueText, unit] }, `${label}-${valueText}-${parameter.unit ?? ''}`));
            }), remaining > 0 ? (_jsxs("span", { className: "text-[11px] text-muted-foreground", children: ["+", remaining, " more"] })) : null] }));
}
export function GemstatMapPanel() {
    const [step, setStep] = useState('map');
    const [locations, setLocations] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);
    const [stationRows, setStationRows] = useState([]);
    const [stationMeasurements, setStationMeasurements] = useState([]);
    const [activeRowKey, setActiveRowKey] = useState(null);
    const [measurementName, setMeasurementName] = useState('');
    const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingStation, setIsLoadingStation] = useState(false);
    const [stationPanelState, setStationPanelState] = useState('idle');
    const [canRenderMap, setCanRenderMap] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                const result = await getGemstatLocations();
                if (cancelled)
                    return;
                setLocations(result.locations);
            }
            catch (e) {
                console.error(e);
                if (cancelled)
                    return;
                setError('Failed to load map locations');
                setLocations([]);
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        if (step !== 'map')
            return;
        if (isLoading || !locations || locations.length === 0) {
            setCanRenderMap(false);
            return;
        }
        setCanRenderMap(false);
        let raf2 = 0;
        const raf1 = window.requestAnimationFrame(() => {
            raf2 = window.requestAnimationFrame(() => {
                setCanRenderMap(true);
            });
        });
        return () => {
            window.cancelAnimationFrame(raf1);
            if (raf2)
                window.cancelAnimationFrame(raf2);
        };
    }, [step, isLoading, locations]);
    const sampleRows = useMemo(() => toDateRows(stationRows, stationMeasurements), [stationRows, stationMeasurements]);
    const latestSampleStamp = sampleRows.length > 0 ? sampleRows[sampleRows.length - 1]?.stamp : null;
    const totalParameterValues = sampleRows.reduce((sum, row) => sum + row.parameters.length, 0);
    const loadStationData = async (station) => {
        setIsLoadingStation(true);
        setStationPanelState('loading');
        setError(null);
        try {
            const stationData = await getGemstatStationMeasurements(station.locationId);
            const nextRows = stationData.rows ?? [];
            const nextMeasurements = stationData.measurements ?? [];
            const nextSampleRows = toDateRows(nextRows, nextMeasurements);
            setStationRows(nextRows);
            setStationMeasurements(nextMeasurements);
            setStationPanelState(nextSampleRows.length > 0 ? 'success' : 'empty');
            setActionMessage(null);
            return true;
        }
        catch (e) {
            console.error(e);
            setError('Failed to load station parameter history');
            setStationPanelState('error');
            return false;
        }
        finally {
            setIsLoadingStation(false);
        }
    };
    const onSelectStation = async (station) => {
        if (isLoadingStation)
            return;
        setSelectedStation(station);
        setStationRows([]);
        setStationMeasurements([]);
        setActiveRowKey(null);
        setActionMessage(null);
        setError(null);
        setStationPanelState('loading');
        await loadStationData(station);
    };
    const onContinueFromMap = async () => {
        if (!selectedStation)
            return;
        if (stationPanelState === 'loading')
            return;
        if (stationPanelState === 'idle' || stationPanelState === 'error') {
            const ok = await loadStationData(selectedStation);
            if (!ok)
                return;
        }
        setStep('timestamps');
    };
    const onAskNameForRow = (row) => {
        setActiveRowKey(row.rowKey);
        setActionMessage(null);
        const defaultName = `${selectedStation ? formatStationTitle(selectedStation) : 'Station'} - ${row.stamp}`;
        setMeasurementName(defaultName);
    };
    const onSaveRowMeasurement = async (row) => {
        setIsSavingMeasurement(true);
        setError(null);
        setActionMessage(null);
        try {
            await createMeasurement({
                name: measurementName.trim() || undefined,
                source: 'gemstat',
                sampleDate: row.sampleDate,
                sampleTime: toSampleTimeWithSeconds(row.sampleTime),
                depth: row.depth ?? undefined,
                temperature: row.temperature ?? 0,
                ph: row.ph ?? 0,
                parameters: row.parameters.map((parameter) => ({
                    parameterCode: parameter.parameterCode,
                    parameterName: parameter.parameterName ?? undefined,
                    unit: parameter.unit ?? undefined,
                    value: parameter.value,
                })),
                sampleLocation: selectedStation
                    ? {
                        station_id: selectedStation.localStationNumber ?? selectedStation.stationIdentifier,
                        country: selectedStation.countryName,
                        water_type: selectedStation.waterType,
                        station_identifier: selectedStation.stationIdentifier,
                        latitude: selectedStation.latitude,
                        longitude: selectedStation.longitude,
                    }
                    : undefined,
            });
            setActionMessage(`Added timestamp ${row.stamp} to measurements.`);
            setActiveRowKey(null);
            setMeasurementName('');
        }
        catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Failed to add station timestamp as measurement.';
            setError(message);
        }
        finally {
            setIsSavingMeasurement(false);
        }
    };
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col gap-4 rounded-[6px] border border-border bg-card p-5", children: [_jsxs("div", { className: "shrink-0", children: [_jsx("h2", { className: "text-sm font-semibold", children: "GemStat Map" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Select a station and list all sample timestamps." })] }), step === 'map' ? (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col gap-4", children: [isLoading ? (_jsxs("div", { className: "flex items-center gap-2 rounded-[6px] border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Loading map data..."] })) : null, _jsxs("div", { className: "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]", children: [_jsx("div", { className: "relative min-h-0 h-full overflow-hidden rounded-[6px] border border-border bg-muted", children: !isLoading && locations && locations.length > 0 ? (_jsx(_Fragment, { children: canRenderMap ? (_jsx(Suspense, { fallback: _jsxs("div", { className: "flex h-full flex-col items-center justify-center gap-2 px-4 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Preparing interactive map..."] }), children: _jsx(OpenStreetMapPointsCard, { points: locations, selectedLocationId: selectedStation?.locationId ?? null, onSelectPoint: (point) => {
                                                void onSelectStation(point);
                                            } }) })) : null })) : !isLoading && locations && locations.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-muted-foreground", children: "No map points returned by backend for this account." })) : (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-muted-foreground", children: "Preparing map data..." })) }), _jsxs("div", { className: "rounded-[6px] border border-border bg-muted/30 p-4", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Selected station" }), selectedStation ? (_jsxs("div", { className: "mt-3 space-y-2 text-sm", children: [_jsx("p", { className: "font-medium", children: formatStationTitle(selectedStation) }), _jsxs("p", { className: "text-muted-foreground", children: [_jsx("span", { className: "mr-1 font-medium text-foreground", children: "Station #:" }), selectedStation.localStationNumber ?? selectedStation.stationIdentifier ?? 'N/A'] }), _jsxs("p", { className: "text-muted-foreground", children: [_jsx("span", { className: "mr-1 font-medium text-foreground", children: "Country:" }), selectedStation.countryName ?? 'Unknown'] }), _jsxs("p", { className: "text-muted-foreground", children: [_jsx("span", { className: "mr-1 font-medium text-foreground", children: "Water type:" }), selectedStation.waterType ?? 'Unknown'] }), _jsxs("p", { className: "text-muted-foreground", children: [_jsx("span", { className: "mr-1 font-medium text-foreground", children: "Coordinates:" }), selectedStation.latitude.toFixed(4), ", ", selectedStation.longitude.toFixed(4)] }), stationPanelState === 'loading' ? (_jsxs("div", { className: "mt-3 rounded-[6px] border border-border bg-background px-3 py-2 text-sm text-muted-foreground", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { className: "font-medium text-foreground", children: "Loading station history..." })] }), _jsx("p", { className: "mt-1 text-xs", children: "We are fetching all available timestamps and parameter values." })] })) : null, stationPanelState === 'success' ? (_jsxs("div", { className: "mt-3 rounded-[6px] border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm", children: [_jsx("p", { className: "font-medium text-emerald-800", children: "Station data loaded" }), _jsxs("p", { className: "mt-1 text-emerald-700", children: [sampleRows.length, " timestamps ready for review."] }), _jsxs("p", { className: "text-xs text-emerald-700", children: ["Latest: ", latestSampleStamp ?? 'N/A', " | Values: ", totalParameterValues] })] })) : null, stationPanelState === 'empty' ? (_jsxs("div", { className: "mt-3 rounded-[6px] border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm", children: [_jsx("p", { className: "font-medium text-amber-800", children: "No timestamps found" }), _jsx("p", { className: "mt-1 text-xs text-amber-700", children: "This station is reachable, but the backend returned no sample rows." })] })) : null, stationPanelState === 'error' ? (_jsxs("div", { className: "mt-3 rounded-[6px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm", children: [_jsx("p", { className: "font-medium text-destructive", children: "Could not load station history" }), _jsx("p", { className: "mt-1 text-xs text-destructive/90", children: error ?? 'Please retry the request for this station.' })] })) : null] })) : (_jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Click a map point to inspect and select a station." })), _jsx(Button, { className: "mt-4 w-full", disabled: !selectedStation || stationPanelState === 'idle' || stationPanelState === 'loading', onClick: () => void onContinueFromMap(), children: stationPanelState === 'loading'
                                            ? 'Loading station...'
                                            : stationPanelState === 'error'
                                                ? 'Retry loading station'
                                                : 'Show station timestamps' })] })] })] })) : null, step === 'timestamps' ? (_jsxs("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col gap-4", children: [_jsxs("div", { className: "flex shrink-0 flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-sm font-semibold", children: selectedStation ? formatStationTitle(selectedStation) : 'Station' }), _jsx("p", { className: "text-sm text-muted-foreground", children: "All timestamps for this station." })] }), _jsxs(Button, { variant: "outline", onClick: () => setStep('map'), disabled: isLoadingStation, children: [_jsx(ChevronLeft, { className: "mr-1 h-4 w-4" }), " Back to map"] })] }), _jsx("div", { className: "min-h-0 min-w-0 flex-1 overflow-auto rounded-[6px] border border-border", children: _jsxs("table", { className: "w-full min-w-[680px] text-sm", children: [_jsx("thead", { className: "bg-muted/40 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "Timestamp" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Probe values" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Action" })] }) }), _jsxs("tbody", { children: [sampleRows.map((row) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "whitespace-nowrap px-3 py-2 font-mono text-xs align-top", children: row.stamp }), _jsx("td", { className: "max-w-0 px-3 py-2 text-xs text-muted-foreground align-top", children: renderProbeValueChips(row.parameters) }), _jsx("td", { className: "whitespace-nowrap px-3 py-2 text-right align-top", children: activeRowKey === row.rowKey ? (_jsxs("div", { className: "flex max-w-full flex-wrap items-center justify-end gap-2", children: [_jsx("input", { value: measurementName, onChange: (event) => setMeasurementName(event.target.value), placeholder: "Measurement name", className: "h-8 min-w-0 w-64 max-w-full rounded-[6px] border border-input bg-background px-2 text-xs" }), _jsx(Button, { size: "sm", onClick: () => void onSaveRowMeasurement(row), disabled: !measurementName.trim() || isSavingMeasurement, children: isSavingMeasurement ? 'Saving...' : 'Save' }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                    setActiveRowKey(null);
                                                                    setMeasurementName('');
                                                                }, disabled: isSavingMeasurement, children: "Cancel" })] })) : (_jsx(Button, { size: "sm", variant: "outline", onClick: () => onAskNameForRow(row), children: "Add to measurement" })) })] }, row.stamp))), sampleRows.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-3 py-4 text-muted-foreground", children: "No timestamps found for this station." }) })) : null] })] }) })] })) : null, error ? _jsx("p", { className: "text-sm text-destructive", children: error }) : null, actionMessage ? _jsx("p", { className: "text-sm text-emerald-600", children: actionMessage }) : null] }));
}
