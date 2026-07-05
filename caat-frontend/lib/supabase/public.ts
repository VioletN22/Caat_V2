import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cookieless, typed anon Supabase client for PUBLIC (logged-out) pages.
 *
 * Unlike the cookie-aware server client, this reads no request cookies, so it
 * carries no user session and can only see rows exposed to the `anon` role via
 * RLS: the public-read `scholarships` catalog. That makes the public directory
 * pages cacheable (no per-request personalization) and guarantees no user data
 * can ever leak through them.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
