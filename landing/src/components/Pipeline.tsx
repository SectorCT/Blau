const steps = [
  {
    n: '1',
    title: 'Measure',
    body: 'Manual entry, CSV import, USB lab equipment, GEMStat dataset, or live-streamed from the field station.',
  },
  {
    n: '2',
    title: 'Propose',
    body: 'DEAP genetic algorithm searches across 5 design genes — pore, thickness, material, functionalisation, doping.',
  },
  {
    n: '3',
    title: 'Score',
    body: 'PySCF Hartree-Fock baseline · PennyLane VQE on real IBM Quantum hardware · empirical fallbacks.',
  },
  {
    n: '4',
    title: 'Blueprint',
    body: 'Real atomic structure with Kekulé bond orders and -COOH/-NH₂/-OH groups. Exportable as CSV / XYZ / SDF.',
  },
]

function Pipeline() {
  return (
    <section className="section pipeline-section" id="pipeline">
      <p className="section-eyebrow">What it does</p>
      <h2>A four-step research workflow.</h2>
      <p className="section-copy">
        Researcher loads a water sample → marks the pollutants that matter → presses Generate →
        gets a 3D molecular structure of a candidate filter, per-pollutant removal-efficiency
        predictions, and an export to standard chemistry formats.
      </p>
      <ol className="pipeline-strip">
        {steps.map((step, idx) => (
          <li className="pipeline-step" key={step.n}>
            <span className="pipeline-n">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {idx < steps.length - 1 && (
              <span className="pipeline-arrow" aria-hidden="true">→</span>
            )}
          </li>
        ))}
      </ol>
      <figure className="inline-figure" data-fallback="FilterAnalysis chart">
        <img
          src="/screenshots/filter-analysis.png"
          alt="Per-pollutant removal-efficiency chart with method tags"
          width={1600}
          height={900}
          loading="lazy"
        />
        <figcaption>
          Every result is tagged with the level of theory that produced it (HF / VQE / empirical /
          proxied). Provenance is the most important UX decision in the app.
        </figcaption>
      </figure>
    </section>
  )
}

export default Pipeline
