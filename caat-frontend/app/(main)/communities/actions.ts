"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import type { CommunityPost, PostAuthor, TopicTag, ResultCard, ScoreCard } from "@/types/community";

const VALID_TOPICS: TopicTag[] = [
  "APPLICATION_RESULTS",
  "ESSAYS",
  "TEST_SCORES",
  "EXTRACURRICULARS",
  "ADVICE",
  "SCHOLARSHIPS",
];

export async function createPostAction(input: {
  content: string;
  topic_tag: TopicTag;
  result_card?: ResultCard | null;
  score_card?: ScoreCard | null;
  resume_link?: string | null;
}): Promise<{ post: CommunityPost | null; error: string | null }> {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { post: null, error: "Not signed in" };

  const content = input.content.trim();
  if (!content) return { post: null, error: "Post cannot be empty" };
  if (content.length > 2000) return { post: null, error: "Post exceeds 2000 characters" };
  if (!VALID_TOPICS.includes(input.topic_tag)) return { post: null, error: "Invalid topic" };

  const { data: row, error: insertError } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      content,
      topic_tag: input.topic_tag,
      result_card: input.result_card ?? null,
      score_card: input.score_card ?? null,
      resume_link: input.resume_link ?? null,
    })
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .single();

  if (insertError || !row) return { post: null, error: "Failed to create post" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  const post: CommunityPost = {
    ...row,
    likes_count: 0,
    comments_count: 0,
    author: profile ?? null,
  };

  return { post, error: null };
}

export async function fetchPostsAction(cursor?: string): Promise<{
  posts: CommunityPost[];
  nextCursor: string | null;
}> {
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("community_posts")
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: rows, error } = await query;

  if (error || !rows) return { posts: [], nextCursor: null };

  // Fetch author profiles for this batch
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<string, PostAuthor>(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const posts: CommunityPost[] = rows.map((row) => ({
    ...row,
    likes_count: (row.likes as { count: number }[])[0]?.count ?? 0,
    comments_count: (row.comments as { count: number }[])[0]?.count ?? 0,
    author: profileMap.get(row.user_id) ?? null,
  }));

  const nextCursor =
    rows.length === 20 ? rows[rows.length - 1].created_at : null;

  return { posts, nextCursor };
}
