import { useRef } from "react";
import { useMathBackground } from "../../hooks";
import "./MathBackground.css";

/**
 * Ambient full-viewport background layer of slowly drifting math glyphs and
 * expressions. Purely decorative: removed from the accessibility tree via
 * aria-hidden, never intercepts pointer input, and carries no state of its
 * own. All sizing/animation lives in useMathBackground, which owns the
 * canvas 2D context and the requestAnimationFrame loop.
 */
export function MathBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useMathBackground(canvasRef);

  return <canvas ref={canvasRef} className="math-background" aria-hidden="true" />;
}
