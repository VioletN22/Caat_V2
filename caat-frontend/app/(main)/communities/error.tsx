"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";

export default function CommunitiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Community Campus" />
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <ErrorState
            message="We couldn't load the community right now. Please try again."
            onRetry={reset}
          />
        </div>
      </div>
    </>
  );
}
