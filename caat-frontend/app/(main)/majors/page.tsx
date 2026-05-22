import { Suspense } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { createSupabaseServer } from "@/lib/supabase-server";
import { PageHeader } from "@/components/PageHeader";
import MajorsClient from "./client";
import type { FilterView } from "@/types/majors";
import type { ProfileRow } from "@/types/profile";

async function fetchProfile(): Promise<ProfileRow | null> {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select("id, first_name, last_name, email, birth_date, phone, linkedin, github, avatar_url, nationality, current_location, school_name, curriculum, graduation_year, target_majors, preferred_countries, activities, default_resume_id")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

export default async function MajorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const initialFilter = (params.category ?? "All") as FilterView;

  const [majorsRes, profile] = await Promise.all([
    supabase.from("majors").select("*").order("name"),
    fetchProfile(),
  ]);
  const { data: majors, error } = majorsRes;

  if (error) {
    return <div className="p-10 text-[#9a1a27]">Unable to load majors. Please try again later.</div>;
  }

  return (
    <>
      <PageHeader title="Majors" />
      <Suspense>
        <MajorsClient majors={majors ?? []} initialFilter={initialFilter} profile={profile} />
      </Suspense>
    </>
  );
}
