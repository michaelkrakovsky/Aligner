import { AskClaude } from "@/components/ask-claude";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Project Aligner
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Hello, World
        </h1>
        <p className="mt-4 max-w-md text-zinc-500">
          Keep every team aligned and accountable to the mission.
        </p>
      </div>
      <AskClaude />
    </main>
  );
}
