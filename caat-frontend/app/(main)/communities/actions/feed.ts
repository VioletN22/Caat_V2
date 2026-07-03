"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import type { CommunityPost, TopicTag } from "@/types/community";
import { fetchBlockedIds, enrichPosts } from "./_shared";


// ─── Feed (all / following) ───────────────────────────────────────────────────

export async function fetchPostsAction(
  cursor?: string,
  followingOnly?: boolean,
): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let followeeIds: string[] | null = null;
  if (followingOnly) {
    if (!user) return { posts: [], nextCursor: null };
    const { data: follows } = await supabase
      .from("community_follows")
      .select("followee_id")
      .eq("follower_id", user.id);
    followeeIds = (follows ?? []).map((f) => f.followee_id as string);
    if (followeeIds.length === 0) return { posts: [], nextCursor: null };
  }

  const blockedIds = await fetchBlockedIds(supabase, user?.id);

  let query = supabase
    .from("community_posts")
    .select(
      "*, likes:community_likes(count), comments:community_comments(count)",
    )
    .eq("is_hidden", false)
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);

  // Keyset cursor on (created_at, id) so posts sharing a timestamp aren't
  // skipped or duplicated across pages. Cursor format: "<created_at>|<id>".
  if (cursor) {
    const [cTs, cId] = cursor.split("|");
    query = cId
      ? query.or(`created_at.lt.${cTs},and(created_at.eq.${cTs},id.lt.${cId})`)
      : query.lt("created_at", cTs);
  }
  if (followeeIds) query = query.in("user_id", followeeIds);
  if (blockedIds.length)
    query = query.not("user_id", "in", `(${blockedIds.join(",")})`);

  const { data: rows, error } = await query;
  if (error || !rows) return { posts: [], nextCursor: null };

  const posts = await enrichPosts(
    supabase,
    rows as Record<string, unknown>[],
    user?.id,
  );
  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length === 20
      ? `${last.created_at as string}|${last.id as string}`
      : null;
  return { posts, nextCursor };
}


// ─── Feed (trending — top 20 by engagement in last 7 days) ───────────────────

// C11: the trending candidate window (300 posts) + scoring is global — the same
// for every viewer — yet it ran on every tab switch, per user. Cache the scored
// top candidates in-process for a short TTL; the per-user block filter and
// enrichment (liked/saved/polls) still run per request against the cached rows.
// (unstable_cache can't be used here: community_posts is RLS-gated, so the fetch
// needs the request's authenticated client, not a cookie-less one.)
const TRENDING_TTL_MS = 120_000;
const TRENDING_KEEP = 60; // buffer above the 20 shown, so block-filtering rarely underfills
let trendingCache: { rows: Record<string, unknown>[]; at: number } | null = null;

function hotScore(r: Record<string, unknown>, now: number): number {
  const likes = (r.likes as { count: number }[] | undefined)?.[0]?.count ?? 0;
  const comments = (r.comments as { count: number }[] | undefined)?.[0]?.count ?? 0;
  const ageHours = (now - new Date(r.created_at as string).getTime()) / 3_600_000;
  // Comments weighted higher than likes; gravity decay (Hacker-News style).
  return (likes + 2 * comments + 1) / Math.pow(ageHours + 2, 1.5);
}

async function getTrendingCandidates(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
): Promise<Record<string, unknown>[]> {
  if (trendingCache && Date.now() - trendingCache.at < TRENDING_TTL_MS) {
    return trendingCache.rows;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Global candidate window (no per-user block filter — applied after the cache).
  const { data: rows } = await supabase
    .from("community_posts")
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .eq("is_hidden", false)
    .is("group_id", null)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(300);

  const now = Date.now();
  const scored = [...((rows ?? []) as Record<string, unknown>[])]
    .sort((a, b) => hotScore(b, now) - hotScore(a, now))
    .slice(0, TRENDING_KEEP);

  trendingCache = { rows: scored, at: Date.now() };
  return scored;
}

export async function fetchTrendingPostsAction(): Promise<{
  posts: CommunityPost[];
}> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [candidates, blockedIds] = await Promise.all([
    getTrendingCandidates(supabase),
    fetchBlockedIds(supabase, user?.id),
  ]);

  if (!candidates.length) return { posts: [] };

  const blocked = new Set(blockedIds);
  const sorted = candidates
    .filter((r) => !blocked.has(r.user_id as string))
    .slice(0, 20);

  const posts = await enrichPosts(supabase, sorted, user?.id);
  return { posts };
}


