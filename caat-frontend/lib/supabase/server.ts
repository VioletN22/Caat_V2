import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cookie-aware, typed Supabase client for Server Components, Route Handlers,
 * and Server Actions. Reads the caller's session from cookies so RLS applies
 * to the authenticated user.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // read-only in Server Components — safe to ignore
          }
        },
      },
    }
  );
}
