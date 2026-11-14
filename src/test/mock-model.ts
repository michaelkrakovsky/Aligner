import { MockLanguageModelV4 } from "ai/test";

/** A fake Claude model that always replies with `text`. */
export function mockModelReturning(text: string) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: "end_turn" },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 5, text: 5, reasoning: undefined },
      },
      warnings: [],
    },
  });
}

/** A fake Claude model whose call fails, like a network or API error. */
export function mockModelFailing(message = "Anthropic API unavailable") {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error(message);
    },
  });
}
