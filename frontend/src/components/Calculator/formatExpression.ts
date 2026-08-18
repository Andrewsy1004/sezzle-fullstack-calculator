import { OPERATIONS, UNARY_OPERATIONS, type HistoryEntry } from "../../types";

function symbolFor(entry: HistoryEntry): string {
  return OPERATIONS.find((op) => op.value === entry.operation)?.symbol ?? entry.operation;
}

/** Wraps a negative operand in parens so it never sits flush against the
 * preceding operator glyph (e.g. `5 − -3` -> `5 − (-3)`). Only ever applied
 * to non-leading operands - the leading operand and the result read fine
 * with a bare minus sign. */
function formatOperand(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** Renders a history entry as a human-readable expression, e.g.
 * "12 + 8 = 20", "√ 16 = 4", or "12% of 8 = 0.96". Pure and presentational -
 * numbers are printed as-is (no rounding/locale formatting). */
export function formatExpression(entry: HistoryEntry): string {
  const { operation, a, b, result } = entry;
  const symbol = symbolFor(entry);

  if (UNARY_OPERATIONS.has(operation)) {
    return `${symbol} ${a} = ${result}`;
  }

  if (operation === "percentage") {
    return `${a}% of ${formatOperand(b ?? 0)} = ${result}`;
  }

  return `${a} ${symbol} ${formatOperand(b ?? 0)} = ${result}`;
}
