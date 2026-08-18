/**
 * Operations supported by the backend calculator API. Kept as a union of
 * string literals so the compiler catches typos and the UI can iterate over
 * `OPERATIONS` below to render buttons/select options.
 */
export type Operation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "power"
  | "sqrt"
  | "percentage";

/** Operations that only need a single operand ("a"). */
export const UNARY_OPERATIONS: ReadonlySet<Operation> = new Set(["sqrt"]);

export interface OperationMeta {
  value: Operation;
  label: string;
  symbol: string;
}

/** Display metadata for every supported operation, in UI order. */
export const OPERATIONS: OperationMeta[] = [
  { value: "add", label: "Add", symbol: "+" },
  { value: "subtract", label: "Subtract", symbol: "−" },
  { value: "multiply", label: "Multiply", symbol: "×" },
  { value: "divide", label: "Divide", symbol: "÷" },
  { value: "power", label: "Power", symbol: "^" },
  { value: "sqrt", label: "Square Root", symbol: "√" },
  { value: "percentage", label: "Percentage (a% of b)", symbol: "%" },
];

/** Request body for POST /api/calculate. */
export interface CalculateRequest {
  operation: Operation;
  a: number;
  b?: number;
}

/** Successful response body from POST /api/calculate. */
export interface CalculateResponse {
  operation: Operation;
  result: number;
}

/** Error response body from the API (any 4xx/5xx). */
export interface ApiErrorResponse {
  error: string;
}

/** Thrown by the API client on non-2xx responses or network failures. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
