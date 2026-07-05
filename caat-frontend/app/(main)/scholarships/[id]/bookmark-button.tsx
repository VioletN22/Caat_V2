"use client";

import SharedBookmarkButton from "@/components/BookmarkButton";

interface Props {
  scholarshipId: string;
}

export default function ScholarshipBookmarkButton({ scholarshipId }: Props) {
  return (
    <SharedBookmarkButton
      table="user_bookmarked_scholarships"
      column="scholarship_id"
      id={scholarshipId}
      label="scholarship"
    />
  );
}
