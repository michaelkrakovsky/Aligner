import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig, SUPABASE_NOT_CONFIGURED } from "./config";

/** A Supabase client acting as the signed-in user of this request. */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error(SUPABASE_NOT_CONFIGURED);
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies; the proxy refreshes them.
        }
      },
    },
  });
}

export type SignedInUser = { id: string; email: string | null };

/** The signed-in user, verified from the session token, or null. */
export async function getUser(): Promise<SignedInUser | null> {
  // Read the request first so pages that check the user are never
  // prerendered, even when a build runs without Supabase settings.
  await cookies();
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
