import type { FormEvent } from 'react'

type LoginFormProps = {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <section className="card">
      <h2>Authentication</h2>
      <form onSubmit={onSubmit} className="grid">
        <label>
          Email
          <input value={email} onChange={(event) => onEmailChange(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => onPasswordChange(event.target.value)} type="password" required />
        </label>
        <button type="submit">Sign In</button>
      </form>
    </section>
  )
}
