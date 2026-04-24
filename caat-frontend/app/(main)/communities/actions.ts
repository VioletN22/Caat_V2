"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import type { CommunityPost, CommunityComment, NotificationItem, PostAuthor, TopicTag, ResultCard, ScoreCard, PrivacySettings, CommunityProfileData } from "@/types/community";

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

export async function fetchPostsAction(
  cursor?: string,
  followingOnly?: boolean
): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
  const supabase = await createSupabaseServer();

  // For the following tab, scope to followee user IDs
  let followeeIds: string[] | null = null;
  if (followingOnly) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { posts: [], nextCursor: null };
    const { data: follows } = await supabase
      .from("community_follows")
      .select("followee_id")
      .eq("follower_id", user.id);
    followeeIds = (follows ?? []).map((f) => f.followee_id);
    if (followeeIds.length === 0) return { posts: [], nextCursor: null };
  }

  let query = supabase
    .from("community_posts")
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (cursor) query = query.lt("created_at", cursor);
  if (followeeIds) query = query.in("user_id", followeeIds);

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

// ─── Feed (with followingOnly support) ───────────────────────────────────────

export async function fetchPostsByUserAction(
  userId: string,
  cursor?: string
): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("community_posts")
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .eq("is_hidden", false)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (cursor) query = query.lt("created_at", cursor);

  const { data: rows, error } = await query;
  if (error || !rows) return { posts: [], nextCursor: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", userId)
    .single();

  const posts: CommunityPost[] = rows.map((row) => ({
    ...row,
    likes_count: (row.likes as { count: number }[])[0]?.count ?? 0,
    comments_count: (row.comments as { count: number }[])[0]?.count ?? 0,
    author: profile ?? null,
  }));

  return {
    posts,
    nextCursor: rows.length === 20 ? rows[rows.length - 1].created_at : null,
  };
}

// ─── Follows ─────────────────────────────────────────────────────────────────

export async function followUserAction(
  targetUserId: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (user.id === targetUserId) return { error: "Cannot follow yourself" };

  await supabase
    .from("community_follows")
    .insert({ follower_id: user.id, followee_id: targetUserId });
  return { error: null };
}

export async function unfollowUserAction(
  targetUserId: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  await supabase
    .from("community_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", targetUserId);
  return { error: null };
}

// ─── Privacy settings ────────────────────────────────────────────────────────

export async function updatePrivacySettingsAction(
  settings: PrivacySettings
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("community_profile_settings")
    .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() });

  return { error: error?.message ?? null };
}

// ─── Community profile data ───────────────────────────────────────────────────

