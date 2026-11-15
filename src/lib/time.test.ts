import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

const now = new Date("2026-11-15T12:00:00Z");

describe("timeAgo", () => {
  it("describes how long ago something happened", () => {
    expect(timeAgo("2026-11-15T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-15T11:55:00Z", now)).toBe("5 minutes ago");
    expect(timeAgo("2026-11-14T12:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-11-12T12:00:00Z", now)).toBe("3 days ago");
    expect(timeAgo("2026-09-15T12:00:00Z", now)).toBe("2 months ago");
  });

  it("returns nothing for an unreadable date", () => {
    expect(timeAgo("not a date", now)).toBe("");
  });
});
