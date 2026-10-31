import * as React from 'react'
import { createRoot } from 'react-dom/client'
import 'react-day-picker/style.css'
import '../../src/tokens.css'
import '../../src/themes/light.css'
import '../../src/base.css'
import { Sections } from './sections'

function App() {
  const [light, setLight] = React.useState(false)
  // The attribute is the one source: the appearance picker in the demo writes it too.
  React.useEffect(() => {
    const root = document.documentElement
    const read = () => setLight(root.dataset.theme === 'light')
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-h2 font-semibold tracking-tight">Registry demo</h1>
          <p className="mt-1 text-sm text-text-muted">
            Every component in registry.json, rendered with sample content and the neutral tokens.
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-muted desk:min-h-0">
          <input type="checkbox" checked={light} onChange={(e) => { document.documentElement.dataset.theme = e.target.checked ? 'light' : 'dark' }} />
          Light theme
        </label>
      </header>
      <Sections />
    </div>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
