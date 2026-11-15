// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GoogleDocsApi } from "@/components/google/google-docs-context";
import { linkDoc } from "@/lib/map/operations";
import type { LinkedDoc, RealityMap } from "@/lib/map/schema";
import { medicalTestingTemplate } from "@/lib/map/template";

const google = vi.hoisted(() => ({ current: null as GoogleDocsApi | null }));
vi.mock("@/components/google/google-docs-context", () => ({
  useGoogleDocs: () => google.current,
}));

import { LinkedDocs } from "./linked-docs";

const doc: LinkedDoc = {
  type: "google_doc",
  fileId: "1AbCdEfGhIjKlMnOp",
  title: "Missing results escalation SOP",
  url: "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit",
  modifiedTime: new Date(Date.now() - 2 * 86400_000).toISOString(),
  lastModifiedBy: "Dana Ops",
  syncedAt: new Date().toISOString(),
};

function fakeGoogle(overrides: Partial<GoogleDocsApi> = {}): GoogleDocsApi {
  return {
    available: true,
    connected: true,
    pickDoc: vi.fn(async () => doc),
    refreshDoc: vi.fn(async () => null),
    disconnect: vi.fn(async () => undefined),
    ...overrides,
  };
}

/** Renders the section for one node and applies updates to a live map. */
function setup(map: RealityMap = medicalTestingTemplate()) {
  let current = map;
  const update = vi.fn((fn: (m: RealityMap) => RealityMap) => {
    current = fn(current);
  });
  const node = () => current.nodes.find((n) => n.id === "missing")!;
  const view = render(<LinkedDocs node={node()} update={update} />);
  return { update, node, rerender: () => view.rerender(<LinkedDocs node={node()} update={update} />) };
}

describe("LinkedDocs", () => {
  it("links a picked Google Doc to the node", async () => {
    google.current = fakeGoogle();
    const { node, rerender } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Link a Google Doc" }));
    expect(node().docs).toEqual([doc]);

    rerender();
    const link = screen.getByRole("link", { name: doc.title });
    expect(link.getAttribute("href")).toBe(doc.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("Edited 2 days ago by Dana Ops")).toBeDefined();
  });

  it("does nothing when the picker is cancelled", async () => {
    google.current = fakeGoogle({ pickDoc: vi.fn(async () => null) });
    const { node } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Link a Google Doc" }));
    expect(node().docs).toBeUndefined();
  });

  it("shows why linking failed", async () => {
    google.current = fakeGoogle({
      pickDoc: vi.fn(async () => {
        throw new Error("Only Google Docs can be linked for now.");
      }),
    });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Link a Google Doc" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Only Google Docs can be linked for now.",
    );
  });

  it("explains the permission before the first connection", () => {
    google.current = fakeGoogle({ connected: false });
    setup();
    expect(screen.getByText(/read the docs you pick, and nothing else/)).toBeDefined();
  });

  it("unlinks a doc", async () => {
    google.current = fakeGoogle();
    const { node } = setup(linkDoc(medicalTestingTemplate(), "missing", doc));
    await userEvent.click(screen.getByLabelText(`Unlink ${doc.title}`));
    expect(node().docs).toEqual([]);
  });

  it("refreshes stale doc details when opened", async () => {
    const fresh = { ...doc, title: "Renamed SOP" };
    google.current = fakeGoogle({ refreshDoc: vi.fn(async () => fresh) });
    const stale = { ...doc, syncedAt: "2026-01-01T00:00:00Z" };
    const { node } = setup(linkDoc(medicalTestingTemplate(), "missing", stale));

    await vi.waitFor(() => expect(node().docs?.[0].title).toBe("Renamed SOP"));
    expect(google.current.refreshDoc).toHaveBeenCalledWith(doc.fileId);
  });

  it("hides the link button when Google Docs isn't set up", () => {
    google.current = fakeGoogle({ available: false });
    setup();
    expect(screen.queryByRole("button", { name: "Link a Google Doc" })).toBeNull();
    expect(screen.getByText(/isn.t set up for Aligner yet/)).toBeDefined();
  });
});
