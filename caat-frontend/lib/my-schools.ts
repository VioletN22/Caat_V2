import { supabase } from "@/src/lib/supabaseClient";

export interface MySchool {
  id: number;
  name: string;
}

/**
 * The schools the user is applying to (their applications), for the
 * "This is for: [school]" tag selectors in the essays + documents tools.
 */
export async function fetchMySchools(): Promise<MySchool[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("user_school_applications")
    .select("school_id, schools(id, name)")
    .eq("user_id", user.id);
  if (error) return [];
  const seen = new Set<number>();
  const out: MySchool[] = [];
  for (const row of (data ?? []) as unknown as { schools: { id: number; name: string } | null }[]) {
    const s = row.schools;
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      out.push({ id: s.id, name: s.name });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
