import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathBackground } from "../MathBackground";

describe("<MathBackground />", () => {
  it("renders a single canvas hidden from the accessibility tree", () => {
    const { container } = render(<MathBackground />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("mounts and unmounts without throwing", () => {
    // jsdom has no 2D canvas context, so this is the real regression test
    // for the getContext guard and the effect cleanup path.
    const { unmount } = render(<MathBackground />);
    expect(() => unmount()).not.toThrow();
  });

  it("renders identically across separate mounts", () => {
    const first = render(<MathBackground />);
    const second = render(<MathBackground />);
    expect(first.container.innerHTML).toBe(second.container.innerHTML);
  });

  it("contains no focusable elements", () => {
    const { container } = render(<MathBackground />);
    const focusable = container.querySelectorAll("a, button, input, select, textarea, [tabindex]");
    expect(focusable).toHaveLength(0);
  });
});
