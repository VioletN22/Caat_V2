import { supabase } from "@/lib/supabase/client";

/**
 * Resolve the signed-in user's id on the client WITHOUT a /auth/v1/user network
 * round trip (C5).
 *
 * getClaims() verifies the session JWT locally against the project's asymmetric
 * (ES256) signing keys — the JWKS is fetched once and cached — so this is a
 * local operation, unlike getUser(), which calls the Auth server every time.
 * Dozens of client fetchers used to call getUser() purely to obtain user.id for
 * an RLS-scoped query; routing them through this helper removes that per-fetch
 * auth round trip while RLS still enforces authorization server-side.
 *
 * Returns null when there is no valid session.
 */
export async function getClientUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}
