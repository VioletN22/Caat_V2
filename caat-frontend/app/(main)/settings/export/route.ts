import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// F5 - Data export. Streams a single JSON document of everything the signed-in
// user owns, as a file download. Every query is scoped to the caller's own id
// (defense in depth alongside RLS) so the export can only ever contain the
// requester's own rows.
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const uid = user.id;

  // Tables keyed by the column that identifies the owner.
  const byUserId = [
    "calendar_events",
    "user_todos",
    "user_recommenders",
    "user_scholarships",
    "user_school_applications",
    "user_school_notes",
    "user_bookmarked_schools",
    "user_bookmarked_scholarships",
    "user_bookmarked_majors",
    "custom_essay_prompts",
    "essay_drafts",
    "documents",
    "dashboard_layouts",
    "user_dashboard_widgets",
    "community_posts",
    "community_comments",
    "community_group_members",
    "notifications",
  ] as const;

  const data: Record<string, unknown> = {};

  // Profile (owner column is `id`).
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid);
  data.profile = profile ?? [];

  // Standardised tests + their subjects (subjects are scoped through the scores).
  const { data: scores } = await supabase
    .from("standardised_test_scores")
    .select("*")
    .eq("profile_id", uid);
  data.standardised_test_scores = scores ?? [];
  const scoreIds = (scores ?? []).map((s) => s.id);
  data.standardised_test_subjects = scoreIds.length
    ? (
        await supabase
          .from("standardised_test_subjects")
          .select("*")
          .in("test_score_id", scoreIds)
      ).data ?? []
    : [];

  // Resumes + their sections (sections scoped through the user's resumes).
  const { data: resumes } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", uid);
  data.resumes = resumes ?? [];
  const resumeIds = (resumes ?? []).map((r) => r.id);
  data.resume_sections = resumeIds.length
    ? (
        await supabase
          .from("resume_sections")
          .select("*")
          .in("resume_id", resumeIds)
      ).data ?? []
    : [];

  // Community groups the user created.
  data.community_groups = (
    await supabase.from("community_groups").select("*").eq("creator_id", uid)
  ).data ?? [];

  // Everything keyed by user_id.
  for (const table of byUserId) {
    const { data: rows } = await supabase.from(table).select("*").eq("user_id", uid);
    data[table] = rows ?? [];
  }

  const payload = {
    export_version: 1,
    generated_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    data,
  };

  const filename = `caat-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
