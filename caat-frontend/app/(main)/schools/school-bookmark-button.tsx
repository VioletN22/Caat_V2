"use client";

import SharedBookmarkButton from "@/components/BookmarkButton";
import { SCHOOL_BOOKMARK_EVENT } from "./schools-client";

interface Props {
  schoolId: number;
  /** When true, renders a small icon button suitable for list card footers */
  compact?: boolean;
}

export default function SchoolBookmarkButton({ schoolId, compact = false }: Props) {
  return (
    <SharedBookmarkButton
      table="user_bookmarked_schools"
      column="school_id"
      id={schoolId}
      label="school"
      compact={compact}
      iconSize="h-4 w-4"
      onToggle={(delta) =>
        window.dispatchEvent(
          new CustomEvent(SCHOOL_BOOKMARK_EVENT, { detail: delta })
        )
      }
    />
  );
}
