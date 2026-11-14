// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RealityMap } from "@/lib/map/schema";
import { medicalTestingTemplate } from "@/lib/map/template";
import { stubReactFlowDom } from "@/test/react-flow-jsdom";
import { FlowMapper } from "./flow-mapper";

beforeEach(() => stubReactFlowDom());

function lastMap(onChange: ReturnType<typeof vi.fn>): RealityMap {
  return onChange.mock.calls.at(-1)![0] as RealityMap;
}

describe("FlowMapper", () => {
  it("renders the template's nodes and the map overview", () => {
    render(<FlowMapper initialMap={medicalTestingTemplate()} />);

    expect(screen.getByTestId("map-node-missing")).toBeDefined();
    expect(screen.getByText("Map overview")).toBeDefined();
    expect(screen.getByText("Issues (3)")).toBeDefined();
  });

  it("edits a node in the side panel and reports the change", async () => {
    const onChange = vi.fn();
    render(<FlowMapper initialMap={medicalTestingTemplate()} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();

    // fireEvent, not userEvent: d3-drag's mousedown handler needs a real window.
    fireEvent.click(screen.getByTestId("map-node-missing"));
    const title = screen.getByLabelText("Title");
    expect((title as HTMLInputElement).value).toBe("Results never arrive");

    await userEvent.clear(title);
    await userEvent.type(title, "Results go missing");
    await userEvent.click(screen.getByLabelText("No SOP yet"));

    await waitFor(() => {
      const node = lastMap(onChange).nodes.find((n) => n.id === "missing")!;
      expect(node.title).toBe("Results go missing");
      expect(node.variation?.noSopYet).toBe(true);
    });
    expect(screen.getByTestId("map-node-missing").textContent).toContain("Results go missing");
  });

  it("adds a variation branching from the selected node", async () => {
    const onChange = vi.fn();
    render(<FlowMapper initialMap={medicalTestingTemplate()} onChange={onChange} />);

    const addVariation = screen.getByRole("button", { name: "+ Variation" });
    expect((addVariation as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("map-node-test"));
    await userEvent.click(addVariation);

    const map = lastMap(onChange);
    const added = map.nodes.at(-1)!;
    expect(added).toMatchObject({ type: "variation", title: "New variation" });
    expect(map.edges).toContainEqual(expect.objectContaining({ source: "test", target: added.id }));
    expect(screen.getByText("Needs a trigger condition", { exact: false })).toBeDefined();
  });

  it("renames the map", async () => {
    const onChange = vi.fn();
    render(<FlowMapper initialMap={medicalTestingTemplate()} onChange={onChange} />);

    const name = screen.getByLabelText("Map name");
    await userEvent.clear(name);
    await userEvent.type(name, "Results delivery");

    expect(lastMap(onChange).name).toBe("Results delivery");
  });
});
