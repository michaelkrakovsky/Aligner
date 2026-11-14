// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/app/maps/actions", () => ({
  createJourneyAction: vi.fn(),
  deleteJourneyAction: vi.fn(),
}));
vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));

import { JourneySidebar } from "./journey-sidebar";

const journeys = [
  { id: "a", name: "Member journey" },
  { id: "b", name: "Lab supply chain" },
  { id: "c", name: "Hiring" },
];

describe("JourneySidebar", () => {
  it("lists journeys in rank order and marks the open one", () => {
    render(
      <JourneySidebar journeys={journeys} activeId="b" email="pm@example.com" onReorder={vi.fn()} />,
    );

    const list = screen.getByRole("list", { name: /priority order/ });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("1Member journey"),
      expect.stringContaining("2Lab supply chain"),
      expect.stringContaining("3Hiring"),
    ]);
    expect(screen.getByRole("link", { current: "page" }).textContent).toBe(
      "Lab supply chain",
    );
    expect(screen.getByText("pm@example.com")).toBeDefined();
  });

  it("moves a journey up the stack rank", async () => {
    const onReorder = vi.fn();
    render(
      <JourneySidebar journeys={journeys} activeId="a" email={null} onReorder={onReorder} />,
    );

    const topUp = screen.getByLabelText("Move Member journey up") as HTMLButtonElement;
    expect(topUp.disabled).toBe(true);
    await userEvent.click(screen.getByLabelText("Move Hiring up"));

    expect(onReorder).toHaveBeenCalledWith([journeys[0], journeys[2], journeys[1]]);
  });

  it("shows a reorder error", () => {
    render(
      <JourneySidebar
        journeys={journeys}
        activeId="a"
        email={null}
        onReorder={vi.fn()}
        error="Could not save the new order."
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe("Could not save the new order.");
  });
});
