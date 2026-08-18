import { useCallback, useRef, useState } from "react";
import { calculate } from "../api";
import { ApiError, UNARY_OPERATIONS, type HistoryEntry, type Operation } from "../types";

interface CalculatorState {
  operandA: string;
  operandB: string;
  operation: Operation;
  result: number | null;
  lastEntry: HistoryEntry | null;
  error: string | null;
  isLoading: boolean;
}

const initialState: CalculatorState = {
  operandA: "",
  operandB: "",
  operation: "add",
  result: null,
  lastEntry: null,
  error: null,
  isLoading: false,
};

const HISTORY_LIMIT = 10;

function parseOperand(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useCalculator() {
  const [state, setState] = useState<CalculatorState>(initialState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const isSubmittingRef = useRef(false);

  const lastSuccessKeyRef = useRef<string | null>(null);
  // Snapshot of the entry produced by the last successful request. Lets the
  // duplicate-request short-circuit below replay a result (and push another
  // history row) without needing state.result, which may be null by then.
  const lastSuccessEntryRef = useRef<HistoryEntry | null>(null);
  const nextIdRef = useRef(1);

  const isUnary = UNARY_OPERATIONS.has(state.operation);

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

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
    lastSuccessEntryRef.current = null;
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
    // has changed, so there's nothing new to compute. Replay the prior
    // result (and log another history row for it) instead of firing
    // another identical request.
    const requestKey = `${state.operation}:${a}:${b ?? ""}`;
    if (requestKey === lastSuccessKeyRef.current) {
      const prior = lastSuccessEntryRef.current;
      if (prior) {
        const replay = { ...prior, id: nextIdRef.current++ };
        pushHistory(replay);
        setState((prev) => ({ ...prev, error: null, result: replay.result, lastEntry: replay }));
      } else {
        setState((prev) => ({ ...prev, error: null }));
      }
      return;
    }

    setState((prev) => ({ ...prev, error: null, result: null, lastEntry: null, isLoading: true }));
    isSubmittingRef.current = true;
    try {
      const response = await calculate({ operation: state.operation, a, b });
      const entry: HistoryEntry = { id: nextIdRef.current++, operation: state.operation, a, b, result: response.result };
      lastSuccessKeyRef.current = requestKey;
      lastSuccessEntryRef.current = entry;
      pushHistory(entry);
      setState((prev) => ({ ...prev, result: response.result, lastEntry: entry, isLoading: false }));
    } catch (err) {
      // Don't remember this key on failure — a failed request should be
      // retryable with the same inputs (e.g. a transient network error).
      const message = err instanceof ApiError ? err.message : "Unexpected error. Please try again.";
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    } finally {
      isSubmittingRef.current = false;
    }
  }, [state.operandA, state.operandB, state.operation, isUnary, pushHistory]);

  return {
    ...state,
    isUnary,
    history,
    setOperandA,
    setOperandB,
    setOperation,
    submit,
    reset,
    clearHistory,
  };
}