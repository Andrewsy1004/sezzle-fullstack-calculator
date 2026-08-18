import { useEffect, type RefObject } from "react";
import {
  MATH_FONT_STACK,
  baseFontSizeFor,
  createRandom,
  spawnToken,
  tokenAlpha,
  tokenCountFor,
  type MathToken,
} from "../components/MathBackground/mathTokens";

const TAU = Math.PI * 2;
const INDIGO = "#6366f1";
const RANDOM_SEED = 20260817;

/**
 * Drives the ambient math background: sizes the canvas for the device
 * pixel ratio, maintains a recycled pool of MathToken instances, and runs
 * the requestAnimationFrame loop that drifts them slowly upward with a
 * horizontal sway and a fade in/out. All positions are normalized (0..1),
 * so resizing never reallocates or repositions the field.
 *
 * No-ops safely wherever a 2D canvas context isn't available (e.g. jsdom in
 * tests), respects prefers-reduced-motion (renders one static frame and
 * never starts the loop), and pauses the loop while the tab is hidden.
 */
export function useMathBackground(canvasRef: RefObject<HTMLCanvasElement>): void {
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas = canvasEl;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null; // jsdom / canvas-less environment
    }
    if (!ctx) return;
    const context = ctx;

    const random = createRandom(RANDOM_SEED);
    const tokens: MathToken[] = [];
    let width = 0;
    let height = 0;
    let baseFontSize = 16;
    let rafId: number | null = null;
    let last: number | null = null;

    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = INDIGO;

      baseFontSize = baseFontSizeFor(width, height);

      const count = tokenCountFor(width, height);
      if (tokens.length < count) {
        while (tokens.length < count) tokens.push(spawnToken(random));
      } else if (tokens.length > count) {
        tokens.length = count;
      }

      if (media?.matches) drawStatic();
    }

    function drawToken(token: MathToken, progress: number) {
      const alpha = tokenAlpha(progress) * token.peakAlpha;
      if (alpha < 0.005) return;

      const y = (1.12 - 1.22 * progress) * height;
      const x = (token.x + token.swayAmp * Math.sin(token.swayPhase + progress * TAU)) * width;
      const rotation = -token.tilt + 2 * token.tilt * progress;

      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.globalAlpha = alpha;
      context.font = `${token.upright ? "" : "italic "}${baseFontSize * token.scale}px ${MATH_FONT_STACK}`;
      context.fillText(token.text, 0, 0);
      context.restore();
    }

    function drawStatic() {
      context.clearRect(0, 0, width, height);
      tokens.forEach((token, i) => drawToken(token, i / tokens.length));
    }

    function frame(now: number) {
      if (last === null) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      context.clearRect(0, 0, width, height);
      for (const token of tokens) {
        token.progress += token.speed * dt;
        if (token.progress >= 1) spawnToken(random, token);
        drawToken(token, token.progress);
      }

      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      last = null;
    }

    function start() {
      if (rafId !== null || media?.matches) return;
      rafId = requestAnimationFrame(frame);
    }

    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }

    function handleMotionChange() {
      if (media?.matches) {
        stop();
        drawStatic();
      } else {
        start();
      }
    }

    resize();
    if (!media?.matches) start();

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    if (observer) {
      observer.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    document.addEventListener("visibilitychange", handleVisibility);
    media?.addEventListener("change", handleMotionChange);

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      media?.removeEventListener("change", handleMotionChange);
    };
  }, [canvasRef]);
}
