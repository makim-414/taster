---
id: webgl-scene
name: WebGL and 3D scene
category: 3d
uses: [set-the-mood, introduce-the-product, show-relationships]
surfaces: [landing, dashboard]
replaces: [BG-01, MOT-01]
components: []
inspiration: [https://github.com/shuding/cobe, https://blog.maximeheckel.co/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/]
status: draft
---

## When to use

Use it when a third dimension says something a flat image cannot: a globe because the product works across places, a point cloud because the product is about many small things, a 3D graph because the data is a network. The scene is a hero element or a panel in a dashboard, not wallpaper for everything.

Do not use it when a still image or a CSS gradient would carry the same message. A 3D scene costs a bundle, a GPU and battery. Do not use it on pages people read for ten minutes, or where the first paint is the job.

## Anatomy

Four restrained forms, pick one.

1. Half globe: a dotted sphere rising from the bottom edge of a container so that only the upper half shows, rotating slowly, with a handful of real markers.
2. Particle core: a few thousand points shaped into a sphere or a form, that reshapes as the page scrolls through three stages.
3. Backdrop: a quiet mesh or point set behind the hero text, moving a few degrees, color neutral.
4. Data graph: nodes and links from real data (a knowledge graph, a supply chain), orbit controls, a legend and a node detail panel next to it.

Every form ships with the same four layers: a static poster image that shows instantly, a lazy-loaded renderer that replaces it, a render loop that runs only while the canvas is visible, and a reduced-motion path that renders one frame.

## Do

- Show the poster first. The scene is progressive enhancement, never the thing the page waits for.
- Load the 3D library with a dynamic `import()` after first paint, and only when the container is near the viewport.
- Cap the pixel ratio at 1.5, lower on phones, and cap point counts by device memory and screen area.
- Stop rendering when the canvas leaves the viewport and when the tab is hidden. Resume on return.
- On `prefers-reduced-motion`, render a single frame and stop. Keep the data graph interactive by user input only.
- Dispose geometries, materials and the renderer on unmount, and release the context.
- Keep the scene one neutral color family. Encode meaning in size and lightness; use color only for real categories in a data graph, with a legend.

## Don't

- Do not use neon tubes chasing the cursor over the whole page (BG-01, MOT-01).
- Do not run a 60fps shader behind a page that is mostly text.
- Do not capture the wheel or touch. If the scene is draggable, do not stop vertical page scroll on touch devices; use `touch-action: pan-y`.
- Do not hide important copy inside the scene. Text goes in the DOM.
- Do not ship WebGL with no fallback. If `getContext('webgl2')` fails, the poster stays.
- Do not make a 3D graph out of fake nodes. A graph is only evidence if the data is real.

## Swap recipe

The slop version is a full-bleed, always-running scene with glow and cursor chase, loaded in the main bundle.

```html
<!-- before: always-on WebGL hero, glowing tubes, no poster, no pause (BG-01, MOT-01) -->
<section class="relative h-screen bg-[#0b0b0b]">
  <canvas id="tubes" class="absolute inset-0"></canvas>
  <div class="absolute left-1/2 top-1/3 h-96 w-96 rounded-full bg-violet-600/40 blur-[120px]"></div>
  <h1 class="relative">Welcome to the future</h1>
</section>
<script src="https://cdn.example.com/bundle-with-everything.js"></script>
```

```tsx
// after: poster first, lazy renderer, visible-only loop, one still frame for reduced motion
export function GlobeScene({ poster }: { poster: string }) {
  const host = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    let dead = false
    let cleanup = () => {}
    const probe = document.createElement('canvas')
    if (!probe.getContext('webgl2')) return // poster stays
    ;(async () => {
      const THREE = await import('three')
      if (dead) return
      const el = host.current!
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10); camera.position.z = 3.4
      const N = 4000, pos = new Float32Array(N * 3)
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i
        pos.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3)
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const mat = new THREE.PointsMaterial({ size: 0.012, color: getComputedStyle(el).color, transparent: true, opacity: 0.7 })
      const globe = new THREE.Points(geo, mat); scene.add(globe)
      const fit = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix() }
      el.appendChild(renderer.domElement); fit()
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      let raf = 0, visible = true
      const frame = () => { globe.rotation.y += 0.0015; renderer.render(scene, camera); if (visible && !reduce && !document.hidden) raf = requestAnimationFrame(frame) }
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { cancelAnimationFrame(raf); frame() } })
      io.observe(el); window.addEventListener('resize', fit); frame()
      cleanup = () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', fit); geo.dispose(); mat.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove() }
    })()
    return () => { dead = true; cleanup() }
  }, [])
  return (
    <div ref={host} className="relative h-[420px] overflow-hidden text-[var(--text-subtle)]" aria-hidden>
      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
    </div>
  )
}
```

Position the container so the globe sits half below its bottom edge (`translateY(40%)` on the canvas, `overflow: hidden` on the host) for the rising half globe. The poster image should be a render of the same scene.

## Tokens

- Surface: `--bg`. Points and lines take `currentColor`, set from `--text-subtle`; marker accents use `--text`.
- Data graph categories: `--chart-1` to `--chart-4`, a lightness ramp, with a legend that names each one.
- Panel next to a graph: `--bg-elev`, `--border`, `--r-card`, type `--t-body` and `--t-sm`.
- Animation rates are local constants (rotation per frame). The shared `--dur-*` tokens cover only the DOM overlays, such as a legend fade at `--dur-dropdown` with `--ease-out`.
- Reduced motion: one rendered frame, no loop. DOM overlays follow the token overrides automatically.
