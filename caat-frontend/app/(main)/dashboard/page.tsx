import { PageHeader } from "@/components/PageHeader";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { createServerClient } from "@/lib/supabase/server";
import type { PlacedWidget } from "@/components/dashboard/api";

// C6: resolve the saved widget layout on the server and hand it to the shell as
// initial data, replacing the hydrate -> getUser -> fetchDashboardWidgets client
// waterfall (and its full-page skeleton) so the dashboard paints its layout
// immediately. Widget mutations (add/remove/move/resize) stay client-side.
async function fetchWidgetLayout(): Promise<PlacedWidget[] | null> {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("user_dashboard_widgets")
    .select("id, widget_id, order, grid_x, grid_y, grid_w, grid_h")
    .eq("user_id", user.id)
    .order("order", { ascending: true });

  if (error) return null;

  return (data ?? []).map((row) => ({
    instanceId: row.id as string,
    widgetId: row.widget_id as string,
    order: row.order as number,
    gridX: row.grid_x != null ? (row.grid_x as number) : undefined,
    gridY: row.grid_y != null ? (row.grid_y as number) : undefined,
    gridW: row.grid_w != null ? (row.grid_w as number) : undefined,
    gridH: row.grid_h != null ? (row.grid_h as number) : undefined,
  }));
}

export default async function DashboardPage() {
  const initialWidgets = await fetchWidgetLayout();

  return (
    <>
      <PageHeader title="Dashboard" />
      <DashboardShell initialWidgets={initialWidgets} />
    </>
  );
}
