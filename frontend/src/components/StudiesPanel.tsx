import type { FormEvent } from 'react'
import type { Study } from '../types'

type StudiesPanelProps = {
  studies: Study[]
  newStudyName: string
  newStudyDescription: string
  onStudyNameChange: (value: string) => void
  onStudyDescriptionChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
}

export function StudiesPanel({
  studies,
  newStudyName,
  newStudyDescription,
  onStudyNameChange,
  onStudyDescriptionChange,
  onSubmit,
  isLoading,
}: StudiesPanelProps) {
  return (
    <section className="card">
      <h2>Studies</h2>
      <form onSubmit={onSubmit} className="grid">
        <label>
          Name
          <input value={newStudyName} onChange={(event) => onStudyNameChange(event.target.value)} required disabled={isLoading} />
        </label>
        <label>
          Description
          <input value={newStudyDescription} onChange={(event) => onStudyDescriptionChange(event.target.value)} disabled={isLoading} />
        </label>
        <button type="submit" disabled={isLoading}>
          Create Study
        </button>
      </form>
      <ul>
        {studies.map((study) => (
          <li key={study.id}>
            <strong>{study.name}</strong>
            <span>{study.description || 'No description'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
