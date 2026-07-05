import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Global, non-personalised catalog metadata for the scholarships browse page.
 *
 * The main browse query (search_scholarships) is personalised — it match-sorts
 * by the signed-in user's profile and can be scoped to their bookmarks — so it
 * is fetched per request and cannot be globally cached. The university list,
 * however, is global and changes only when the scraper runs, so it is cached
 * here (revalidate 1h) and reused across users instead of being derived from a
 * full-table dump on the client, as it used to be.
 *
 * Uses a plain anon client (no cookies) because unstable_cache callbacks must
 * not read request-scoped data; the RPC is granted to anon.
 */
export const getScholarshipUniversities = unstable_cache(
  async (): Promise<string[]> => {
    const sb = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await sb.rpc("scholarship_universities");
    return (data as string[] | null) ?? [];
  },
  ["scholarship-universities"],
  { revalidate: 3600, tags: ["scholarship-catalog"] },
);
