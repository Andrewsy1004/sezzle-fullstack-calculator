import { describe, expect, it } from "vitest";
import { baseFontSizeFor, createRandom, tokenAlpha, tokenCountFor } from "../mathTokens";

describe("createRandom", () => {
  it("produces a repeatable sequence for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const sequenceA = Array.from({ length: 5 }, () => a());
    const sequenceB = Array.from({ length: 5 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it("returns values in [0, 1)", () => {
    const random = createRandom(1);
    for (let i = 0; i < 100; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("tokenAlpha", () => {
  it("is 0 at the start and end of life", () => {
    expect(tokenAlpha(0)).toBe(0);
    expect(tokenAlpha(1)).toBe(0);
  });

  it("is fully opaque during the hold phase", () => {
    expect(tokenAlpha(0.5)).toBe(1);
  });
});

describe("tokenCountFor", () => {
  it("clamps to the minimum for small viewports", () => {
    expect(tokenCountFor(100, 100)).toBe(14);
  });

  it("clamps to the maximum for large viewports", () => {
    expect(tokenCountFor(2560, 1440)).toBe(44);
  });
});

describe("baseFontSizeFor", () => {
  it("clamps to the minimum for tiny viewports", () => {
    expect(baseFontSizeFor(200, 200)).toBe(14);
  });

  it("clamps to the maximum for huge viewports", () => {
    expect(baseFontSizeFor(3000, 3000)).toBe(38);
  });
});
