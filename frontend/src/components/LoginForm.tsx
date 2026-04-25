import type { FormEvent } from 'react'

type LoginFormProps = {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
}

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
}: LoginFormProps) {
  return (
    <section className="card">
      <h2>Authentication</h2>
      <form onSubmit={onSubmit} className="grid">
        <label>
          Email
          <input value={email} onChange={(event) => onEmailChange(event.target.value)} type="email" required disabled={isLoading} />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => onPasswordChange(event.target.value)} type="password" required disabled={isLoading} />
        </label>
        <button type="submit" disabled={isLoading}>
          Sign In
        </button>
      </form>
    </section>
  )
}
