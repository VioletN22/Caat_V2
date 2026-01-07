//components/dashboard/api.ts
import { supabase } from "@/src/lib/supabaseClient";

export async function getWidgetsFromDB(user_id: string) {
  const { data: widgets, error } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .order("section", { ascending: true })
    .order("ordering", { ascending: true });

  if (error) throw error;

  if (widgets.length === 0) {
    const defaultWidgets = [
      { widget_key: "To-Do List", icon: "list_todo", section: "main", ordering: 1, user_id: user_id },
      { widget_key: "Calendar", icon: "calendar", section: "active", ordering: 1, user_id: user_id },
      { widget_key: "News", icon: "news", section: "active", ordering: 2, user_id: user_id },
      { widget_key: "Schools", icon: "university", section: "active", ordering: 3, user_id: user_id }
    ];
    await supabase.from("dashboard_layouts").insert(defaultWidgets);
    return defaultWidgets;
}
  return widgets;
}
