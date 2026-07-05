import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { fetchProfileServer } from "@/lib/profile-server";
import { PageHeader } from "@/components/PageHeader";
import MajorsClient from "./client";
import type { FilterView, Major } from "@/types/majors";

export default async function MajorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const initialFilter = (params.category ?? "All") as FilterView;

  const sb = await createServerClient();
  const [majorsRes, profile] = await Promise.all([
    sb.from("majors").select("*").order("name"),
    fetchProfileServer(),
  ]);
  const { data: majors, error } = majorsRes;

  if (error) {
    return <div className="p-10 text-[#9a1a27]">Unable to load majors. Please try again later.</div>;
  }

  return (
    <>
      <PageHeader title="Majors" />
      <Suspense>
        <MajorsClient majors={(majors ?? []) as unknown as Major[]} initialFilter={initialFilter} profile={profile} />
      </Suspense>
    </>
  );
}
