import { describe, expect, it } from "vitest";
import { formatExpression } from "../formatExpression";

describe("formatExpression", () => {
  it("formats a binary operation", () => {
    expect(formatExpression({ id: 1, operation: "add", a: 12, b: 8, result: 20 })).toBe("12 + 8 = 20");
  });

  it("uses the minus sign glyph for subtraction", () => {
    expect(formatExpression({ id: 1, operation: "subtract", a: 12, b: 8, result: 4 })).toBe("12 − 8 = 4");
  });

  it("formats a unary operation without a second operand", () => {
    expect(formatExpression({ id: 1, operation: "sqrt", a: 16, result: 4 })).toBe("√ 16 = 4");
  });

  it("formats percentage as 'a% of b'", () => {
    expect(formatExpression({ id: 1, operation: "percentage", a: 12, b: 8, result: 0.96 })).toBe("12% of 8 = 0.96");
  });

  it("parenthesizes a negative second operand", () => {
    expect(formatExpression({ id: 1, operation: "subtract", a: 5, b: -3, result: 8 })).toBe("5 − (-3) = 8");
  });

  it("does not parenthesize a negative leading operand", () => {
    expect(formatExpression({ id: 1, operation: "add", a: -5, b: 3, result: -2 })).toBe("-5 + 3 = -2");
  });
});
