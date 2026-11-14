import { anthropic } from "@ai-sdk/anthropic";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

/**
 * The one place the app creates its Claude model.
 * Tests mock this module so they never call the real API.
 */
export function getModel() {
  return anthropic(process.env.ANTHROPIC_MODEL || DEFAULT_MODEL);
}
