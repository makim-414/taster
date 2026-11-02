// Types for engine/tone.mjs, so the web app (TypeScript, no allowJs) imports the same functions the MCP server uses.
export type ToneAxisId = 'density' | 'contrast' | 'roundness' | 'type-expression' | 'color-restraint' | 'elevation' | 'motion' | 'stroke';
export type ToneAxes = Record<ToneAxisId, number>;
export type ToneAxis = { id: ToneAxisId; name: string; ko: string; steps: number[]; names: string[]; namesKo: string[] };
export type Spot = { x: number; y: number };
export type Bilingual = { en: string; ko: string };
export type Praise = { on: 'x' | 'reddit' | 'hackernews'; url: string; date: string; caveat?: Bilingual };
export type ToneRef = { id: string; name: string; url: string; x: number; y: number; genres: string[]; note: Bilingual; praise: Praise | null };
export type Quadrant = { id: string; x: number[]; y: number[]; name: string; ko: string };
export type Genre = { id: string; name: string; ko: string; summary: string };
export type ToneCatalog = {
  about: string;
  checked: string;
  axes: Record<'x' | 'y', { id: string; from: string; to: string; ko: string[] }>;
  quadrants: Quadrant[];
  genres: Genre[];
  refs: ToneRef[];
};
export type AxisStep = { id: ToneAxisId; name: string; ko: string; value: number; step: string; stepKo: string };
export type Theme = 'dark' | 'light';

export const TONE_AXES: ToneAxis[];
export const DEMO_BRAND: string;
export function readSpot(input?: { x?: unknown; y?: unknown }): Spot;
export function snap(axis: ToneAxisId | ToneAxis, value: number): number;
export function toneAxes(spot: Partial<Spot>, genre?: string): ToneAxes;
export function describeAxes(axes: ToneAxes): AxisStep[];
export function textOn(hex: string): string;
export function isHex(value: unknown): value is string;
export function axesToTokens(axes: ToneAxes, options?: { theme?: Theme; brand?: string | null }): Record<string, string>;
export function tokensCss(tokens: Record<string, string>, comment?: string): string;
export function quadrantOf(catalog: ToneCatalog, spot: Partial<Spot>): Quadrant | undefined;
export function nearestRefs(catalog: ToneCatalog, spot: Partial<Spot>, options?: { genre?: string; limit?: number }): (ToneRef & { distance: number })[];
export function toneParts(spot: Partial<Spot>): string[];
export function toneUrl(base: string, input?: { x?: number; y?: number; genre?: string; theme?: Theme; brand?: string | null }): string;
export function pickTone(
  catalog: ToneCatalog,
  input?: { x?: number; y?: number; genre?: string; theme?: Theme; brand?: string | null; limit?: number },
): {
  spot: Spot;
  quadrant: Quadrant | undefined;
  genre: Genre | null;
  axes: ToneAxes;
  steps: AxisStep[];
  tokens: Record<string, string>;
  css: string;
  demoBrand: boolean;
  refs: (ToneRef & { distance: number })[];
  parts: string[];
};
