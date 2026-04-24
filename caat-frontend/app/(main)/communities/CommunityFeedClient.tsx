"use client";

import { useState, useTransition, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { PostCard } from "@/components/communities/PostCard";
import { CreatePostForm } from "@/components/communities/CreatePostForm";
import { FeedTabs } from "@/components/communities/FeedTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPostsAction } from "./actions";
import type { CommunityPost, PostAuthor } from "@/types/community";

type FeedTab = "all" | "following";

interface CommunityFeedClientProps {
  initialPosts: CommunityPost[];
  initialCursor: string | null;
  currentUser: PostAuthor | null;
  initialLikedIds: string[];
  initialSavedIds: string[];
}

function PostSkeleton() {
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3.5 w-3/5" />
    </div>
  );
}

export function CommunityFeedClient({
  initialPosts,
  initialCursor,
  currentUser,
  initialLikedIds,
  initialSavedIds,
}: CommunityFeedClientProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [likedIds] = useState<Set<string>>(new Set(initialLikedIds));
  const [savedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { ref, inView } = useInView({ threshold: 0.1 });

  // Load more on scroll
  useEffect(() => {
    if (!inView || !cursor || isPending) return;
    startTransition(async () => {
      const { posts: newPosts, nextCursor } = await fetchPostsAction(
        cursor,
        activeTab === "following"
      );
      setPosts((prev) => [...prev, ...newPosts]);
      setCursor(nextCursor);
    });
  }, [inView, cursor, isPending, activeTab]);

  // Switch tabs — reset feed and fetch fresh
  async function handleTabChange(tab: FeedTab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setIsTabLoading(true);
    setPosts([]);
    setCursor(null);
    const { posts: fresh, nextCursor } = await fetchPostsAction(
      undefined,
      tab === "following"
    );
    setPosts(fresh);
    setCursor(nextCursor);
    setIsTabLoading(false);
  }

  function handlePostCreated(post: CommunityPost) {
    if (activeTab === "all") setPosts((prev) => [post, ...prev]);
  }

  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="space-y-4">
      <CreatePostForm currentUser={currentUser} onPostCreated={handlePostCreated} />

      <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {isTabLoading ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          {activeTab === "following" ? (
            <>
              <p className="text-lg font-medium">No posts from people you follow</p>
              <p className="text-sm mt-1">Find people to follow by visiting their profiles.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No posts yet</p>
              <p className="text-sm mt-1">Be the first to share your experience.</p>
            </>
          )}
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            initialIsLiked={likedIds.has(post.id)}
            initialIsSaved={savedIds.has(post.id)}
            onPostDeleted={handlePostDeleted}
          />
        ))
      )}

      {cursor && !isTabLoading && (
        <div ref={ref} className="space-y-4">
          {isPending && <><PostSkeleton /><PostSkeleton /></>}
        </div>
      )}

      {!cursor && posts.length > 0 && !isTabLoading && (
        <p className="text-center text-xs text-muted-foreground py-6">
          You&apos;ve reached the end
        </p>
      )}
    </div>
  );
}
