import { createServerClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS } from "@/lib/profile-columns";
import type { ProfileRow } from "@/types/profile";

export { PROFILE_COLUMNS } from "@/lib/profile-columns";

/**
 * Fetch the signed-in user's profile from a Server Component. Returns null when
 * there is no authenticated user or no profile row yet. Does not create a row
 * (that is the client profile API's job).
 */
export async function fetchProfileServer(): Promise<ProfileRow | null> {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  return (data as unknown as ProfileRow | null) ?? null;
}
