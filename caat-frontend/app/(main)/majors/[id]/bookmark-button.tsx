"use client";

import SharedBookmarkButton from "@/components/BookmarkButton";

interface Props {
  majorId: string;
}

export default function BookmarkButton({ majorId }: Props) {
  return (
    <SharedBookmarkButton
      table="user_bookmarked_majors"
      column="major_id"
      id={majorId}
      label="major"
    />
  );
}
