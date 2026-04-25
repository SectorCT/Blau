import type { FilterInfo } from '@renderer/utils/api/types'
import {
  parseTargetBand,
  type EnrichmentMineral
} from '@renderer/data/enrichmentMinerals'
import {
  buildFilterInfoViewModel,
  type EnrichmentMineralView
} from '@renderer/utils/filterInfoViewModel'

export type EnrichmentMineralRuntime = {
  mineral: EnrichmentMineral
  releaseRate: number
  targetMin: number
  targetMax: number
  unit: string
  /** mg/L equivalent of one released particle, calibrated so steady-state at 100% releaseRate sits in band. */
  mgPerParticle: number
}

export type EnrichmentConfig = {
  minerals: EnrichmentMineralRuntime[]
  poreSize?: number
  layerThickness?: number
  materialType?: string
  temperature?: number
  ph?: number
  bindingEnergy?: number
}

export type EnrichmentStats = {
  totalWaterSpawned: number
  totalReleased: number
  releasedByType: Record<string, number>
  /** Current sliding-window mg/L per mineral key. */
  concentrationByType: Record<string, number>
  /** Fraction of minerals currently in their target band [0..1]. */
  coverageRatio: number
}

const SPAWN_RATE = 5
const WATER_SPEED = 1.8
const MINERAL_SPEED = 1.6
const BROWNIAN_STRENGTH = 0.4
const FILTER_WIDTH_RATIO = 0.18
const FILTER_CENTER_RATIO = 0.5
const MAX_PARTICLES = 700
const CONCENTRATION_WINDOW_MS = 4000
/** Cooldown between firings of a single bound site at 100% release rate. */
const RELEASE_COOLDOWN_MS = 600
const RIGHT_DETECTION_RATIO = 0.62
const SITES_PER_MINERAL = 7
const SITES_GRID_COLS = 3

const WATER_COLOR = '#3b82f6'

const DEFAULT_BAND = { min: 0, max: 1, unit: 'mg/L', minMgPerL: 0, maxMgPerL: 1 }

type WaterParticle = {
  kind: 'water'
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
}

type FreeMineral = {
  kind: 'free'
  mineralKey: string
  color: string
  symbol: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  /** Real time when this particle entered the right-side detection zone, or null. */
  detectedAt: number | null
}

type BoundSite = {
  kind: 'bound'
  mineralKey: string
  color: string
  symbol: string
  x: number
  y: number
  radius: number
  cooldownUntil: number
}

type Particle = WaterParticle | FreeMineral

export const DEFAULT_ENRICHMENT_CONFIG: EnrichmentConfig = {
  minerals: [],
  materialType: 'Filter'
}

export function buildEnrichmentConfigFromFilterInfo(info: FilterInfo | null | undefined): EnrichmentConfig {
  const vm = buildFilterInfoViewModel(info ?? null)
  const minerals: EnrichmentMineralRuntime[] = vm.enrichmentMinerals.map((view) =>
    toRuntime(view)
  )
  return {
    minerals,
    poreSize: vm.metrics.poreSize ?? undefined,
    layerThickness: vm.metrics.layerThickness ?? undefined,
    materialType: vm.metrics.materialType !== 'n/a' ? vm.metrics.materialType : 'Filter',
    temperature: vm.metrics.temperature ?? undefined,
    ph: vm.metrics.ph ?? undefined,
    bindingEnergy: vm.metrics.bindingEnergy ?? undefined
  }
}

