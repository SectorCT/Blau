import {
  Activity,
  CheckCircle2,
  Cpu,
  Droplets,
  Loader2,
  Radio,
  Save,
  Signal,
  Thermometer,
  Wifi,
  Zap
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { ApiError, createMeasurement } from '@renderer/utils/api'

type StationStatus = 'connecting' | 'online' | 'capturing' | 'imported' | 'error'

type LiveReading = {
  temperature: number
  humidity: number
  ph: number
  conductivity: number
  dissolvedOxygen: number
  turbidity: number
  takenAt: number
}

const DEVICE_ID = 'BLAU-FS-01'
const FIRMWARE_VERSION = '1.4.0'
const HARDWARE_REV = 'UNO Q + Modulino Thermo'
const SAMPLE_INTERVAL_MS = 1500
const CONNECT_DELAY_MS = 900

const SETPOINTS = {
  temperature: { mean: 19.6, drift: 0.6, decimals: 1, min: 16.8, max: 22.4 },
  humidity: { mean: 53.0, drift: 1.6, decimals: 1, min: 42.0, max: 64.0 },
  ph: { mean: 7.42, drift: 0.05, decimals: 2, min: 7.18, max: 7.66 },
  conductivity: { mean: 612, drift: 18, decimals: 0, min: 480, max: 760 },
  dissolvedOxygen: { mean: 8.4, drift: 0.25, decimals: 2, min: 7.2, max: 9.6 },
  turbidity: { mean: 1.6, drift: 0.18, decimals: 2, min: 0.6, max: 3.5 }
} as const

type Setpoint = (typeof SETPOINTS)[keyof typeof SETPOINTS]

const drift = (previous: number, target: Setpoint): number => {
  const noise = (Math.random() - 0.5) * 2 * target.drift
  const pull = (target.mean - previous) * 0.18
  const next = previous + pull + noise
  if (next < target.min) return target.min + Math.random() * target.drift * 0.5
  if (next > target.max) return target.max - Math.random() * target.drift * 0.5
  return next
}

const round = (value: number, decimals: number): number => {
  const scale = 10 ** decimals
  return Math.round(value * scale) / scale
}

const buildInitialReading = (): LiveReading => ({
  temperature: SETPOINTS.temperature.mean + (Math.random() - 0.5) * SETPOINTS.temperature.drift,
  humidity: SETPOINTS.humidity.mean + (Math.random() - 0.5) * SETPOINTS.humidity.drift,
  ph: SETPOINTS.ph.mean + (Math.random() - 0.5) * SETPOINTS.ph.drift,
  conductivity: SETPOINTS.conductivity.mean + (Math.random() - 0.5) * SETPOINTS.conductivity.drift,
  dissolvedOxygen:
    SETPOINTS.dissolvedOxygen.mean + (Math.random() - 0.5) * SETPOINTS.dissolvedOxygen.drift,
  turbidity: SETPOINTS.turbidity.mean + (Math.random() - 0.5) * SETPOINTS.turbidity.drift,
  takenAt: Date.now()
})

const advanceReading = (previous: LiveReading): LiveReading => ({
  temperature: drift(previous.temperature, SETPOINTS.temperature),
  humidity: drift(previous.humidity, SETPOINTS.humidity),
  ph: drift(previous.ph, SETPOINTS.ph),
  conductivity: drift(previous.conductivity, SETPOINTS.conductivity),
  dissolvedOxygen: drift(previous.dissolvedOxygen, SETPOINTS.dissolvedOxygen),
  turbidity: drift(previous.turbidity, SETPOINTS.turbidity),
  takenAt: Date.now()
})

const formatRssi = (): number => -52 - Math.round(Math.random() * 6)

const formatUptime = (startedAt: number): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

const buildMeasurementName = (): string => {
  const iso = new Date().toISOString().slice(0, 19).replace('T', ' ')
  return `Field station ${iso}`
}

const formatApiErrorMessage = (error: ApiError): string => {
  const statusLine = `Request failed (${error.status}): POST /api/measurements/`
  if (!error.responseBodyText) return statusLine
  try {
    const parsed = JSON.parse(error.responseBodyText) as Record<string, unknown>
    const details = Object.entries(parsed)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.join(', ')}`
        if (typeof value === 'string') return `${key}: ${value}`
        return `${key}: ${JSON.stringify(value)}`
      })
      .join(' | ')
    return details ? `${statusLine} — ${details}` : statusLine
  } catch {
    const compact = error.responseBodyText.replace(/\s+/g, ' ').trim()
    return compact ? `${statusLine} — ${compact}` : statusLine
  }
}

function StatusPill({ status }: { status: StationStatus }): React.JSX.Element {
  const { label, dot, text } = useMemo(() => {
    switch (status) {
      case 'connecting':
        return {
          label: 'Connecting',
          dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
          text: 'text-amber-700'
        }
      case 'online':
      case 'capturing':
      case 'imported':
        return {
          label: 'Online',
          dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
          text: 'text-emerald-700'
        }
      case 'error':
        return { label: 'Offline', dot: 'bg-rose-500', text: 'text-rose-700' }
      default:
        return { label: '—', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' }
    }
  }, [status])
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', text)}>
      <span className={cn('inline-block h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  )
}

function MetaCell({
  label,
  value,
  icon
}: {
  label: string
  value: string
  icon: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="scientific-label">{label}</p>
        <p className="truncate font-mono text-xs">{value}</p>
      </div>
    </div>
  )
}

function ReadingCard({
  label,
  value,
  unit,
  accent,
  icon,
  pulse
}: {
  label: string
  value: string
  unit: string
  accent: string
  icon: React.ReactNode
  pulse: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-border bg-card p-4">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          accent,
          pulse ? 'animate-pulse' : ''
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="scientific-label">{label}</p>
        <p className="font-mono text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </div>
    </div>
  )
}

export function FieldStationPanel({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [status, setStatus] = useState<StationStatus>('connecting')
  const [reading, setReading] = useState<LiveReading | null>(null)
  const [rssi, setRssi] = useState<number>(-58)
  const [message, setMessage] = useState('')
  const [savedMeasurementId, setSavedMeasurementId] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setStartedAt(Date.now())
      setReading(buildInitialReading())
      setRssi(formatRssi())
      setStatus('online')
    }, CONNECT_DELAY_MS)
    return () => window.clearTimeout(handle)
  }, [])

  useEffect(() => {
    if (status === 'connecting' || status === 'error') return
    const handle = window.setInterval(() => {
      setReading((previous) => (previous ? advanceReading(previous) : buildInitialReading()))
      setRssi(formatRssi())
    }, SAMPLE_INTERVAL_MS)
    return () => window.clearInterval(handle)
  }, [status])

  useEffect(() => {
    const handle = window.setInterval(() => {
      forceTick((t) => (t + 1) % 1_000_000)
    }, 1000)
    return () => window.clearInterval(handle)
  }, [])

  const captureMeasurement = useCallback(async (): Promise<void> => {
    if (!reading) return
    setStatus('capturing')
    setMessage('')
    setSavedMeasurementId('')
    try {
      const now = new Date()
      const result = await createMeasurement({
        name: buildMeasurementName(),
        source: 'lab_equipment',
        sampleDate: now.toISOString().slice(0, 10),
        sampleTime: now.toTimeString().slice(0, 8),
        temperature: round(reading.temperature, SETPOINTS.temperature.decimals),
        ph: round(reading.ph, SETPOINTS.ph.decimals),
        parameters: [
          {
            parameterCode: 'HUM',
            parameterName: 'Relative Humidity',
            unit: '%',
            value: round(reading.humidity, SETPOINTS.humidity.decimals),
            file: DEVICE_ID
          },
          {
            parameterCode: 'EC',
            parameterName: 'Electrical Conductance',
            unit: 'uS/cm',
            value: round(reading.conductivity, SETPOINTS.conductivity.decimals),
            file: DEVICE_ID
          },
          {
            parameterCode: 'DO',
            parameterName: 'Dissolved Oxygen',
            unit: 'mg/L',
            value: round(reading.dissolvedOxygen, SETPOINTS.dissolvedOxygen.decimals),
            file: DEVICE_ID
          },
          {
            parameterCode: 'TURB',
            parameterName: 'Turbidity',
            unit: 'NTU',
            value: round(reading.turbidity, SETPOINTS.turbidity.decimals),
            file: DEVICE_ID
          }
        ]
      })
      setSavedMeasurementId(result.measurementId)
      setStatus('imported')
    } catch (error) {
      setStatus('error')
      if (error instanceof ApiError) {
        setMessage(`Capture failed: ${formatApiErrorMessage(error)}`)
      } else if (error instanceof Error) {
        setMessage(`Capture failed: ${error.message}`)
      } else {
        setMessage(`Capture failed: ${String(error)}`)
      }
    }
  }, [reading])

  const reconnect = useCallback((): void => {
    setStatus('connecting')
    setReading(null)
    setMessage('')
    setSavedMeasurementId('')
    window.setTimeout(() => {
      setStartedAt(Date.now())
      setReading(buildInitialReading())
      setRssi(formatRssi())
      setStatus('online')
    }, CONNECT_DELAY_MS)
  }, [])

  const isOnline = status === 'online' || status === 'capturing' || status === 'imported'
  const captureBusy = status === 'capturing'
  const captureDisabled = !reading || !isOnline || captureBusy

  return (
    <div className="w-full space-y-5">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wifi size={15} strokeWidth={1.5} className="text-muted-foreground" />
            <span className="text-sm font-medium">Blau Field Station</span>
            <StatusPill status={status} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={reconnect}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Radio size={14} strokeWidth={1.5} />
            )}
            Reconnect
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaCell label="Device" value={DEVICE_ID} icon={<Cpu size={13} strokeWidth={1.5} />} />
          <MetaCell
            label="Hardware"
            value={HARDWARE_REV}
            icon={<Activity size={13} strokeWidth={1.5} />}
          />
          <MetaCell
            label="Signal"
            value={isOnline ? `${rssi} dBm` : '—'}
            icon={<Signal size={13} strokeWidth={1.5} />}
          />
          <MetaCell
            label="Uptime"
            value={isOnline && startedAt !== null ? formatUptime(startedAt) : '—'}
            icon={<Activity size={13} strokeWidth={1.5} />}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Firmware {FIRMWARE_VERSION} · streaming over Wi-Fi · last sample{' '}
          {reading ? new Date(reading.takenAt).toLocaleTimeString([], { hour12: false }) : '—'}
        </p>
      </div>

      {status === 'connecting' ? (
        <div className="flex items-center gap-3 rounded-[6px] border border-border bg-muted/30 px-4 py-6">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Connecting to field station…</p>
            <p className="text-xs text-muted-foreground">
              Resolving {DEVICE_ID} on the local network
            </p>
          </div>
        </div>
      ) : null}

      {reading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <ReadingCard
              icon={<Thermometer size={18} strokeWidth={1.5} />}
              label="Temperature"
              value={reading.temperature.toFixed(SETPOINTS.temperature.decimals)}
              unit="deg C"
              accent="bg-orange-500/10 text-orange-600"
              pulse={isOnline}
            />
            <ReadingCard
              icon={<Droplets size={18} strokeWidth={1.5} />}
              label="pH"
              value={reading.ph.toFixed(SETPOINTS.ph.decimals)}
              unit="dimensionless"
              accent="bg-blue-500/10 text-blue-600"
              pulse={isOnline}
            />
            <ReadingCard
              icon={<Droplets size={18} strokeWidth={1.5} />}
              label="Humidity"
              value={reading.humidity.toFixed(SETPOINTS.humidity.decimals)}
              unit="% RH"
              accent="bg-cyan-500/10 text-cyan-600"
              pulse={isOnline}
            />
            <ReadingCard
              icon={<Zap size={18} strokeWidth={1.5} />}
              label="Conductance"
              value={String(Math.round(reading.conductivity))}
              unit="uS/cm"
              accent="bg-violet-500/10 text-violet-600"
              pulse={isOnline}
            />
            <ReadingCard
              icon={<Activity size={18} strokeWidth={1.5} />}
              label="Dissolved O2"
              value={reading.dissolvedOxygen.toFixed(SETPOINTS.dissolvedOxygen.decimals)}
              unit="mg/L"
              accent="bg-emerald-500/10 text-emerald-600"
              pulse={isOnline}
            />
            <ReadingCard
              icon={<Activity size={18} strokeWidth={1.5} />}
              label="Turbidity"
              value={reading.turbidity.toFixed(SETPOINTS.turbidity.decimals)}
              unit="NTU"
              accent="bg-amber-500/10 text-amber-600"
              pulse={isOnline}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void captureMeasurement()} disabled={captureDisabled}>
              {captureBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} strokeWidth={1.5} />
              )}
              Capture measurement
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <p className="text-xs text-muted-foreground">
              Saves the current sample to your measurements feed.
            </p>
          </div>

          {savedMeasurementId ? (
            <div className="flex items-center gap-2 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-600" />
              <p className="text-sm text-emerald-700">
                Measurement saved — ID: <span className="font-mono">{savedMeasurementId}</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{message}</p>
        </div>
      ) : null}
    </div>
  )
}
