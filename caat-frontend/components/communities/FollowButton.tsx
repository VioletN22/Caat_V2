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

  // Use the iconic CAAT red (#b81f2f). The "Follow" state is solid red with
  // white text; the "Following" state is an outlined red ghost so it reads
  // as a toggleable, secondary state.
  const baseClasses = "min-w-[90px] transition-colors";
  const followClasses =
    "bg-[#b81f2f] text-white border border-[#b81f2f] hover:bg-white hover:text-[#b81f2f]";
  const followingClasses =
    "bg-white text-[#b81f2f] border border-[#b81f2f] hover:bg-[#b81f2f] hover:text-white";

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
