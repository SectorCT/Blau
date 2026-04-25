import { ArrowLeft, Download, Eye, Microscope, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { FilterStatusWithProgress, StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { isFilterStatusWaiting } from '@renderer/hooks/usePollPendingFilterStatuses'
import { exportFilterCsv, getFilterDetails, getFilterStatus } from '@renderer/utils/api/endpoints'
import {
  type FilterDetailsSuccessResponse,
  type FilterStatus,
  type FilterStatusRefreshResponse
} from '@renderer/utils/api/types'

/** UI-only: JSON import is not a server job status. */
type FilterDetailsPageStatus = FilterStatus | 'Imported'
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'
import {
  buildFilterDetailsFromImportedJson,
  isImportedFilterRouteId,
  readImportedFilterSession,
  type ImportedFilterLocationState,
} from '@renderer/utils/importedFilterPayload'

const toSafeFileStem = (value: string): string => {
  const normalized = value
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\.+$/g, '')
  return normalized || 'filter'
}

const METHOD_LABELS: Record<string, { label: string; tone: string; title?: string }> = {
  ionic_empirical: {
    label: 'Ionic (empirical)',
    tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-100',
    title: 'DFT-D3+U calibrated empirical model for charged pollutants.'
  },
  vdw_empirical: {
    label: 'vdW (empirical)',
    tone: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-100',
    title: 'DFT-D3 calibrated van der Waals model for neutral organics / microplastics.'
  },
  mixed_empirical: {
    label: 'Mixed empirical',
    tone: 'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100',
    title: 'Multiple empirical methods used across layers in this filter.'
  },
  vqe_ibm: {
    label: 'Real quantum (IBM)',
    tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100',
    title: 'VQE executed on IBM Quantum hardware.'
  }
}

function MethodChip({ method }: { method: string | null | undefined }): React.JSX.Element | null {
  if (!method) return null
  const meta = METHOD_LABELS[method] ?? {
    label: method,
    tone: 'border-border bg-muted text-foreground',
    title: undefined
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}
      title={meta.title}
    >
      {meta.label}
    </span>
  )
}

