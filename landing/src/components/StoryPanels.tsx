const panels = [
  {
    title: 'Challenges we ran into',
    items: [
      'Wiring four quantum libraries — PennyLane, Qiskit, qiskit-ibm-runtime, PySCF — into one stable binding-energy oracle.',
      'STO-3G has no basis for Z > 36, so heavy elements (Pb, Hg, Cd) crash the engine — solved with a chemically defensible same-group proxy table surfaced in the UI.',
      'Polymers as single atoms — PE/PP via vdW → C, PVC via Cl dipole → Cl, PET via ester O → O.',
      'Kekulé bond orders on a graphene lattice via BFS 2-colouring of the bipartite honeycomb graph.',
      'IBM Quantum queue times — VQE is gated behind an env var with the deterministic HF path as fallback.',
    ],
  },
  {
    title: "Accomplishments we're proud of",
    items: [
      'A real-world problem with a real research user — grounded in Barcelona water-quality data.',
      'Quantum chemistry on real hardware — VQE jobs running on IBM Quantum, returning binding energies that the GA actually consumes.',
      'Honesty as a feature — every layer tagged with the level of theory (HF / VQE / empirical / proxied).',
      'Production-shaped architecture — JWT-authed, Celery-orchestrated, Docker-Compose-deployable, exportable scientific formats.',
      'Five distinct numerical and quantum technologies behind one clean API.',
    ],
  },
  {
    title: 'What we learned',
    items: [
      'Quantum advantage is narrow but real — for ionic systems, VQE outperformed classical Hartree-Fock and refined CCSD on some configurations.',
      'The hardest part of "just call a quantum computer" is the four-library bridge that gets you there.',
      'Scientific tools live or die on provenance — a binding energy without a method tag is worse than no number at all.',
      'Approximations have to be honest — single-atom polymer proxies and same-group heavy-metal substitutions are defensible only if surfaced.',
    ],
  },
  {
    title: "What's next",
    items: [
      'Multi-atom interaction sites — small clusters (3–5 atoms) for richer organic-molecule modelling.',
      'More basis sets and methods — 6-31G* and B3LYP/DFT, propagated through the UI.',
      'More quantum backends — benchmark across IBM Quantum machines to find the best fit per molecule class.',
      'Pilot with a real lab — Barcelona’s ICM-CSIC publishes microplastic concentration data that maps onto Blau’s input format.',
      'Experimental validation — partner with a 2D-materials lab to fabricate one Blau-designed layer and measure removal efficiency.',
    ],
  },
]

function StoryPanels() {
  return (
    <section className="section story" id="story">
      <p className="section-eyebrow">The story</p>
      <h2>Challenges, learnings, and what comes next.</h2>
      <div className="story-grid">
        {panels.map((panel) => (
          <article className="story-card" key={panel.title}>
            <h3>{panel.title}</h3>
            <ul>
              {panel.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

export default StoryPanels
