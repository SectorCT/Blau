import { REPO_URL, DEVPOST_URL, DOWNLOAD_URL } from '../constants'

function Topbar() {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Blau home">
        <img
          className="brand-mark"
          src="/blauicontransparent-cropped.png"
          alt=""
          width={32}
          height={32}
        />
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
        <a href="#gallery">Screenshots</a>
        <a className="ghost-link" href={DEVPOST_URL} target="_blank" rel="noreferrer">
          Devpost
        </a>
        <a className="ghost-link" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a className="cta cta-primary topbar-download" href={DOWNLOAD_URL} download>
          ↓ Download
        </a>
      </nav>
    </header>
  )
}

export default Topbar
