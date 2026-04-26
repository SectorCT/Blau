const stats = [
  {
    figure: '1.25M',
    unit: 'fragments / km²',
    label: 'Mediterranean microplastic density — 4× the North Pacific garbage patch.',
  },
  {
    figure: '100–900',
    unit: 'particles / kg sand',
    label: 'Microplastics measured on Barcelona beaches.',
  },
  {
    figure: 'Pb · Hg · Cd',
    unit: 'in the Llobregat',
    label: 'Pharmaceuticals, pesticides, and heavy metals in the city’s main drinking-water source.',
  },
  {
    figure: '2008',
    unit: 'near-drought',
    label: 'The year Barcelona nearly ran out of water entirely.',
  },
]

function StatCards() {
  return (
    <section className="section problem-section" id="problem">
      <p className="section-eyebrow">The problem</p>
      <h2>Barcelona is drowning and dehydrating at the same time.</h2>
      <p className="section-copy">
        The people fixing this are water-purification researchers — materials scientists who
        design nano-filters one molecular structure at a time. Their design loop is hours per
        iteration, weeks per study. Blau closes that loop.
      </p>
      <div className="stat-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.figure}>
            <p className="stat-figure">{stat.figure}</p>
            <p className="stat-unit">{stat.unit}</p>
            <p className="stat-label">{stat.label}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default StatCards
