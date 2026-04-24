import { PageHeader } from "@/components/PageHeader";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { CommunityPost, PostAuthor } from "@/types/community";
import { CommunityFeedClient } from "./CommunityFeedClient";

export default async function CommunitiesPage() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch initial 20 posts
  const { data: rows, error } = await supabase
    .from("community_posts")
    .select("*, likes:community_likes(count), comments:community_comments(count)")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return (
      <>
        <PageHeader title="Communities" />
        <div className="p-6 text-red-500 text-sm">
          Unable to load posts. Please try again later.
        </div>
      </>
    );
  }

  // Fetch all author profiles for this batch + current user's profile in one query
  const postUserIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  const allUserIds = user ? [...new Set([...postUserIds, user.id])] : postUserIds;

  const { data: profiles } = allUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", allUserIds)
    : { data: [] };

  const profileMap = new Map<string, PostAuthor>(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const posts: CommunityPost[] = (rows ?? []).map((row) => ({
    ...row,
    likes_count: (row.likes as { count: number }[])[0]?.count ?? 0,
    comments_count: (row.comments as { count: number }[])[0]?.count ?? 0,
    author: profileMap.get(row.user_id) ?? null,
  }));

  const initialCursor =
    posts.length === 20 ? posts[posts.length - 1].created_at : null;

  const currentUser = user ? (profileMap.get(user.id) ?? null) : null;

  return (
    <>
      <PageHeader title="Communities" />
      <div className="p-6">
        <main className="max-w-2xl mx-auto">
          <CommunityFeedClient
            initialPosts={posts}
            initialCursor={initialCursor}
            currentUser={currentUser}
          />
        </main>
      </div>
    </>
  );
}
