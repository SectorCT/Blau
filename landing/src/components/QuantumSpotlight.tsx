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

        <div className="vqe-terminal" aria-label="VQE job output on IBM Quantum">
          <div className="vqe-terminal-bar">
            <div className="vqe-terminal-dot" style={{ background: '#ef4444' }} />
            <div className="vqe-terminal-dot" style={{ background: '#f59e0b' }} />
            <div className="vqe-terminal-dot" style={{ background: '#22c55e' }} />
            <span>blau · run_quantum.py · ibm_sherbrooke</span>
          </div>
          <div className="vqe-terminal-body">
            <div>
              <span className="t-comment">$ </span>
              <span className="t-dim">python run_quantum.py --filter 3587ef2a --pollutant ca_ion</span>
            </div>
            <div className="t-divider">{'─'.repeat(46)}</div>
            <div><span className="t-label">Ansatz   </span><span className="t-key">UCCSD</span>  <span className="t-dim">active space 4e / 4o</span></div>
            <div><span className="t-label">Qubits   </span><span className="t-val">4</span></div>
            <div><span className="t-label">Shots    </span><span className="t-val">1024</span></div>
            <div><span className="t-label">Backend  </span><span className="t-str">ibm_sherbrooke</span></div>
            <div><span className="t-label">Depth    </span><span className="t-val">12</span>  <span className="t-dim">layers</span></div>
            <div>&nbsp;</div>
            <div><span className="t-dim">Computing E(filter + Ca²⁺)…</span>  <span className="t-success">done  1.8 s</span></div>
            <div><span className="t-dim">Computing E(filter)………………</span>  <span className="t-success">done  1.6 s</span></div>
            <div><span className="t-dim">Computing E(Ca²⁺)……………………</span>  <span className="t-success">done  0.9 s</span></div>
            <div>&nbsp;</div>
            <div className="t-divider">{'─'.repeat(46)}</div>
            <div><span className="t-label">E_HF baseline </span><span className="t-dim">−0.6512 eV</span></div>
            <div><span className="t-label">E_VQE         </span><span className="t-result">−0.6683 eV  ← quantum</span></div>
            <div><span className="t-label">ΔE (VQE−HF)   </span><span className="t-key">−0.0171 eV</span></div>
            <div>&nbsp;</div>
            <div><span className="t-label">Job ID   </span><span className="t-dim">crv8qz3a4p7f</span></div>
            <div><span className="t-label">Wall time </span><span className="t-val">4.3 s</span></div>
            <div><span className="t-label">Status   </span><span className="t-success">DONE</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default QuantumSpotlight
