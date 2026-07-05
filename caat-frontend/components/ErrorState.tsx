"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** What failed, in plain language. Distinct from an empty state. */
  message?: string;
  /** Retry handler. When present, a "Try again" button is shown. */
  onRetry?: () => void;
  /** Compact variant for inside widgets/cards. */
  compact?: boolean;
  className?: string;
}

/**
 * Shared fetch-failure state: a clear error message plus an optional retry,
 * used everywhere a load can fail so an outage never masquerades as an empty
 * account. Keep this visually distinct from empty states.
 */
export function ErrorState({
  message = "Something went wrong while loading this. Please try again.",
  onRetry,
  compact = false,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        compact ? "py-8" : "py-14"
      } ${className}`}
    >
      <AlertTriangle
        className={`text-destructive ${compact ? "h-6 w-6" : "h-8 w-8"}`}
        aria-hidden
      />
      <p
        className={`text-muted-foreground max-w-sm ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
