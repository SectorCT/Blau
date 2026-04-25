import type { FormEvent } from 'react'
import type { Study } from '../types'

type StudiesPanelProps = {
  studies: Study[]
  newStudyName: string
  newStudyDescription: string
  onStudyNameChange: (value: string) => void
  onStudyDescriptionChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function StudiesPanel({
  studies,
  newStudyName,
  newStudyDescription,
  onStudyNameChange,
  onStudyDescriptionChange,
  onSubmit,
}: StudiesPanelProps) {
  return (
    <section className="card">
      <h2>Studies</h2>
      <form onSubmit={onSubmit} className="grid">
        <label>
          Name
          <input value={newStudyName} onChange={(event) => onStudyNameChange(event.target.value)} required />
        </label>
        <label>
          Description
          <input value={newStudyDescription} onChange={(event) => onStudyDescriptionChange(event.target.value)} />
        </label>
        <button type="submit">Create Study</button>
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
