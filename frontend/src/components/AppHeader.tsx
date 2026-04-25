type AppHeaderProps = {
  isAuthenticated: boolean
  onLogout: () => void
}

export function AppHeader({ isAuthenticated, onLogout }: AppHeaderProps) {
  return (
    <header className="header">
      <div>
        <h1>Blau Frontend</h1>
        <p>Frontend console for studies, measurements, and generated filters.</p>
      </div>
      <div>
        {isAuthenticated ? (
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </div>
    </header>
  )
}