function toRuntime(view: EnrichmentMineralView): EnrichmentMineralRuntime {
  const target = view.targetConcentration ?? view.mineral.target
  const band = target ? parseTargetBand(target) : DEFAULT_BAND
  // releaseRate is a percent; default to 60% if backend omitted it so the demo still runs visibly.
  const releaseRate = view.releaseRate != null ? Math.max(0, Math.min(100, view.releaseRate)) : 60
  // Calibrate so steady-state at 100% release rate lands ~3/4 of the way through the WHO target band.
  const bandSpan = band.maxMgPerL - band.minMgPerL
  const targetSteadyMgPerL =
    bandSpan > 0
      ? band.minMgPerL + 0.75 * bandSpan
      : Math.max(band.minMgPerL, band.maxMgPerL, 1)
  // At 100% release rate each site fires at the cooldown limit (1 / cooldown), so steady-state
  // detections in the sliding window = sitesPerMineral * (window / cooldown).
  const expectedParticlesAt100 = SITES_PER_MINERAL * (CONCENTRATION_WINDOW_MS / RELEASE_COOLDOWN_MS)
  const mgPerParticle =
    expectedParticlesAt100 > 0 ? Math.max(targetSteadyMgPerL / expectedParticlesAt100, 1e-6) : 1
  return {
    mineral: view.mineral,
    releaseRate,
    targetMin: band.minMgPerL,
    targetMax: band.maxMgPerL,
    unit: band.unit,
    mgPerParticle
  }
}

export class EnrichmentEngine {
  config: EnrichmentConfig
  paused = false
  speed = 1
  stats: EnrichmentStats = {
    totalWaterSpawned: 0,
    totalReleased: 0,
    releasedByType: {},
    concentrationByType: {},
    coverageRatio: 0
  }

  private particles: Particle[] = []
  private boundSites: BoundSite[] = []
  private width = 0
  private height = 0
  private spawnAccumulator = 0
  /** Recent crossings into the right detection zone, used for sliding-window concentration. */
  private detectionLog: Array<{ key: string; t: number }> = []

  constructor(config?: EnrichmentConfig) {
    this.config = config ?? DEFAULT_ENRICHMENT_CONFIG
  }

  get filterLeft(): number {
    return this.width * FILTER_CENTER_RATIO - (this.width * FILTER_WIDTH_RATIO) / 2
  }

  get filterRight(): number {
    return this.width * FILTER_CENTER_RATIO + (this.width * FILTER_WIDTH_RATIO) / 2
  }

  get rightDetectionX(): number {
    return this.width * RIGHT_DETECTION_RATIO
  }

  resize(width: number, height: number): void {
    const widthChanged = Math.abs(this.width - width) > 0.5 || Math.abs(this.height - height) > 0.5
    this.width = width
    this.height = height
    if (widthChanged || this.boundSites.length === 0) {
      this.placeBoundSites()
    }
  }

  reset(): void {
    this.particles = []
    this.detectionLog = []
    this.spawnAccumulator = 0
    this.stats = {
      totalWaterSpawned: 0,
      totalReleased: 0,
      releasedByType: {},
      concentrationByType: {},
      coverageRatio: 0
    }
    this.placeBoundSites()
  }

  setSpeed(multiplier: number): void {
    this.speed = multiplier
  }

  private placeBoundSites(): void {
    if (this.width === 0 || this.height === 0) {
      this.boundSites = []
      return
    }
    const sites: BoundSite[] = []
    const minerals = this.config.minerals
    if (minerals.length === 0) {
      this.boundSites = []
      return
    }
    // Lay sites in a grid inside the filter band so each mineral has multiple sites.
    // The per-mineral count must match the calibration constant in toRuntime().
    const fl = this.filterLeft
    const fr = this.filterRight
    const colStep = (fr - fl) / (SITES_GRID_COLS + 1)
    for (let i = 0; i < minerals.length; i++) {
      const m = minerals[i]
      const rowBase = (this.height / (minerals.length + 1)) * (i + 1)
      for (let s = 0; s < SITES_PER_MINERAL; s++) {
        const col = s % SITES_GRID_COLS
        const tier = Math.floor(s / SITES_GRID_COLS)
        const x = fl + colStep * (col + 1) + (Math.random() - 0.5) * 6
        const y = rowBase + (tier - 1) * 14 + (Math.random() - 0.5) * 6
        if (y < 12 || y > this.height - 12) continue
        sites.push({
          kind: 'bound',
          mineralKey: m.mineral.key,
          color: m.mineral.color,
          symbol: m.mineral.symbol,
          x,
          y,
          radius: 5,
          // Stagger initial cooldowns so sites fire out of phase from frame 1.
          cooldownUntil: performance.now() + Math.random() * RELEASE_COOLDOWN_MS
        })
      }
    }
    this.boundSites = sites
  }

