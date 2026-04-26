import './App.css'

function App() {
  return (
    <div className="landing-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/blauicontransparent-cropped.png" className="brand-mark" alt="Blau logo" />
          <span className="brand-name">Blau Chemistry</span>
        </div>
        <nav className="main-nav" aria-label="Primary">
          <a href="#capabilities">Capabilities</a>
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <p className="eyebrow">Computational Chemistry Platform</p>
          <h1>
            Molecular intelligence at
            <span> laboratory-grade clarity.</span>
          </h1>
          <p className="hero-copy">
            Blau brings structure discovery, reaction simulation, and quality scoring into one
            precision workflow. Designed for chemists who need publication-ready confidence, not
            noisy dashboards.
          </p>

          <div className="hero-actions">
            <a href="#contact" className="btn btn-primary">
              Schedule a Demo
            </a>
            <a href="#workflow" className="btn btn-ghost">
              Explore Workflow
            </a>
          </div>

          <div className="tags-row" aria-label="Platform highlights">
            <span>Reaction Kinetics</span>
            <span>3D Structure Engine</span>
            <span>Spectral Prediction</span>
            <span>Validation Pipelines</span>
          </div>
        </section>

        <section className="metrics-strip" aria-label="Performance highlights">
          <article>
            <h2>12M</h2>
            <p>Molecules indexed</p>
          </article>
          <article>
            <h2>24x</h2>
            <p>Faster hypothesis screening</p>
          </article>
          <article>
            <h2>96.4%</h2>
            <p>Prediction confidence window</p>
          </article>
          <article>
            <h2>0</h2>
            <p>Opaque model decisions</p>
          </article>
        </section>

        <section id="capabilities" className="section capabilities">
          <div className="section-heading">
            <p className="eyebrow">Core capabilities</p>
            <h3>
              Engineered for <span>precision chemistry.</span>
            </h3>
            <p>
              Each module maps to a real laboratory constraint: clarity, reproducibility, and
              traceable results from the first simulation to the final report.
            </p>
          </div>

          <div className="card-grid">
            <article>
              <p className="pill">MODEL</p>
              <h4>Quantum-aware reaction simulation</h4>
              <p>Run deterministic pathways with transition-state annotations and confidence maps.</p>
            </article>
            <article>
              <p className="pill">STRUCTURE</p>
              <h4>3D molecular architecture viewer</h4>
              <p>Inspect geometry, bond orientation, and conformational drift in one focused space.</p>
            </article>
            <article>
              <p className="pill">SPECTRUM</p>
              <h4>IR / NMR prediction studio</h4>
              <p>Compare expected signatures against references to validate compounds faster.</p>
            </article>
            <article>
              <p className="pill">TRACEABILITY</p>
              <h4>Reproducible experiment lineage</h4>
              <p>Every run records assumptions, parameters, and method changes for audit clarity.</p>
            </article>
            <article>
              <p className="pill">DATA</p>
              <h4>Dataset integrity scoring</h4>
              <p>Highlight outliers, missing values, and contamination risk before model training.</p>
            </article>
            <article>
              <p className="pill">EXPORT</p>
              <h4>Publication-ready outputs</h4>
              <p>Generate clean tables, structure snapshots, and summary notes for your lab reports.</p>
            </article>
          </div>
        </section>

        <section id="workflow" className="section workflow">
          <div className="workflow-list">
            <p className="eyebrow">Get started</p>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h4>Load your compounds</h4>
                  <p>Import structures from SDF, SMILES, or internal LIMS with automatic cleanup.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h4>Define chemistry constraints</h4>
                  <p>Set reaction conditions, temperature windows, and catalyst assumptions.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h4>Run guided simulations</h4>
                  <p>Evaluate kinetic outcomes, spectral signatures, and structural confidence.</p>
                </div>
              </li>
              <li>
                <span>04</span>
                <div>
                  <h4>Deliver validated insights</h4>
                  <p>Share experiment-ready reports with transparent model reasoning included.</p>
                </div>
              </li>
            </ol>
          </div>

          <aside className="code-card" aria-label="Example workflow configuration">
            <p>// Blau chemistry runbook</p>
            <pre>{`load_dataset("candidate_molecules.sdf")
set_reaction_profile({
  temperature: "298K",
  solvent: "ethanol",
  catalyst: "Pd/C"
})
run_simulation({ mode: "deterministic" })
compare_signatures(["IR", "NMR"])
export_report("compound_validation.pdf")`}</pre>
          </aside>
        </section>
      </main>

      <footer id="contact" className="footer-cta">
        <img src="/blauicontransparent-cropped.png" className="footer-logo" alt="Blau logo" />
        <p className="eyebrow">Built for chemistry teams</p>
        <h3>Build with confidence from molecule to decision.</h3>
        <a href="#" className="btn btn-primary">
          Talk with Blau
        </a>
      </footer>
    </div>
  )
}

export default App
