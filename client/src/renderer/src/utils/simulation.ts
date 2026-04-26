import type { FilterInfo } from '@renderer/utils/api/types'
import {
  getAggregateBindingEnergyEv,
  getAggregatePoreSizeNm,
  getAggregateRemovalEfficiencyPercent,
  getFilterLayers,
  getSummaryMetrics
} from '@renderer/utils/normalizeFilterStructure'
import {
  buildEnrichmentConfigFromFilterInfo,
  type EnrichmentMineralRuntime
} from '@renderer/utils/enrichmentSimulation'

export type MoleculeType = {
  code: string
  name: string
  color: string
  radius: number
  filterable: boolean
  captureStage: number | null
  spawnWeight: number
  /** Per-pollutant removal efficiency from the matching filtration layer (0-100). */
  captureEfficiency?: number
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  type: MoleculeType
  captured: boolean
  captureX: number
  captureY: number
  passed: boolean
  opacity: number
}

type EnrichBoundSite = {
  mineralKey: string
  color: string
  symbol: string
  x: number
  y: number
  radius: number
  cooldownUntil: number
}

type MineralParticle = {
  mineralKey: string
  color: string
  symbol: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  detectedAt: number | null
}

export type SimulationStats = {
  totalSpawned: number
  totalPassed: number
  totalContaminantsSpawned: number
  capturedByType: Record<string, number>
  mineralsByType: Record<string, number>
  mineralConcentrationByType: Record<string, number>
  mineralCoverageRatio: number
}

export type SimulationConfig = {
  moleculeTypes: MoleculeType[]
  waterRatio: number
  removalEfficiency: number
  poreSize?: number
  materialType?: string
  temperature?: number
  ph?: number
  pollutant?: string
  bindingEnergy?: number
  enrichmentMinerals?: EnrichmentMineralRuntime[]
}

const SPAWN_RATE = 3
const BASE_SPEED = 1.8
const BROWNIAN_STRENGTH = 0.4
const FILTER_WIDTH_RATIO = 0.08
// Shifted left to make room for the enrichment zone on the right
const FILTER_CENTER_RATIO = 0.34
const MAX_PARTICLES = 700

// Enrichment zone layout (ratios of canvas width)
const ZONE_SEPARATOR_RATIO = 0.55
const ENRICHMENT_ZONE_LEFT_RATIO = 0.58
const ENRICHMENT_ZONE_RIGHT_RATIO = 0.86
const ENRICHMENT_DETECTION_RATIO = 0.88
const ENRICHMENT_SITES_PER_MINERAL = 7
const ENRICHMENT_SITES_GRID_COLS = 3
const ENRICHMENT_CONCENTRATION_WINDOW_MS = 4000
const ENRICHMENT_RELEASE_COOLDOWN_MS = 600
const ENRICHMENT_MINERAL_SPEED = 1.6

const KNOWN_MOLECULES: Record<string, { name: string; color: string; radius: number }> = {
  NO3: { name: 'Nitrate', color: '#22c55e', radius: 5 },
  PO4: { name: 'Phosphate', color: '#f59e0b', radius: 5.5 },
  FE: { name: 'Iron', color: '#ef4444', radius: 6 },
  MN: { name: 'Manganese', color: '#a855f7', radius: 5 },
  CL: { name: 'Chloride', color: '#14b8a6', radius: 4.5 },
  TDS: { name: 'Dissolved Solids', color: '#6b7280', radius: 7 },
  TURB: { name: 'Turbidity', color: '#78716c', radius: 6.5 },
  HARD: { name: 'Total Hardness', color: '#d97706', radius: 6 },
  COND: { name: 'Conductivity', color: '#0ea5e9', radius: 5 },
  DO: { name: 'Dissolved Oxygen', color: '#06b6d4', radius: 4 }
}

const FALLBACK_COLORS = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#818cf8', '#e879f9']
const NON_MOLECULAR_CODES = new Set(['PH', 'TEMP'])

