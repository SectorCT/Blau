
import './App.css'
import Topbar from './components/Topbar'
import Hero from './components/Hero'
import StatCards from './components/StatCards'
import Pipeline from './components/Pipeline'
import QuantumSpotlight from './components/QuantumSpotlight'
import TechGrid from './components/TechGrid'
import FieldStation from './components/FieldStation'
import Gallery from './components/Gallery'
import StoryPanels from './components/StoryPanels'
import Footer from './components/Footer'

function App() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="ambient ambient-1" aria-hidden="true" />
      <div className="ambient ambient-2" aria-hidden="true" />
      <div className="ambient ambient-3" aria-hidden="true" />

      <Topbar />
      <main id="main">
        <Hero />
        <StatCards />
        <Pipeline />
        <QuantumSpotlight />
        <TechGrid />
        <FieldStation />
        <Gallery />
        <StoryPanels />
      </main>
      <Footer />
    </div>
  )
}

export default App
