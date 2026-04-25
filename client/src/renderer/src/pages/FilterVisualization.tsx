import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as $3Dmol from '3dmol'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { getFilterDetails } from '@renderer/utils/api/endpoints'
import type { FilterInfo } from '@renderer/utils/api/types'
import { atomPositionsToXyz, buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'
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
type VisualizationMode = 'molecular' | 'physical'

const BASE_ELEMENTS = ['C', 'N', 'O', 'S', 'H'] as const
const BASE_STYLE = { stick: { radius: 0.06 }, sphere: { scale: 0.15 } }
const ELEMENT_LABELS: Record<string, string> = {
  C: 'Carbon (black)',
  O: 'Oxygen (red)',
  N: 'Nitrogen (blue)',
  S: 'Sulfur (yellow)',
  H: 'Hydrogen (white)'
}

function randomFrom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]
}

function buildRandomMoleculeXYZ(seed: number): string {
  const atomCount = 240 + Math.floor((seed % 40) + Math.random() * 80)
  const atoms: string[] = []

  for (let i = 0; i < atomCount; i++) {
    const chain = Math.floor(i / 22)
    const angle = i * 0.42 + Math.random() * 0.35
    const radius = 2.4 + chain * 0.34 + Math.random() * 0.2
    const x = Number((Math.cos(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4))
    const y = Number((Math.sin(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4))
    const z = Number(((i % 22) * 0.33 - 3.6 + (Math.random() - 0.5) * 0.6).toFixed(4))
    const element = i % 6 === 0 ? randomFrom(BASE_ELEMENTS) : 'C'
    atoms.push(`${element} ${x} ${y} ${z}`)
  }

  return `${atomCount}
Stress test random structure
${atoms.join('\n')}`
}

function downsampleXyz(xyz: string, maxAtoms: number): string {
  const lines = xyz.split('\n')
  const declaredCount = Number(lines[0] ?? 0)
  if (!Number.isFinite(declaredCount) || declaredCount <= 0) return xyz
  if (declaredCount <= maxAtoms) return xyz

  const headerLine = lines[1] ?? 'Generated structure'
  const atomLines = lines.slice(2)
  const step = Math.ceil(declaredCount / maxAtoms)
  const sampled: string[] = []
  for (let i = 0; i < atomLines.length; i += step) {
    sampled.push(atomLines[i])
  }
  return `${sampled.length}\n${headerLine} (downsampled)\n${sampled.join('\n')}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function FilterVisualization(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ReturnType<typeof $3Dmol.createViewer> | null>(null)
  const lastAtomClickRef = useRef(0)
  const [seed] = useState(() => Date.now())
  const [selectedAtom, setSelectedAtom] = useState<SelectedAtomInfo | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedFromName, setLoadedFromName] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<VisualizationMode>('molecular')

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

    const state = (location.state ?? {}) as ImportedFilterLocationState & {
      uploadedFilterJson?: unknown
      uploadedFileName?: string
    }
    const legacyJson = state.importedFilterJson ?? state.uploadedFilterJson
    const fileName = state.importedFileName ?? state.uploadedFileName
    if (legacyJson !== undefined) {
      const next: ImportedFilterLocationState = { importedFilterJson: legacyJson, importedFileName: fileName }
      writeImportedFilterSession(next)
      navigate(`/filters/${IMPORTED_FILTER_ROUTE_ID}/visualize`, { replace: true, state: next })
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
  const filterStructure = filterInfo?.filterStructure
  const experimentPayload = filterInfo?.experimentPayload
  const resultPayload = filterInfo?.resultPayload
  const usingRealStructure = vm.atomPositions.length > 0
  const hasExplicitConnections = vm.atomConnections.length > 0
  const rawXyz = useMemo(
    () => (usingRealStructure ? atomPositionsToXyz(vm.atomPositions) : buildRandomMoleculeXYZ(seed)),
    [seed, usingRealStructure, vm.atomPositions]
  )
  const rawAtomCount = useMemo(() => Number(rawXyz.split('\n')[0] ?? 0), [rawXyz])
  const xyz = useMemo(
    () => (hasExplicitConnections ? rawXyz : downsampleXyz(rawXyz, 500)),
    [rawXyz, hasExplicitConnections]
  )
  const atomCount = useMemo(() => Number(xyz.split('\n')[0] ?? 0), [xyz])
  const isDownsampled = rawAtomCount > atomCount
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
    const source = vm.atomPositions
    const counts = new Map<string, number>()
    for (const atom of source) {
      const key = atom.element || 'Unknown'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [vm.atomPositions])
  const physicalNodes = useMemo(() => {
    if (vm.atomPositions.length === 0) return []
    const sampleSize = Math.min(220, vm.atomPositions.length)
    const step = Math.max(1, Math.floor(vm.atomPositions.length / sampleSize))
    const sampled = vm.atomPositions.filter((_, index) => index % step === 0).slice(0, sampleSize)
    const xs = sampled.map((atom) => atom.x)
    const ys = sampled.map((atom) => atom.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const xRange = Math.max(0.0001, maxX - minX)
    const yRange = Math.max(0.0001, maxY - minY)

    return sampled.map((atom, index) => {
      const normalizedX = (atom.x - minX) / xRange
      const normalizedY = (atom.y - minY) / yRange
      const jitter = ((index % 6) - 3) * 0.003
      return {
        id: atom.id,
        element: atom.element,
        cx: clamp(0.06 + normalizedX * 0.88 + jitter, 0.04, 0.96),
        cy: clamp(0.14 + normalizedY * 0.72, 0.1, 0.9),
        r: atom.element === 'C' ? 2.6 : atom.element === 'O' ? 2.2 : 2.0
      }
    })
  }, [vm.atomPositions])
  const poreBandHeight = useMemo(() => {
    const pore = vm.metrics.poreSize ?? 1.2
    return clamp(0.08 + pore / 22, 0.08, 0.22)
  }, [vm.metrics.poreSize])

  const resetSelection = (): void => {
    setSelectedAtom(null)
    if (viewerRef.current) {
      viewerRef.current.setStyle({}, BASE_STYLE)
      ;(viewerRef.current as unknown as { setColorByElement?: (sel: object, colors: Record<string, string>) => void })
        .setColorByElement?.({}, { C: '#424242' })
    }
    viewerRef.current?.removeAllLabels()
    viewerRef.current?.render()
  }

  useEffect(() => {
    if (viewMode !== 'molecular') {
      viewerRef.current?.clear()
      viewerRef.current = null
      return
    }
    if (loading) return
    if (!containerRef.current) return

    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: "#F9F8F6"
    })
    viewerRef.current = viewer
    if (modelAtoms) {
      const model = viewer.addModel()
      model.addAtoms(modelAtoms)
    } else {
      viewer.addModel(xyz, 'xyz')
    }
    viewer.setStyle({}, BASE_STYLE)
    ;(viewer as unknown as { setColorByElement?: (sel: object, colors: Record<string, string>) => void })
      .setColorByElement?.({}, { C: '#424242' })
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
      viewer.setStyle({}, BASE_STYLE)
      ;(viewer as unknown as { setColorByElement?: (sel: object, colors: Record<string, string>) => void })
        .setColorByElement?.({}, { C: '#424242' })
      if (typeof atom?.serial === 'number') {
        viewer.setStyle(
          { serial: atom.serial },
          {
            sphere: { scale: 0.34 },
            stick: { radius: 0.12 }
          }
        )
      } else if (typeof atom?.index === 'number') {
        viewer.setStyle(
          { index: atom.index },
          {
            sphere: { scale: 0.34 },
            stick: { radius: 0.12 }
          }
        )
      }
      if (Array.isArray(atom?.bonds) && atom.bonds.length > 0) {
        viewer.setStyle(
          { index: atom.bonds as number[] },
          {
            sphere: { scale: 0.21 },
            stick: { radius: 0.09 }
          }
        )
      }
      viewer.addLabel(`${atom?.elem ?? 'X'} (#${atomIndex})`, {
        position: { x: atom.x, y: atom.y, z: atom.z },
        backgroundColor: '#111827',
        fontColor: '#e5e7eb',
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
  }, [xyz, loading, atomCount, modelAtoms, viewMode])

  const handleViewerClick = (): void => {
    if (!selectedAtom) return
    if (Date.now() - lastAtomClickRef.current < 120) return
    resetSelection()
  }

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
            <h1 className="text-xl font-semibold">Filter Visualization</h1>
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

      {!loading ? (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black">
            {viewMode === 'molecular' ? (
              <div ref={containerRef} className="absolute inset-0" onClick={handleViewerClick} />
            ) : (
              <div className="absolute inset-0 flex flex-col bg-slate-950 text-slate-100">
                <div className="border-b border-slate-800 px-4 py-3 text-xs text-slate-300">
                  Contaminated water input
                </div>
                <div className="relative h-[12%] overflow-hidden border-b border-cyan-900/50 bg-cyan-500/15">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cyan-300/30" />
                </div>
                <div className="relative h-[48%] overflow-hidden border-y border-slate-700 bg-slate-800/90">
                  {physicalNodes.map((node) => (
                    <span
                      key={`physical-node-${node.id}`}
                      className="absolute block rounded-full"
                      style={{
                        left: `${node.cx * 100}%`,
                        top: `${node.cy * 100 - 18}%`,
                        width: `${node.r * 2}px`,
                        height: `${node.r * 2}px`,
                        backgroundColor:
                          node.element === 'C' ? '#475569' : node.element === 'O' ? '#ef4444' : '#e2e8f0',
                        boxShadow: '0 0 0.5px rgba(255,255,255,0.6)'
                      }}
                    />
                  ))}
                  <div
                    className="absolute inset-x-2 bg-cyan-300/20"
                    style={{
                      top: `${50 - poreBandHeight * 50}%`,
                      height: `${poreBandHeight * 100}%`
                    }}
                  />
                  <div className="absolute left-3 top-2 rounded bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300">
                    Membrane body
                  </div>
                </div>
                <div className="flex h-[28%] items-center justify-center border-t border-emerald-900/50 bg-emerald-500/10 text-sm text-emerald-200">
                  Filtered output
                </div>
              </div>
            )}
          </div>
          <div className="h-36 shrink-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Structure Description</h2>
            {viewMode === 'molecular' && selectedAtom ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Selected atom: <span className="font-medium text-foreground">{selectedAtom.element}</span> #
                  <span className="font-mono text-foreground">{selectedAtom.index}</span>
                </p>
                <p>
                  Connections: <span className="font-mono text-foreground">{selectedAtom.bonds}</span>
                </p>
                <p>
                  Bonded atom indexes: <span className="font-mono text-foreground">{selectedAtom.bondTargets}</span>
                </p>
                <p>
                  Position (A):{' '}
                  <span className="font-mono text-foreground">
                    {selectedAtom.x.toFixed(3)}, {selectedAtom.y.toFixed(3)}, {selectedAtom.z.toFixed(3)}
                  </span>
                </p>
              </div>
            ) : viewMode === 'molecular' ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {usingRealStructure
                    ? hasExplicitConnections
                      ? 'Structure loaded from backend atom coordinates with explicit connection graph.'
                      : 'Structure loaded from backend atom coordinates with inferred connectivity.'
                    : 'Backend atom coordinates unavailable, so a generated fallback topology is shown.'}
                </p>
                <p>
                  Material:{' '}
                  <span className="font-mono text-foreground">{vm.metrics.materialType}</span> | Pore Size:{' '}
                  <span className="font-mono text-foreground">
                    {vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a'}
                  </span>{' '}
                  | Removal:{' '}
                  <span className="font-mono text-foreground">
                    {vm.metrics.removalEfficiency != null ? `${vm.metrics.removalEfficiency.toFixed(2)}%` : 'n/a'}
                  </span>
                </p>
                <p>Click an atom to inspect it. Click empty space to return to this summary.</p>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Physical mode turns the molecular coordinates into a membrane cross-section: darker particles indicate
                  the solid matrix, and the blue channel illustrates the effective pore corridor.
                </p>
                <p>
                  This helps connect nanoscale structure with a real-world filter shape (water inlet, membrane body, and
                  filtered outlet).
                </p>
                <p>Use the switch in the legend panel to return to atom-level molecular inspection.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Legend</h2>
            <div className="inline-flex rounded-[6px] border border-border bg-background p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('molecular')}
                className={`rounded-[4px] px-2 py-1 transition-colors ${
                  viewMode === 'molecular'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Molecular
              </button>
              <button
                type="button"
                onClick={() => setViewMode('physical')}
                className={`rounded-[4px] px-2 py-1 transition-colors ${
                  viewMode === 'physical'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Physical
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {elementCounts.length > 0 ? (
              elementCounts.map(([element]) => (
                <p key={`legend-${element}`} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{element}</span>{' '}
                  {ELEMENT_LABELS[element] ?? 'Element'}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">No elements available.</p>
            )}
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Graph Info</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Atoms: <span className="font-mono text-foreground">{atomCount}</span>
              {isDownsampled ? (
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  (from {rawAtomCount}, perf mode)
                </span>
              ) : null}
            </p>
            <p>
              Connections:{' '}
              <span className="font-mono text-foreground">
                {hasExplicitConnections ? vm.atomConnections.length : 'inferred'}
              </span>
            </p>
            <p>
              Structure:{' '}
              <span className="text-foreground">
                {usingRealStructure ? 'Atom coordinates from API payload' : 'Randomized test topology'}
              </span>
            </p>
            <p>
              Purpose:{' '}
              <span className="text-foreground">
                {usingRealStructure ? 'Real backend filter structure' : 'Renderer stress/perf fallback'}
              </span>
            </p>
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Filter Metrics</h3>
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
              Binding Energy:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.bindingEnergy != null ? `${vm.metrics.bindingEnergy.toFixed(4)} eV` : 'n/a'}
              </span>
            </p>
            <p>
              Removal Efficiency:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.removalEfficiency != null ? `${vm.metrics.removalEfficiency.toFixed(2)}%` : 'n/a'}
              </span>
            </p>
            <p>
              Pollutant: <span className="font-mono text-foreground">{vm.metrics.pollutant}</span>
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
              pH: <span className="font-mono text-foreground">{vm.metrics.ph != null ? vm.metrics.ph.toFixed(2) : 'n/a'}</span>
            </p>
            <p>
              Parameters: <span className="font-mono text-foreground">{vm.metrics.parameterCount}</span>
            </p>
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Element Composition</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            {elementCounts.length > 0 ? (
              elementCounts.map(([element, count]) => (
                <p key={element}>
                  {element}: <span className="font-mono text-foreground">{count}</span>
                </p>
              ))
            ) : (
              <p>No atomic composition available.</p>
            )}
          </div>

          {(filterStructure || experimentPayload || resultPayload) ? (
            <>
              <div className="my-4 border-t border-border" />
              <h3 className="mb-2 text-sm font-semibold">Payload Availability</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  filterStructure:{' '}
                  <span className="font-mono text-foreground">{filterStructure ? 'present' : 'missing'}</span>
                </p>
                <p>
                  experimentPayload:{' '}
                  <span className="font-mono text-foreground">{experimentPayload ? 'present' : 'missing'}</span>
                </p>
                <p>
                  resultPayload: <span className="font-mono text-foreground">{resultPayload ? 'present' : 'missing'}</span>
                </p>
              </div>
            </>
          ) : null}
        </aside>
      </div>
      ) : null}
    </div>
  )
}
