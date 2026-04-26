const shots = [
  { src: '/screenshots/studies.png', caption: 'Studies dashboard — measurements + filters grouped by research project.', label: 'Studies' },
  { src: '/screenshots/newfilter.png', caption: 'NewFilter — pollutant selection and level-of-theory toggle.', label: 'NewFilter' },
  { src: '/screenshots/filter-analysis.png', caption: 'FilterAnalysis — per-pollutant removal-efficiency with method tags.', label: 'FilterAnalysis' },
  { src: '/screenshots/simulation.png', caption: 'FilterSimulation — pollutant particles flowing through the lattice.', label: 'FilterSimulation' },
  { src: '/screenshots/lattice.png', caption: 'FilterDetails — Kekulé-correct graphene with edge -COOH groups.', label: 'FilterDetails' },
  { src: '/screenshots/ibm-console.png', caption: 'IBM Quantum console — VQE job dispatched from Blau.', label: 'IBM Quantum' },
]

function Gallery() {
  return (
    <section className="section gallery" id="gallery">
      <p className="section-eyebrow">Inside the platform</p>
      <h2>Built like a research tool, not a hackathon demo.</h2>
      <div className="gallery-grid">
        {shots.map((shot) => (
          <figure className="gallery-card" key={shot.src} data-fallback={shot.label}>
            <img
              src={shot.src}
              alt={shot.caption}
              width={1600}
              height={1000}
              loading="lazy"
            />
            <figcaption>{shot.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export default Gallery