const WATER_TYPE: MoleculeType = {
  code: 'H2O',
  name: 'Water',
  color: '#3b82f6',
  radius: 3,
  filterable: false,
  captureStage: null,
  spawnWeight: 1
}

export const DEFAULT_MOLECULE_TYPES: MoleculeType[] = [
  { ...WATER_TYPE },
  { code: 'NO3', name: 'Nitrate', color: '#22c55e', radius: 5, filterable: true, captureStage: 3, spawnWeight: 1 },
  { code: 'PO4', name: 'Phosphate', color: '#f59e0b', radius: 5.5, filterable: true, captureStage: 3, spawnWeight: 1 },
  { code: 'FE', name: 'Iron', color: '#ef4444', radius: 6, filterable: true, captureStage: 2, spawnWeight: 1 },
  { code: 'MN', name: 'Manganese', color: '#a855f7', radius: 5, filterable: true, captureStage: 2, spawnWeight: 1 },
  { code: 'CL', name: 'Chloride', color: '#14b8a6', radius: 4.5, filterable: true, captureStage: 4, spawnWeight: 1 },
  { code: 'TDS', name: 'Dissolved Solids', color: '#6b7280', radius: 7, filterable: true, captureStage: 1, spawnWeight: 1 }
]

export const DEFAULT_CONFIG: SimulationConfig = {
  moleculeTypes: DEFAULT_MOLECULE_TYPES,
  waterRatio: 0.55,
  removalEfficiency: 100,
  materialType: 'Filter'
}

export function buildSimulationConfig(info: FilterInfo): SimulationConfig {
  const params = info.experimentPayload?.params ?? []
  const layers = getFilterLayers(info)
  const efficiency =
    getAggregateRemovalEfficiencyPercent(info) ??
    info.resultPayload?.removalEfficiency ??
    getSummaryMetrics(info)?.removalEfficiency ??
    (layers[0]?.removalEfficiency ?? 90)

  // Build symbol→efficiency from filtration-only layers so each pollutant gets its own rate.
  const symNorm = (s: string): string => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const filtrationLayers = layers.filter(
    (l) => typeof l.mode !== 'string' || l.mode.toLowerCase() !== 'enrichment'
  )
  const effBySymbol = new Map<string, number>()
  for (const layer of filtrationLayers) {
    const eff = typeof layer.removalEfficiency === 'number' ? layer.removalEfficiency : null
    if (eff == null) continue
    if (layer.pollutantSymbol) effBySymbol.set(symNorm(layer.pollutantSymbol), eff)
    if (Array.isArray(layer.mergedPollutants)) {
      for (const sym of layer.mergedPollutants) effBySymbol.set(symNorm(sym), eff)
    }
  }

  const contaminants: MoleculeType[] = []
  let fallbackIdx = 0

  for (const p of params) {
    const code = p.name.toUpperCase()
    if (NON_MOLECULAR_CODES.has(code)) continue
    const known = KNOWN_MOLECULES[code]
    const color = known?.color ?? FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length]
    const radius = known?.radius ?? 5
    const name = known?.name ?? p.name
    const captureEfficiency = effBySymbol.get(symNorm(code)) ?? efficiency

    contaminants.push({
      code,
      name,
      color,
      radius,
      filterable: true,
      captureStage: null,
      spawnWeight: Math.max(0.01, p.value),
      captureEfficiency
    })
  }

  const allTypes: MoleculeType[] = [{ ...WATER_TYPE }, ...contaminants]

  const totalContaminantWeight = contaminants.reduce((s, c) => s + c.spawnWeight, 0)
  const waterRatio = totalContaminantWeight > 0
    ? Math.max(0.3, Math.min(0.8, 1 - totalContaminantWeight / (totalContaminantWeight + 50)))
    : 0.55

  const firstLayer = layers[0]
  const enrichmentConfig = buildEnrichmentConfigFromFilterInfo(info)
  const enrichmentMinerals = enrichmentConfig.minerals.length > 0 ? enrichmentConfig.minerals : undefined

  return {
    moleculeTypes: allTypes,
    waterRatio,
    removalEfficiency: efficiency,
    poreSize:
      getAggregatePoreSizeNm(info) ?? info.filterStructure?.poreSize ?? firstLayer?.poreSize,
    materialType:
      info.filterStructure?.materialType ?? info.summaryMetrics?.materialType ?? firstLayer?.materialType,
    temperature: info.experimentPayload?.temperature,
    ph: info.experimentPayload?.ph,
    pollutant: info.resultPayload?.pollutant,
    bindingEnergy:
      getAggregateBindingEnergyEv(info) ??
      info.resultPayload?.bindingEnergy ??
      getSummaryMetrics(info)?.bindingEnergy ??
      firstLayer?.bindingEnergy,
    enrichmentMinerals
  }
}

