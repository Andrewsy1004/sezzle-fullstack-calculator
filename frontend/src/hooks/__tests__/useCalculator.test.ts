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

  it("appends a history entry with the parsed operands on success, newest first", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ operation: "add", result: 7 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ operation: "multiply", result: 12 }) });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperandA("3");
      result.current.setOperandB("4");
    });
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.history[0]).toMatchObject({ operation: "add", a: 3, b: 4, result: 7 });

    act(() => {
      result.current.setOperation("multiply");
      result.current.setOperandA("3");
      result.current.setOperandB("4");
    });
    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.history[0]).toMatchObject({ operation: "multiply", result: 12 });
    expect(result.current.history[1]).toMatchObject({ operation: "add", result: 7 });
  });

  it("appends a second history entry when an identical calculation is repeated, without refetching", async () => {
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
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.history[0]).toMatchObject({ operation: "add", a: 3, b: 4, result: 7 });
    expect(result.current.history[0].id).not.toBe(result.current.history[1].id);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not append to history when a request fails", async () => {
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
    expect(result.current.history).toHaveLength(0);
  });

  it("reset() clears the form but preserves history", async () => {
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
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.reset());

    expect(result.current.operandA).toBe("");
    expect(result.current.result).toBeNull();
    expect(result.current.history).toHaveLength(1);
  });

  it("clearHistory() empties history without touching the current result", async () => {
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
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.clearHistory());

    expect(result.current.history).toHaveLength(0);
    expect(result.current.result).toBe(7);
  });

  it("caps history at 10 entries", async () => {
    const { result } = renderHook(() => useCalculator());

    for (let i = 0; i < 12; i++) {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ operation: "add", result: i }),
      });
      act(() => {
        result.current.setOperandA(String(i));
        result.current.setOperandB("1");
      });
      await act(async () => {
        await result.current.submit();
      });
    }

    await waitFor(() => expect(result.current.history).toHaveLength(10));
    expect(result.current.history[0]).toMatchObject({ result: 11 });
  });

  it("replays the prior successful entry (with a non-null result) after an intervening failure", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ operation: "divide", result: 2 }) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "division by zero is not allowed" }) });

    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setOperation("divide");
      result.current.setOperandA("10");
      result.current.setOperandB("5");
    });
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.result).toBe(2));

    act(() => result.current.setOperandB("0"));
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.error).toBe("division by zero is not allowed"));
    expect(result.current.result).toBeNull();

    act(() => result.current.setOperandB("5"));
    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.result).toBe(2);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.history[0]).toMatchObject({ operation: "divide", a: 10, b: 5, result: 2 });
  });
});
