import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { createSupabaseServer } from "@/lib/supabase-server";
import { PostCard } from "@/components/communities/PostCard";
import type { CommunityPost, PostAuthor } from "@/types/community";

interface Props {
  params: Promise<{ postId: string }>;
}

export default async function SinglePostPage({ params }: Props) {
  const { postId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from("community_posts")
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .eq("id", postId)
    .eq("is_hidden", false)
    .single();

  if (error || !row) notFound();

  const userIds = [...new Set([row.user_id as string, ...(user ? [user.id] : [])])];
  const resumeId = (row.resume_link as string | null) ?? null;

  // C9: these four reads all depend only on the post row (not on each other),
  // so run them concurrently instead of in sequence.
  // Profiles goes through get_public_profiles for the same RLS reason as
  // enrichPosts: profiles is owner-read-only, so a direct .in("id", ...) returns
  // nothing for the post author when the viewer isn't them (communities_v8).
  const [profilesResult, likedResult, savedResult, resumeResult] = await Promise.all([
    supabase.rpc("get_public_profiles", { user_ids: userIds }),
    user
      ? supabase.from("community_likes").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("community_saves").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle()
      : Promise.resolve({ data: null }),
    resumeId
      ? supabase.from("resumes").select("title").eq("id", resumeId).single()
      : Promise.resolve({ data: null }),
  ]);

  const profileMap = new Map<string, PostAuthor>(
    ((profilesResult.data ?? []) as PostAuthor[]).map((p) => [p.id, p])
  );
  const resumeRow = resumeResult.data;

  // B1 — anonymise user_id and null the author when the viewer is not the
  // post owner. Owner still sees their real id so they can edit/delete.
  const isAnon = (row.is_anonymous as boolean | null) ?? false;
  const isOwnPost = !!user && user.id === row.user_id;
  const exposedUserId = isAnon && !isOwnPost ? `anon:${row.id}` : (row.user_id as string);
  const post: CommunityPost = {
    ...(row as unknown as CommunityPost),
    user_id: exposedUserId,
    resume_id: resumeId,
    resume_title: (resumeRow as { title: string } | null)?.title ?? null,
    likes_count: (row.likes as { count: number }[])[0]?.count ?? 0,
    comments_count: (row.comments as { count: number }[])[0]?.count ?? 0,
    author: isAnon ? null : (profileMap.get(row.user_id) ?? null),
  };

  const currentUser = user ? (profileMap.get(user.id) ?? null) : null;

  return (
    <>
      <PageHeader title="Community Campus" />
      <div className="p-6">
        <main className="max-w-2xl mx-auto">
          <PostCard
            post={post}
            currentUser={currentUser}
            initialIsLiked={!!likedResult.data}
            initialIsSaved={!!savedResult.data}
          />
        </main>
      </div>
    </>
  );
}
