import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { createMeasurement } from '@renderer/utils/api';
const PARAMETER_PRESETS = [
    { parameterCode: 'Alk-Tot', parameterName: 'Alkalinity', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Al-Dis', parameterName: 'Aluminium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Al-Tot', parameterName: 'Aluminium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'NH3N', parameterName: 'Ammonia', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'NH4N', parameterName: 'Ammonia', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'As-Dis', parameterName: 'Arsenic', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'As-Tot', parameterName: 'Arsenic', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'HCO3', parameterName: 'Bicarbonate', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cd-Dis', parameterName: 'Cadmium', unit: 'ug/l', category: 'standard' },
    { parameterCode: 'Cd-Tot', parameterName: 'Cadmium', unit: 'ug/l', category: 'standard' },
    { parameterCode: 'Ca-Dis', parameterName: 'Calcium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Ca-Tot', parameterName: 'Calcium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cl-Dis', parameterName: 'Chloride', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cl-Tot', parameterName: 'Chloride', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cr-Dis', parameterName: 'Chromium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cr-Tot', parameterName: 'Chromium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cu-Dis', parameterName: 'Copper', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Cu-Tot', parameterName: 'Copper', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'EC', parameterName: 'Electrical Conductance', unit: 'uS/cm', category: 'standard' },
    { parameterCode: 'F-Dis', parameterName: 'Fluoride', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'F-Tot', parameterName: 'Fluoride', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'H-T', parameterName: 'Hardness', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Fe-Dis', parameterName: 'Iron', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Fe-Tot', parameterName: 'Iron', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Pb-Dis', parameterName: 'Lead', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Pb-Tot', parameterName: 'Lead', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Mg-Dis', parameterName: 'Magnesium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Mg-Tot', parameterName: 'Magnesium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Mn-Dis', parameterName: 'Manganese', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Mn-Tot', parameterName: 'Manganese', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Hg-Dis', parameterName: 'Mercury', unit: 'ug/l', category: 'standard' },
    { parameterCode: 'Hg-Tot', parameterName: 'Mercury', unit: 'ug/l', category: 'standard' },
    { parameterCode: 'Ni-Dis', parameterName: 'Nickel', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Ni-Tot', parameterName: 'Nickel', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'TOC', parameterName: 'Organic Carbon', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'DOC', parameterName: 'Organic Carbon', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'DRP', parameterName: 'Orthophosphate', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'NO2N', parameterName: 'Oxidized Nitrogen', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'NO3N', parameterName: 'Oxidized Nitrogen', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'NOxN', parameterName: 'Oxidized Nitrogen', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'O2-Dis', parameterName: 'Oxygen', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'BOD', parameterName: 'Oxygen Demand', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'COD', parameterName: 'Oxygen Demand', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Sal', parameterName: 'Salinity', unit: 'psu', category: 'standard' },
    { parameterCode: 'Se-Dis', parameterName: 'Selenium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Se-Tot', parameterName: 'Selenium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'SO4-Dis', parameterName: 'Sulfate', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'SO4-Tot', parameterName: 'Sulfate', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'TURB', parameterName: 'Turbidity', unit: 'NTU', category: 'standard' },
    { parameterCode: 'U-Dis', parameterName: 'Uranium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'U-Tot', parameterName: 'Uranium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'V-Dis', parameterName: 'Vanadium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'V-Tot', parameterName: 'Vanadium', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Zn-Dis', parameterName: 'Zinc', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'Zn-Tot', parameterName: 'Zinc', unit: 'mg/l', category: 'standard' },
    { parameterCode: 'pe', parameterName: 'Polyethylene (PE)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'hdpe', parameterName: 'High-density polyethylene (HDPE)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'ldpe', parameterName: 'Low-density polyethylene (LDPE)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pp', parameterName: 'Polypropylene (PP)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'ps', parameterName: 'Polystyrene (PS)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'eps', parameterName: 'Expanded polystyrene (EPS)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pet', parameterName: 'PET', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'nylon', parameterName: 'Nylon', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pa6', parameterName: 'Nylon-6 (PA6)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pa66', parameterName: 'Nylon-6,6 (PA66)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'polyamide', parameterName: 'Polyamide', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pvc', parameterName: 'PVC', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pmma', parameterName: 'PMMA (acrylic)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'acrylic', parameterName: 'Acrylic', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pu', parameterName: 'Polyurethane (PU)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'polyurethane', parameterName: 'Polyurethane', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'abs', parameterName: 'ABS', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'polycarbonate', parameterName: 'Polycarbonate', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'pc', parameterName: 'Polycarbonate (PC)', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'ptfe', parameterName: 'PTFE', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'teflon', parameterName: 'Teflon', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'rubber', parameterName: 'Rubber microparticle', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'tire wear', parameterName: 'Tire wear microparticle', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'synthetic fiber', parameterName: 'Synthetic textile fiber', unit: 'ug/l', category: 'microplastics' },
    { parameterCode: 'polyester fiber', parameterName: 'Polyester textile fiber', unit: 'ug/l', category: 'microplastics' },
];
const getPresetKey = (preset) => `${preset.parameterCode}|${preset.parameterName}|${preset.unit}`;
const PARAMETER_TABS = [
    { key: 'all', label: 'All Parameters' },
    { key: 'standard', label: 'Standard' },
    { key: 'microplastics', label: 'Microplastics' },
];
export function ManualEntryPanel({ preset = null, onBackToMethodSelection, }) {
    const navigate = useNavigate();
    const [measurementName, setMeasurementName] = useState('');
    const [temperature, setTemperature] = useState('');
    const [ph, setPh] = useState('');
    const [rows, setRows] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const presetsByKey = Object.fromEntries(PARAMETER_PRESETS.map((p) => [getPresetKey(p), p]));
    const presetsByCode = useMemo(() => new Map(PARAMETER_PRESETS.map((item) => [item.parameterCode.toLowerCase(), item])), []);
    const visiblePresetOptions = useMemo(() => {
        if (activeTab === 'all')
            return PARAMETER_PRESETS;
        return PARAMETER_PRESETS.filter((presetItem) => presetItem.category === activeTab);
    }, [activeTab]);
    useEffect(() => {
        if (!preset)
            return;
        setMeasurementName(preset.name);
        setTemperature(String(preset.temperature));
        setPh(String(preset.ph));
        setRows(preset.parameters
            .map((parameter, index) => {
            const existing = presetsByCode.get(parameter.parameterCode.toLowerCase());
            const normalizedPreset = existing ?? {
                parameterCode: parameter.parameterCode,
                parameterName: parameter.parameterName,
                unit: parameter.unit,
                category: 'standard',
            };
            const presetKey = getPresetKey(normalizedPreset);
            return {
                id: `preset-${preset.id}-${index}`,
                presetKey,
                value: String(parameter.value),
            };
        })
            .filter((row) => !!row));
    }, [preset, presetsByCode]);
    const addRow = () => {
        const first = visiblePresetOptions[0] ?? PARAMETER_PRESETS[0];
        if (!first)
            return;
        setRows((prev) => [
            ...prev,
            {
                id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                presetKey: getPresetKey(first),
                value: '',
            },
        ]);
    };
    const removeRow = (id) => {
        setRows((prev) => prev.filter((row) => row.id !== id));
    };
    const updateRow = (id, patch) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    };
    const phNumber = ph === '' ? null : Number(ph);
    const isPhValid = phNumber === null || (Number.isFinite(phNumber) && phNumber >= 0 && phNumber <= 14);
    const buildPayload = () => {
        const now = new Date();
        const sampleDate = now.toISOString().slice(0, 10);
        const sampleTime = now.toTimeString().slice(0, 8);
        const extraRows = rows
            .map((row) => {
            const preset = presetsByKey[row.presetKey];
            if (!preset || row.value === '')
                return null;
            const numericValue = Number(row.value);
            if (!Number.isFinite(numericValue))
                return null;
            return {
                parameterCode: preset.parameterCode,
                parameterName: preset.parameterName,
                unit: preset.unit,
                value: numericValue,
            };
        })
            .filter((v) => v !== null);
        const requiredRows = [];
        const t = Number(temperature);
        if (Number.isFinite(t)) {
            requiredRows.push({
                parameterCode: 'TEMP',
                parameterName: 'Temperature',
                unit: '°C',
                value: t,
            });
        }
        if (phNumber !== null && Number.isFinite(phNumber)) {
            requiredRows.push({
                parameterCode: 'PH',
                parameterName: 'pH',
                unit: '---',
                value: phNumber,
            });
        }
        return {
            name: measurementName.trim() || undefined,
            source: 'manual',
            sampleDate,
            sampleTime,
            temperature: t,
            ph: Number(ph),
            parameters: [...requiredRows, ...extraRows],
        };
    };
    const canSubmit = temperature !== '' && ph !== '' && isPhValid && Number.isFinite(Number(temperature));
    const handleSave = async () => {
        if (!canSubmit) {
            setError('Temperature and pH are required and must be valid numbers.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await createMeasurement(buildPayload());
            navigate('/dashboard');
        }
        catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Failed to save measurement.';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleSaveAndGenerate = async () => {
        await handleSave();
    };
    return (_jsx("div", { className: "min-h-[calc(100vh-180px)]", children: _jsxs("div", { className: "flex min-h-0 flex-col rounded-[6px] border border-border bg-card p-4 md:p-5", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Manual Measurement" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Structure aligned to `POST /api/measurements/`." }), preset ? (_jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: ["Using preset: ", _jsx("span", { className: "font-medium text-foreground", children: preset.name })] })) : null] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Name (optional)" }), _jsx("input", { value: measurementName, onChange: (e) => setMeasurementName(e.target.value), placeholder: "Example: River sample - Site A", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" })] }), _jsxs("div", { children: [_jsxs("label", { className: "scientific-label mb-1 block", children: ["Temperature ", _jsx("span", { className: "text-destructive", children: "*" })] }), _jsx("input", { value: temperature, onChange: (e) => setTemperature(e.target.value), type: "number", step: "any", placeholder: "22.1", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" })] }), _jsxs("div", { children: [_jsxs("label", { className: "scientific-label mb-1 block", children: ["pH ", _jsx("span", { className: "text-destructive", children: "*" })] }), _jsx("input", { value: ph, onChange: (e) => {
                                        const next = e.target.value;
                                        if (next === '') {
                                            setPh('');
                                            return;
                                        }
                                        const n = Number(next);
                                        if (!Number.isFinite(n))
                                            return;
                                        if (n < 0 || n > 14)
                                            return;
                                        setPh(next);
                                    }, type: "number", step: "any", min: 0, max: 14, placeholder: "7.3", className: cn('h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring', !isPhValid ? 'border-destructive focus:ring-destructive' : '') }), !isPhValid ? (_jsx("p", { className: "mt-1 text-xs text-destructive", children: "pH must be between 0 and 14." })) : null] })] }), _jsxs("div", { className: "mt-6 mb-3 flex items-center justify-between", children: [_jsx("p", { className: "scientific-label", children: "Additional Parameters" }), _jsxs(Button, { type: "button", variant: "outline", onClick: addRow, children: [_jsx(Plus, { className: "mr-1.5", size: 14 }), " Add Parameter"] })] }), _jsx("div", { className: "mb-3 flex flex-wrap gap-1.5", children: PARAMETER_TABS.map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab.key), className: cn('rounded-[6px] border px-2.5 py-1 text-xs transition-colors', activeTab === tab.key
                            ? 'border-foreground bg-secondary text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'), children: tab.label }, tab.key))) }), _jsxs("div", { className: "min-h-0 flex-1 space-y-2 overflow-auto pr-1", children: [rows.length === 0 ? (_jsxs("div", { className: "rounded-[6px] border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground", children: ["No additional parameters yet. Click ", _jsx("strong", { children: "Add Parameter" }), " to choose from preset code/name/unit entries."] })) : null, rows.map((row) => {
                            const preset = presetsByKey[row.presetKey];
                            return (_jsxs("div", { className: "grid grid-cols-1 gap-2 rounded-[6px] border border-border bg-surface-elevated p-3 lg:grid-cols-[1.5fr_1fr_120px_120px_40px]", children: [_jsx("select", { value: row.presetKey, onChange: (e) => updateRow(row.id, { presetKey: e.target.value }), className: "h-9 rounded-[6px] border border-input bg-background px-2 text-sm", children: visiblePresetOptions.map((p) => {
                                            const key = getPresetKey(p);
                                            return (_jsxs("option", { value: key, children: [p.parameterName, " - ", p.parameterCode, " (", p.unit, ")"] }, key));
                                        }) }), _jsx("input", { value: preset?.parameterCode ?? '', disabled: true, className: "h-9 rounded-[6px] border border-input bg-muted px-3 text-sm text-muted-foreground" }), _jsx("input", { value: preset?.unit ?? '', disabled: true, className: "h-9 rounded-[6px] border border-input bg-muted px-3 text-sm text-muted-foreground" }), _jsx("input", { value: row.value, onChange: (e) => updateRow(row.id, { value: e.target.value }), type: "number", step: "any", placeholder: "Value", className: "h-9 rounded-[6px] border border-input bg-background px-3 text-sm" }), _jsx("button", { type: "button", onClick: () => removeRow(row.id), className: "flex h-9 w-9 items-center justify-center rounded-[6px] border border-input text-muted-foreground hover:bg-secondary hover:text-foreground", children: _jsx(Trash2, { size: 14 }) })] }, row.id));
                        })] }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-2", children: [_jsx(Button, { onClick: () => void handleSave(), disabled: !canSubmit || isSubmitting, children: isSubmitting ? 'Saving...' : 'Save Measurement' }), _jsx(Button, { variant: "outline", onClick: () => void handleSaveAndGenerate(), disabled: !canSubmit || isSubmitting, children: "Save & Generate Filter" }), onBackToMethodSelection ? (_jsx(Button, { variant: "outline", onClick: onBackToMethodSelection, disabled: isSubmitting, children: "Back to methods" })) : null, !onBackToMethodSelection ? (_jsx(Button, { variant: "outline", onClick: () => navigate('/add-measurement'), disabled: isSubmitting, children: "Back to methods" })) : null] }), error ? _jsx("p", { className: "mt-3 text-sm text-destructive", children: error }) : null] }) }));
}
