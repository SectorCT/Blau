type AppHeaderProps = {
  isAuthenticated: boolean
  onLogout: () => void
  onRefresh?: () => void
}

export function AppHeader({ isAuthenticated, onLogout, onRefresh }: AppHeaderProps) {
  return (
    <header className="header">
      <div>
        <h1>Blau Frontend</h1>
        <p>Frontend console for studies, measurements, and generated filters.</p>
      </div>
      <div className="header-actions">
        {isAuthenticated && onRefresh ? (
          <button type="button" className="button-secondary" onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
        {isAuthenticated ? (
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </div>
    </header>
  )
}
