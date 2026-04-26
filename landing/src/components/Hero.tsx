import { REPO_URL, DEVPOST_URL, DEMO_URL, DOWNLOAD_URL } from '../constants'

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Water Quality Analysis Platform</p>
        <h1>From water sample to filter blueprint.</h1>
        <p className="hero-text">
          A research platform for water-purification scientists. A genetic algorithm proposes
          molecular lattices; first-principles quantum chemistry on{' '}
          <strong>real IBM&nbsp;Quantum hardware</strong> scores them. From a Barcelona water
          sample to a lab-ready filter blueprint in minutes.
        </p>
        <div className="cta-row">
          <a className="cta cta-primary" href={DOWNLOAD_URL} download>
            ↓ Download for Windows
          </a>
          <a className="cta cta-secondary" href={REPO_URL} target="_blank" rel="noreferrer">
            View on GitHub
          </a>
          <a className="cta cta-ghost" href={DEVPOST_URL} target="_blank" rel="noreferrer">
            Read on Devpost
          </a>
          <a className="cta cta-ghost" href={DEMO_URL} target="_blank" rel="noreferrer">
            Watch the demo
          </a>
        </div>
      </div>

      <div className="hero-panel">
        <figure className="hero-frame" data-fallback="Blau filter visualization">
          <img
            src="/screenshots/filter-visualization-schematic.png"
            alt="Blau filter visualization — filtration membrane and enrichment zone diagram"
            width={1280}
            height={800}
            loading="eager"
            fetchPriority="high"
          />
          <figcaption className="hero-frame-caption">
            Filter visualization — filtration membrane · enrichment zone · real backend structure
          </figcaption>
        </figure>
        <div className="mini-stats">
          <article>
            <p>Method</p>
            <strong>Genetic algorithm + quantum chemistry</strong>
          </article>
          <article>
            <p>Quantum runtime</p>
            <strong>PennyLane VQE on IBM&nbsp;Quantum</strong>
          </article>
          <article>
            <p>Hardware companion</p>
            <strong>Arduino UNO Q · Qualcomm QRB2210</strong>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Hero
