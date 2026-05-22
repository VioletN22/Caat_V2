import { supabase } from "@/src/lib/supabaseClient";
import type { ApplicationRow, ApplicationStatus } from "@/types/applications";

async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

export async function fetchApplications(): Promise<ApplicationRow[]> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("user_school_applications")
    .select("*, schools(id, name, country)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ApplicationRow[];
}

export async function fetchApplicationForSchool(
  schoolId: number
): Promise<ApplicationRow | null> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("user_school_applications")
    .select("*, schools(id, name, country)")
    .eq("user_id", user.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as ApplicationRow | null;
}

export async function addApplication(
  schoolId: number
): Promise<ApplicationRow> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("user_school_applications")
    .insert({ user_id: user.id, school_id: schoolId, status: "researching" })
    .select("*, schools(id, name, country)")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as ApplicationRow;
}

export async function updateApplication(
  id: string,
  patch: {
    status?: ApplicationStatus;
    deadline_at?: string | null;
    notes?: string | null;
  }
): Promise<void> {
  const user = await getUser();
  const { error } = await supabase
    .from("user_school_applications")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteApplication(id: string): Promise<void> {
  const user = await getUser();
  const { error } = await supabase
    .from("user_school_applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

/**
 * Number of bookmarked schools the user does NOT yet have an application for.
 * Powers the "Import from Bookmarks" button count badge.
 */
export async function fetchUnimportedBookmarkCount(): Promise<number> {
  const user = await getUser();

  const [bookmarkedRes, appsRes] = await Promise.all([
    supabase
      .from("user_bookmarked_schools")
      .select("school_id")
      .eq("user_id", user.id),
    supabase
      .from("user_school_applications")
      .select("school_id")
      .eq("user_id", user.id),
  ]);

  if (bookmarkedRes.error) throw new Error(bookmarkedRes.error.message);
  if (appsRes.error) throw new Error(appsRes.error.message);

  const existing = new Set((appsRes.data ?? []).map((r) => r.school_id as number));
  return (bookmarkedRes.data ?? []).filter(
    (b) => !existing.has(b.school_id as number)
  ).length;
}

/**
 * Bulk-create 'researching'-status applications for every bookmarked school
 * the user does not already have an application for. Idempotent — schools
 * already tracked are skipped silently.
 */
export async function importBookmarkedSchools(): Promise<{
  added: ApplicationRow[];
  skipped: number;
}> {
  const user = await getUser();

  const [bookmarkedRes, appsRes] = await Promise.all([
    supabase
      .from("user_bookmarked_schools")
      .select("school_id")
      .eq("user_id", user.id),
    supabase
      .from("user_school_applications")
      .select("school_id")
      .eq("user_id", user.id),
  ]);

  if (bookmarkedRes.error) throw new Error(bookmarkedRes.error.message);
  if (appsRes.error) throw new Error(appsRes.error.message);

  const existing = new Set((appsRes.data ?? []).map((r) => r.school_id as number));
  const toInsert = (bookmarkedRes.data ?? [])
    .map((r) => r.school_id as number)
    .filter((id) => !existing.has(id));

  if (toInsert.length === 0) {
    return { added: [], skipped: (bookmarkedRes.data ?? []).length };
  }

  const rows = toInsert.map((school_id) => ({
    user_id: user.id,
    school_id,
    status: "researching" as const,
  }));

  const { data, error } = await supabase
    .from("user_school_applications")
    .insert(rows)
    .select("*, schools(id, name, country)");

  if (error) throw new Error(error.message);

  return {
    added: (data ?? []) as unknown as ApplicationRow[],
    skipped: (bookmarkedRes.data ?? []).length - (data?.length ?? 0),
  };
}

export async function searchSchools(
  query: string
): Promise<{ id: number; name: string; country: string | null }[]> {
  if (!query.trim()) return [];
  // Escape LIKE special characters so user input is treated as a literal string (C2).
  // % and _ are wildcard characters in SQL LIKE/ILIKE; without escaping they allow
  // unintended broad matching (e.g. "%" matches every row).
  const safeQuery = query.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, country")
    .ilike("name", `%${safeQuery}%`)
    .order("name", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: number; name: string; country: string | null }[];
}
