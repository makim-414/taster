import { ArrowRight, Check } from 'lucide-react'

export default function App() {
  return (
    <main className="bg-canvas text-ink">
      <a href="#start" className="inline-flex items-center gap-2 rounded-card bg-accent px-4 py-2">
        Start <ArrowRight strokeWidth={1.5} className="size-4" />
      </a>
      <p className="flex gap-2 text-ink-muted">
        <Check strokeWidth={1.5} className="size-4" /> Included
      </p>
    </main>
  )
}
