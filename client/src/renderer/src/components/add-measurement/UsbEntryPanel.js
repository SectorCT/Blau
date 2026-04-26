import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, CheckCircle2, ChevronDown, Copy, Droplets, Loader2, RefreshCw, Save, Thermometer, Usb, Zap, } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { ApiError, createMeasurement } from '@renderer/utils/api';
const buildUsbMeasurementName = () => {
    const iso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return `USB measurement ${iso}`;
};
const asOptionalTrimmedString = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
const normalizeMeasurementPayload = (measurement) => {
    const temperature = Number(measurement.temperature);
    const ph = Number(measurement.ph);
    if (!Number.isFinite(temperature) || !Number.isFinite(ph)) {
        return null;
    }
    const parameters = measurement.parameters
        .map((parameter) => {
        const parameterCode = asOptionalTrimmedString(parameter.parameterCode);
        const value = Number(parameter.value);
        if (!parameterCode || !Number.isFinite(value)) {
            return null;
        }
        return {
            parameterCode,
            value,
            file: asOptionalTrimmedString(parameter.file),
            parameterName: asOptionalTrimmedString(parameter.parameterName),
            unit: asOptionalTrimmedString(parameter.unit),
        };
    })
        .filter((parameter) => parameter !== null);
    return {
        name: buildUsbMeasurementName(),
        source: 'lab_equipment',
        temperature,
        ph,
        parameters,
    };
};
const formatApiErrorMessage = (error) => {
    const statusLine = `Request failed (${error.status}): POST /api/measurements/`;
    if (!error.responseBodyText) {
        return statusLine;
    }
    try {
        const parsed = JSON.parse(error.responseBodyText);
        const details = Object.entries(parsed)
            .map(([key, value]) => {
            if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
            }
            if (typeof value === 'string') {
                return `${key}: ${value}`;
            }
            return `${key}: ${JSON.stringify(value)}`;
        })
            .join(' | ');
        return details ? `${statusLine} — ${details}` : statusLine;
    }
    catch {
        const compactBody = error.responseBodyText.replace(/\s+/g, ' ').trim();
        return compactBody ? `${statusLine} — ${compactBody}` : statusLine;
    }
};
function ConnectionDot({ status }) {
    const isConnected = status !== 'idle' && status !== 'error';
    return (_jsx("span", { className: cn('inline-block h-2 w-2 rounded-full', isConnected
            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
            : 'bg-muted-foreground/40') }));
}
function CoreValueCard({ label, value, unit, accent, icon, }) {
    return (_jsxs("div", { className: "flex items-center gap-3 rounded-[6px] border border-border bg-card p-4", children: [_jsx("div", { className: cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', accent), children: icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "scientific-label", children: label }), _jsx("p", { className: "font-mono text-lg font-semibold tabular-nums leading-tight", children: value }), _jsx("p", { className: "text-xs text-muted-foreground", children: unit })] })] }));
}
export function UsbEntryPanel({ onBack }) {
    const WET_POLL_INTERVAL_MS = 300;
    const [ports, setPorts] = useState([]);
    const [selectedPort, setSelectedPort] = useState('');
    const [usbStatus, setUsbStatus] = useState('idle');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [measurement, setMeasurement] = useState(null);
    const [createdMeasurementId, setCreatedMeasurementId] = useState('');
    const [copyStatus, setCopyStatus] = useState('idle');
    const stopWaitingForWetRef = useRef(false);
    const copyStatusTimerRef = useRef(null);
    const labApi = window.labApi ?? window.api;
    const isConnected = usbStatus !== 'idle' && usbStatus !== 'error';
    const statusLabel = useMemo(() => {
        switch (usbStatus) {
            case 'idle':
                return 'Disconnected';
            case 'connected':
                return 'Connected';
            case 'reading':
                return 'Reading';
            case 'waiting_wet':
                return 'Waiting for wet probes';
            case 'dry':
                return 'Probes dry';
            case 'measurement':
                return 'Data ready';
            case 'imported':
                return 'Saved';
            case 'error':
                return 'Error';
            default:
                return usbStatus;
        }
    }, [usbStatus]);
    const refreshPorts = useCallback(async () => {
        if (!labApi) {
            setUsbStatus('error');
            setMessage('Device API unavailable. Restart Electron app.');
            return;
        }
        const availablePorts = await labApi.listPorts();
        setPorts(availablePorts);
        if (!selectedPort && availablePorts.length > 0) {
            setSelectedPort(availablePorts[0] ?? '');
        }
    }, [labApi, selectedPort]);
    useEffect(() => {
        if (!labApi)
            return;
        void refreshPorts();
    }, [labApi, refreshPorts]);
    useEffect(() => {
        return () => {
            stopWaitingForWetRef.current = true;
        };
    }, []);
    useEffect(() => {
        return () => {
            if (copyStatusTimerRef.current != null) {
                window.clearTimeout(copyStatusTimerRef.current);
            }
        };
    }, []);
    const payloadText = useMemo(() => (measurement ? JSON.stringify(measurement, null, 2) : ''), [measurement]);
    useEffect(() => {
        setCopyStatus('idle');
    }, [measurement]);
    const connectDevice = async () => {
        if (!labApi)
            return;
        if (!selectedPort) {
            setUsbStatus('error');
            setMessage('Select a serial port first.');
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            await labApi.connectDevice(selectedPort);
            setUsbStatus('connected');
        }
        catch (error) {
            setUsbStatus('error');
            setMessage(`Connection failed: ${String(error)}`);
        }
        finally {
            setBusy(false);
        }
    };
    const disconnectDevice = async () => {
        if (!labApi)
            return;
        stopWaitingForWetRef.current = true;
        setBusy(true);
        setMessage('');
        try {
            await labApi.disconnectDevice();
            setUsbStatus('idle');
            setMeasurement(null);
        }
        catch (error) {
            setMessage(`Disconnect failed: ${String(error)}`);
        }
        finally {
            setBusy(false);
        }
    };
    const requestMeasurement = async () => {
        if (!labApi)
            return;
        setBusy(true);
        setMessage('');
        setCreatedMeasurementId('');
        stopWaitingForWetRef.current = false;
        setUsbStatus('reading');
        try {
            while (!stopWaitingForWetRef.current) {
                const result = await labApi.readMeasurement();
                if (result.status === 'DRY') {
                    setUsbStatus('waiting_wet');
                    setMeasurement(null);
                    await new Promise((resolve) => setTimeout(resolve, WET_POLL_INTERVAL_MS));
                    continue;
                }
                if (!result.measurement)
                    throw new Error('Device returned WET without measurement payload.');
                setMeasurement(result.measurement);
                setUsbStatus('measurement');
                return;
            }
            setUsbStatus('connected');
        }
        catch (error) {
            setUsbStatus('error');
            setMessage(`Read failed: ${String(error)}`);
        }
        finally {
            setBusy(false);
        }
    };
    const importMeasurement = async () => {
        if (!measurement)
            return;
        const normalizedMeasurement = normalizeMeasurementPayload(measurement);
        if (!normalizedMeasurement) {
            setUsbStatus('error');
            setMessage('Import failed: Device payload contains invalid temperature or pH.');
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            const now = new Date();
            const result = await createMeasurement({
                source: measurement.source,
                sampleDate: now.toISOString().slice(0, 10),
                sampleTime: now.toTimeString().slice(0, 8),
                temperature: measurement.temperature,
                ph: measurement.ph,
                parameters: measurement.parameters,
            });
            setCreatedMeasurementId(result.measurementId);
            setUsbStatus('imported');
        }
        catch (error) {
            setUsbStatus('error');
            if (error instanceof ApiError) {
                setMessage(`Import failed: ${formatApiErrorMessage(error)}`);
            }
            else if (error instanceof Error) {
                setMessage(`Import failed: ${error.message}`);
            }
            else {
                setMessage(`Import failed: ${String(error)}`);
            }
        }
        finally {
            setBusy(false);
        }
    };
    const handleCopyDetails = async () => {
        if (!payloadText)
            return;
        if (!navigator.clipboard) {
            setCopyStatus('error');
            return;
        }
        try {
            await navigator.clipboard.writeText(payloadText);
            setCopyStatus('success');
        }
        catch {
            setCopyStatus('error');
        }
        finally {
            if (copyStatusTimerRef.current != null) {
                window.clearTimeout(copyStatusTimerRef.current);
            }
            copyStatusTimerRef.current = window.setTimeout(() => {
                setCopyStatus('idle');
            }, 1800);
        }
    };
    return (_jsxs("div", { className: "w-full space-y-5", children: [_jsxs("div", { className: "rounded-[6px] border border-border bg-card p-4", children: [_jsx("div", { className: "mb-3 flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Usb, { size: 15, strokeWidth: 1.5, className: "text-muted-foreground" }), _jsx("span", { className: "text-sm font-medium", children: "Device" }), _jsx(ConnectionDot, { status: usbStatus }), _jsx("span", { className: "text-xs text-muted-foreground", children: statusLabel })] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsxs("select", { value: selectedPort, onChange: (event) => setSelectedPort(event.target.value), className: "h-9 w-full appearance-none rounded-[6px] border border-input bg-surface-elevated pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring", disabled: busy || ports.length === 0 || isConnected, children: [ports.length === 0 ? _jsx("option", { value: "", children: "No serial ports found" }) : null, ports.map((port) => (_jsx("option", { value: port, children: port }, port)))] }), _jsx(ChevronDown, { size: 14, className: "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" })] }), _jsx("button", { onClick: () => {
                                    void refreshPorts();
                                }, disabled: busy || isConnected, className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-input bg-surface-elevated transition-colors hover:bg-secondary disabled:opacity-40", title: "Refresh ports", children: _jsx(RefreshCw, { size: 14, strokeWidth: 1.5 }) })] }), _jsx("div", { className: "mt-3", children: !isConnected ? (_jsxs(Button, { className: "w-full", onClick: () => void connectDevice(), disabled: busy || !selectedPort, children: [busy ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Usb, { size: 14, strokeWidth: 1.5 }), "Connect device"] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex flex-1 items-center gap-2 rounded-[6px] border border-emerald-600/30 bg-emerald-500/10 px-4 py-2", children: [_jsx(CheckCircle2, { size: 14, strokeWidth: 1.5, className: "shrink-0 text-emerald-600" }), _jsxs("span", { className: "text-sm font-medium text-emerald-700", children: ["Connected \u2014 ", selectedPort] })] }), _jsx(Button, { variant: "destructive", size: "sm", onClick: () => void disconnectDevice(), disabled: busy, children: "Disconnect" })] })) })] }), _jsxs(Button, { size: "lg", className: "w-full text-base", onClick: () => void requestMeasurement(), disabled: busy || !isConnected, children: [usbStatus === 'reading' ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Zap, { size: 16, strokeWidth: 1.5 }), usbStatus === 'reading' ? 'Reading from device...' : 'Request Measurement'] }), usbStatus === 'dry' ? (_jsxs("div", { className: "flex items-center gap-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 py-3", children: [_jsx(Droplets, { size: 18, strokeWidth: 1.5, className: "shrink-0 text-amber-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-amber-700", children: "Probes are dry" }), _jsx("p", { className: "text-xs text-amber-600/80", children: "Place probes in water and press Request Measurement again." })] })] })) : null, usbStatus === 'waiting_wet' ? (_jsxs("div", { className: "flex items-center justify-between gap-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Loader2, { size: 18, className: "animate-spin text-amber-600" }), _jsx("div", { children: _jsx("p", { className: "text-sm font-medium text-amber-700", children: "Waiting for probes to get wet" }) })] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                            stopWaitingForWetRef.current = true;
                            setUsbStatus('connected');
                            setBusy(false);
                        }, children: "Cancel" })] })) : null, measurement ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(CoreValueCard, { icon: _jsx(Thermometer, { size: 18, strokeWidth: 1.5 }), label: "Temperature", value: measurement.temperature.toFixed(1), unit: "deg C", accent: "bg-orange-500/10 text-orange-600" }), _jsx(CoreValueCard, { icon: _jsx(Droplets, { size: 18, strokeWidth: 1.5 }), label: "pH", value: measurement.ph.toFixed(2), unit: "dimensionless", accent: "bg-blue-500/10 text-blue-600" })] }), _jsxs("div", { className: "rounded-[6px] border border-border", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5", children: [_jsxs("p", { className: "scientific-label", children: ["Parameters (", measurement.parameters.length, ")"] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void handleCopyDetails(), children: copyStatus === 'success' ? (_jsxs(_Fragment, { children: [_jsx(Check, { size: 14, strokeWidth: 1.5 }), "Copied"] })) : copyStatus === 'error' ? (_jsxs(_Fragment, { children: [_jsx(Copy, { size: 14, strokeWidth: 1.5 }), "Copy failed"] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { size: 14, strokeWidth: 1.5 }), "Copy details"] })) })] }), _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full min-w-[520px] text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-4 py-2.5 font-medium", children: "Parameter" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Value" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Unit" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Source File" })] }) }), _jsxs("tbody", { children: [measurement.parameters.map((parameter, index) => (_jsxs("tr", { className: "border-b border-border/70", children: [_jsx("td", { className: "px-4 py-2.5 font-medium", children: parameter.parameterName?.trim() || parameter.parameterCode }), _jsx("td", { className: "px-4 py-2.5 font-mono tabular-nums", children: parameter.value }), _jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: parameter.unit?.trim() || '-' }), _jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: parameter.file?.trim() || '-' })] }, `${parameter.parameterCode}-${index}`))), measurement.parameters.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-4 text-center text-sm text-muted-foreground", children: "No parameters received from the device." }) })) : null] })] }), _jsx("div", { className: "px-4 py-2 text-xs text-muted-foreground", children: "Detailed payload is hidden for readability. Use `Copy details` for advanced access." })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs(Button, { onClick: () => void importMeasurement(), disabled: busy, children: [busy ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Save, { size: 14, strokeWidth: 1.5 }), "Save measurement"] }), _jsx(Button, { variant: "outline", onClick: onBack, children: "Back" })] }), createdMeasurementId ? (_jsxs("div", { className: "flex items-center gap-2 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3", children: [_jsx(CheckCircle2, { size: 16, strokeWidth: 1.5, className: "text-emerald-600" }), _jsxs("p", { className: "text-sm text-emerald-700", children: ["Measurement saved \u2014 ID: ", _jsx("span", { className: "font-mono", children: createdMeasurementId })] })] })) : null] })) : null, message ? (_jsx("div", { className: "rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3", children: _jsx("p", { className: "text-sm text-destructive", children: message }) })) : null] }));
}
