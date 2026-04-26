import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@renderer/components/ui/button';
import { importMeasurementCsv } from '@renderer/utils/api';
export function CsvImportPanel() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [name, setName] = useState('');
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const handleUpload = async () => {
        if (!file) {
            setError('Please choose a CSV file first.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await importMeasurementCsv({ file, name: name.trim() || undefined });
            navigate('/dashboard');
        }
        catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Failed to import CSV measurement.';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "space-y-4 rounded-[6px] border border-border bg-card p-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold", children: "Import CSV" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Upload a CSV file containing water quality parameter values." })] }), _jsxs("div", { children: [_jsx("label", { className: "scientific-label mb-1 block", children: "Name (optional)" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "Example: March station import", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".csv,text/csv", className: "hidden", onChange: (e) => {
                    setError(null);
                    setFile(e.target.files?.[0] ?? null);
                } }), _jsx("div", { className: "flex h-52 cursor-pointer items-center justify-center rounded-[6px] border border-dashed border-border bg-muted", onClick: () => fileInputRef.current?.click(), children: _jsxs("div", { className: "flex flex-col items-center gap-2 text-muted-foreground", children: [_jsx(FileUp, { size: 24, strokeWidth: 1.5 }), _jsx("span", { className: "text-sm", children: file ? file.name : 'Click to choose CSV file' })] }) }), _jsx(Button, { onClick: () => void handleUpload(), disabled: !file || isSubmitting, children: isSubmitting ? 'Importing...' : 'Import Measurement' }), error ? _jsx("p", { className: "text-sm text-destructive", children: error }) : null] }));
}