export class SimulationEngine {
  particles: Particle[] = []
  stats: SimulationStats = {
    totalSpawned: 0,
    totalPassed: 0,
    totalContaminantsSpawned: 0,
    capturedByType: {},
    mineralsByType: {},
    mineralConcentrationByType: {},
    mineralCoverageRatio: 0
  }
  speed = 1
  paused = false
  config: SimulationConfig

  private width = 0
  private height = 0
  private spawnAccumulator = 0
  private contaminantCdf: { type: MoleculeType; cumWeight: number }[] = []
  private totalContaminantWeight = 0
  private enrichBoundSites: EnrichBoundSite[] = []
  private mineralParticles: MineralParticle[] = []
  private detectionLog: Array<{ key: string; t: number }> = []
  private enrichmentUnlocked = false

  constructor(config?: SimulationConfig) {
    this.config = config ?? DEFAULT_CONFIG
    this.rebuildCdf()
  }

  private rebuildCdf(): void {
    const contaminants = this.config.moleculeTypes.filter((m) => m.filterable)
    let cumWeight = 0
    this.contaminantCdf = contaminants.map((m) => {
      cumWeight += m.spawnWeight
      return { type: m, cumWeight }
    })
    this.totalContaminantWeight = cumWeight
  }

  get filterLeft(): number {
    return this.width * FILTER_CENTER_RATIO - (this.width * FILTER_WIDTH_RATIO) / 2
  }

  get filterRight(): number {
    return this.width * FILTER_CENTER_RATIO + (this.width * FILTER_WIDTH_RATIO) / 2
  }

  get hasEnrichment(): boolean {
    return (this.config.enrichmentMinerals?.length ?? 0) > 0
  }

  private get enrichMineralMap(): Map<string, EnrichmentMineralRuntime> {
    return new Map((this.config.enrichmentMinerals ?? []).map((m) => [m.mineral.key, m]))
  }

  resize(width: number, height: number): void {
    const changed = Math.abs(this.width - width) > 0.5 || Math.abs(this.height - height) > 0.5
    this.width = width
    this.height = height
    if (changed || this.enrichBoundSites.length === 0) {
      this.placeEnrichmentSites()
    }
  }

  reset(): void {
    this.particles = []
    this.mineralParticles = []
    this.detectionLog = []
    this.stats = {
      totalSpawned: 0,
      totalPassed: 0,
      totalContaminantsSpawned: 0,
      capturedByType: {},
      mineralsByType: {},
      mineralConcentrationByType: {},
      mineralCoverageRatio: 0
    }
    this.spawnAccumulator = 0
    this.enrichmentUnlocked = false
    this.placeEnrichmentSites()
  }

  setSpeed(multiplier: number): void {
    this.speed = multiplier
  }

