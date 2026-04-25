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
  const [zoomTransition, setZoomTransition] = useState(0)

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
  useEffect(() => {
    setZoomTransition(0)
  }, [xyz])
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
  }, [xyz, loading, atomCount, modelAtoms])

  const handleViewerClick = (): void => {
    if (!selectedAtom) return
    if (Date.now() - lastAtomClickRef.current < 120) return
    resetSelection()
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container || loading) return

    const onWheel = (event: WheelEvent): void => {
      const direction = Math.sign(event.deltaY)
      if (direction === 0) return
      // Positive deltaY = zoom out (pull back) in 3Dmol; negative = zoom in.
      // Scope / cylinder view should strengthen on zoom out, fade on zoom in.
      setZoomTransition((prev) => Math.min(1, Math.max(0, prev + direction * 0.07)))
    }

    container.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      container.removeEventListener('wheel', onWheel)
    }
  }, [loading])

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
            <div
              ref={containerRef}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: Math.max(0.2, 1 - zoomTransition * 0.78) }}
              onClick={handleViewerClick}
            />
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-500"
              style={{ opacity: zoomTransition }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 85% 55% at 50% 48%, rgba(120,200,255,0.12), rgba(6,14,24,0.95) 55%, rgba(2,6,12,1))'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <svg
                  className="h-full max-h-[min(420px,55vh)] w-full max-w-[min(720px,92%)]"
                  viewBox="0 0 720 280"
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="fv-cyl-body" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#5a7a8e" stopOpacity="0.95" />
                      <stop offset="45%" stopColor="#2d4150" stopOpacity="1" />
                      <stop offset="100%" stopColor="#1a2833" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="fv-cyl-cap" x1="0%" y1="50%" x2="100%" y2="50%">
                      <stop offset="0%" stopColor="#7a9eb5" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#3d5566" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="fv-water-in" x1="0%" y1="50%" x2="100%" y2="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.55" />
                    </linearGradient>
                    <linearGradient id="fv-water-out" x1="100%" y1="50%" x2="0%" y2="50%">
                      <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.65" />
                    </linearGradient>
                    <filter id="fv-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2.2" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <ellipse cx="108" cy="140" rx="22" ry="78" fill="url(#fv-cyl-cap)" stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="1" />
                  <rect x="108" y="62" width="504" height="156" fill="url(#fv-cyl-body)" />
                  <path d="M108 62 Q360 42 612 62 L612 218 Q360 238 108 218 Z" fill="url(#fv-cyl-body)" opacity="0.92" />
                  <ellipse cx="612" cy="140" rx="22" ry="78" fill="url(#fv-cyl-cap)" stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="1" />

                  <rect x="358" y="58" width="4" height="164" fill="#e2e8f0" opacity="0.85" filter="url(#fv-glow)" />
                  <rect x="356" y="56" width="8" height="168" fill="none" stroke="#f8fafc" strokeOpacity="0.25" strokeWidth="0.75" rx="1" />

                  <path
                    d="M 40 155 C 120 155, 160 130, 200 128 C 260 125, 300 138, 356 138"
                    fill="none"
                    stroke="url(#fv-water-in)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                  <path
                    d="M 40 155 C 120 155, 160 130, 200 128 C 260 125, 300 138, 356 138"
                    fill="none"
                    stroke="#7dd3fc"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeDasharray="10 18"
                    opacity="0.9"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-280" dur="2.4s" repeatCount="indefinite" />
                  </path>

                  <path
                    d="M 364 138 C 420 138, 480 125, 540 128 C 580 130, 640 148, 688 152"
                    fill="none"
                    stroke="url(#fv-water-out)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                  <path
                    d="M 364 138 C 420 138, 480 125, 540 128 C 580 130, 640 148, 688 152"
                    fill="none"
                    stroke="#a5f3fc"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="8 16"
                    opacity="0.85"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-240" dur="2.1s" repeatCount="indefinite" />
                  </path>

                  <ellipse cx="360" cy="72" rx="200" ry="14" fill="none" stroke="#64748b" strokeOpacity="0.25" strokeWidth="1" />
                  <ellipse cx="360" cy="208" rx="200" ry="14" fill="none" stroke="#0f172a" strokeOpacity="0.5" strokeWidth="1" />
                </svg>
              </div>
              <div className="absolute bottom-3 left-3 rounded bg-black/45 px-2 py-1 text-[11px] text-slate-200">
                Scope: feed water (left) - membrane - permeate (right)
              </div>
            </div>
          </div>
          <div className="h-36 shrink-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Structure Description</h2>
            {selectedAtom ? (
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
            ) : (
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
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Legend</h2>
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
