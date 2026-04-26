function FieldStation() {
  return (
    <section className="section section-soft hardware" id="hardware">
      <div className="hardware-grid">
        <figure className="hardware-figure" data-fallback="Field station photo">
          <img
            src="/screenshots/field-station.png"
            alt="Arduino UNO Q running the Blau field station with a Modulino Thermo sensor"
            width={1200}
            height={900}
            loading="lazy"
          />
          <figcaption>
            Arduino UNO Q + Modulino Thermo HS3003 — live measurements over WiFi.
          </figcaption>
        </figure>
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
            <li>Modulino Thermo (HS3003) over I²C — temperature & humidity.</li>
            <li>WiFi HTTP POST to Django ingest endpoint with JWT.</li>
            <li>Optional — the platform doesn't need it; researchers running real fieldwork do.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export default FieldStation
