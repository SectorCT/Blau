function FieldStation() {
  return (
    <section className="section section-soft hardware" id="hardware">
      <div className="hardware-grid">
        <div className="hardware-terminal" aria-label="Arduino UNO Q WiFi POST to Blau API">
          <div className="hardware-terminal-bar">
            <div className="hardware-terminal-dot" style={{ background: '#ef4444' }} />
            <div className="hardware-terminal-dot" style={{ background: '#f59e0b' }} />
            <div className="hardware-terminal-dot" style={{ background: '#22c55e' }} />
            <span>arduino_uno_q · wifi_post.py</span>
          </div>
          <div className="hardware-terminal-body">
            <div>
              <span className="t-comment">$ </span>
              <span className="t-dim">python wifi_post.py --host blau.local</span>
            </div>
            <div>&nbsp;</div>
            <div><span className="t-key">POST</span> <span className="t-dim">/api/measurements/ HTTP/1.1</span></div>
            <div><span className="t-label">Host           </span><span className="t-val">blau.local</span></div>
            <div><span className="t-label">Authorization  </span><span className="t-str">Bearer eyJhbGciOiJIUzI1…</span></div>
            <div><span className="t-label">Content-Type   </span><span className="t-dim">application/json</span></div>
            <div>&nbsp;</div>
            <div><span className="t-dim">{'{'}</span></div>
            <div>{'  '}<span className="t-key">"study_id"</span><span className="t-dim">:    </span><span className="t-str">"573e6023-3ed3-43fb…"</span><span className="t-dim">,</span></div>
            <div>{'  '}<span className="t-key">"temperature"</span><span className="t-dim">: </span><span className="t-val">18.50</span><span className="t-dim">,</span></div>
            <div>{'  '}<span className="t-key">"humidity"</span><span className="t-dim">:    </span><span className="t-val">72.3</span><span className="t-dim">,</span></div>
            <div>{'  '}<span className="t-key">"source"</span><span className="t-dim">:     </span><span className="t-str">"arduino_uno_q"</span><span className="t-dim">,</span></div>
            <div>{'  '}<span className="t-key">"device_id"</span><span className="t-dim">:  </span><span className="t-str">"QRB2210-001"</span></div>
            <div><span className="t-dim">{'}'}</span></div>
            <div>&nbsp;</div>
            <div><span className="t-success">← 201 Created</span>  <span className="t-dim">·  43 ms  ·  measurement saved</span></div>
          </div>
        </div>

        <div className="hardware-copy">
          <p className="section-eyebrow">Hardware companion · Qualcomm</p>
          <h2>Longitudinal fieldwork, straight into the platform.</h2>
          <p className="hero-text">
            For researchers running long campaigns on a real water source, an{' '}
            <strong>Arduino UNO Q</strong> powered by the <strong>Qualcomm QRB2210</strong> SoC
            runs a Python app inside the Uno Q App Lab. It reads a{' '}
            <strong>Modulino Thermo (HS3003)</strong> over I²C and POSTs measurements to the Blau
            API over WiFi — they appear live in the active study.
          </p>
          <ul className="hardware-bullets">
            <li>Qualcomm QRB2210 SoC · Linux on the Uno Q App Lab.</li>
            <li>Modulino Thermo (HS3003) over I²C — temperature &amp; humidity.</li>
            <li>WiFi HTTP POST to Django ingest endpoint with JWT auth.</li>
            <li>Optional — the platform doesn't need it; researchers running real fieldwork do.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export default FieldStation
