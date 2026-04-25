export type EnrichmentMineral = {
  key: string
  label: string
  symbol: string
  element: string
  target: string
  color: string
}

export const ENRICHMENT_MINERALS: readonly EnrichmentMineral[] = [
  { key: 'calcium',   label: 'Calcium (Ca2+)',   symbol: 'Ca²⁺', element: 'Ca', target: '40-80 mg/L', color: '#7dd3fc' },
  { key: 'magnesium', label: 'Magnesium (Mg2+)', symbol: 'Mg²⁺', element: 'Mg', target: '10-30 mg/L', color: '#a78bfa' },
  { key: 'potassium', label: 'Potassium (K+)',   symbol: 'K⁺',   element: 'K',  target: '1-12 mg/L',  color: '#facc15' },
  { key: 'zinc',      label: 'Zinc (Zn2+)',      symbol: 'Zn²⁺', element: 'Zn', target: '0.5-3 mg/L', color: '#f472b6' },
  { key: 'selenium',  label: 'Selenium (Se2-)',  symbol: 'Se²⁻', element: 'Se', target: '10-40 ug/L', color: '#fb923c' },
  { key: 'silicate',  label: 'Silicate (SiO3)',  symbol: 'SiO₃', element: 'Si', target: '5-15 mg/L',  color: '#34d399' }
] as const

const BY_KEY: Record<string, EnrichmentMineral> = ENRICHMENT_MINERALS.reduce(
  (acc, mineral) => {
    acc[mineral.key] = mineral
    return acc
  },
  {} as Record<string, EnrichmentMineral>
)

const BY_ELEMENT: Record<string, EnrichmentMineral> = ENRICHMENT_MINERALS.reduce(
  (acc, mineral) => {
    acc[mineral.element.toLowerCase()] = mineral
    return acc
  },
  {} as Record<string, EnrichmentMineral>
)

export const MINERAL_ELEMENTS: ReadonlySet<string> = new Set(
  ENRICHMENT_MINERALS.map((mineral) => mineral.element)
)

export const findMineralByKey = (key: string): EnrichmentMineral | undefined =>
  BY_KEY[key.toLowerCase()]

/** Resolve a mineral by element symbol (Ca, Mg, K, …) or by free-form name (Calcium, Mg2+, …). */
export const findMineralByElement = (element: string): EnrichmentMineral | undefined =>
  BY_ELEMENT[element.trim().toLowerCase()]

export const findMineralByName = (name: string): EnrichmentMineral | undefined => {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  if (BY_KEY[normalized]) return BY_KEY[normalized]
  for (const mineral of ENRICHMENT_MINERALS) {
    const label = mineral.label.toLowerCase()
    if (
      label === normalized ||
      label.startsWith(normalized) ||
      normalized.startsWith(mineral.element.toLowerCase()) ||
      normalized.includes(mineral.key)
    ) {
      return mineral
    }
  }
  return undefined
}

export type ParsedTargetBand = {
  min: number
  max: number
  unit: string
  /** mg/L equivalent for normalization. */
  minMgPerL: number
  maxMgPerL: number
}

const UNIT_TO_MG_PER_L: Record<string, number> = {
  'mg/l': 1,
  'ug/l': 0.001,
  'μg/l': 0.001
}

/** Parse strings like "40-80 mg/L", "10-40 ug/L", "5 mg/L". Falls back to a wide band on parse failure. */
export const parseTargetBand = (target: string): ParsedTargetBand => {
  const match = target.match(/([\d.]+)\s*(?:[-–]\s*([\d.]+))?\s*([a-zA-Zµμ]+\s*\/\s*[a-zA-Z]+)?/)
  const minRaw = match?.[1] ? Number(match[1]) : NaN
  const maxRaw = match?.[2] ? Number(match[2]) : minRaw
  const unitRaw = (match?.[3] ?? 'mg/L').replace(/\s+/g, '').toLowerCase()
  const factor = UNIT_TO_MG_PER_L[unitRaw] ?? 1
  const min = Number.isFinite(minRaw) ? minRaw : 0
  const max = Number.isFinite(maxRaw) ? Math.max(maxRaw, min) : min
  return {
    min,
    max,
    unit: unitRaw === 'ug/l' || unitRaw === 'μg/l' ? 'µg/L' : 'mg/L',
    minMgPerL: min * factor,
    maxMgPerL: max * factor
  }
}
