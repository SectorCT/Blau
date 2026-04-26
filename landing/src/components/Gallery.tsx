const shots = [
  {
    src: '/screenshots/simulation.png',
    caption: 'Filtration Simulation — pollutant particles (Ca²⁺, PE, PET, nylon) flowing through the graphene lattice in real time with per-type capture efficiency.',
    label: 'Simulation',
  },
  {
    src: '/screenshots/filter-visualization-schematic.png',
    caption: 'Filter Schematic — annotated filtration membrane, separator, and enrichment zone from real backend atom coordinates.',
    label: 'Schematic View',
  },
  {
    src: '/screenshots/molecular-analysis.png',
    caption: 'Molecular Analysis — 2D density view with per-pollutant removal efficiency, sample conditions, and method provenance.',
    label: 'Molecular Analysis',
  },
  {
    src: '/screenshots/filter-visualization.png',
    caption: 'Filter Visualization — real atom coordinates from the backend rendered as a 3D molecular graph with Kekulé bond orders.',
    label: '3D Visualization',
  },
  {
    src: '/screenshots/filter-details.png',
    caption: 'Filter Details — per-layer composition with filtration and enrichment cards, removal efficiency, binding energy, and method tags.',
    label: 'Filter Details',
  },
  {
    src: '/screenshots/dashboard.png',
    caption: 'Dashboard — total filters, in-progress jobs, and recent measurements at a glance.',
    label: 'Dashboard',
  },
  {
    src: '/screenshots/add-measurement-map.png',
    caption: 'GEMStat Map — pick a global groundwater monitoring station directly from the map and import its historical data.',
    label: 'GEMStat Map',
  },
  {
    src: '/screenshots/add-measurement-form.png',
    caption: 'Manual Measurement — enter temperature, pH, and contaminant concentrations by hand with full unit control.',
    label: 'Manual Entry',
  },
]

function Gallery() {
  return (
    <section className="section gallery" id="gallery">
      <p className="section-eyebrow">Inside the platform</p>
      <h2>Built like a research tool, not a hackathon demo.</h2>
      <div className="gallery-grid">
        {shots.map((shot) => (
          <figure className="gallery-card" key={shot.src}>
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
