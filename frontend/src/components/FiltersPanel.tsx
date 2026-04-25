import type { FormEvent } from 'react'
import type { Filter, Measurement, Study } from '../types'

type FiltersPanelProps = {
  filters: Filter[]
  measurements: Measurement[]
  studies: Study[]
  selectedMeasurementId: string
  selectedStudyId: string
  onMeasurementChange: (value: string) => void
  onStudyChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
}

export function FiltersPanel({
  filters,
  measurements,
  studies,
  selectedMeasurementId,
  selectedStudyId,
  onMeasurementChange,
  onStudyChange,
  onSubmit,
  isLoading,
}: FiltersPanelProps) {
  return (
    <section className="card">
      <h2>Filters</h2>
      <form onSubmit={onSubmit} className="grid">
        <label>
          Measurement
          <select value={selectedMeasurementId} onChange={(event) => onMeasurementChange(event.target.value)} required disabled={isLoading}>
            <option value="">Choose measurement</option>
            {measurements.map((measurement) => (
              <option key={measurement.id} value={measurement.id}>
                {measurement.location_name || measurement.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Study (optional)
          <select value={selectedStudyId} onChange={(event) => onStudyChange(event.target.value)} disabled={isLoading}>
            <option value="">No study</option>
            {studies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isLoading}>
          Generate Filter
        </button>
      </form>
      {filters.length === 0 ? (
        <p className="empty-state">No generated filters yet.</p>
      ) : (
        <ul>
          {filters.map((filterItem) => (
            <li key={filterItem.id}>
              <strong>{filterItem.id}</strong>
              <span>Status: {filterItem.status || 'unknown'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
