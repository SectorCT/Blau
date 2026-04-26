import { REPO_URL, DEVPOST_URL } from '../constants'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <p className="footer-brand">Blau</p>
          <p className="footer-line">Water Quality Analysis Platform · HackUPC&nbsp;2026</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
          <a href={DEVPOST_URL} target="_blank" rel="noreferrer">Devpost</a>
          <a href="#problem">Problem</a>
          <a href="#quantum">IBM Quantum</a>
          <a href="#hardware">Hardware</a>
        </nav>
        <div>
          <p className="footer-line">
            Sponsor track: <strong>Qualcomm</strong> · Quantum execution on{' '}
            <strong>IBM&nbsp;Quantum</strong>.
          </p>
          <p className="footer-line footer-fineprint">
            Public-data attribution: UNEP GEMS/Water Global Freshwater Quality Archive
            (GEMStat&nbsp;v3, CC&nbsp;BY&nbsp;4.0).
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
