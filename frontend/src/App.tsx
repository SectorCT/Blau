import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { login } from './api/auth'
import { createMeasurement, listMeasurements } from './api/measurements'
import { createStudy, listStudies } from './api/studies'
import { AppHeader } from './components/AppHeader'
import { FiltersPanel } from './components/FiltersPanel'
import { LoginForm } from './components/LoginForm'
import { MeasurementsPanel } from './components/MeasurementsPanel'
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
    const data = await listStudies()
    setStudies(data)
  }

  async function loadMeasurements() {
    const data = await listMeasurements()
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
      const data = await login(email, password)
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
      await createStudy(newStudyName, newStudyDescription)
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
      await createMeasurement({
        location_name: newLocationName,
        ph: Number(newPh),
        temperature: Number(newTemperature),
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

          <MeasurementsPanel
            measurements={measurements}
            newLocationName={newLocationName}
            newPh={newPh}
            newTemperature={newTemperature}
            onLocationNameChange={setNewLocationName}
            onPhChange={setNewPh}
            onTemperatureChange={setNewTemperature}
            onSubmit={onCreateMeasurement}
          />

          <FiltersPanel
            filters={filters}
            measurements={measurements}
            studies={studies}
            selectedMeasurementId={selectedMeasurementId}
            selectedStudyId={selectedStudyId}
            onMeasurementChange={setSelectedMeasurementId}
            onStudyChange={setSelectedStudyId}
            onSubmit={onGenerateFilter}
          />
        </div>
      )}
    </main>
  )
}

export default App
