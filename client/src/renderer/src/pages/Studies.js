import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@renderer/components/Breadcrumbs';
import { Button } from '@renderer/components/ui/button';
import { createStudy, getStudies } from '@renderer/utils/api/endpoints';
const resolveStudies = (payload) => {
    if (Array.isArray(payload))
        return payload;
    return payload.results ?? [];
};
const formatDateYmd = (value) => {
    if (typeof value !== 'string')
        return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return '-';
    return parsed.toISOString().slice(0, 10);
};
export function Studies() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const [nameInput, setNameInput] = useState('');
    const [descriptionInput, setDescriptionInput] = useState('');
    useEffect(() => {
        let isMounted = true;
        const loadStudies = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getStudies();
                if (!isMounted)
                    return;
                setItems(resolveStudies(response));
            }
            catch (fetchError) {
                if (!isMounted)
                    return;
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load studies.');
            }
            finally {
                if (isMounted)
                    setIsLoading(false);
            }
        };
        void loadStudies();
        return () => {
            isMounted = false;
        };
    }, []);
    const total = useMemo(() => items.length, [items]);
    const handleCreateStudy = async () => {
        const trimmedName = nameInput.trim();
        if (!trimmedName) {
            toast.error('Study name is required.');
            return;
        }
        setIsCreating(true);
        setError(null);
        try {
            const created = await createStudy({
                name: trimmedName,
                description: descriptionInput.trim() || undefined
            });
            setItems((prev) => [created, ...prev]);
            setNameInput('');
            setDescriptionInput('');
            toast.success('Study created.');
        }
        catch (createError) {
            const message = createError instanceof Error ? createError.message : 'Failed to create study.';
            setError(message);
        }
        finally {
            setIsCreating(false);
        }
    };
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsx(Breadcrumbs, {}), _jsx("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Studies" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [total, " studies"] })] }) }), _jsxs("div", { className: "mb-4 rounded-[6px] border border-border bg-card p-4", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold", children: "Create Study" }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]", children: [_jsx("input", { type: "text", value: nameInput, onChange: (event) => setNameInput(event.target.value), placeholder: "Study name", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm" }), _jsx("input", { type: "text", value: descriptionInput, onChange: (event) => setDescriptionInput(event.target.value), placeholder: "Description (optional)", className: "h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm" }), _jsxs(Button, { onClick: () => void handleCreateStudy(), disabled: isCreating, children: [_jsx(Plus, { size: 16, strokeWidth: 1.5 }), isCreating ? 'Creating...' : 'Create'] })] })] }), _jsx("div", { className: "rounded-[6px] border border-border bg-card", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-[680px] w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-table-header text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Name" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Description" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "Created" }), _jsx("th", { className: "px-4 py-2.5 font-medium text-muted-foreground", children: "ID" })] }) }), _jsxs("tbody", { children: [isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "Loading studies..." }) })) : null, !isLoading && error ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-10 text-center text-sm text-destructive", children: error }) })) : null, !isLoading && !error && items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "No studies yet. Create one to organize your filters." }) })) : null, !isLoading &&
                                        !error &&
                                        items.map((study) => (_jsxs("tr", { className: "border-b border-border last:border-0", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: study.name }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: study.description ?? '-' }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: formatDateYmd(study.createdAt) }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: study.id })] }, study.id)))] })] }) }) })] }));
}
