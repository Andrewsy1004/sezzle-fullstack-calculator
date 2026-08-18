import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalculator } from "../useCalculator";

describe("useCalculator", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with empty operands and the 'add' operation", () => {
    const { result } = renderHook(() => useCalculator());
    expect(result.current.operandA).toBe("");
    expect(result.current.operandB).toBe("");
    expect(result.current.operation).toBe("add");
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("marks sqrt as a unary operation, hiding the need for operand b", () => {
    const { result } = renderHook(() => useCalculator());
    act(() => result.current.setOperation("sqrt"));
    expect(result.current.isUnary).toBe(true);
  });

  it("submits a valid binary calculation and stores the result", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ operation: "add", result: 7 }),
    });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperandA("3");
      result.current.setOperandB("4");
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.result).toBe(7));
    expect(result.current.error).toBeNull();
  });

  it("rejects a non-numeric first operand without calling the API", async () => {
    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperandA("abc");
      result.current.setOperandB("4");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toMatch(/valid number/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not require operand b for unary operations like sqrt", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ operation: "sqrt", result: 3 }),
    });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperation("sqrt");
      result.current.setOperandA("9");
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.result).toBe(3));
  });

  it("surfaces API error messages", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "division by zero is not allowed" }),
    });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperation("divide");
      result.current.setOperandA("10");
      result.current.setOperandB("0");
    });

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.error).toBe("division by zero is not allowed"));
    expect(result.current.result).toBeNull();
  });

  it("ignores extra submits while a request is already in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperandA("3");
      result.current.setOperandB("4");
    });

    await act(async () => {
      void result.current.submit();
      void result.current.submit();
      void result.current.submit();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch({ ok: true, status: 200, json: async () => ({ operation: "add", result: 7 }) });
    });

    await waitFor(() => expect(result.current.result).toBe(7));
    expect(result.current.isLoading).toBe(false);
  });

  it("releases the guard after a successful submit, allowing the next one through", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ operation: "add", result: 7 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ operation: "add", result: 9 }) });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperandA("3");
      result.current.setOperandB("4");
    });

    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.result).toBe(7));

    act(() => {
      result.current.setOperandB("6");
    });
    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.result).toBe(9));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("releases the guard after a failed submit, allowing a retry", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "division by zero is not allowed" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ operation: "divide", result: 5 }) });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperation("divide");
      result.current.setOperandA("10");
      result.current.setOperandB("0");
    });

    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.error).toBe("division by zero is not allowed"));

    act(() => {
      result.current.setOperandB("2");
    });
    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.result).toBe(5));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reset() restores the initial state", async () => {
    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperandA("5");
      result.current.setOperandB("6");
      result.current.setOperation("multiply");
    });
    act(() => result.current.reset());

    expect(result.current.operandA).toBe("");
    expect(result.current.operandB).toBe("");
    expect(result.current.operation).toBe("add");
  });
});
