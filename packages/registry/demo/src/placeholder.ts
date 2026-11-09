// Neutral placeholder images for the demo page, as inline SVG data URIs, so the page stays one file and
// works offline. Each plate says what belongs there ("Product screenshot, 1440 by 900") instead of
// pretending to be a real screen or photo. Replace them with real files in an app.

const TONES = {
  a: ['#3a3a3c', '#5b5b5f'],
  b: ['#4a4744', '#77726c'],
  c: ['#2f3436', '#53595c'],
  d: ['#6d6a66', '#a19c95'],
  e: ['#26282b', '#3d4045'],
} as const

export type Tone = keyof typeof TONES

export function plate(label: string, w: number, h: number, tone: Tone = 'a', kind: 'photo' | 'screen' = 'photo'): string {
  const [c1, c2] = TONES[tone]
  const fs = Math.max(12, Math.round(Math.min(w, h) / 22))
  const shapes =
    kind === 'photo'
      ? `<ellipse cx="${w * 0.68}" cy="${h * 0.62}" rx="${w * 0.34}" ry="${h * 0.3}" fill="#ffffff" opacity="0.07"/>` +
        `<ellipse cx="${w * 0.25}" cy="${h * 0.3}" rx="${w * 0.2}" ry="${h * 0.16}" fill="#000000" opacity="0.08"/>`
      : `<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.07)}" fill="#ffffff" opacity="0.05"/>` +
        `<rect x="0" y="${Math.round(h * 0.07)}" width="${Math.round(w * 0.16)}" height="${h}" fill="#000000" opacity="0.08"/>`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>${shapes}` +
    `<text x="${Math.round(fs * 1.4)}" y="${h - Math.round(fs * 1.4)}" font-family="system-ui, sans-serif" font-size="${fs}" fill="#ffffff" opacity="0.72">${label}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
