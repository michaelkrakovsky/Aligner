"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseConfig, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const Credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function parseCredentials(formData: FormData) {
  return Credentials.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!getSupabaseConfig()) return { error: SUPABASE_NOT_CONFIGURED };
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match an account." };
  redirect("/maps");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!getSupabaseConfig()) return { error: SUPABASE_NOT_CONFIGURED };
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { message: "Check your email for a link to confirm your account." };
  }
  redirect("/maps");
}

export async function signInWithGoogle(): Promise<AuthState> {
  if (!getSupabaseConfig()) return { error: SUPABASE_NOT_CONFIGURED };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error || !data.url) return { error: "Google sign in isn't available right now." };
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
