// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskClaude } from "./ask-claude";

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AskClaude", () => {
  it("shows Claude's reply after clicking the button", async () => {
    const fetchMock = stubFetch(async () =>
      Response.json({ text: "Hello from Claude" }),
    );
    render(<AskClaude />);

    await userEvent.click(
      screen.getByRole("button", { name: "Say hello to Claude" }),
    );

    expect(await screen.findByText("Hello from Claude")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/hello", { method: "POST" });
  });

  it("shows the API's error message", async () => {
    stubFetch(async () =>
      Response.json({ error: "Claude request failed." }, { status: 500 }),
    );
    render(<AskClaude />);

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Claude request failed.")).toBeDefined();
  });

  it("handles the network being down", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<AskClaude />);

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Could not reach the API.")).toBeDefined();
  });
});
