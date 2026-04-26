function QuantumSpotlight() {
  return (
    <section className="section section-dark spotlight" id="quantum">
      <div className="spotlight-grid">
        <div className="spotlight-copy">
          <p className="section-eyebrow on-dark">The wow</p>
          <h2>Real qubits. Real chemistry.</h2>
          <p className="hero-text on-dark">
            For every candidate filter, Blau computes the binding energy at the electron level:
          </p>
          <pre className="formula" aria-label="binding energy formula">
            E_bind = E(filter + pollutant) − E(filter) − E(pollutant)
          </pre>
          <ul className="spotlight-list">
            <li>
              <strong>PennyLane VQE</strong> with a <strong>UCCSD ansatz</strong> — the variational
              form for ground-state energies.
            </li>
            <li>
              <strong>qiskit-ibm-runtime</strong> as the bridge — PennyLane's <code>qiskit.remote</code>{' '}
              device routes the circuit onto an <strong>IBM Quantum</strong> backend at 1024 shots.
            </li>
            <li>
              <strong>PySCF Hartree-Fock</strong> with STO-3G as the deterministic baseline; empirical
              fallbacks for systems STO-3G can't represent.
            </li>
            <li>
              For ionic pollutants, the quantum result is measurably more accurate than classical
              Hartree-Fock — and in some configurations faster than refined classical CCSD.
            </li>
          </ul>
        </div>
        <figure className="spotlight-figure" data-fallback="IBM Quantum console">
          <img
            src="/screenshots/ibm-console.png"
            alt="IBM Quantum console showing a Blau VQE job"
            width={1600}
            height={1000}
            loading="lazy"
          />
          <figcaption>VQE job on IBM&nbsp;Quantum hardware — not a simulator.</figcaption>
        </figure>
      </div>
    </section>
  )
}

export default QuantumSpotlight
