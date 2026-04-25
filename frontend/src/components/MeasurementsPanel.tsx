import type { FormEvent } from 'react'
import type { Measurement } from '../types'

type MeasurementsPanelProps = {
  measurements: Measurement[]
  newLocationName: string
  newPh: string
  newTemperature: string
  onLocationNameChange: (value: string) => void
  onPhChange: (value: string) => void
  onTemperatureChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
}

export function MeasurementsPanel({
  measurements,
  newLocationName,
  newPh,
  newTemperature,
  onLocationNameChange,
  onPhChange,
  onTemperatureChange,
  onSubmit,
  isLoading,
}: MeasurementsPanelProps) {
  return (
    <section className="card">
      <h2>Measurements</h2>
      <form onSubmit={onSubmit} className="grid">
        <label>
          Location Name
          <input value={newLocationName} onChange={(event) => onLocationNameChange(event.target.value)} required disabled={isLoading} />
        </label>
        <label>
          pH
          <input value={newPh} onChange={(event) => onPhChange(event.target.value)} type="number" step="0.1" disabled={isLoading} />
        </label>
        <label>
          Temperature
          <input value={newTemperature} onChange={(event) => onTemperatureChange(event.target.value)} type="number" step="0.1" disabled={isLoading} />
        </label>
        <button type="submit" disabled={isLoading}>
          Create Measurement
        </button>
      </form>
      {measurements.length === 0 ? (
        <p className="empty-state">No measurements yet.</p>
      ) : (
        <ul>
          {measurements.map((measurement) => (
            <li key={measurement.id}>
              <strong>{measurement.location_name || 'Unknown location'}</strong>
              <span>
                pH {measurement.ph ?? '-'} | Temp {measurement.temperature ?? '-'} C
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
