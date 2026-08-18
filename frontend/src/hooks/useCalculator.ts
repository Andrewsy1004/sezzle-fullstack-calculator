import { useCallback, useRef, useState } from "react";
import { calculate } from "../api";
import { ApiError, UNARY_OPERATIONS, type Operation } from "../types";

interface CalculatorState {
  operandA: string;
  operandB: string;
  operation: Operation;
  result: number | null;
  error: string | null;
  isLoading: boolean;
}

const initialState: CalculatorState = {
  operandA: "",
  operandB: "",
  operation: "add",
  result: null,
  error: null,
  isLoading: false,
};

function parseOperand(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useCalculator() {
  const [state, setState] = useState<CalculatorState>(initialState);

  const isSubmittingRef = useRef(false);

  const lastSuccessKeyRef = useRef<string | null>(null);

  const isUnary = UNARY_OPERATIONS.has(state.operation);

  const setOperandA = useCallback((value: string) => {
    setState((prev) => ({ ...prev, operandA: value }));
  }, []);

  const setOperandB = useCallback((value: string) => {
    setState((prev) => ({ ...prev, operandB: value }));
  }, []);

  const setOperation = useCallback((operation: Operation) => {
    setState((prev) => ({ ...prev, operation }));
  }, []);

  const reset = useCallback(() => {
    lastSuccessKeyRef.current = null;
    setState(initialState);
  }, []);

  const submit = useCallback(async () => {
    if (isSubmittingRef.current) return;

    const a = parseOperand(state.operandA);
    if (a === null) {
      setState((prev) => ({ ...prev, error: "Please enter a valid number for the first value.", result: null }));
      return;
    }

    let b: number | undefined;
    if (!isUnary) {
      const parsedB = parseOperand(state.operandB);
      if (parsedB === null) {
        setState((prev) => ({ ...prev, error: "Please enter a valid number for the second value.", result: null }));
        return;
      }
      b = parsedB;
    }

    // Same operation + same operands as the last successful call: nothing
    // has changed, so there's nothing new to compute. Leave the existing
    // result on screen instead of firing another identical request.
    const requestKey = `${state.operation}:${a}:${b ?? ""}`;
    if (requestKey === lastSuccessKeyRef.current) {
      setState((prev) => ({ ...prev, error: null }));
      return;
    }

    setState((prev) => ({ ...prev, error: null, result: null, isLoading: true }));
    isSubmittingRef.current = true;
    try {
      const response = await calculate({ operation: state.operation, a, b });
      lastSuccessKeyRef.current = requestKey;
      setState((prev) => ({ ...prev, result: response.result, isLoading: false }));
    } catch (err) {
      // Don't remember this key on failure — a failed request should be
      // retryable with the same inputs (e.g. a transient network error).
      const message = err instanceof ApiError ? err.message : "Unexpected error. Please try again.";
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    } finally {
      isSubmittingRef.current = false;
    }
  }, [state.operandA, state.operandB, state.operation, isUnary]);

  return {
    ...state,
    isUnary,
    setOperandA,
    setOperandB,
    setOperation,
    submit,
    reset,
  };
}