// ─── Feed (user profile) ─────────────────────────────────────────────────────

export async function fetchPostsByUserAction(
  userId: string,
  cursor?: string,
): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A4 — if either side has blocked the other, the entire profile is hidden.
  if (user && user.id !== userId) {
    const blockedIds = await fetchBlockedIds(supabase, user.id);
    if (blockedIds.includes(userId)) return { posts: [], nextCursor: null };
  }

  let query = supabase
    .from("community_posts")
    .select(
      "*, likes:community_likes(count), comments:community_comments(count)",
    )
    .eq("is_hidden", false)
    // A3 — a profile feed must never surface the user's private-group posts to a
    // non-member; public posts only (group views gate on canAccessGroup separately).
    .is("group_id", null)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // B1 — hide anonymous posts on someone else's profile, otherwise the profile
  // page itself de-anonymises them. Owner still sees their own anonymous posts.
  if (user?.id !== userId) {
    query = query.eq("is_anonymous", false);
  }

  if (cursor) query = query.lt("created_at", cursor);
  const { data: rows, error } = await query;
  if (error || !rows) return { posts: [], nextCursor: null };

  const posts = await enrichPosts(
    supabase,
    rows as Record<string, unknown>[],
    user?.id,
  );
  return {
    posts,
    nextCursor:
      rows.length === 20 ? (rows[rows.length - 1].created_at as string) : null,
  };
}


// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchPostsAction(
  query: string,
  topicFilter?: TopicTag,
): Promise<{ posts: CommunityPost[] }> {
  if (!query.trim() && !topicFilter) return { posts: [] };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const blockedIds = await fetchBlockedIds(supabase, user?.id);

  let q = supabase
    .from("community_posts")
    .select(
      "*, likes:community_likes(count), comments:community_comments(count)",
    )
    .eq("is_hidden", false)
    // A3 — search must not leak private-group post bodies to non-members; restrict
    // to public posts (group-internal posts are reachable only inside the group).
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(30);

  // I1 — escape PostgREST LIKE wildcards so user input is treated literally.
  if (query.trim()) {
    const safe = query.trim().replace(/[\\%_]/g, "\\$&");
    q = q.ilike("content", `%${safe}%`);
  }
  if (topicFilter) q = q.eq("topic_tag", topicFilter);
  // A4 — exclude blocked relationships from search results.
  if (blockedIds.length)
    q = q.not("user_id", "in", `(${blockedIds.join(",")})`);

  const { data: rows } = await q;
  if (!rows?.length) return { posts: [] };
  const posts = await enrichPosts(
    supabase,
    rows as Record<string, unknown>[],
    user?.id,
  );
  return { posts };
}


// ─── Saved posts ──────────────────────────────────────────────────────────────

export async function fetchSavedPostsAction(
  cursor?: string,
): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { posts: [], nextCursor: null };

  let savesQuery = supabase
    .from("community_saves")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (cursor) savesQuery = savesQuery.lt("created_at", cursor);
  const { data: saves } = await savesQuery;
  if (!saves?.length) return { posts: [], nextCursor: null };

  const postIds = saves.map((s) => s.post_id as string);
  const { data: rows } = await supabase
    .from("community_posts")
    .select(
      "*, likes:community_likes(count), comments:community_comments(count)",
    )
    .eq("is_hidden", false)
    .in("id", postIds);

  if (!rows?.length) return { posts: [], nextCursor: null };

  const postMap = new Map(
    (rows as Record<string, unknown>[]).map((r) => [r.id as string, r]),
  );
  const orderedRows = postIds
    .map((id) => postMap.get(id))
    .filter(Boolean) as Record<string, unknown>[];

  const posts = await enrichPosts(supabase, orderedRows, user.id);
  const nextCursor =
    saves.length === 20 ? (saves[saves.length - 1].created_at as string) : null;
  return { posts, nextCursor };
}


// ─── Topic Stats (for sidebar) ───────────────────────────────────────────────

export async function fetchTopicStatsAction(): Promise<
  { tag: TopicTag; count: number }[]
> {
  const supabase = await createSupabaseServer();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from("community_posts")
    .select("topic_tag")
    .eq("is_hidden", false)
    .gte("created_at", sevenDaysAgo);

  if (!data?.length) return [];

  const counts = new Map<TopicTag, number>();
  for (const row of data) {
    const tag = row.topic_tag as TopicTag;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}
