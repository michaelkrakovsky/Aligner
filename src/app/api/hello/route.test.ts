import { beforeEach, describe, expect, it, vi } from "vitest";
import { getModel } from "@/lib/model";
import { mockModelFailing, mockModelReturning } from "@/test/mock-model";
import { POST } from "./route";

vi.mock("@/lib/model", () => ({ getModel: vi.fn() }));

describe("POST /api/hello", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("returns Claude's reply", async () => {
    const model = mockModelReturning("Hello, founder!");
    vi.mocked(getModel).mockReturnValue(model);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "Hello, founder!" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("returns 500 without calling Claude when the API key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const res = await POST();

    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
    expect(getModel).not.toHaveBeenCalled();
  });

  it("returns 500 with a safe message when Claude fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getModel).mockReturnValue(mockModelFailing());

    const res = await POST();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Claude request failed." });
  });
});
