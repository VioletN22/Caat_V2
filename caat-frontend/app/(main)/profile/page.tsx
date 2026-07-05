import { createServerClient } from "@/lib/supabase/server";
import { fetchProfileServer } from "@/lib/profile-server";
import type {
  ProfileRow,
  StandardisedTestScore,
  StandardisedTestSubjectRow,
} from "@/types/profile";
import ProfileClient from "./client";

// C8: resolve the profile row, its test scores, and the majors option list on
// the server so the page paints real content on first render instead of a
// post-hydration skeleton. Mutations stay client-side. A brand-new user has no
// profile row yet -> initialProfile is null and the client creates it as before.
async function fetchProfileData(): Promise<{
  profile: ProfileRow | null;
  scores: StandardisedTestScore[];
  majorOptions: string[];
}> {
  const sb = await createServerClient();

  const [profile, majorsRes] = await Promise.all([
    fetchProfileServer(),
    sb.from("majors").select("name").order("name", { ascending: true }),
  ]);
  const majorOptions = (majorsRes.data ?? []).map((r) => r.name as string);

  if (!profile) return { profile: null, scores: [], majorOptions };

  const { data: scoreRows } = await sb
    .from("standardised_test_scores")
    .select("*, standardised_test_subjects(*)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  const scores = ((scoreRows ?? []) as unknown as (StandardisedTestScore & {
    standardised_test_subjects: StandardisedTestSubjectRow[] | null;
  })[]).map((score) => ({
    ...score,
    subjects: score.standardised_test_subjects ?? [],
  })) as StandardisedTestScore[];

  return { profile, scores, majorOptions };
}

export default async function ProfilePage() {
  const { profile, scores, majorOptions } = await fetchProfileData();
  return (
    <ProfileClient
      initialProfile={profile}
      initialScores={scores}
      initialMajorOptions={majorOptions}
    />
  );
}
