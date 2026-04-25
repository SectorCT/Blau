import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AppHeader } from './components/AppHeader'
import { LoginForm } from './components/LoginForm'
import { StatusBanner } from './components/StatusBanner'
import { StudiesPanel } from './components/StudiesPanel'
import { TOKEN_KEY } from './lib/config'
import { apiRequest } from './lib/http'
import type { Filter, Measurement, Study } from './types'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [statusMessage, setStatusMessage] = useState<string>('Ready')

  const [studies, setStudies] = useState<Study[]>([])
  const [newStudyName, setNewStudyName] = useState('')
  const [newStudyDescription, setNewStudyDescription] = useState('')

  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newPh, setNewPh] = useState('7')
  const [newTemperature, setNewTemperature] = useState('20')

  const [filters, setFilters] = useState<Filter[]>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState('')
  const [selectedStudyId, setSelectedStudyId] = useState('')

  const isAuthenticated = useMemo(() => Boolean(token), [token])

  async function loadStudies() {
    const data = await apiRequest<Study[]>('/api/studies/')
    setStudies(data)
  }

  async function loadMeasurements() {
    const data = await apiRequest<Measurement[]>('/api/measurements/')
    setMeasurements(data)
  }

  async function loadFilters() {
    const data = await apiRequest<Filter[]>('/api/filters/')
    setFilters(data)
  }

  async function refreshData() {
    if (!isAuthenticated) return
    await Promise.all([loadStudies(), loadMeasurements(), loadFilters()])
  }

  useEffect(() => {
    refreshData().catch((error: unknown) => {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load data')
    })
  }, [isAuthenticated])

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage('Signing in...')
    try {
      const data = await apiRequest<{ access: string }>('/api/auth/token/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem(TOKEN_KEY, data.access)
      setToken(data.access)
      setStatusMessage('Logged in successfully')
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : 'Login failed')
    }
  }

  function onLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setStudies([])
    setMeasurements([])
    setFilters([])
    setStatusMessage('Logged out')
  }

  async function onCreateStudy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage('Creating study...')
    try {
      await apiRequest<Study>('/api/studies/', {
        method: 'POST',
        body: JSON.stringify({ name: newStudyName, description: newStudyDescription }),
      })
      setNewStudyName('')
      setNewStudyDescription('')
      await loadStudies()
      setStatusMessage('Study created')
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not create study')
    }
  }

  async function onCreateMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage('Creating measurement...')
    try {
      await apiRequest<Measurement>('/api/measurements/', {
        method: 'POST',
        body: JSON.stringify({
          location_name: newLocationName,
          ph: Number(newPh),
          temperature: Number(newTemperature),
        }),
      })
      setNewLocationName('')
      await loadMeasurements()
      setStatusMessage('Measurement created')
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not create measurement')
    }
  }

  async function onGenerateFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedMeasurementId) {
      setStatusMessage('Select a measurement first')
      return
    }
    setStatusMessage('Submitting filter generation...')
    try {
      await apiRequest('/api/filters/generate/', {
        method: 'POST',
        body: JSON.stringify({
          measurement_id: selectedMeasurementId,
          study_id: selectedStudyId || undefined,
          use_quantum_computer: false,
        }),
      })
      await loadFilters()
      setStatusMessage('Filter request submitted')
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not generate filter')
    }
  }

  return (
    <main className="container">
      <AppHeader isAuthenticated={isAuthenticated} onLogout={onLogout} />

      <StatusBanner message={statusMessage} />

      {!isAuthenticated ? (
        <LoginForm
          email={email}
          password={password}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={onLogin}
        />
      ) : (
        <div className="layout">
          <StudiesPanel
            studies={studies}
            newStudyName={newStudyName}
            newStudyDescription={newStudyDescription}
            onStudyNameChange={setNewStudyName}
            onStudyDescriptionChange={setNewStudyDescription}
            onSubmit={onCreateStudy}
          />

          <section className="card">
            <h2>Measurements</h2>
            <form onSubmit={onCreateMeasurement} className="grid">
              <label>
                Location Name
                <input value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} required />
              </label>
              <label>
                pH
                <input value={newPh} onChange={(event) => setNewPh(event.target.value)} type="number" step="0.1" />
              </label>
              <label>
                Temperature
                <input value={newTemperature} onChange={(event) => setNewTemperature(event.target.value)} type="number" step="0.1" />
              </label>
              <button type="submit">Create Measurement</button>
            </form>
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
          </section>

          <section className="card">
            <h2>Filters</h2>
            <form onSubmit={onGenerateFilter} className="grid">
              <label>
                Measurement
                <select value={selectedMeasurementId} onChange={(event) => setSelectedMeasurementId(event.target.value)} required>
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
                <select value={selectedStudyId} onChange={(event) => setSelectedStudyId(event.target.value)}>
                  <option value="">No study</option>
                  {studies.map((study) => (
                    <option key={study.id} value={study.id}>
                      {study.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Generate Filter</button>
            </form>
            <ul>
              {filters.map((filterItem) => (
                <li key={filterItem.id}>
                  <strong>{filterItem.id}</strong>
                  <span>Status: {filterItem.status || 'unknown'}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
