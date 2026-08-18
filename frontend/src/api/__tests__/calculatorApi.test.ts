import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { calculate } from "../calculatorApi";
import { ApiError } from "../../types";

describe("calculatorApi.calculate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed result on success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ operation: "add", result: 5 }),
    });

    const result = await calculate({ operation: "add", a: 2, b: 3 });

    expect(result).toEqual({ operation: "add", result: 5 });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/calculate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "add", a: 2, b: 3 }),
      }),
    );
  });

  it("throws ApiError with the server message on a 4xx response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "division by zero is not allowed" }),
    });

    await expect(calculate({ operation: "divide", a: 1, b: 0 })).rejects.toMatchObject({
      message: "division by zero is not allowed",
      status: 400,
    });
  });

  it("throws a friendly ApiError when the network request fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(calculate({ operation: "add", a: 1, b: 1 })).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError when the response body is not valid JSON", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token");
      },
    });

    await expect(calculate({ operation: "add", a: 1, b: 1 })).rejects.toBeInstanceOf(ApiError);
  });
});