export async function fetchCommunityProfileAction(
  targetUserId: string
): Promise<{ profile: CommunityProfileData | null; error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileResult, settingsResult, followerResult, followingResult, isFollowingResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, graduation_year, school_name, preferred_countries, target_majors")
        .eq("id", targetUserId)
        .single(),
      supabase
        .from("community_profile_settings")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle(),
      supabase
        .from("community_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("followee_id", targetUserId),
      supabase
        .from("community_follows")
        .select("followee_id", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
      user
        ? supabase
            .from("community_follows")
            .select("followee_id")
            .eq("follower_id", user.id)
            .eq("followee_id", targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (!profileResult.data) return { profile: null, error: "User not found" };

  const p = profileResult.data;
  const s = settingsResult.data ?? {
    show_graduation_year: true,
    show_school_name: true,
    show_preferred_countries: false,
    show_target_majors: false,
  };

  const profile: CommunityProfileData = {
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    avatar_url: p.avatar_url,
    graduation_year: s.show_graduation_year ? p.graduation_year : null,
    school_name: s.show_school_name ? p.school_name : null,
    preferred_countries: s.show_preferred_countries ? (p.preferred_countries ?? []) : [],
    target_majors: s.show_target_majors ? (p.target_majors ?? []) : [],
    follower_count: followerResult.count ?? 0,
    following_count: followingResult.count ?? 0,
    is_following: !!isFollowingResult.data,
    is_own_profile: user?.id === targetUserId,
    privacy: {
      show_graduation_year: s.show_graduation_year,
      show_school_name: s.show_school_name,
      show_preferred_countries: s.show_preferred_countries,
      show_target_majors: s.show_target_majors,
    },
  };

  return { profile, error: null };
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export async function toggleLikeAction(
  postId: string
): Promise<{ liked: boolean; error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("community_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    return { liked: false, error: null };
  }

  await supabase
    .from("community_likes")
    .insert({ post_id: postId, user_id: user.id });

  // Notify post author (not if self-like)
  const { data: post } = await supabase
    .from("community_posts")
    .select("user_id")
    .eq("id", postId)
    .single();
  if (post && post.user_id !== user.id) {
    await supabase.from("notifications").insert({
      user_id: post.user_id,
      actor_id: user.id,
      type: "like",
      post_id: postId,
    });
  }

  return { liked: true, error: null };
}

// ─── Saves ───────────────────────────────────────────────────────────────────

export async function toggleSaveAction(
  postId: string
): Promise<{ saved: boolean; error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("community_saves")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("community_saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    return { saved: false, error: null };
  }

  await supabase
    .from("community_saves")
    .insert({ post_id: postId, user_id: user.id });
  return { saved: true, error: null };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function fetchCommentsAction(
  postId: string
): Promise<{ comments: CommunityComment[]; error: string | null }> {
  const supabase = await createSupabaseServer();

  const { data: rows, error } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error || !rows) return { comments: [], error: error?.message ?? "Failed to load" };

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map<string, PostAuthor>(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Build flat list then nest replies under parents
  const allComments: CommunityComment[] = rows.map((row) => ({
    ...row,
    author: profileMap.get(row.user_id) ?? null,
    replies: [],
  }));

  const topLevel: CommunityComment[] = [];
  const byId = new Map(allComments.map((c) => [c.id, c]));

  for (const comment of allComments) {
    if (comment.parent_comment_id) {
      byId.get(comment.parent_comment_id)?.replies.push(comment);
    } else {
      topLevel.push(comment);
    }
  }

  return { comments: topLevel, error: null };
}

export async function addCommentAction(
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<{ comment: CommunityComment | null; error: string | null }> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { comment: null, error: "Not signed in" };

  const text = content.trim();
  if (!text) return { comment: null, error: "Comment cannot be empty" };
  if (text.length > 1000) return { comment: null, error: "Comment too long" };

  const { data: row, error: insertError } = await supabase
    .from("community_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content: text,
      parent_comment_id: parentCommentId ?? null,
    })
    .select("*")
    .single();

  if (insertError || !row) return { comment: null, error: "Failed to post comment" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Notify post author if not the commenter
  const { data: post } = await supabase
    .from("community_posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (post && post.user_id !== user.id) {
    await supabase.from("notifications").insert({
      user_id: post.user_id,
      actor_id: user.id,
      type: parentCommentId ? "reply" : "comment",
      post_id: postId,
      comment_id: row.id,
    });
  }

  // For replies: also notify the parent comment author if different from post author and self
  if (parentCommentId) {
    const { data: parentComment } = await supabase
      .from("community_comments")
      .select("user_id")
      .eq("id", parentCommentId)
      .single();
    if (
      parentComment &&
      parentComment.user_id !== user.id &&
      parentComment.user_id !== post?.user_id
    ) {
      await supabase.from("notifications").insert({
        user_id: parentComment.user_id,
        actor_id: user.id,
        type: "reply",
        post_id: postId,
        comment_id: row.id,
      });
    }
  }

  const comment: CommunityComment = {
    ...row,
    author: profile ?? null,
    replies: [],
  };

  return { comment, error: null };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotificationsAction(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  const { data: rows } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!rows?.length) return { notifications: [], unreadCount: 0 };

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const postIds  = [...new Set(rows.map((r) => r.post_id))];

  const [profilesResult, postsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .in("id", actorIds),
    supabase
      .from("community_posts")
      .select("id, content")
      .in("id", postIds),
  ]);

  const actorMap = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id,
      {
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Someone",
        avatar: p.avatar_url as string | null,
      },
    ])
  );
  const postMap = new Map(
    (postsResult.data ?? []).map((p) => [p.id, (p.content as string).slice(0, 60)])
  );

  const notifications: NotificationItem[] = rows.map((row) => ({
    id: row.id,
    type: row.type as NotificationItem["type"],
    actor_name: actorMap.get(row.actor_id)?.name ?? "Someone",
    actor_avatar: actorMap.get(row.actor_id)?.avatar ?? null,
    post_id: row.post_id,
    post_snippet: postMap.get(row.post_id) ?? "",
    is_read: row.is_read,
    created_at: row.created_at,
  }));

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount };
}

export async function markNotificationsReadAction(): Promise<void> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}
