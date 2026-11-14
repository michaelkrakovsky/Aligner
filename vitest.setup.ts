import { afterEach } from "vitest";

afterEach(async () => {
  // Unmount anything React Testing Library rendered (jsdom tests only).
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
