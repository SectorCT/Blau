import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as $3Dmol from '3dmol'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { getFilterDetails } from '@renderer/utils/api/endpoints'
import type { FilterInfo } from '@renderer/utils/api/types'
import { atomPositionsToXyz, buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'
import { MINERAL_ELEMENTS, ENRICHMENT_MINERALS } from '@renderer/data/enrichmentMinerals'
import {
  IMPORTED_FILTER_ROUTE_ID,
  normalizeImportedFilterInfo,
  readImportedFilterSession,
  writeImportedFilterSession,
  type ImportedFilterLocationState,
} from '@renderer/utils/importedFilterPayload'

type SelectedAtomInfo = {
  index: number | string
  element: string
  bonds: number
  bondTargets: string
  x: number
  y: number
  z: number
}
type ClickableAtom = {
  serial?: number
  index?: number | string
  bonds?: Array<number | string>
  elem?: string
  x: number
  y: number
  z: number
}
type ModelAtom = {
  elem: string
  x: number
  y: number
  z: number
  bonds: number[]
  bondOrder: number[]
}

const BASE_STYLE = { stick: { radius: 0.06 }, sphere: { scale: 0.15 } }
const DIM_STYLE = { stick: { radius: 0.05, opacity: 0.35 }, sphere: { scale: 0.13, opacity: 0.35 } }
const HIGHLIGHT_STYLE = { stick: { radius: 0.1 }, sphere: { scale: 0.45 } }

const ELEMENT_LABELS: Record<string, string> = {
  C: 'Carbon (scaffold)',
  O: 'Oxygen (scaffold)',
  N: 'Nitrogen (scaffold)',
  S: 'Sulfur (scaffold)',
  H: 'Hydrogen (scaffold)'
}

const MINERAL_COLOR_BY_ELEMENT: Record<string, string> = ENRICHMENT_MINERALS.reduce<
  Record<string, string>
>((acc, mineral) => {
  acc[mineral.element] = mineral.color
  return acc
}, {})

const MINERAL_LABEL_BY_ELEMENT: Record<string, string> = ENRICHMENT_MINERALS.reduce<
  Record<string, string>
>((acc, mineral) => {
  acc[mineral.element] = `${mineral.label}`
  return acc
}, {})

export function EnrichmentVisualization(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ReturnType<typeof $3Dmol.createViewer> | null>(null)
  const lastAtomClickRef = useRef(0)
  const [selectedAtom, setSelectedAtom] = useState<SelectedAtomInfo | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedFromName, setLoadedFromName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadImported = (session: ImportedFilterLocationState): void => {
      try {
        const importedInfo = normalizeImportedFilterInfo(session.importedFilterJson)
        if (cancelled) return
        setFilterInfo(importedInfo)
        setLoadedFromName(session.importedFileName ?? null)
        setError(null)
      } catch (importError) {
        if (!cancelled) {
          setFilterInfo(null)
          setError(importError instanceof Error ? importError.message : 'Failed to parse filter JSON.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (id === IMPORTED_FILTER_ROUTE_ID) {
      const session = readImportedFilterSession(location)
      if (!session?.importedFilterJson) {
        setFilterInfo(null)
        setError('No imported filter data. Open a JSON file from All Filters.')
        setLoading(false)
        return () => {
          cancelled = true
        }
      }
      loadImported(session)
      return () => {
        cancelled = true
      }
    }

    if (id) {
      getFilterDetails(id)
        .then((resp) => {
          if (!cancelled) setFilterInfo(resp.filterInfo)
        })
        .catch((fetchError) => {
          if (!cancelled) {
            setFilterInfo(null)
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter structure.')
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    const state = (location.state ?? {}) as ImportedFilterLocationState
    if (state.importedFilterJson !== undefined) {
      writeImportedFilterSession(state)
      navigate(`/filters/${IMPORTED_FILTER_ROUTE_ID}/enrich/visualize`, { replace: true, state })
      return () => {
        cancelled = true
      }
    }

    navigate('/filters', { replace: true })
    return () => {
      cancelled = true
    }
  }, [id, location.state, navigate])

  const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo])
  const enrichmentEnabled = vm.enrichmentSummary?.enabled === true || vm.enrichmentMinerals.length > 0
  const usingRealStructure = vm.atomPositions.length > 0
  const hasExplicitConnections = vm.atomConnections.length > 0
  const xyz = useMemo(
    () => (usingRealStructure ? atomPositionsToXyz(vm.atomPositions) : ''),
    [usingRealStructure, vm.atomPositions]
  )
  const atomCount = vm.atomPositions.length
  const modelAtoms = useMemo(() => {
    if (!hasExplicitConnections) return null
    const indexById = new Map(vm.atomPositions.map((atom, index) => [atom.id, index]))
    const atoms: ModelAtom[] = vm.atomPositions.map((atom) => ({
      elem: atom.element,
      x: atom.x,
      y: atom.y,
      z: atom.z,
      bonds: [],
      bondOrder: []
    }))
    for (const connection of vm.atomConnections) {
      const fromIndex = indexById.get(connection.from)
      const toIndex = indexById.get(connection.to)
      if (fromIndex == null || toIndex == null) continue
      atoms[fromIndex].bonds.push(toIndex)
      atoms[fromIndex].bondOrder.push(connection.order)
      atoms[toIndex].bonds.push(fromIndex)
      atoms[toIndex].bondOrder.push(connection.order)
    }
    return atoms
  }, [hasExplicitConnections, vm.atomConnections, vm.atomPositions])
  const elementCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const atom of vm.atomPositions) {
      const key = atom.element || 'Unknown'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [vm.atomPositions])
  const presentMineralElements = useMemo(
    () => elementCounts.filter(([element]) => MINERAL_ELEMENTS.has(element)),
    [elementCounts]
  )
  const presentScaffoldElements = useMemo(
    () => elementCounts.filter(([element]) => !MINERAL_ELEMENTS.has(element)).slice(0, 8),
    [elementCounts]
  )
  const hasMineralAtoms = presentMineralElements.length > 0

  const applyHighlightStyles = (
    viewer: ReturnType<typeof $3Dmol.createViewer> & {
      setColorByElement?: (sel: object, colors: Record<string, string>) => void
    }
  ): void => {
    if (hasMineralAtoms) {
      viewer.setStyle({}, DIM_STYLE)
      for (const element of MINERAL_ELEMENTS) {
        viewer.setStyle({ elem: element }, HIGHLIGHT_STYLE)
      }
    } else {
      viewer.setStyle({}, BASE_STYLE)
    }
    viewer.setColorByElement?.({}, { C: '#424242', ...MINERAL_COLOR_BY_ELEMENT })
  }

  const resetSelection = (): void => {
    setSelectedAtom(null)
    if (viewerRef.current) {
      const v = viewerRef.current as ReturnType<typeof $3Dmol.createViewer> & {
        setColorByElement?: (sel: object, colors: Record<string, string>) => void
      }
      applyHighlightStyles(v)
    }
    viewerRef.current?.removeAllLabels()
    viewerRef.current?.render()
  }

  useEffect(() => {
    if (loading) return
    if (!containerRef.current) return
    if (!usingRealStructure) return

    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: '#F9F8F6'
    })
    viewerRef.current = viewer
    if (modelAtoms) {
      const model = viewer.addModel()
      model.addAtoms(modelAtoms)
    } else if (xyz) {
      viewer.addModel(xyz, 'xyz')
    }
    const v = viewer as ReturnType<typeof $3Dmol.createViewer> & {
      setColorByElement?: (sel: object, colors: Record<string, string>) => void
    }
    applyHighlightStyles(v)
    viewer.setClickable({}, true, (atom: ClickableAtom) => {
      lastAtomClickRef.current = Date.now()
      const atomIndex = typeof atom?.serial === 'number' ? atom.serial : (atom?.index ?? '?')
      const targets = Array.isArray(atom?.bonds) ? atom.bonds.slice(0, 8).join(', ') : 'None'
      setSelectedAtom({
        index: atomIndex,
        element: atom?.elem ?? 'Unknown',
        bonds: Array.isArray(atom?.bonds) ? atom.bonds.length : 0,
        bondTargets: targets.length > 0 ? targets : 'None',
        x: atom.x,
        y: atom.y,
        z: atom.z
      })
      viewer.removeAllLabels()
      applyHighlightStyles(v)
      if (typeof atom?.serial === 'number') {
        viewer.setStyle({ serial: atom.serial }, { sphere: { scale: 0.55 }, stick: { radius: 0.14 } })
      } else if (typeof atom?.index === 'number') {
        viewer.setStyle({ index: atom.index }, { sphere: { scale: 0.55 }, stick: { radius: 0.14 } })
      }
      if (Array.isArray(atom?.bonds) && atom.bonds.length > 0) {
        viewer.setStyle(
          { index: atom.bonds as number[] },
          { sphere: { scale: 0.3 }, stick: { radius: 0.1 } }
        )
      }
      viewer.addLabel(`${atom?.elem ?? 'X'} (#${atomIndex})`, {
        position: { x: atom.x, y: atom.y, z: atom.z },
        backgroundColor: '#064e3b',
        fontColor: '#d1fae5',
        borderThickness: 0,
        inFront: true,
        showBackground: true
      })
      viewer.render()
    })
    viewer.zoomTo()
    viewer.render()

    const onResize = (): void => {
      viewer.resize()
    }
    window.addEventListener('resize', onResize)
    window.setTimeout(() => {
      viewer.resize()
    }, 0)

    return () => {
      window.removeEventListener('resize', onResize)
      viewer.clear()
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xyz, loading, atomCount, modelAtoms, hasMineralAtoms])

  const handleViewerClick = (): void => {
    if (!selectedAtom) return
    if (Date.now() - lastAtomClickRef.current < 120) return
    resetSelection()
  }

  const renderEmptyState = (): React.JSX.Element => (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-md rounded-[8px] border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <h2 className="mb-2 text-base font-semibold text-foreground">No enrichment layers</h2>
        <p>This filter has no enrichment layers configured. Generate a filter with enrichment enabled to view it here.</p>
        <button
          onClick={() => navigate(`/filters/${id ?? ''}`)}
          className="mt-4 rounded-[6px] border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          Back to Filter
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() =>
              id
                ? navigate(`/filters/${id}`, {
                    state:
                      id === IMPORTED_FILTER_ROUTE_ID
                        ? readImportedFilterSession(location) ?? undefined
                        : undefined,
                  })
                : navigate('/filters')
            }
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Enrichment Visualization</h1>
            <p className="font-mono text-xs text-muted-foreground">
              {loadedFromName ? `Imported JSON: ${loadedFromName}` : `Filter ${id ?? '-'}`}
            </p>
          </div>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[8px] border border-border bg-card">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!loading && !enrichmentEnabled ? renderEmptyState() : null}

      {!loading && enrichmentEnabled ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black">
              {usingRealStructure ? (
                <div ref={containerRef} className="absolute inset-0" onClick={handleViewerClick} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Backend atom coordinates unavailable for this filter.
                </div>
              )}
            </div>
            <div className="h-36 shrink-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Structure Description</h2>
              {selectedAtom ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Selected atom:{' '}
                    <span className="font-medium text-foreground">{selectedAtom.element}</span> #
                    <span className="font-mono text-foreground">{selectedAtom.index}</span>
                  </p>
                  <p>
                    Connections:{' '}
                    <span className="font-mono text-foreground">{selectedAtom.bonds}</span>
                  </p>
                  <p>
                    Bonded atom indexes:{' '}
                    <span className="font-mono text-foreground">{selectedAtom.bondTargets}</span>
                  </p>
                  <p>
                    Position (A):{' '}
                    <span className="font-mono text-foreground">
                      {selectedAtom.x.toFixed(3)}, {selectedAtom.y.toFixed(3)}, {selectedAtom.z.toFixed(3)}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    {hasMineralAtoms
                      ? 'Highlighted atoms are mineral release sites bound to the filter scaffold. Scaffold atoms are dimmed for contrast.'
                      : 'Filter scaffold structure shown. Mineral release sites are tracked in the simulation; the bound species are not present in the static atom list.'}
                  </p>
                  <p>
                    Material: <span className="font-mono text-foreground">{vm.metrics.materialType}</span>{' '}
                    | Pore Size:{' '}
                    <span className="font-mono text-foreground">
                      {vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a'}
                    </span>
                  </p>
                  <p>Click an atom to inspect it. Click empty space to return to this summary.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Legend</h2>
            <div className="space-y-2 text-sm">
              {presentMineralElements.map(([element]) => (
                <div key={`legend-${element}`} className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: MINERAL_COLOR_BY_ELEMENT[element] ?? '#888' }}
                  />
                  <span>
                    <span className="font-medium text-foreground">{element}</span>{' '}
                    {MINERAL_LABEL_BY_ELEMENT[element] ?? 'Mineral'}
                  </span>
                </div>
              ))}
              {presentScaffoldElements.map(([element]) => (
                <p key={`legend-${element}`} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{element}</span>{' '}
                  {ELEMENT_LABELS[element] ?? 'Scaffold element'}
                </p>
              ))}
            </div>

            <div className="my-4 border-t border-border" />

            <h3 className="mb-2 text-sm font-semibold">Enrichment Targets</h3>
            <div className="space-y-3 text-sm">
              {vm.enrichmentMinerals.length === 0 ? (
                <p className="text-muted-foreground">No enrichment minerals reported.</p>
              ) : (
                vm.enrichmentMinerals.map((view) => (
                  <div key={view.mineral.key} className="rounded-[6px] border border-border/60 bg-background/40 p-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: view.mineral.color }}
                      />
                      <span className="font-medium text-foreground">{view.mineral.label}</span>
                    </div>
                    <div className="mt-1.5 space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Target band</span>
                        <span className="font-mono text-foreground">
                          {view.targetConcentration ?? view.mineral.target}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Release rate</span>
                        <span className="font-mono text-foreground">
                          {view.releaseRate != null ? `${view.releaseRate.toFixed(1)}%` : 'n/a'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Layer thickness</span>
                        <span className="font-mono text-foreground">
                          {view.layerThickness != null ? `${view.layerThickness.toFixed(3)} nm` : 'n/a'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Binding energy</span>
                        <span className="font-mono text-foreground">
                          {view.bindingEnergy != null ? `${view.bindingEnergy.toFixed(4)} eV` : 'n/a'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="my-4 border-t border-border" />

            <h3 className="mb-2 text-sm font-semibold">Filter Scaffold</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Material: <span className="font-mono text-foreground">{vm.metrics.materialType}</span>
              </p>
              <p>
                Pore Size:{' '}
                <span className="font-mono text-foreground">
                  {vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a'}
                </span>
              </p>
              <p>
                Layer Thickness:{' '}
                <span className="font-mono text-foreground">
                  {vm.metrics.layerThickness != null ? `${vm.metrics.layerThickness.toFixed(3)} nm` : 'n/a'}
                </span>
              </p>
              <p>
                Lattice Spacing:{' '}
                <span className="font-mono text-foreground">
                  {vm.metrics.latticeSpacing != null ? `${vm.metrics.latticeSpacing.toFixed(3)} A` : 'n/a'}
                </span>
              </p>
              <p>
                Atoms: <span className="font-mono text-foreground">{atomCount}</span>
              </p>
              <p>
                Connections:{' '}
                <span className="font-mono text-foreground">
                  {hasExplicitConnections ? vm.atomConnections.length : 'inferred'}
                </span>
              </p>
            </div>

            <div className="my-4 border-t border-border" />

            <h3 className="mb-2 text-sm font-semibold">Sample Conditions</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Temperature:{' '}
                <span className="font-mono text-foreground">
                  {vm.metrics.temperature != null ? `${vm.metrics.temperature.toFixed(2)} C` : 'n/a'}
                </span>
              </p>
              <p>
                pH:{' '}
                <span className="font-mono text-foreground">
                  {vm.metrics.ph != null ? vm.metrics.ph.toFixed(2) : 'n/a'}
                </span>
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
