import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { getFilterDetails } from '@renderer/utils/api/endpoints'
import type { FilterInfo } from '@renderer/utils/api/types'
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'
import {
  buildFilterDetailsFromImportedJson,
  isImportedFilterRouteId,
  readImportedFilterSession
} from '@renderer/utils/importedFilterPayload'
import {
  buildEnrichmentConfigFromFilterInfo,
  DEFAULT_ENRICHMENT_CONFIG,
  EnrichmentEngine,
  type EnrichmentConfig,
  type EnrichmentStats
} from '@renderer/utils/enrichmentSimulation'

const EMPTY_STATS: EnrichmentStats = {
  totalWaterSpawned: 0,
  totalReleased: 0,
  releasedByType: {},
  concentrationByType: {},
  coverageRatio: 0
}

const formatConcentration = (mgPerL: number, unit: string): string => {
  if (!Number.isFinite(mgPerL)) return '–'
  if (unit === 'µg/L') {
    return `${(mgPerL * 1000).toFixed(1)} µg/L`
  }
  if (mgPerL < 1) return `${mgPerL.toFixed(2)} mg/L`
  return `${mgPerL.toFixed(1)} mg/L`
}

const statusForConcentration = (
  current: number,
  min: number,
  max: number
): 'below' | 'in range' | 'above' => {
  if (current < min) return 'below'
  if (current > max) return 'above'
  return 'in range'
}

const STATUS_STYLES: Record<'below' | 'in range' | 'above', string> = {
  below: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'in range': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  above: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
}

