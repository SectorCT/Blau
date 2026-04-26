import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { Button } from '@renderer/components/ui/button';
import { createStudy, generateFilter, getMeasurementById, getMeasurements, getStudies } from '@renderer/utils/api/endpoints';
import { ENRICHMENT_MINERALS } from '@renderer/data/enrichmentMinerals';
const resolveMeasurements = (payload) => {
    if (Array.isArray(payload))
        return payload;
    return payload.results ?? [];
};
const resolveStudies = (payload) => {
    if (Array.isArray(payload))
        return payload;
    return payload.results ?? [];
};
const NEW_STUDY_OPTION = '__new_study__';
const MICROPLASTIC_CODES = new Set(['pe', 'pp', 'ps', 'pet', 'nylon', 'pvc', 'mp', 'microplastic']);
const formatFixed = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return '-';
    return value.toFixed(2);
};
export function NewFilter() {
    const navigate = useNavigate();
    const [measurements, setMeasurements] = useState([]);
    const [studies, setStudies] = useState([]);
    const [selectedStudyId, setSelectedStudyId] = useState('');
    const [selectedMeasurementId, setSelectedMeasurementId] = useState('');
    const [selectedTargetCodes, setSelectedTargetCodes] = useState([]);
    const [codeToAdd, setCodeToAdd] = useState('');
    const [measurementParameters, setMeasurementParameters] = useState([]);
    const [selectedMeasurementDetail, setSelectedMeasurementDetail] = useState(null);
    const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true);
    const [isLoadingStudies, setIsLoadingStudies] = useState(true);
    const [isCreatingStudyInline, setIsCreatingStudyInline] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [useQuantumComputer, setUseQuantumComputer] = useState(false);
    const [enrichmentEnabled, setEnrichmentEnabled] = useState(false);
    const [selectedMinerals, setSelectedMinerals] = useState(['calcium', 'magnesium']);
    const [error, setError] = useState(null);
    const [inlineStudyName, setInlineStudyName] = useState('');
    const [inlineStudyDescription, setInlineStudyDescription] = useState('');
    useEffect(() => {
        let isMounted = true;
        const loadMeasurements = async () => {
            setIsLoadingMeasurements(true);
            setError(null);
            try {
                const response = await getMeasurements();
                if (!isMounted)
                    return;
                const items = resolveMeasurements(response);
                setMeasurements(items);
                if (items.length > 0) {
                    setSelectedMeasurementId(items[0]?.measurementId ?? '');
                }
            }
            catch (fetchError) {
                if (!isMounted)
                    return;
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load measurements.');
            }
            finally {
                if (isMounted)
                    setIsLoadingMeasurements(false);
            }
        };
        void loadMeasurements();
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        let isMounted = true;
        const loadStudies = async () => {
            setIsLoadingStudies(true);
            try {
                const response = await getStudies();
                if (!isMounted)
                    return;
                const items = resolveStudies(response);
                if (items.length > 0) {
                    setStudies(items);
                    setSelectedStudyId(items[0]?.id ?? '');
                    return;
                }
                const created = await createStudy({
                    name: 'Default Study',
                    description: 'Auto-created default study for filter experiments'
                });
                if (!isMounted)
                    return;
                setStudies([created]);
                setSelectedStudyId(created.id);
            }
            catch (studyError) {
                if (!isMounted)
                    return;
                setStudies([]);
                setSelectedStudyId('');
                const message = studyError instanceof Error ? studyError.message : 'Failed to load or create a study.';
                setError(message);
            }
            finally {
                if (isMounted) {
                    setIsLoadingStudies(false);
                }
            }
        };
        void loadStudies();
        return () => {
            isMounted = false;
        };
    }, []);
    const selectedMeasurement = useMemo(() => measurements.find((item) => item.measurementId === selectedMeasurementId) ?? null, [measurements, selectedMeasurementId]);
    const hasFiltrationTargets = selectedTargetCodes.length > 0;
    const hasEnrichmentTargets = enrichmentEnabled && selectedMinerals.length > 0;
    const canSubmit = !!selectedStudyId &&
        selectedStudyId !== NEW_STUDY_OPTION &&
        !!selectedMeasurementId &&
        (hasFiltrationTargets || hasEnrichmentTargets);
    const availableParameterOptions = useMemo(() => measurementParameters
        .filter((parameter) => !selectedTargetCodes.includes(parameter.parameterCode))
        .map((parameter) => ({
        code: parameter.parameterCode,
        label: parameter.parameterName?.trim() || parameter.parameterCode
    })), [measurementParameters, selectedTargetCodes]);
    useEffect(() => {
        let isMounted = true;
        const loadMeasurementImpurities = async () => {
            if (!selectedMeasurementId) {
                setMeasurementParameters([]);
                setSelectedTargetCodes([]);
                setSelectedMeasurementDetail(null);
                return;
            }
            try {
                const detail = await getMeasurementById(selectedMeasurementId);
                if (!isMounted)
                    return;
                setSelectedMeasurementDetail(detail);
                const derived = Array.from(new Map((detail.parameters ?? [])
                    .filter((parameter) => !['TEMP', 'PH'].includes(parameter.parameterCode.toUpperCase()))
                    .map((parameter) => [parameter.parameterCode, parameter])).values());
                setMeasurementParameters(derived);
                setSelectedTargetCodes((prev) => prev.filter((code) => derived.some((parameter) => parameter.parameterCode === code)));
            }
            catch {
                if (!isMounted)
                    return;
                setMeasurementParameters([]);
                setSelectedTargetCodes([]);
                setSelectedMeasurementDetail(null);
            }
        };
        void loadMeasurementImpurities();
        return () => {
            isMounted = false;
        };
    }, [selectedMeasurementId]);
    const handleAddImpurity = (value) => {
        if (!value)
            return;
        setSelectedTargetCodes((prev) => (prev.includes(value) ? prev : [...prev, value]));
        setCodeToAdd('');
    };
    const handleRemoveImpurity = (code) => {
        setSelectedTargetCodes((prev) => prev.filter((item) => item !== code));
    };
    const selectedCodeLabels = useMemo(() => {
        const byCode = new Map(measurementParameters.map((parameter) => [parameter.parameterCode, parameter]));
        return selectedTargetCodes.map((code) => {
            const parameter = byCode.get(code);
            const label = parameter?.parameterName?.trim() || code;
            const value = parameter?.value;
            const unit = parameter?.unit?.trim();
            const valueText = typeof value === 'number' && Number.isFinite(value)
                ? unit
                    ? `${value} ${unit}`
                    : String(value)
                : null;
            return { code, label, valueText };
        });
    }, [measurementParameters, selectedTargetCodes]);
    const microplasticCodeLabels = useMemo(() => selectedCodeLabels.filter((item) => MICROPLASTIC_CODES.has(item.code.toLowerCase()) || item.label.toLowerCase().includes('plastic')), [selectedCodeLabels]);
    const standardCodeLabels = useMemo(() => selectedCodeLabels.filter((item) => !(MICROPLASTIC_CODES.has(item.code.toLowerCase()) ||
        item.label.toLowerCase().includes('plastic'))), [selectedCodeLabels]);
    const buildMeasurementPayload = (detail) => ({
        temperature: typeof detail.temperature === 'number' && Number.isFinite(detail.temperature)
            ? detail.temperature
            : 0,
        ph: typeof detail.ph === 'number' && Number.isFinite(detail.ph) ? detail.ph : 0,
        parameters: detail.parameters ?? []
    });
    const selectedStudy = useMemo(() => studies.find((study) => study.id === selectedStudyId) ?? null, [studies, selectedStudyId]);
    const selectedTargetParameters = useMemo(() => measurementParameters.filter((parameter) => selectedTargetCodes.includes(parameter.parameterCode)), [measurementParameters, selectedTargetCodes]);
    const selectedTargetParameterCodes = useMemo(() => selectedTargetParameters.map((parameter) => parameter.parameterCode), [selectedTargetParameters]);
    const handleSubmit = async () => {
        if (!canSubmit || !selectedMeasurementDetail)
            return;
        const payload = {
            studyId: selectedStudyId,
            studyName: selectedStudy?.name ?? null,
            measurementId: selectedMeasurementId,
            useQuantumComputer,
            measurement: buildMeasurementPayload(selectedMeasurementDetail),
            targetParameterCodes: selectedTargetParameterCodes,
            enrichment: {
                enabled: enrichmentEnabled,
                minerals: enrichmentEnabled ? selectedMinerals : [],
            }
        };
        console.log('[New Filter] study selection:', JSON.stringify({
            selectedStudyId,
            selectedStudyName: selectedStudy?.name ?? null,
            availableStudyCount: studies.length
        }, null, 2));
        console.log('[New Filter] JSON payload:', JSON.stringify(payload, null, 2));
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await generateFilter(payload);
            console.log('[New Filter] Generate response:', JSON.stringify({ filterId: result.filterId, status: result.status }, null, 2));
            toast.success(`Filter generation started (${result.status}).`);
            navigate(`/filters/${result.filterId}`);
        }
        catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Failed to trigger filter generation.';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const toggleMineral = (mineral) => {
        setSelectedMinerals((prev) => prev.includes(mineral) ? prev.filter((item) => item !== mineral) : [...prev, mineral]);
    };
    const handleCreateStudyInline = async () => {
        const trimmedName = inlineStudyName.trim();
        if (!trimmedName) {
            toast.error('Study name is required.');
            return;
        }
        setIsCreatingStudyInline(true);
        setError(null);
        try {
            const created = await createStudy({
                name: trimmedName,
                description: inlineStudyDescription.trim() || undefined
            });
            setStudies((prev) => {
                if (prev.some((study) => study.id === created.id))
                    return prev;
                return [created, ...prev];
            });
            setSelectedStudyId(created.id);
            setInlineStudyName('');
            setInlineStudyDescription('');
            console.log('[New Filter] inline study created:', JSON.stringify({ studyId: created.id, studyName: created.name }, null, 2));
            toast.success('Study created and selected.');
        }
        catch (createError) {
            const message = createError instanceof Error ? createError.message : 'Failed to create study.';
            setError(message);
        }
        finally {
            setIsCreatingStudyInline(false);
        }
    };
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsxs("div", { className: "mb-6 flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate('/filters'), className: "rounded-[6px] p-1.5 transition-colors hover:bg-secondary", children: _jsx(ArrowLeft, { size: 16, strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "New Filter" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Choose an existing measurement and target impurities to remove." })] })] }), _jsxs("div", { className: "rounded-[6px] border border-border bg-card p-5", children: [isLoadingMeasurements ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading your measurements..." })) : null, isLoadingStudies ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Loading your studies..." })) : null, !isLoadingMeasurements && error ? (_jsx("p", { className: "text-sm text-destructive", children: error })) : null, !isLoadingMeasurements && !error ? (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Study" }), _jsxs("select", { value: selectedStudyId, onChange: (e) => setSelectedStudyId(e.target.value), className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm", disabled: isLoadingStudies, children: [studies.length === 0 ? _jsx("option", { value: "", children: "No studies available" }) : null, studies.map((study) => (_jsx("option", { value: study.id, children: study.name }, study.id))), _jsx("option", { value: NEW_STUDY_OPTION, children: "NEW STUDY" })] }), selectedStudyId === NEW_STUDY_OPTION ? (_jsxs("div", { className: "mt-2 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]", children: [_jsx("input", { type: "text", value: inlineStudyName, onChange: (event) => setInlineStudyName(event.target.value), placeholder: "New study name", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm" }), _jsx("input", { type: "text", value: inlineStudyDescription, onChange: (event) => setInlineStudyDescription(event.target.value), placeholder: "Description (optional)", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm" }), _jsx(Button, { type: "button", variant: "outline", onClick: () => void handleCreateStudyInline(), disabled: isCreatingStudyInline, children: isCreatingStudyInline ? 'Creating...' : 'Create Study' })] })) : null] }), _jsxs("div", { children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Water Measurement" }), _jsxs("select", { value: selectedMeasurementId, onChange: (e) => setSelectedMeasurementId(e.target.value), className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm", children: [measurements.length === 0 ? (_jsx("option", { value: "", children: "No measurements available" })) : null, measurements.map((measurement) => (_jsx("option", { value: measurement.measurementId, children: measurement.name ?? 'Untitled measurement' }, measurement.measurementId)))] }), selectedMeasurement ? (_jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: ["pH ", formatFixed(selectedMeasurement.ph), " | Temperature", ' ', formatFixed(selectedMeasurement.temperature), " C"] })) : null] }), _jsxs("div", { children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Impurities To Clean Out" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: codeToAdd, onChange: (e) => handleAddImpurity(e.target.value), className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm", disabled: availableParameterOptions.length === 0, children: [_jsx("option", { value: "", children: availableParameterOptions.length === 0
                                                            ? 'No contaminants available'
                                                            : 'Select contaminant...' }), availableParameterOptions.map((option) => (_jsx("option", { value: option.code, children: option.label }, option.code)))] }), _jsx(Button, { type: "button", variant: "outline", onClick: () => setSelectedTargetCodes([]), disabled: selectedTargetCodes.length === 0, children: "Clear" }), _jsx(Button, { type: "button", variant: "outline", onClick: () => setSelectedTargetCodes(measurementParameters.map((parameter) => parameter.parameterCode)), disabled: measurementParameters.length === 0 ||
                                                    selectedTargetCodes.length === measurementParameters.length, title: "Select every impurity option", children: "All" })] }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [selectedCodeLabels.length === 0 ? (_jsx("span", { className: "text-xs text-muted-foreground", children: "No impurities selected. Skip this section to generate an enrichment-only filter (enable enrichment below and pick at least one mineral)." })) : null, microplasticCodeLabels.map((item) => (_jsxs("button", { type: "button", onClick: () => handleRemoveImpurity(item.code), className: "rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-900 transition-colors hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100", title: "Remove", children: ["MP | ", item.label, " (", item.code, ")", item.valueText ? ` · ${item.valueText}` : '', " x"] }, item.code))), standardCodeLabels.map((item) => (_jsxs("button", { type: "button", onClick: () => handleRemoveImpurity(item.code), className: "rounded-full border border-border bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-secondary", title: "Remove", children: [item.label, " (", item.code, ")", item.valueText ? ` · ${item.valueText}` : '', " x"] }, item.code)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Water Enrichment" }), _jsxs("div", { className: "space-y-3 rounded-[6px] border border-input bg-surface-elevated px-3 py-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "Enable enrichment layers" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Add mineral release layers to enrich filtered water with chosen minerals." })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": enrichmentEnabled, onClick: () => setEnrichmentEnabled((prev) => !prev), className: `inline-flex h-6 w-11 items-center rounded-full border transition-colors ${enrichmentEnabled
                                                            ? 'border-emerald-500 bg-emerald-500/80'
                                                            : 'border-border bg-muted'}`, children: _jsx("span", { className: `h-5 w-5 rounded-full bg-white transition-transform ${enrichmentEnabled ? 'translate-x-5' : 'translate-x-0.5'}` }) })] }), enrichmentEnabled ? (_jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: ENRICHMENT_MINERALS.map((mineral) => (_jsxs("button", { type: "button", onClick: () => toggleMineral(mineral.key), className: `rounded-[6px] border px-3 py-2 text-left transition-colors ${selectedMinerals.includes(mineral.key)
                                                        ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                                                        : 'border-border bg-card hover:bg-secondary'}`, children: [_jsx("p", { className: "text-sm font-medium", children: mineral.label }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Target: ", mineral.target] })] }, mineral.key))) })) : null] })] }), _jsxs("div", { children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Execution Mode" }), _jsxs("div", { className: "flex items-center justify-between gap-3 rounded-[6px] border border-input bg-surface-elevated px-3 py-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium", children: "Use quantum computer" }), _jsxs("p", { className: "flex items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(Info, { size: 13 }), "If off, a quantum simulation is used. If on, a real quantum computer is used."] })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": useQuantumComputer, onClick: () => setUseQuantumComputer((prev) => !prev), className: `inline-flex h-6 w-11 items-center rounded-full border transition-colors ${useQuantumComputer
                                                    ? 'border-emerald-500 bg-emerald-500/80'
                                                    : 'border-border bg-muted'}`, children: _jsx("span", { className: `h-5 w-5 rounded-full bg-white transition-transform ${useQuantumComputer ? 'translate-x-5' : 'translate-x-0.5'}` }) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => void handleSubmit(), disabled: !canSubmit || isSubmitting || isLoadingStudies, children: isSubmitting ? 'Starting...' : 'Trigger Filter Generation' }), _jsx(Button, { variant: "outline", onClick: () => navigate('/filters'), children: "Cancel" })] })] })) : null] })] }));
}
