import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Calculator } from "../Calculator";

describe("<Calculator />", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the operation select and both operand inputs by default", () => {
    render(<Calculator />);
    expect(screen.getByLabelText(/operation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value a/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value b/i)).toBeInTheDocument();
  });

  it("hides the second operand when 'Square Root' is selected", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.selectOptions(screen.getByLabelText(/operation/i), "sqrt");

    expect(screen.queryByLabelText(/value b/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^value$/i)).toBeInTheDocument();
  });

  it("submits values and displays the result returned by the API", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ operation: "add", result: 42 }),
    });

    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByLabelText(/value a/i), "40");
    await user.type(screen.getByLabelText(/value b/i), "2");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("42"));
  });

  it("shows a client-side validation message without calling the API", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByLabelText(/value a/i), "abc");
    await user.type(screen.getByLabelText(/value b/i), "2");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid number/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("displays the backend error message for domain errors like division by zero", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "division by zero is not allowed" }),
    });

    const user = userEvent.setup();
    render(<Calculator />);

    await user.selectOptions(screen.getByLabelText(/operation/i), "divide");
    await user.type(screen.getByLabelText(/value a/i), "10");
    await user.type(screen.getByLabelText(/value b/i), "0");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/division by zero/i);
  });

  it("sends only one request when Calculate is clicked repeatedly while pending", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByLabelText(/value a/i), "40");
    await user.type(screen.getByLabelText(/value b/i), "2");

    const button = screen.getByRole("button", { name: /calculate/i });
    await user.click(button);

    // Button disables itself once "Calculating…" renders, so clicks past this
    // point are no-ops at the DOM level too — this asserts the composed UX.
    expect(await screen.findByRole("button", { name: /calculating/i })).toBeDisabled();
    await user.click(button);
    await user.click(button);

    expect(fetch).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, status: 200, json: async () => ({ operation: "add", result: 42 }) });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("42"));
    expect(screen.getByRole("button", { name: /^calculate$/i })).not.toBeDisabled();
  });

  it("clears all fields when Reset is clicked", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    const valueA = screen.getByLabelText(/value a/i) as HTMLInputElement;
    await user.type(valueA, "5");
    expect(valueA.value).toBe("5");

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(valueA.value).toBe("");
  });
});
