"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "@/app/(main)/communities/actions";

/**
 * M3 — mark notifications read only on an actual view (client mount), not during
 * server render. Server rendering (including router prefetch) previously zeroed
 * the unread badge before the user ever saw the page.
 */
export function MarkNotificationsRead() {
  useEffect(() => {
    markNotificationsReadAction().catch(() => {});
  }, []);
  return null;
}
