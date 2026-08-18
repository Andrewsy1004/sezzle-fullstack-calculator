/**
 * Data and pure helpers behind the ambient math background. Kept out of
 * MathBackground.tsx so that file exports only the component (a module
 * exporting both a component and plain values trips
 * eslint-plugin-react-refresh's only-export-components rule).
 *
 * Token strings are decorative only and are deliberately kept free of the
 * words "operation", "value", "calculate", "reset", "result", and "error" —
 * Calculator.test.tsx queries the DOM by those strings, so glyph-only
 * content keeps any future <App />-level test unambiguous.
 */

/** Pool of glyphs/expressions the recycler draws from. Echoes the symbols in
 * ../../types/index.ts (`+ − × ÷ ^ √ %`) without importing OPERATIONS —
 * coupling decorative content to API metadata would be a false abstraction.
 */
export const MATH_TOKEN_TEXTS: readonly string[] = [
  "x + y",
  "a² + b²",
  "√x",
  "∑",
  "π",
  "∫",
  "θ",
  "Δ",
  "∞",
  "≈",
  "f(x)",
  "n!",
  "φ",
  "∂",
  "μ",
  "3.14159",
  "1.618",
  "42%",
  "x ÷ y",
  "n²",
  "√2",
  "%",
];

/** Operator glyphs that read wrong when italicized. Mirrors the
 * UNARY_OPERATIONS set idiom in ../../types/index.ts. */
export const UPRIGHT_TOKENS: ReadonlySet<string> = new Set([
  "∑",
  "∫",
  "∂",
  "÷",
  "×",
  "%",
  "x ÷ y",
  "42%",
]);

/** Font stack for canvas-drawn tokens: an italic-serif "math notation" look,
 * distinct from the app's system-ui UI font. */
export const MATH_FONT_STACK =
  '"Cambria Math", "Latin Modern Math", Georgia, "Times New Roman", serif';

const TAU = Math.PI * 2;

/** Mutable per-token animation state. Positions are normalized (0..1 of
 * canvas width/height) so a resize never needs to reposition or reallocate
 * the field — only the pixel multiplier at draw time changes. */
export interface MathToken {
  /** Glyph or expression to draw. */
  text: string;
  /** Base horizontal position, 0..1 of canvas width. */
  x: number;
  /** Life, 0..1: 0 = just below the bottom edge, 1 = above the top edge. */
  progress: number;
  /** Progress gained per second (1 / traversal duration in seconds). */
  speed: number;
  /** Multiplier against the viewport-derived base font size. */
  scale: number;
  /** Opacity at the hold phase of the fade curve. */
  peakAlpha: number;
  /** Radians; de-phases each token's horizontal sway. */
  swayPhase: number;
  /** Sway amplitude, as a fraction of canvas width. */
  swayAmp: number;
  /** Total rotation swept over the token's life, in radians. */
  tilt: number;
  /** True for operator glyphs drawn non-italic. */
  upright: boolean;
}

function randRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/**
 * Deterministic PRNG (mulberry32), seeded rather than Math.random() so that
 * <StrictMode>'s double-invoked effects produce an identical field on both
 * mounts, and so any visual regression is reproducible.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills a fresh (or recycles an existing) token from the PRNG. Passing an
 * existing token resets it in place so the loop never allocates per frame.
 */
export function spawnToken(random: () => number, token?: MathToken): MathToken {
  const text = MATH_TOKEN_TEXTS[Math.floor(random() * MATH_TOKEN_TEXTS.length)];
  const scale = randRange(random, 0.8, 2.1);
  const next: MathToken = {
    text,
    x: randRange(random, 0.04, 0.96),
    progress: 0,
    speed: 1 / randRange(random, 20, 38),
    scale,
    // Depth cue: larger (nearer) tokens read stronger than smaller (farther) ones.
    peakAlpha: 0.13 + 0.1 * ((scale - 0.8) / 1.3) + randRange(random, -0.02, 0.02),
    swayPhase: randRange(random, 0, TAU),
    swayAmp: randRange(random, 0.015, 0.035),
    tilt: (randRange(random, -2, 2) * Math.PI) / 180,
    upright: UPRIGHT_TOKENS.has(text),
  };
  if (token) {
    Object.assign(token, next);
    return token;
  }
  return next;
}

/** Fade curve over a token's 0..1 life: ramps in, holds, ramps out. Returns
 * a 0..1 multiplier against the token's peakAlpha. */
export function tokenAlpha(progress: number): number {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < 0.12) return progress / 0.12;
  if (progress > 0.82) return (1 - progress) / 0.18;
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Number of concurrent tokens for a given canvas size (CSS pixels). */
export function tokenCountFor(width: number, height: number): number {
  return clamp(Math.round((width * height) / 34000), 14, 44);
}

/** Base font size in CSS pixels for a given canvas size. Individual tokens
 * multiply this by their own `scale`. */
export function baseFontSizeFor(width: number, height: number): number {
  return clamp(Math.min(width, height) / 38, 14, 38);
}
