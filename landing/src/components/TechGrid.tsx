const columns = [
  {
    title: 'Quantum stack',
    body: 'Four libraries cooperating to score one filter.',
    items: [
      'PySCF — Unrestricted Hartree-Fock with STO-3G basis.',
      'PennyLane — VQE algorithm, parameter-shift gradients, optimisation loop.',
      'UCCSD ansatz — deterministic active space per system.',
      'qiskit-ibm-runtime — circuit execution on real IBM Quantum backends.',
    ],
  },
  {
    title: 'Genetic search',
    body: 'Classical evolutionary optimisation over 5 design genes.',
    items: [
      'DEAP framework with `optimize_filter()` as the runtime entry point.',
      'Pore size 0.3–2.0 nm · layer thickness 0.5–5.0 nm · material · functionalisation · doping.',
      'Tournament selection · two-point crossover · Gaussian mutation.',
      'Fitness = |binding_energy|; ProcessPoolExecutor for parallel evaluation.',
    ],
  },
  {
    title: 'Lattice construction',
    body: 'Genes alone aren’t a filter — these algorithms build the atoms.',
    items: [
      'Honeycomb graphene from a = 2.46 Å (C-C bond = a/√3).',
      'Kekulé bond orders via BFS 2-colouring of the bipartite graph.',
      'Edge-atom detection · -COOH for heavy metals · -NH₂ for anions · -OH default.',
      'Multi-layer stacking with 3.4 Å vdW interlayer spacing.',
    ],
  },
]

function TechGrid() {
  return (
    <section className="section tech-section" id="how-we-built-it">
      <p className="section-eyebrow">How we built it</p>
      <h2>One scientific stack — three layers of rigour.</h2>
      <div className="tech-grid">
        {columns.map((col) => (
          <article className="tech-col" key={col.title}>
            <h3>{col.title}</h3>
            <p className="tech-col-body">{col.body}</p>
            <ul>
              {col.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="arch-card" id="architecture">
        <p className="section-eyebrow">Architecture</p>
        <h3>Multi-tier, fully Dockerised.</h3>
        <p className="section-copy">
          The Electron client never talks to the simulation engine directly — only the Celery
          worker does. Heavy compute and quantum jobs run out-of-band from any user-facing
          request.
        </p>
        <pre className="arch-diagram" aria-label="Blau service diagram">{`Electron desktop client (React 19, TypeScript)
        │ HTTP + JWT
        ▼
Django REST API + Celery + Redis (Postgres)
        │ HTTP to internal core service
        ▼
FastAPI core simulation service (SQLite)
        │
        ├── DEAP genetic algorithm
        ├── PySCF Hartree-Fock (STO-3G)
        ├── PennyLane + qiskit-ibm-runtime VQE  ──►  IBM Quantum
        └── Lattice / Kekulé / functional-group construction`}</pre>
      </div>
    </section>
  )
}

export default TechGrid
