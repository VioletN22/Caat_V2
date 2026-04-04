"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CalendarWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, event_date")
        .eq("user_id", user.id)
        .order("event_date", { ascending: true });

      if (error) {
        toast.error("Could not load calendar events.");
        return;
      }
      setEvents((data ?? []) as CalendarEvent[]);
    }

    load();
  }, []);

  const selectedKey = date ? toDateKey(date) : null;
  const eventsForDay = events.filter((e) => e.event_date === selectedKey);
  const datesWithEvents = new Set(events.map((e) => e.event_date));

  async function handleAddEvent() {
    if (!newTitle.trim() || !date) return;
    setAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated.");
      setAdding(false);
      return;
    }

    const eventDate = toDateKey(date);
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({ user_id: user.id, title: newTitle.trim(), event_date: eventDate })
      .select("id, title, event_date")
      .single();

    if (error || !data) {
      toast.error("Could not save event.");
    } else {
      setEvents((prev) => [...prev, data as CalendarEvent]);
      setNewTitle("");
    }
    setAdding(false);
  }

  async function handleDeleteEvent(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not delete event.");
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md"
        modifiers={{
          hasEvent: (d) => datesWithEvents.has(toDateKey(d)),
        }}
        modifiersClassNames={{
          hasEvent: "underline decoration-primary decoration-2",
        }}
      />

      {date && (
        <div className="space-y-2 px-1">
          <p className="text-xs font-medium text-muted-foreground">
            {date.toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>

          {eventsForDay.length > 0 && (
            <ul className="space-y-1">
              {eventsForDay.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{ev.title}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                    aria-label="Delete event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Add event..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddEvent(); }}
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 shrink-0"
              onClick={handleAddEvent}
              disabled={adding || !newTitle.trim()}
              aria-label="Add event"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
