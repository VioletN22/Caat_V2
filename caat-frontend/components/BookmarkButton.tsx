"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthContext";
import { toast } from "sonner";

type BookmarkTable =
  | "user_bookmarked_majors"
  | "user_bookmarked_scholarships"
  | "user_bookmarked_schools";

interface BookmarkButtonProps {
  /** The bookmark join table for this entity. */
  table: BookmarkTable;
  /** The entity id column on that table (e.g. "major_id"). */
  column: string;
  /** The entity id value. */
  id: string | number;
  /** Singular noun used in the aria-label and sign-in toast (e.g. "major"). */
  label: string;
  /** List-card variant: smaller button + tooltip. */
  compact?: boolean;
  /** Extra size classes for the icon when not compact (schools uses "h-4 w-4"). */
  iconSize?: string;
  /** Called with +1 on bookmark and -1 on un-bookmark, after the write succeeds. */
  onToggle?: (delta: 1 | -1) => void;
  /**
   * Initial bookmarked state resolved server-side. When provided, the button
   * skips its per-mount `getUser()` + per-card bookmark query, which removes the
   * N+1 request storm on list pages (C2). The signed-in user still comes from
   * AuthContext (one shared call) so the toggle works.
   */
  initialBookmarked?: boolean;
}

/**
 * Shared bookmark toggle button for majors, scholarships and schools. Optimistic
 * toggle with rollback + error toast on failure. Preserves the per-entity
 * behavior the three original buttons had (labels, sizing, schools' list event).
 */
export default function BookmarkButton({
  table,
  column,
  id,
  label,
  compact = false,
  iconSize,
  onToggle,
  initialBookmarked,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked ?? false);
  // The user is resolved once, app-wide, by AuthProvider — no per-card getUser.
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Only fetch the initial bookmark state when the caller did not provide it.
  // List pages pass `initialBookmarked` (resolved in one server query), so this
  // effect is skipped there and the N+1 per-card query disappears (C2).
  const skipInitialFetch = initialBookmarked !== undefined;
  useEffect(() => {
    if (skipInitialFetch || !userId) return;
    let active = true;
    supabase
      .from(table)
      .select(column)
      .eq("user_id", userId)
      .eq(column, id as never)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsBookmarked(!!data);
      });
    return () => {
      active = false;
    };
  }, [table, column, id, userId, skipInitialFetch]);

  async function handleToggle() {
    if (!userId) {
      toast.error(`Sign in to bookmark ${label}s.`);
      return;
    }

    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      if (prev) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", userId)
          .eq(column, id as never);
        if (error) throw error;
        onToggle?.(-1);
      } else {
        const { error } = await supabase
          .from(table)
          .upsert({ user_id: userId, [column]: id } as never);
        if (error) throw error;
        onToggle?.(1);
      }
    } catch {
      setIsBookmarked(prev);
      toast.error("Failed to update bookmark. Please try again.");
    }
  }

  const button = (
    <Button
      size="icon"
      variant={isBookmarked ? "default" : "outline"}
      onClick={handleToggle}
      aria-label={isBookmarked ? "Remove bookmark" : `Bookmark ${label}`}
      className={compact ? "h-8 w-8" : undefined}
    >
      <Bookmark
        className={
          `${compact ? "h-3.5 w-3.5" : iconSize ?? ""} ${isBookmarked ? "fill-current" : ""}`.trim()
        }
      />
    </Button>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{isBookmarked ? "Remove bookmark" : "Bookmark"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