export function FilterDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isImported = isImportedFilterRouteId(id)
  const importedSession = useMemo((): ImportedFilterLocationState | null => {
    if (!isImported) return null
    return readImportedFilterSession(location)
  }, [isImported, location.state])
  const [status, setStatus] = useState<FilterDetailsPageStatus | null>(null)
  const [progress, setProgress] = useState<{
    progressPercent?: number
    currentStep?: string
    internalStatus?: string
  }>({})
  const [details, setDetails] = useState<FilterDetailsSuccessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!isImported || !id) return
    if (!importedSession?.importedFilterJson) {
      setDetails(null)
      setStatus(null)
      setError('No imported filter data. Upload a JSON file from All Filters.')
      setIsLoading(false)
      return
    }
    try {
      setDetails(buildFilterDetailsFromImportedJson(importedSession.importedFilterJson, importedSession.importedFileName))
      setStatus('Imported')
      setError(null)
    } catch (parseError) {
      setDetails(null)
      setStatus(null)
      setError(parseError instanceof Error ? parseError.message : 'Invalid filter JSON.')
    } finally {
      setIsLoading(false)
    }
  }, [isImported, id, importedSession])

  useEffect(() => {
    if (isImported) return

    let isMounted = true
    setStatus(null)
    setProgress({})
    const loadStatus = async (): Promise<void> => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await getFilterStatus(id)
        if (!isMounted) return
        applyStatusResponse(response)
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter status.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    const applyStatusResponse = (response: FilterStatusRefreshResponse): void => {
      setStatus(response.status)
      setProgress({
        progressPercent: response.progressPercent,
        currentStep: response.currentStep,
        internalStatus: response.internalStatus
      })
    }
    void loadStatus()
    return () => {
      isMounted = false
    }
  }, [id, isImported])

  const statusPollingActive = id != null && !isImported && isFilterStatusWaiting(status)

  useEffect(() => {
    if (!id || !statusPollingActive) return

    let cancelled = false
    const poll = async (): Promise<void> => {
      try {
        const response = await getFilterStatus(id)
        if (cancelled) return
        setStatus(response.status)
        setProgress({
          progressPercent: response.progressPercent,
          currentStep: response.currentStep,
          internalStatus: response.internalStatus
        })
      } catch {
        // Transient poll errors: keep showing the last known status.
      }
    }

    const interval = window.setInterval(() => {
      void poll()
    }, 5000)
    void poll()

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [id, statusPollingActive])

  useEffect(() => {
    let isMounted = true
    const loadDetails = async (): Promise<void> => {
      if (!id || isImported || status !== 'Success') return
      try {
        const response = await getFilterDetails(id)
        if (!isMounted) return
        setDetails(response)
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter details.')
      }
    }
    void loadDetails()
    return () => {
      isMounted = false
    }
  }, [id, status, isImported])

  const displayStatus = status ?? 'Pending'
  const dashboardReady = status === 'Success' || status === 'Imported'
  const createdAt = useMemo(
    () => (details?.createdAt ? new Date(details.createdAt).toISOString().slice(0, 10) : '-'),
    [details?.createdAt]
  )
  const view = useMemo(() => buildFilterInfoViewModel(details?.filterInfo), [details?.filterInfo])
  const metricCards = useMemo(
    () => [
      { label: 'Material', value: view.metrics.materialType },
      { label: 'Pore Size', value: view.metrics.poreSize != null ? `${view.metrics.poreSize.toFixed(3)} nm` : '-' },
      {
        label: 'Binding Energy',
        value: view.metrics.bindingEnergy != null ? `${view.metrics.bindingEnergy.toFixed(4)} eV` : '-'
      },
      {
        label: 'Removal Efficiency',
        value: view.metrics.removalEfficiency != null ? `${view.metrics.removalEfficiency.toFixed(2)}%` : '-'
      },
      { label: 'Pollutant', value: view.metrics.pollutant },
      { label: 'Parameter Count', value: String(view.metrics.parameterCount) }
    ],
    [view]
  )
  const compositionData = useMemo(() => {
    if (view.parameterBarData.length > 0) return view.parameterBarData
    const fallback = [
      { code: 'PH', name: 'pH', value: view.metrics.ph ?? 7, rawValue: view.metrics.ph ?? 7, unit: '' },
      { code: 'TMP', name: 'Temperature', value: view.metrics.temperature ?? 25, rawValue: view.metrics.temperature ?? 25, unit: 'C' },
      { code: 'PSE', name: 'Pore Size', value: view.metrics.poreSize ?? 1, rawValue: view.metrics.poreSize ?? 1, unit: 'nm' },
      { code: 'BND', name: 'Binding Energy', value: view.metrics.bindingEnergy ?? 1, rawValue: view.metrics.bindingEnergy ?? 1, unit: 'eV' },
      { code: 'EFF', name: 'Removal', value: view.metrics.removalEfficiency ?? 50, rawValue: view.metrics.removalEfficiency ?? 50, unit: '%' }
    ]
    const maxF = Math.max(...fallback.map((i) => Math.abs(Number(i.value)) || 0), 1e-9)
    return fallback.map((item) => ({
      ...item,
      value: Number(((Math.abs(Number(item.value)) / maxF) * 100).toFixed(2)),
      rawValue: Number(Number(item.rawValue).toFixed(4))
    }))
  }, [view])
  const fingerprintData = useMemo(() => {
    if (view.parameterRadarData.length > 0) return view.parameterRadarData
    const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))
    return [
      { parameter: 'Efficiency', value: clamp(view.metrics.removalEfficiency ?? 50) },
      { parameter: 'Pore Fit', value: clamp(((view.metrics.poreSize ?? 1) / 3) * 100) },
      { parameter: 'Binding', value: clamp((Math.abs(view.metrics.bindingEnergy ?? 1) / 5) * 100) },
      { parameter: 'Neutral pH', value: clamp((1 - Math.min(1, Math.abs((view.metrics.ph ?? 7) - 7) / 7)) * 100) },
      {
        parameter: 'Thermal Stability',
        value: clamp((1 - Math.min(1, Math.abs((view.metrics.temperature ?? 25) - 25) / 50)) * 100)
      }
    ]
  }, [view])
  const donutData = useMemo(() => {
    if (view.parameterDonutData.length > 0) return view.parameterDonutData
    const sorted = compositionData
      .filter((item) => item.rawValue > 0 || item.value > 0)
      .map((item) => ({
        code: item.code,
        name: item.name,
        value: Math.max(item.rawValue, 1e-9),
        rawValue: item.rawValue,
        unit: item.unit
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return sorted.length > 0 ? sorted : [{ code: 'N/A', name: 'No Data', value: 1, rawValue: 0, unit: '' }]
  }, [compositionData, view.parameterDonutData])
  const donutColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

  const handleExportCsv = async (): Promise<void> => {
    if (!id || status !== 'Success' || isImported) return
    setIsExporting(true)
    setError(null)
    try {
      const result = await exportFilterCsv(id)
      if (result.kind !== 'csvText') {
        throw new Error('Unexpected export response (expected CSV text).')
      }
      const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' })
      const href = URL.createObjectURL(blob)
      const preferredName = details?.measurementName?.trim() || details?.studyName?.trim() || 'filter'
      const fileStem = toSafeFileStem(preferredName)
      const link = document.createElement('a')
      link.href = href
      link.setAttribute('download', `${fileStem}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(href)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  const importedReady = !isImported || Boolean(importedSession?.importedFilterJson)
  const childNavState = isImported ? importedSession ?? undefined : undefined

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/filters')}
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">Filter Details</h1>
              {dashboardReady ? <MethodChip method={view.method} /> : null}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {isImported && importedSession?.importedFileName ? (
                <>
                  Imported <span className="text-foreground">{importedSession.importedFileName}</span> · local
                  preview (not saved) · {details?.filterId ?? id}
                </>
              ) : (
                <>
                  Filter {id ?? '-'} · Generated {createdAt}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/filters/${id}/analysis`, { state: childNavState })}
            disabled={!id || !importedReady}
          >
            <Microscope size={16} strokeWidth={1.5} />
            Analyze
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/filters/${id}/visualize`, { state: childNavState })}
            disabled={!id || !importedReady}
          >
            <Eye size={16} strokeWidth={1.5} />
            Visualize
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/filters/${id}/simulate`, { state: childNavState })}
            disabled={!id || !importedReady}
          >
            <Play size={16} strokeWidth={1.5} />
            Simulate
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleExportCsv()}
            disabled={status !== 'Success' || isExporting || isImported}
            title={isImported ? 'Export is only available for saved filters.' : undefined}
          >
            <Download size={16} strokeWidth={1.5} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[6px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Status</p>
          <StatusBadge status={displayStatus} />
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Study ID</p>
          <p className="text-sm font-medium font-mono">{details?.studyId ?? '-'}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Measurement ID</p>
          <p className="font-mono text-xs">{details?.measurementId ?? '-'}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Created</p>
          <p className="font-mono text-xs">{createdAt}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading filter status...
        </div>
      ) : null}

      {!isLoading && !dashboardReady ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm">
          {isFilterStatusWaiting(status) ? (
            <div className="space-y-3">
              <FilterStatusWithProgress
                status={displayStatus}
                progressPercent={progress.progressPercent}
                currentStep={progress.currentStep}
              />
              <p className="text-xs text-muted-foreground">
                Details and export unlock when status becomes Success.
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Filter is currently <StatusBadge status={displayStatus} />. Details and export unlock when status
              becomes Success.
            </div>
          )}
        </div>
      ) : null}

      {!isLoading && dashboardReady ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[6px] border border-border bg-card p-4">
                <p className="scientific-label mb-2">{card.label}</p>
                <p className="font-mono text-sm">{card.value}</p>
              </div>
            ))}
          </div>

          {view.layerRows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Filter Composition</h2>
                <p className="text-xs text-muted-foreground">
                  {view.layerRows.length} layer{view.layerRows.length === 1 ? '' : 's'}
                  {' · '}
                  {view.layerRows.filter((r) => r.mode === 'filtration').length} filtration
                  {' · '}
                  {view.layerRows.filter((r) => r.mode === 'enrichment').length} enrichment
                </p>
              </div>

              {view.enrichmentSummary?.enabled && (view.enrichmentSummary.minerals?.length ?? 0) > 0 ? (
                <div className="rounded-[6px] border border-emerald-300 bg-emerald-50/70 px-4 py-3 text-sm dark:border-emerald-500/40 dark:bg-emerald-500/10">
                  <span className="font-medium text-emerald-900 dark:text-emerald-100">
                    Enriches with:
                  </span>{' '}
                  <span className="text-emerald-900/80 dark:text-emerald-100/80">
                    {view.enrichmentSummary.minerals?.join(', ')}
                  </span>
                  <span className="ml-2 text-xs text-emerald-900/60 dark:text-emerald-100/60">
                    · {view.enrichmentSummary.mineralCount ?? view.enrichmentSummary.minerals?.length ?? 0}{' '}
                    mineral{(view.enrichmentSummary.mineralCount ?? view.enrichmentSummary.minerals?.length ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {view.layerRows.map((row, index) => {
                  const isEnrichment = row.mode === 'enrichment'
                  const cardTone = isEnrichment
                    ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-500/40 dark:bg-emerald-500/5'
                    : 'border-border bg-card'
                  const modeChipTone = isEnrichment
                    ? 'border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100'
                    : 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-100'
                  const fmtPct = (value: number | null): string =>
                    value != null ? `${value.toFixed(2)}%` : '-'
                  const fmtEv = (value: number | null): string =>
                    value != null ? `${value.toFixed(4)} eV` : '-'
                  const fmtNm = (value: number | null): string =>
                    value != null ? `${value.toFixed(3)} nm` : '-'
                  return (
                    <div
                      key={`${row.pollutantSymbol}-${index}`}
                      className={`flex flex-col gap-3 rounded-[6px] border p-4 ${cardTone}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{row.pollutant}</p>
                          <p className="font-mono text-xs text-muted-foreground">{row.pollutantSymbol}</p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${modeChipTone}`}
                        >
                          {isEnrichment ? 'Enrichment' : 'Filtration'}
                        </span>
                      </div>

                      {row.mergedPollutants.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Also captures: {row.mergedPollutants.join(', ')}
                        </p>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {isEnrichment ? (
                          <>
                            <div>
                              <p className="scientific-label">Target</p>
                              <p className="font-mono">{row.targetConcentration ?? '-'}</p>
                            </div>
                            <div>
                              <p className="scientific-label">Release Rate</p>
                              <p className="font-mono">{fmtPct(row.releaseRate)}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="scientific-label">Removal</p>
                              <p className="font-mono">{fmtPct(row.removalEfficiency)}</p>
                            </div>
                            <div>
                              <p className="scientific-label">Layer Thickness</p>
                              <p className="font-mono">{fmtNm(row.layerThickness)}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="scientific-label">Pore Size</p>
                          <p className="font-mono">{fmtNm(row.poreSize)}</p>
                        </div>
                        <div>
                          <p className="scientific-label">Binding Energy</p>
                          <p className="font-mono">{fmtEv(row.bindingEnergy)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="scientific-label">Material</p>
                          <p className="font-mono">{row.materialType}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <MethodChip method={row.method || null} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <div className="rounded-[6px] border border-border bg-card p-4">
                  <h2 className="mb-2 text-sm font-semibold">Parameter Composition</h2>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compositionData} margin={{ top: 6, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(_value, _name, item) => {
                        const p = item?.payload as { rawValue?: number; unit?: string } | undefined
                        const raw = p?.rawValue
                        const u = p?.unit ?? ''
                        return [`${raw != null ? String(raw) : '-'} ${u}`.trim(), 'Measured']
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: 'hsl(var(--border))',
                        background: 'hsl(var(--card))'
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {view.parameterBarData.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Experimental parameter values unavailable; showing derived profile from filter metrics.
                </p>
              ) : null}
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Quality Fingerprint</h2>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={fingerprintData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="parameter"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tickCount={6}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.28} />
                    <Tooltip
                      formatter={(value) => [`${String(value ?? '-')}%`, 'Normalized']}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: 'hsl(var(--border))',
                        background: 'hsl(var(--card))'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {view.parameterRadarData.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Fingerprint is estimated from efficiency, pore size, binding, pH, and temperature.
                </p>
              ) : null}
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4 2xl:col-span-2">
              <h2 className="mb-2 text-sm font-semibold">Composition Share (Top Signals)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="code"
                      innerRadius={64}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`${entry.code}-${index}`} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value, _entry, index) => {
                        const data = donutData[index]
                        if (!data) return String(value)
                        return `${data.code}: ${data.rawValue} ${data.unit}`.trim()
                      }}
                    />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as { unit?: string; rawValue?: number } | undefined
                        const total = donutData.reduce((s, d) => s + d.value, 0)
                        const pct = total > 0 && value != null ? ((Number(value) / total) * 100).toFixed(1) : '0'
                        const raw = payload?.rawValue
                        return [
                          `${pct}% (${raw != null ? String(raw) : '-'} ${payload?.unit ?? ''})`.trim(),
                          'Share'
                        ]
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: 'hsl(var(--border))',
                        background: 'hsl(var(--card))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