  tick(dtFrames: number, nowMs: number): void {
    if (this.paused || this.width === 0) return

    const scaledDt = dtFrames * this.speed

    // Spawn water particles from the left edge.
    this.spawnAccumulator += scaledDt
    const toSpawn = Math.floor(this.spawnAccumulator * SPAWN_RATE / 8)
    this.spawnAccumulator -= (toSpawn * 8) / SPAWN_RATE
    for (let i = 0; i < toSpawn; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.spawnWater()
    }

    // Each site fires deterministically when its cooldown elapses; cooldown length is inversely
    // proportional to release rate. Fire rate per site at rate r% = r / (100 * RELEASE_COOLDOWN_MS),
    // which is what toRuntime()'s mgPerParticle calibration assumes.
    if (this.boundSites.length > 0) {
      const minerals = new Map(this.config.minerals.map((m) => [m.mineral.key, m]))
      for (const site of this.boundSites) {
        if (nowMs < site.cooldownUntil) continue
        const m = minerals.get(site.mineralKey)
        if (!m || m.releaseRate <= 0) continue
        this.detachFromSite(site, m, nowMs)
      }
    }

    // Update particles.
    for (const p of this.particles) {
      p.vy += (Math.random() - 0.5) * BROWNIAN_STRENGTH * scaledDt
      p.vy *= 0.96
      p.x += p.vx * scaledDt
      p.y += p.vy * scaledDt
      if (p.y < p.radius) {
        p.y = p.radius
        p.vy = Math.abs(p.vy) * 0.5
      }
      if (p.y > this.height - p.radius) {
        p.y = this.height - p.radius
        p.vy = -Math.abs(p.vy) * 0.5
      }
      if (p.kind === 'free') {
        if (p.detectedAt == null && p.x >= this.rightDetectionX) {
          p.detectedAt = nowMs
          this.detectionLog.push({ key: p.mineralKey, t: nowMs })
          this.stats.releasedByType[p.mineralKey] = (this.stats.releasedByType[p.mineralKey] ?? 0) + 1
          this.stats.totalReleased++
        }
      }
    }

    // Cull old detections.
    const cutoff = nowMs - CONCENTRATION_WINDOW_MS
    while (this.detectionLog.length > 0 && this.detectionLog[0].t < cutoff) {
      this.detectionLog.shift()
    }

    // Cull off-screen particles.
    this.particles = this.particles.filter((p) => p.x < this.width + 24 && p.x > -24)

    this.recomputeConcentrations()
  }

  private spawnWater(): void {
    const radius = 3
    const particle: WaterParticle = {
      kind: 'water',
      x: -radius,
      y: radius + Math.random() * (this.height - radius * 2),
      vx: WATER_SPEED + Math.random() * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius,
      alpha: 0.85
    }
    this.particles.push(particle)
    this.stats.totalWaterSpawned++
  }

  private detachFromSite(site: BoundSite, m: EnrichmentMineralRuntime, nowMs: number): void {
    if (this.particles.length >= MAX_PARTICLES) return
    // Effective cooldown shrinks at higher release rates. At 100% it equals RELEASE_COOLDOWN_MS.
    const effectiveCooldown = (RELEASE_COOLDOWN_MS * 100) / Math.max(m.releaseRate, 1)
    // Small jitter so sites don't fire in lock-step.
    site.cooldownUntil = nowMs + effectiveCooldown * (0.85 + Math.random() * 0.3)
    const free: FreeMineral = {
      kind: 'free',
      mineralKey: site.mineralKey,
      color: site.color,
      symbol: m.mineral.symbol,
      x: site.x,
      y: site.y,
      vx: MINERAL_SPEED + Math.random() * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 5,
      alpha: 1,
      detectedAt: null
    }
    this.particles.push(free)
  }

