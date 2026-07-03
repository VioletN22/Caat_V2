import { supabase } from "@/lib/supabase/client";
import { sanitizeError } from "@/lib/safe-error";
import type { RecommenderRow, RecommenderStatus } from "@/types/profile";

async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

export async function fetchRecommenders(): Promise<RecommenderRow[]> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("user_recommenders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(sanitizeError(error));
  return (data ?? []) as RecommenderRow[];
}

export async function addRecommender(fields: {
  name: string;
  subject?: string | null;
  status: RecommenderStatus;
  notes?: string | null;
}): Promise<RecommenderRow> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("user_recommenders")
    .insert({ user_id: user.id, ...fields })
    .select()
    .single();
  if (error) throw new Error(sanitizeError(error));
  return data as RecommenderRow;
}

export async function updateRecommender(
  id: string,
  patch: {
    name?: string;
    // B13 — allow null so clearing a field explicitly persists. `undefined`
    // is stripped by the Supabase client and never clears the column.
    subject?: string | null;
    status?: RecommenderStatus;
    notes?: string | null;
  }
): Promise<void> {
  const user = await getUser();
  const { error } = await supabase
    .from("user_recommenders")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(sanitizeError(error));
}

export async function deleteRecommender(id: string): Promise<void> {
  const user = await getUser();
  const { error } = await supabase
    .from("user_recommenders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(sanitizeError(error));
}
