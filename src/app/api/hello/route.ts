import { generateText } from "ai";
import { getModel } from "@/lib/model";

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 500 },
    );
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      prompt:
        "Say hello world to the founder of Project Aligner, a tool that keeps organizations aligned to their mission. One short, warm sentence.",
    });
    return Response.json({ text });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Claude request failed." }, { status: 500 });
  }
}