  private recomputeConcentrations(): void {
    const counts = new Map<string, number>()
    for (const entry of this.detectionLog) {
      counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1)
    }
    const result: Record<string, number> = {}
    let inRange = 0
    for (const m of this.config.minerals) {
      const count = counts.get(m.mineral.key) ?? 0
      const mgPerL = count * m.mgPerParticle
      result[m.mineral.key] = mgPerL
      if (mgPerL >= m.targetMin && mgPerL <= m.targetMax) inRange++
    }
    this.stats.concentrationByType = result
    this.stats.coverageRatio = this.config.minerals.length > 0
      ? inRange / this.config.minerals.length
      : 0
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const w = this.width
    const h = this.height
    if (w === 0 || h === 0) return

    ctx.clearRect(0, 0, w, h)

    const bg = ctx.createLinearGradient(0, 0, w, 0)
    bg.addColorStop(0, '#0c1222')
    bg.addColorStop(FILTER_CENTER_RATIO - 0.05, '#0f172a')
    bg.addColorStop(FILTER_CENTER_RATIO + 0.05, '#0d1a2c')
    bg.addColorStop(1, '#0a1626')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    this.drawFilter(ctx)

    ctx.font = '11px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.fillText('PLAIN WATER', w * 0.18, 20)
    ctx.fillStyle = 'rgba(110,231,183,0.6)'
    ctx.fillText('ENRICHED', w * 0.82, 20)

    // Detection line
    ctx.strokeStyle = 'rgba(110,231,183,0.18)'
    ctx.setLineDash([4, 6])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(this.rightDetectionX, 0)
    ctx.lineTo(this.rightDetectionX, h)
    ctx.stroke()
    ctx.setLineDash([])

    for (const site of this.boundSites) {
      this.drawBoundSite(ctx, site)
    }
    for (const p of this.particles) {
      if (p.kind === 'water') this.drawWater(ctx, p)
      else this.drawFree(ctx, p)
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
    const gap = 10
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

    const label = (this.config.materialType ?? 'F I L T E R').toUpperCase()
    ctx.save()
    ctx.translate((fl + fr) / 2, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(148,163,184,0.6)'
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }

  private drawBoundSite(ctx: CanvasRenderingContext2D, site: BoundSite): void {
    const halo = ctx.createRadialGradient(site.x, site.y, 1, site.x, site.y, site.radius + 4)
    halo.addColorStop(0, hexToRgba(site.color, 0.55))
    halo.addColorStop(1, hexToRgba(site.color, 0))
    ctx.beginPath()
    ctx.arc(site.x, site.y, site.radius + 3, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    ctx.beginPath()
    ctx.arc(site.x, site.y, site.radius, 0, Math.PI * 2)
    ctx.fillStyle = hexToRgba(site.color, 0.95)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 0.7
    ctx.stroke()
  }

  private drawWater(ctx: CanvasRenderingContext2D, p: WaterParticle): void {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fillStyle = hexToRgba(WATER_COLOR, p.alpha)
    ctx.fill()
  }

  private drawFree(ctx: CanvasRenderingContext2D, p: FreeMineral): void {
    const halo = ctx.createRadialGradient(p.x, p.y, p.radius * 0.3, p.x, p.y, p.radius + 4)
    halo.addColorStop(0, hexToRgba(p.color, 0.4))
    halo.addColorStop(1, hexToRgba(p.color, 0))
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fillStyle = hexToRgba(p.color, p.alpha)
    ctx.fill()

    if (p.radius >= 5) {
      ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.85})`
      ctx.font = `bold ${Math.max(7, p.radius - 1)}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.symbol, p.x, p.y)
    }
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
