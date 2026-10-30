// The deepest way to change an orb: replace its geometry with the `frame` prop. This one draws a dotted T that turns in
// space. The painter, theme, tint, pause and offscreen handling all stay the library's. Copy it and change `points`.
import { finalizeFrame, makeProj, type ModeFrame } from 'thinking-orbs';

const points: [number, number][] = [];
for (let i = -5; i <= 5; i++) points.push([i / 5, -0.8]);
for (let i = 1; i <= 9; i++) points.push([0, -0.8 + i / 5]);

export const tasterMark: ModeFrame = (size, t) => {
  const center = size / 2;
  const project = makeProj(t * 0.9, 0.3, center, center, size * 0.36);
  const dots = [];
  for (const layer of [-0.14, 0.14]) {
    for (const [px, py] of points) {
      const [x, y, z] = project(px, py, layer);
      dots.push({ x, y, z, r: size * 0.026, white: 0.45 - z * 0.4 });
    }
  }
  return finalizeFrame(dots, [], 0.4);
};

export const TASTER_MARK_CODE = `import { ThinkingOrb, finalizeFrame, makeProj } from 'thinking-orbs'

// Your shape, as points from -1 to 1.
const points = []
for (let i = -5; i <= 5; i++) points.push([i / 5, -0.8])
for (let i = 1; i <= 9; i++) points.push([0, -0.8 + i / 5])

const myMark = (size, t) => {
  const project = makeProj(t * 0.9, 0.3, size / 2, size / 2, size * 0.36)
  const dots = []
  for (const layer of [-0.14, 0.14]) {
    for (const [px, py] of points) {
      const [x, y, z] = project(px, py, layer)
      dots.push({ x, y, z, r: size * 0.026, white: 0.45 - z * 0.4 })
    }
  }
  return finalizeFrame(dots, [], 0.4)
}

<ThinkingOrb frame={myMark} size={64} />`;