  private placeEnrichmentSites(): void {
    if (this.width === 0 || this.height === 0) {
      this.enrichBoundSites = []
      return
    }
    const minerals = this.config.enrichmentMinerals ?? []
    if (minerals.length === 0) {
      this.enrichBoundSites = []
      return
    }
    const zl = this.width * ENRICHMENT_ZONE_LEFT_RATIO
    const zr = this.width * ENRICHMENT_ZONE_RIGHT_RATIO
    const colStep = (zr - zl) / (ENRICHMENT_SITES_GRID_COLS + 1)
    const sites: EnrichBoundSite[] = []
    for (let i = 0; i < minerals.length; i++) {
      const m = minerals[i]
      const rowBase = (this.height / (minerals.length + 1)) * (i + 1)
      for (let s = 0; s < ENRICHMENT_SITES_PER_MINERAL; s++) {
        const col = s % ENRICHMENT_SITES_GRID_COLS
        const tier = Math.floor(s / ENRICHMENT_SITES_GRID_COLS)
        const x = zl + colStep * (col + 1) + (Math.random() - 0.5) * 6
        const y = rowBase + (tier - 1) * 14 + (Math.random() - 0.5) * 6
        if (y < 12 || y > this.height - 12) continue
        sites.push({
          mineralKey: m.mineral.key,
          color: m.mineral.color,
          symbol: m.mineral.symbol,
          x,
          y,
          radius: 5,
          cooldownUntil: performance.now() + Math.random() * ENRICHMENT_RELEASE_COOLDOWN_MS
        })
      }
    }
    this.enrichBoundSites = sites
  }

  tick(dt: number): void {
    if (this.paused || this.width === 0) return

    const scaledDt = dt * this.speed
    const nowMs = performance.now()

    // Spawn water/contaminant particles from the left
    this.spawnAccumulator += scaledDt
    const toSpawn = Math.floor(this.spawnAccumulator * SPAWN_RATE)
    this.spawnAccumulator -= toSpawn / SPAWN_RATE

    for (let i = 0; i < toSpawn; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.spawn()
    }

    // Move and filter water/contaminant particles
    for (const p of this.particles) {
      if (p.captured) continue

      p.vy += (Math.random() - 0.5) * BROWNIAN_STRENGTH * scaledDt
      p.vy *= 0.96
      p.x += p.vx * scaledDt
      p.y += p.vy * scaledDt

      if (p.y < p.type.radius) {
        p.y = p.type.radius
        p.vy = Math.abs(p.vy) * 0.5
      }
      if (p.y > this.height - p.type.radius) {
        p.y = this.height - p.type.radius
        p.vy = -Math.abs(p.vy) * 0.5
      }

      if (!p.passed && p.x + p.type.radius >= this.filterLeft && p.x - p.type.radius <= this.filterRight) {
        if (p.type.filterable) {
          const eff = p.type.captureEfficiency ?? this.config.removalEfficiency
          const captureProb = Math.max(0, Math.min(100, eff)) / 100
          if (Math.random() < captureProb) {
            p.captured = true
            p.captureX = this.filterLeft + Math.random() * (this.filterRight - this.filterLeft)
            p.captureY = p.y
            p.vx = 0
            p.vy = 0
            this.stats.capturedByType[p.type.code] = (this.stats.capturedByType[p.type.code] ?? 0) + 1
          } else {
            p.passed = true
          }
        } else {
          p.passed = true
        }
      }
    }

    this.particles = this.particles.filter((p) => {
      if (p.captured) return true
      if (p.x > this.width + 20) {
        if (p.passed || !p.type.filterable) {
          this.stats.totalPassed++
        }
        return false
      }
      return p.x > -20
    })

    // Unlock enrichment zone once the first water particle crosses the separator
    if (!this.enrichmentUnlocked && this.enrichBoundSites.length > 0) {
      const separatorX = this.width * ZONE_SEPARATOR_RATIO
      for (const p of this.particles) {
        if (!p.captured && p.x >= separatorX) {
          this.enrichmentUnlocked = true
          break
        }
      }
    }

    // Enrichment: fire bound sites on cooldown — only after water has reached the zone
    if (this.enrichBoundSites.length > 0 && this.enrichmentUnlocked) {
      const mineralMap = this.enrichMineralMap
      for (const site of this.enrichBoundSites) {
        if (nowMs < site.cooldownUntil) continue
        const m = mineralMap.get(site.mineralKey)
        if (!m || m.releaseRate <= 0) continue
        this.detachMineral(site, m, nowMs)
      }
    }

    // Move mineral particles
    for (const mp of this.mineralParticles) {
      mp.vy += (Math.random() - 0.5) * BROWNIAN_STRENGTH * scaledDt
      mp.vy *= 0.96
      mp.x += mp.vx * scaledDt
      mp.y += mp.vy * scaledDt
      if (mp.y < mp.radius) {
        mp.y = mp.radius
        mp.vy = Math.abs(mp.vy) * 0.5
      }
      if (mp.y > this.height - mp.radius) {
        mp.y = this.height - mp.radius
        mp.vy = -Math.abs(mp.vy) * 0.5
      }
      const detectionX = this.width * ENRICHMENT_DETECTION_RATIO
      if (mp.detectedAt == null && mp.x >= detectionX) {
        mp.detectedAt = nowMs
        this.detectionLog.push({ key: mp.mineralKey, t: nowMs })
        this.stats.mineralsByType[mp.mineralKey] = (this.stats.mineralsByType[mp.mineralKey] ?? 0) + 1
      }
    }

    // Cull old detection log entries
    const cutoff = nowMs - ENRICHMENT_CONCENTRATION_WINDOW_MS
    while (this.detectionLog.length > 0 && this.detectionLog[0].t < cutoff) {
      this.detectionLog.shift()
    }

    this.mineralParticles = this.mineralParticles.filter((mp) => mp.x < this.width + 24)

    if (this.enrichBoundSites.length > 0) {
      this.recomputeMineralConcentrations()
    }
  }

