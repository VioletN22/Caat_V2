"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  followUserAction,
  unfollowUserAction,
} from "@/app/(main)/communities/actions";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
}: FollowButtonProps) {
  const [, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useOptimistic(
    initialIsFollowing,
    (_, next: boolean) => next,
  );

  function handleClick() {
    startTransition(async () => {
      setIsFollowing(!isFollowing);
      const action = isFollowing ? unfollowUserAction : followUserAction;
      const { error } = await action(targetUserId);
      if (error) toast.error(error);
    });
  }

  // Use the iconic CAAT red (#9a1a27). The "Follow" state is solid red with
  // white text; the "Following" state is an outlined red ghost so it reads
  // as a toggleable, secondary state.
  const baseClasses = "min-w-[90px] transition-colors";
  const followClasses =
    "bg-[#9a1a27] text-white border border-[#9a1a27] hover:bg-white hover:text-[#9a1a27]";
  const followingClasses =
    "bg-white text-[#9a1a27] border border-[#9a1a27] hover:bg-[#9a1a27] hover:text-white";

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={handleClick}
      className={`${baseClasses} ${isFollowing ? followingClasses : followClasses}`}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
