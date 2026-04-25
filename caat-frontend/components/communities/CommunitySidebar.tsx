import Link from "next/link";
import { Users, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FollowButton } from "./FollowButton";
import { getInitials } from "@/lib/user-utils";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  fetchRecommendedUsersAction,
  fetchTopicStatsAction,
} from "@/app/(main)/communities/actions";
import { TOPIC_LABELS } from "@/types/community";
import type { PostAuthor, TopicTag } from "@/types/community";
import { cn } from "@/lib/utils";

const TOPIC_COLORS: Record<TopicTag, string> = {
  APPLICATION_RESULTS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ESSAYS:              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TEST_SCORES:         "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  EXTRACURRICULARS:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ADVICE:              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  SCHOLARSHIPS:        "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

interface CommunitySidebarProps {
  currentUser: PostAuthor | null;
}

export async function CommunitySidebar({ currentUser }: CommunitySidebarProps) {
  const supabase = await createSupabaseServer();

  const [topicStats, recommendedUsers, followerResult, followingResult, postCountResult] =
    await Promise.all([
      fetchTopicStatsAction(),
      fetchRecommendedUsersAction().then((r) => r.users),
      currentUser
        ? supabase.from("community_follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", currentUser.id)
        : Promise.resolve({ count: 0 }),
      currentUser
        ? supabase.from("community_follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", currentUser.id)
        : Promise.resolve({ count: 0 }),
      currentUser
        ? supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("is_hidden", false)
        : Promise.resolve({ count: 0 }),
    ]);

  const followerCount  = (followerResult as { count: number | null }).count ?? 0;
  const followingCount = (followingResult as { count: number | null }).count ?? 0;
  const postCount      = (postCountResult as { count: number | null }).count ?? 0;
  const weeklyTotal    = topicStats.reduce((sum, t) => sum + t.count, 0);
  const displayName    = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") || "Anonymous"
    : null;

  return (
    <div className="space-y-4">

      {/* Mini profile card */}
      {currentUser && displayName && (
        <div className="rounded-xl border p-4 space-y-3">
          <Link
            href={`/communities/profile/${currentUser.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={currentUser.avatar_url ?? undefined} alt={displayName} />
              <AvatarFallback className="text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">View your profile</p>
            </div>
          </Link>
          <Separator />
          <div className="flex justify-between text-center">
            <div>
              <p className="text-sm font-semibold">{postCount}</p>
              <p className="text-[11px] text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{followerCount}</p>
              <p className="text-[11px] text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{followingCount}</p>
              <p className="text-[11px] text-muted-foreground">Following</p>
            </div>
          </div>
        </div>
      )}

      {/* Who to follow */}
      {recommendedUsers.length > 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who to follow</p>
          </div>
          <div className="space-y-3">
            {recommendedUsers.slice(0, 3).map((u) => {
              const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Anonymous";
              return (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Link href={`/communities/profile/${u.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={u.avatar_url ?? undefined} alt={name} />
                      <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{name}</span>
                  </Link>
                  <FollowButton targetUserId={u.id} initialIsFollowing={false} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trending topics */}
      {topicStats.length > 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This week</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{weeklyTotal} post{weeklyTotal !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {topicStats.map(({ tag, count }) => (
              <div key={tag} className="flex items-center justify-between gap-2">
                <Badge
                  className={cn("text-[11px] font-medium border-0", TOPIC_COLORS[tag])}
                >
                  {TOPIC_LABELS[tag]}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">{count} post{count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
