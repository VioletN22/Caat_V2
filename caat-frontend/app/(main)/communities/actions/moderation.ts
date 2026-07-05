"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { gate, ratelimits } from "@/lib/rate-limit";


// ─── Moderation ───────────────────────────────────────────────────────────────

export async function reportPostAction(
  postId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const rl = await gate(ratelimits.reportAction, `report:${user.id}`);
  if (!rl.ok) return { error: rl.error };

  // C5 — reject self-reports so an author can't push their own post toward auto-hide.
  const { data: post } = await supabase
    .from("community_posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { error: "Post not found" };
  if (post.user_id === user.id) return { error: "Cannot report your own post" };

  await supabase
    .from("community_reports")
    .upsert({ post_id: postId, reporter_id: user.id });
  return { error: null };
}


// ─── Blocks ───────────────────────────────────────────────────────────────────

export async function blockUserAction(
  targetUserId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (user.id === targetUserId) return { error: "Cannot block yourself" };

  const rl = await gate(ratelimits.blockAction, `block:${user.id}`);
  if (!rl.ok) return { error: rl.error };

  await supabase
    .from("community_blocks")
    .upsert({ blocker_id: user.id, blocked_id: targetUserId });
  // Also unfollow both ways
  await Promise.all([
    supabase
      .from("community_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", targetUserId),
    supabase
      .from("community_follows")
      .delete()
      .eq("follower_id", targetUserId)
      .eq("followee_id", user.id),
  ]);
  return { error: null };
}


export async function unblockUserAction(
  targetUserId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  await supabase
    .from("community_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);
  return { error: null };
}
