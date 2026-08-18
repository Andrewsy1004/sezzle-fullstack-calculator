import type { ApiErrorResponse, CalculateRequest, CalculateResponse } from "../types";
import { ApiError } from "../types";

/**
 * Base URL for the backend API. Configurable at build time via
 * VITE_API_BASE_URL (see .env.example); defaults to same-origin "/api",
 * which is what the Docker/nginx setup proxies to the Go service.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Calls POST {API_BASE_URL}/calculate.
 * Throws ApiError with a user-readable message on any failure (network,
 * non-2xx response, or malformed JSON), so callers can display it directly.
 */
export async function calculate(request: CalculateRequest): Promise<CalculateResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError("Could not reach the calculator service. Is the backend running?");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("The server returned an unreadable response.", response.status);
  }

  if (!response.ok) {
    const message = isApiErrorResponse(data) ? data.error : "Something went wrong.";
    throw new ApiError(message, response.status);
  }

  return data as CalculateResponse;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" && value !== null && "error" in value;
}
