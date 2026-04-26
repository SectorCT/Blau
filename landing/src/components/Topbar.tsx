import { REPO_URL, DEVPOST_URL } from '../constants'

function Topbar() {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Blau home">
        <div className="brand-mark" aria-hidden="true">B</div>
        <div>
          <p className="brand-title">Blau</p>
          <p className="brand-subtitle">Water Quality Analysis Platform</p>
        </div>
      </a>
      <nav className="topbar-nav" aria-label="Main">
        <a href="#problem">Problem</a>
        <a href="#pipeline">Pipeline</a>
        <a href="#quantum">IBM Quantum</a>
        <a href="#hardware">Hardware</a>
        <a className="ghost-link" href={DEVPOST_URL} target="_blank" rel="noreferrer">
          Devpost
        </a>
        <a className="ghost-link" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  )
}

export default Topbar