export function EnrichmentSimulation(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isImported = isImportedFilterRouteId(id)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<EnrichmentEngine | null>(null)
  const rafRef = useRef<number>(0)

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<EnrichmentConfig>(DEFAULT_ENRICHMENT_CONFIG)
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<EnrichmentStats>(EMPTY_STATS)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!id) {
      setLoading(false)
      setError('Missing filter ID.')
      return
    }

    if (isImported) {
      const session = readImportedFilterSession(location)
      if (!session?.importedFilterJson) {
        setFilterInfo(null)
        setError('No imported filter data. Open your JSON from All Filters first.')
        setLoading(false)
        return
      }
      try {
        const details = buildFilterDetailsFromImportedJson(session.importedFilterJson, session.importedFileName)
        if (cancelled) return
        setFilterInfo(details.filterInfo)
        const next = buildEnrichmentConfigFromFilterInfo(details.filterInfo)
        setConfig(next)
        if (engineRef.current) {
          engineRef.current.config = next
          engineRef.current.reset()
        }
        setError(null)
      } catch (parseError) {
        if (!cancelled) {
          setFilterInfo(null)
          setError(parseError instanceof Error ? parseError.message : 'Failed to load imported filter.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
      return () => {
        cancelled = true
      }
    }

    getFilterDetails(id)
      .then((resp) => {
        if (cancelled) return
        setFilterInfo(resp.filterInfo)
        const next = buildEnrichmentConfigFromFilterInfo(resp.filterInfo)
        setConfig(next)
        if (engineRef.current) {
          engineRef.current.config = next
          engineRef.current.reset()
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load simulation data.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isImported, location.state])

  const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo])
  const enrichmentEnabled = vm.enrichmentSummary?.enabled === true || vm.enrichmentMinerals.length > 0

  const getEngine = useCallback((): EnrichmentEngine => {
    if (!engineRef.current) {
      engineRef.current = new EnrichmentEngine(config)
    }
    return engineRef.current
  }, [config])

  useEffect(() => {
    if (loading) return
    if (!enrichmentEnabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = getEngine()
    engine.config = config
    engine.reset()

    const syncSize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      engine.resize(rect.width, rect.height)
    }

    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(canvas)

    let lastTime = 0
    let frameCount = 0

    const loop = (time: number): void => {
      const dt = lastTime === 0 ? 16 : Math.min(time - lastTime, 50)
      lastTime = time
      engine.tick(dt / 16, performance.now())
      engine.draw(ctx)
      frameCount++
      if (frameCount % 10 === 0) {
        setStats({
          totalWaterSpawned: engine.stats.totalWaterSpawned,
          totalReleased: engine.stats.totalReleased,
          releasedByType: { ...engine.stats.releasedByType },
          concentrationByType: { ...engine.stats.concentrationByType },
          coverageRatio: engine.stats.coverageRatio
        })
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [loading, enrichmentEnabled, getEngine, config])

  useEffect(() => {
    const engine = engineRef.current
    if (engine) engine.paused = !playing
  }, [playing])

  useEffect(() => {
    const engine = engineRef.current
    if (engine) engine.setSpeed(speed)
  }, [speed])

  const handleReset = (): void => {
    const engine = engineRef.current
    if (engine) {
      engine.reset()
      setStats(EMPTY_STATS)
    }
  }

  const minerals = config.minerals
  const coveragePct = Math.round(stats.coverageRatio * 100)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() =>
              navigate(`/filters/${id}`, {
                state: isImported ? readImportedFilterSession(location) ?? undefined : undefined
              })
            }
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Enrichment Simulation</h1>
            <p className="font-mono text-xs text-muted-foreground">Filter {id ?? '-'}</p>
          </div>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!enrichmentEnabled ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md rounded-[8px] border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <h2 className="mb-2 text-base font-semibold text-foreground">No enrichment layers</h2>
            <p>This filter has no enrichment layers configured. Generate a filter with enrichment enabled to view the release simulation.</p>
            <button
              onClick={() => navigate(`/filters/${id ?? ''}`)}
              className="mt-4 rounded-[6px] border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              Back to Filter
            </button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black">
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaying((prev) => !prev)}
                className="w-24"
              >
                {playing ? (
                  <>
                    <Pause size={14} strokeWidth={1.5} /> Pause
                  </>
                ) : (
                  <>
                    <Play size={14} strokeWidth={1.5} /> Play
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.25}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="h-1 w-28 cursor-pointer accent-primary"
                />
                <span className="w-10 text-right font-mono text-xs text-foreground">
                  {speed.toFixed(2)}x
                </span>
              </div>

              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw size={14} strokeWidth={1.5} /> Reset
              </Button>
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Filter Properties</h2>
            <div className="mb-4 space-y-1.5 text-sm">
              {config.materialType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material</span>
                  <span className="font-mono text-xs">{config.materialType}</span>
                </div>
              )}
              {config.poreSize != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pore Size</span>
                  <span className="font-mono text-xs">{config.poreSize.toFixed(3)} nm</span>
                </div>
              )}
              {config.layerThickness != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Layer Thickness</span>
                  <span className="font-mono text-xs">{config.layerThickness.toFixed(3)} nm</span>
                </div>
              )}
              {config.bindingEnergy != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Binding Energy</span>
                  <span className="font-mono text-xs">{config.bindingEnergy.toFixed(4)} eV</span>
                </div>
              )}
              {config.temperature != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temperature</span>
                  <span className="font-mono text-xs">{config.temperature.toFixed(2)} °C</span>
                </div>
              )}
              {config.ph != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">pH</span>
                  <span className="font-mono text-xs">{config.ph.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t border-border" />

            <h2 className="mb-3 text-sm font-semibold">Mineral Targets</h2>
            <div className="mb-4 space-y-2">
              {minerals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No minerals configured.</p>
              ) : (
                minerals.map((m) => {
                  const current = stats.concentrationByType[m.mineral.key] ?? 0
                  const status = statusForConcentration(current, m.targetMin, m.targetMax)
                  const inRange = status === 'in range'
                  return (
                    <div
                      key={m.mineral.key}
                      className={`rounded-[6px] border p-2.5 ${
                        inRange
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-border/60 bg-background/40'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: m.mineral.color }}
                        />
                        <span className="flex-1 truncate text-sm font-medium text-foreground">
                          {m.mineral.label}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Target band</span>
                          <span className="font-mono text-foreground">
                            {formatConcentration(m.targetMin, m.unit)} – {formatConcentration(m.targetMax, m.unit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current</span>
                          <span className="font-mono text-foreground">
                            {formatConcentration(current, m.unit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Release rate</span>
                          <span className="font-mono text-foreground">
                            {m.releaseRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="my-3 border-t border-border" />

            <h2 className="mb-3 text-sm font-semibold">Simulation Stats</h2>
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Water Spawned</span>
                <span className="font-mono">{stats.totalWaterSpawned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Released</span>
                <span className="font-mono text-emerald-400">{stats.totalReleased}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coverage in band</span>
                <span className="font-mono font-semibold text-emerald-400">{coveragePct}%</span>
              </div>
            </div>

            <div className="my-3 border-t border-border" />

            <h3 className="mb-2 text-sm font-semibold">Released by Type</h3>
            <div className="space-y-1.5">
              {minerals.map((m) => {
                const released = stats.releasedByType[m.mineral.key] ?? 0
                const current = stats.concentrationByType[m.mineral.key] ?? 0
                return (
                  <div key={m.mineral.key} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: m.mineral.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {m.mineral.label}
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground/80">
                        ({formatConcentration(current, m.unit)})
                      </span>
                    </span>
                    <span className="font-mono text-xs">{released}</span>
                  </div>
                )
              })}
            </div>

            <div className="my-3 border-t border-border" />

            <h3 className="mb-2 text-sm font-semibold">Legend</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: '#3b82f6' }}
                />
                <span className="text-muted-foreground">H2O — Water</span>
                <span className="ml-auto text-[10px] text-blue-400">passes</span>
              </div>
              {minerals.map((m) => (
                <div key={`legend-${m.mineral.key}`} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: m.mineral.color }}
                  />
                  <span className="text-muted-foreground">
                    {m.mineral.symbol} — {m.mineral.label.replace(/\s*\(.*\)$/, '')}
                  </span>
                  <span className="ml-auto text-[10px] text-emerald-400">released</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