  private spawn(): void {
    const type = this.pickType()
    if (type.filterable) {
      this.stats.totalContaminantsSpawned++
    }
    const particle: Particle = {
      x: -type.radius,
      y: type.radius + Math.random() * (this.height - type.radius * 2),
      vx: BASE_SPEED + Math.random() * 0.8,
      vy: (Math.random() - 0.5) * 0.6,
      type,
      captured: false,
      captureX: 0,
      captureY: 0,
      passed: false,
      opacity: 1
    }
    this.particles.push(particle)
    this.stats.totalSpawned++
  }

  private pickType(): MoleculeType {
    if (Math.random() < this.config.waterRatio) {
      return this.config.moleculeTypes[0]
    }
    if (this.contaminantCdf.length === 0) {
      return this.config.moleculeTypes[0]
    }
    const roll = Math.random() * this.totalContaminantWeight
    for (const entry of this.contaminantCdf) {
      if (roll <= entry.cumWeight) return entry.type
    }
    return this.contaminantCdf[this.contaminantCdf.length - 1].type
  }

  private detachMineral(site: EnrichBoundSite, m: EnrichmentMineralRuntime, nowMs: number): void {
    if (this.particles.length + this.mineralParticles.length >= MAX_PARTICLES) return
    const effectiveCooldown = (ENRICHMENT_RELEASE_COOLDOWN_MS * 100) / Math.max(m.releaseRate, 1)
    site.cooldownUntil = nowMs + effectiveCooldown * (0.85 + Math.random() * 0.3)
    this.mineralParticles.push({
      mineralKey: site.mineralKey,
      color: site.color,
      symbol: m.mineral.symbol,
      x: site.x,
      y: site.y,
      vx: ENRICHMENT_MINERAL_SPEED + Math.random() * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 5,
      alpha: 1,
      detectedAt: null
    })
  }

