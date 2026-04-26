import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft, FileUp, Keyboard, Map, Usb } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CsvImportPanel } from '@renderer/components/add-measurement/CsvImportPanel';
import { GemstatMapPanel } from '@renderer/components/add-measurement/GemstatMapPanel';
import { ManualEntryPanel } from '@renderer/components/add-measurement/ManualEntryPanel';
import { UsbEntryPanel } from '@renderer/components/add-measurement/UsbEntryPanel';
import { BARCELONA_MEASUREMENT_PRESETS, } from '@renderer/data/barcelonaPresets';
const methods = [
    {
        key: 'manual',
        label: 'Manual Input',
        description: 'Enter parameters directly',
        icon: Keyboard
    },
    {
        key: 'usb',
        label: 'Lab Equipment (USB)',
        description: 'Import from connected sensor',
        icon: Usb
    },
    { key: 'map', label: 'GemStat Map', description: 'Select from global stations', icon: Map },
    { key: 'csv', label: 'Import CSV', description: 'Upload measurement file', icon: FileUp }
];
export function AddMeasurement() {
    const navigate = useNavigate();
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedPreset, setSelectedPreset] = useState(null);
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "mb-6 flex shrink-0 items-center gap-3", children: [_jsx("button", { onClick: () => (selectedMethod ? setSelectedMethod(null) : navigate('/dashboard')), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Add Water Measurement" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Select input method" })] })] }), _jsxs("div", { className: "min-h-0 flex-1", children: [!selectedMethod ? (_jsxs("div", { className: "mx-auto w-full max-w-[900px]", children: [_jsxs("div", { className: "mb-4 rounded-[6px] border border-border bg-card p-4", children: [_jsx("p", { className: "scientific-label mb-2", children: "Barcelona Presets" }), _jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: BARCELONA_MEASUREMENT_PRESETS.map((preset) => (_jsxs("button", { onClick: () => {
                                                setSelectedPreset(preset);
                                                setSelectedMethod('manual');
                                            }, className: "rounded-[6px] border border-border bg-surface-elevated p-3 text-left transition-colors hover:bg-secondary", children: [_jsx("p", { className: "text-sm font-medium", children: preset.name }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: preset.description }), _jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [preset.temperature, " C | pH ", preset.ph, " | ", preset.parameters.length, " params"] })] }, preset.id))) })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: methods.map((method) => {
                                    const Icon = method.icon;
                                    return (_jsxs("button", { onClick: () => setSelectedMethod(method.key), className: "flex min-h-[150px] flex-col items-start justify-start gap-2 rounded-[6px] border border-border bg-card p-5 text-left transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-muted/30", children: _jsx(Icon, { size: 18, strokeWidth: 1.5, className: "text-muted-foreground" }) }), _jsx("p", { className: "font-medium", children: method.label })] }), _jsx("p", { className: "text-sm text-muted-foreground break-words", children: method.description }), _jsx("div", { className: "mt-auto pt-2", children: _jsx("p", { className: "text-xs text-muted-foreground", children: "Continue" }) })] }, method.key));
                                }) })] })) : null, selectedMethod === 'manual' ? (_jsx(ManualEntryPanel, { preset: selectedPreset, onBackToMethodSelection: () => {
                            setSelectedPreset(null);
                            setSelectedMethod(null);
                        } })) : null, selectedMethod === 'usb' ? _jsx(UsbEntryPanel, { onBack: () => setSelectedMethod(null) }) : null, selectedMethod === 'map' ? (_jsx("div", { className: "h-full min-h-0", children: _jsx(GemstatMapPanel, {}) })) : null, selectedMethod === 'csv' ? _jsx(CsvImportPanel, {}) : null] })] }));
}
