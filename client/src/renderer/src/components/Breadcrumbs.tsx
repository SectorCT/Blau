import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  filters: 'All Filters',
  measurements: 'Measurements',
  'add-measurement': 'Add Measurement',
  visualize: 'Visualization',
  simulate: 'Simulate',
  analysis: 'Analysis',
  enrich: 'Enrichment'
}

const compoundLabels: Record<string, string> = {
  'enrich/visualize': 'Enrichment Visualization',
  'enrich/simulate': 'Enrichment Simulation'
}

export function Breadcrumbs(): React.JSX.Element {
  const location = useLocation()
  const rawSegments = location.pathname.split('/').filter(Boolean)
  const segments = rawSegments[0] === 'dashboard' ? rawSegments.slice(1) : rawSegments

  if (rawSegments.length === 0) return <></>

  const items: Array<{ href: string; label: string }> = []
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]
    const next = segments[index + 1]
    const compoundKey = next ? `${segment}/${next}` : ''
    if (compoundKey && compoundLabels[compoundKey]) {
      const href = `/${rawSegments.slice(0, index + 2).join('/')}`
      items.push({ href, label: compoundLabels[compoundKey] })
      index++
      continue
    }
    const href = `/${rawSegments.slice(0, index + 1).join('/')}`
    items.push({ href, label: labels[segment] ?? segment.toUpperCase() })
  }

  return (
    <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/dashboard" className="hover:text-foreground">
        Dashboard
      </Link>
      {items.map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          <ChevronRight size={12} strokeWidth={1.5} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  )
}
