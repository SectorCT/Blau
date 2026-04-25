import './App.css'

function App() {
  return (
    <div className="page">
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <p className="brand-title">Blau</p>
            <p className="brand-subtitle">Landing Preview</p>
          </div>
        </div>
        <a className="ghost-link" href="https://github.com" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">AI + Water Quality</p>
            <h1>Designing cleaner, healthier water with Blau</h1>
            <p className="hero-text">
              A modern platform for water measurement intelligence, smart filtration workflows, and
              scientific visualization. Built for demos today, production tomorrow.
            </p>
            <div className="cta-row">
              <a className="cta cta-primary" href="https://github.com" target="_blank" rel="noreferrer">
                View on GitHub
              </a>
              <a className="cta cta-secondary" href="#downloads">
                Download Builds
              </a>
            </div>
          </div>

          <div className="hero-panel">
            <div className="logo-placeholder">
              <span>Logo Placeholder</span>
              <small>Add your final logo here later</small>
            </div>
            <div className="mini-stats">
              <article>
                <p>Workflows</p>
                <strong>Measurement to Filter</strong>
              </article>
              <article>
                <p>Visual style</p>
                <strong>Light blue glass UI</strong>
              </article>
              <article>
                <p>Stack</p>
                <strong>React + Vite</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="features">
          <h2>Why this landing works</h2>
          <div className="feature-grid">
            <article className="feature-card">
              <h3>Fast Funnel</h3>
              <p>Users can immediately choose between exploring code and downloading runnable builds.</p>
            </article>
            <article className="feature-card">
              <h3>Hackathon Ready</h3>
              <p>Clean sections, strong hierarchy, and polished visuals that support pitch storytelling.</p>
            </article>
            <article className="feature-card">
              <h3>Future Expandable</h3>
              <p>React component structure lets you plug in auth, docs, changelog, and analytics later.</p>
            </article>
          </div>
        </section>

        <section id="downloads" className="downloads">
          <h2>Download Blau</h2>
          <p className="section-copy">
            Keep these links as placeholders now, then connect them to your release artifacts.
          </p>
          <div className="download-grid">
            <a className="download-card" href="#" onClick={(event) => event.preventDefault()}>
              <p>Desktop for Windows</p>
              <span>Coming soon</span>
            </a>
            <a className="download-card" href="#" onClick={(event) => event.preventDefault()}>
              <p>Desktop for macOS</p>
              <span>Coming soon</span>
            </a>
            <a className="download-card" href="#" onClick={(event) => event.preventDefault()}>
              <p>Desktop for Linux</p>
              <span>Coming soon</span>
            </a>
            <a className="download-card" href="https://github.com" target="_blank" rel="noreferrer">
              <p>Source Code</p>
              <span>Open repository</span>
            </a>
          </div>
        </section>

        <section className="roadmap">
          <h2>Next Additions</h2>
          <div className="roadmap-list">
            <div>Brand logos and visuals</div>
            <div>Live release feed</div>
            <div>Embedded product demo video</div>
            <div>Newsletter and contact section</div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Built with React for future growth.</p>
        <div className="footer-links">
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="#downloads">Downloads</a>
        </div>
      </footer>
    </div>
  )
}

export default App