  private recomputeMineralConcentrations(): void {
    const minerals = this.config.enrichmentMinerals ?? []
    const counts = new Map<string, number>()
    for (const entry of this.detectionLog) {
      counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1)
    }
    const result: Record<string, number> = {}
    let inRange = 0
    for (const m of minerals) {
      const count = counts.get(m.mineral.key) ?? 0
      const mgPerL = count * m.mgPerParticle
      result[m.mineral.key] = mgPerL
      if (mgPerL >= m.targetMin && mgPerL <= m.targetMax) inRange++
    }
    this.stats.mineralConcentrationByType = result
    this.stats.mineralCoverageRatio = minerals.length > 0 ? inRange / minerals.length : 0
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const w = this.width
    const h = this.height
    if (w === 0 || h === 0) return

    ctx.clearRect(0, 0, w, h)

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, 0)
    bg.addColorStop(0, '#0c1222')
    bg.addColorStop(FILTER_CENTER_RATIO - 0.05, '#0f172a')
    bg.addColorStop(FILTER_CENTER_RATIO + 0.05, '#0f172a')
    if (this.hasEnrichment) {
      bg.addColorStop(ZONE_SEPARATOR_RATIO, '#0a1520')
      bg.addColorStop(ENRICHMENT_ZONE_LEFT_RATIO, '#081520')
      bg.addColorStop(ENRICHMENT_ZONE_RIGHT_RATIO, '#0a1a1a')
      bg.addColorStop(1, '#071510')
    } else {
      bg.addColorStop(1, '#091018')
    }
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // Enrichment zone band
    if (this.hasEnrichment) {
      const zl = w * ENRICHMENT_ZONE_LEFT_RATIO
      const zr = w * ENRICHMENT_ZONE_RIGHT_RATIO
      const enrichBg = ctx.createLinearGradient(zl, 0, zr, 0)
      enrichBg.addColorStop(0, 'rgba(16,78,60,0.18)')
      enrichBg.addColorStop(0.5, 'rgba(20,83,45,0.22)')
      enrichBg.addColorStop(1, 'rgba(16,78,60,0.18)')
      ctx.fillStyle = enrichBg
      ctx.fillRect(zl, 0, zr - zl, h)

      ctx.strokeStyle = 'rgba(52,211,153,0.07)'
      ctx.lineWidth = 0.5
      const gap = 10
      for (let y = 0; y < h; y += gap) {
        ctx.beginPath()
        ctx.moveTo(zl, y)
        ctx.lineTo(zr, y)
        ctx.stroke()
      }

      ctx.strokeStyle = 'rgba(52,211,153,0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(zl, 0, zr - zl, h)

      ctx.save()
      ctx.translate((zl + zr) / 2, h / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(52,211,153,0.3)'
      ctx.fillText('ENRICHMENT ZONE', 0, 0)
      ctx.restore()
    }

    this.drawFilter(ctx)

    // Zone separator dashed line
    if (this.hasEnrichment) {
      const sepX = w * ZONE_SEPARATOR_RATIO
      ctx.strokeStyle = 'rgba(148,163,184,0.22)'
      ctx.setLineDash([6, 8])
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(sepX, 0)
      ctx.lineTo(sepX, h)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Zone labels
    ctx.font = '11px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.fillText('UNFILTERED', w * 0.14, 20)
    if (this.hasEnrichment) {
      ctx.fillStyle = 'rgba(148,163,184,0.5)'
      ctx.fillText('FILTERED', w * 0.46, 20)
      ctx.fillStyle = 'rgba(52,211,153,0.65)'
      ctx.fillText('ENRICHED', w * 0.93, 20)
    } else {
      ctx.fillStyle = 'rgba(148,163,184,0.5)'
      ctx.fillText('FILTERED', w * 0.69, 20)
    }

    // Draw bound mineral sites
    for (const site of this.enrichBoundSites) {
      this.drawBoundSite(ctx, site)
    }

    // Draw water/contaminant particles
    for (const p of this.particles) {
      this.drawParticle(ctx, p)
    }

    // Draw released mineral particles
    for (const mp of this.mineralParticles) {
      this.drawMineralParticle(ctx, mp)
    }
  }

  private drawFilter(ctx: CanvasRenderingContext2D): void {
    const fl = this.filterLeft
    const fr = this.filterRight
    const h = this.height

    const gradient = ctx.createLinearGradient(fl, 0, fr, 0)
    gradient.addColorStop(0, 'rgba(51,65,85,0.7)')
    gradient.addColorStop(0.5, 'rgba(71,85,105,0.85)')
    gradient.addColorStop(1, 'rgba(51,65,85,0.7)')
    ctx.fillStyle = gradient
    ctx.fillRect(fl, 0, fr - fl, h)

    ctx.strokeStyle = 'rgba(100,116,139,0.35)'
    ctx.lineWidth = 0.5
    const gap = 8
    for (let y = 0; y < h; y += gap) {
      ctx.beginPath()
      ctx.moveTo(fl, y)
      ctx.lineTo(fr, y)
      ctx.stroke()
    }
    for (let x = fl; x <= fr; x += gap) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(fl, 0, fr - fl, h)

    const label = this.config.materialType ?? 'F I L T E R'
    ctx.save()
    ctx.translate((fl + fr) / 2, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(148,163,184,0.6)'
    ctx.fillText(label.toUpperCase(), 0, 0)
    ctx.restore()
  }

  private drawBoundSite(ctx: CanvasRenderingContext2D, site: EnrichBoundSite): void {
    const halo = ctx.createRadialGradient(site.x, site.y, 1, site.x, site.y, site.radius + 4)
    halo.addColorStop(0, this.hexToRgba(site.color, 0.55))
    halo.addColorStop(1, this.hexToRgba(site.color, 0))
    ctx.beginPath()
    ctx.arc(site.x, site.y, site.radius + 3, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    ctx.beginPath()
    ctx.arc(site.x, site.y, site.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.hexToRgba(site.color, 0.95)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 0.7
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `bold ${Math.max(7, site.radius - 1)}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(site.symbol, site.x, site.y)
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const x = p.captured ? p.captureX : p.x
    const y = p.captured ? p.captureY : p.y
    const r = p.type.radius
    const alpha = p.captured ? 0.7 : p.opacity

    const glowGrad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r + 3)
    glowGrad.addColorStop(0, this.hexToRgba(p.type.color, alpha * 0.4))
    glowGrad.addColorStop(1, this.hexToRgba(p.type.color, 0))
    ctx.beginPath()
    ctx.arc(x, y, r + 2, 0, Math.PI * 2)
    ctx.fillStyle = glowGrad
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = this.hexToRgba(p.type.color, alpha)
    ctx.fill()

    if (r >= 5) {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`
      ctx.font = `bold ${Math.max(7, r - 1)}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.type.code, x, y)
    }
  }

  private drawMineralParticle(ctx: CanvasRenderingContext2D, mp: MineralParticle): void {
    const halo = ctx.createRadialGradient(mp.x, mp.y, mp.radius * 0.3, mp.x, mp.y, mp.radius + 4)
    halo.addColorStop(0, this.hexToRgba(mp.color, 0.4))
    halo.addColorStop(1, this.hexToRgba(mp.color, 0))
    ctx.beginPath()
    ctx.arc(mp.x, mp.y, mp.radius + 3, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    ctx.beginPath()
    ctx.arc(mp.x, mp.y, mp.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.hexToRgba(mp.color, mp.alpha)
    ctx.fill()

    ctx.fillStyle = `rgba(255,255,255,${mp.alpha * 0.85})`
    ctx.font = `bold ${Math.max(7, mp.radius - 1)}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(mp.symbol, mp.x, mp.y)
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
}
