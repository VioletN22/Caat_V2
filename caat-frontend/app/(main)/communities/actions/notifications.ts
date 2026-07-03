"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { htmlToText } from "@/lib/sanitize-html";
import type { NotificationItem } from "@/types/community";


// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotificationsAction(
  limit = 20,
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  const { data: rows } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows?.length) return { notifications: [], unreadCount: 0 };

  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id as string).filter(Boolean)),
  ];
  const postIds = [
    ...new Set(rows.map((r) => r.post_id as string).filter(Boolean)),
  ];

  const [profilesResult, postsResult] = await Promise.all([
    actorIds.length
      ? supabase.rpc("get_public_profiles", { user_ids: actorIds })
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("community_posts").select("id, content").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const actorMap = new Map(
    (
      (profilesResult.data ?? []) as {
        id: string;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      }[]
    ).map((p) => [
      p.id,
      {
        name:
          [p.first_name, p.last_name].filter(Boolean).join(" ") || "Someone",
        avatar: p.avatar_url,
      },
    ]),
  );
  const postMap = new Map(
    ((postsResult.data ?? []) as { id: string; content: string }[]).map((p) => [
      p.id,
      htmlToText(p.content).slice(0, 60),
    ]),
  );

  const notifications: NotificationItem[] = rows.map((row) => ({
    id: row.id as string,
    type: row.type as NotificationItem["type"],
    actor_id: (row.actor_id as string | null) ?? null,
    actor_name: actorMap.get(row.actor_id as string)?.name ?? "Someone",
    actor_avatar: actorMap.get(row.actor_id as string)?.avatar ?? null,
    post_id: (row.post_id as string | null) ?? null,
    post_snippet: postMap.get(row.post_id as string) ?? "",
    is_read: row.is_read as boolean,
    created_at: row.created_at as string,
  }));

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.is_read).length,
  };
}


export async function markNotificationsReadAction(): Promise<void> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}
