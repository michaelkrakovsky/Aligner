import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · Aligner",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Aligner</h1>
          <p className="mt-3 text-sm text-zinc-500">
            A living map of how your business actually works.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
