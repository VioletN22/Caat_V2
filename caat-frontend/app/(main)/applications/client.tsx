"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ClipboardList,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  fetchApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  searchSchools,
  fetchUnimportedBookmarkCount,
  importBookmarkedSchools,
  fetchGlobalReadinessSignals,
} from "./api";
import type { ApplicationRow, ApplicationStatus } from "@/types/applications";
import { STATUS_CONFIG, APPLICATION_STATUSES } from "@/types/applications";

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------
type FilterKey = "all" | "active" | "outcome";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "In Progress" },
  { key: "outcome", label: "Outcome" },
];

const ACTIVE_STATUSES = new Set<ApplicationStatus>([
  "researching",
  "applying",
  "submitted",
  "decision_pending",
]);
const OUTCOME_STATUSES = new Set<ApplicationStatus>([
  "accepted",
  "rejected",
  "waitlisted",
  "withdrawn",
]);

function matchesFilter(status: ApplicationStatus, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.has(status);
  return OUTCOME_STATUSES.has(status);
}

// ---------------------------------------------------------------------------
// Countdown helper
// ---------------------------------------------------------------------------
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Round, not ceil: a DST transition makes the span 23h or 25h, and ceil turns
  // a same-count day into an off-by-one. Round keeps the whole-day count stable.
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function deadlineLabel(dateStr: string) {
  const days = daysUntil(dateStr);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: "text-[#9a1a27]" };
  if (days === 0) return { text: "Today", color: "text-[#9a1a27]" };
  if (days <= 7) return { text: `${days}d`, color: "text-[#9a1a27]" };
  if (days <= 30) return { text: `${days}d`, color: "text-amber-500" };
  return { text: `${days}d`, color: "text-green-600 dark:text-green-400" };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ApplicationsClient() {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  // Add-school search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: number; name: string; country: string | null }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addingSchoolRef = useRef(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Bulk-import bookmarks bridge
  const [unimportedCount, setUnimportedCount] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  // Global readiness signals (any essay draft, any document) shared by every
  // card's readiness bar in v1; combined per-card with deadline + status.
  const [globalReady, setGlobalReady] = useState<{ essayDrafted: boolean; keyDocsUploaded: boolean }>({
    essayDrafted: false,
    keyDocsUploaded: false,
  });

  useEffect(() => {
    fetchApplications()
      .then(setApps)
      .catch(() => toast.error("Failed to load applications."))
      .finally(() => setLoading(false));
    fetchUnimportedBookmarkCount()
      .then(setUnimportedCount)
      .catch(() => setUnimportedCount(0));
    fetchGlobalReadinessSignals()
      .then(setGlobalReady)
      .catch(() => {});
  }, []);

  async function handleImportBookmarks() {
    if (importing) return;
    setImporting(true);
    try {
      const { added } = await importBookmarkedSchools();
      if (added.length === 0) {
        toast.info("All bookmarked schools are already in your applications.");
      } else {
        setApps((prev) => [...added, ...prev]);
        setFreshIds(new Set(added.map((a) => a.id)));
        const names = added.map((a) => a.schools?.name ?? "Unknown").join(", ");
        toast.success(
          `Added ${added.length} school${added.length === 1 ? "" : "s"} as Researching — ${names}`,
          { duration: 6000 }
        );
      }
      const newCount = await fetchUnimportedBookmarkCount();
      setUnimportedCount(newCount);
    } catch {
      toast.error("Failed to import bookmarks.");
    } finally {
      setImporting(false);
    }
  }

  // Debounced school search
  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchSchools(q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
        toast.error("School search failed. Please try again.");
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  async function handleAddSchool(schoolId: number) {
    // Check if already tracked
    if (apps.some((a) => a.school_id === schoolId)) {
      toast.info("This school is already in your applications.");
      return;
    }
    // In-flight guard: a rapid double-click would otherwise fire two
    // addApplication calls (the apps.some check hasn't updated yet), creating
    // a duplicate application.
    if (addingSchoolRef.current) return;
    addingSchoolRef.current = true;
    try {
      const row = await addApplication(schoolId);
      setApps((prev) => [row, ...prev]);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      toast.success("School added to applications.");
    } catch {
      toast.error("Failed to add school.");
    } finally {
      addingSchoolRef.current = false;
    }
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const prev = apps;
    setApps((cur) =>
      cur.map((a) => (a.id === id ? { ...a, status } : a))
    );
    try {
      await updateApplication(id, { status });
    } catch {
      toast.error("Failed to update status.");
      // Restore the pre-update snapshot instead of refetching: a refetch here
      // can itself throw (leaving an unhandled rejection) and drop other
      // in-flight optimistic edits.
      setApps(prev);
    }
  }

  async function handleDeadlineChange(id: string, deadline_at: string) {
    const value = deadline_at || null;
    const prev = apps;
    setApps((cur) =>
      cur.map((a) => (a.id === id ? { ...a, deadline_at: value } : a))
    );
    try {
      await updateApplication(id, { deadline_at: value });
    } catch {
      toast.error("Failed to update deadline.");
      setApps(prev);
    }
  }

  async function handleNotesChange(id: string, notes: string): Promise<boolean> {
    const value = notes || null;
    const prev = apps;
    setApps((cur) =>
      cur.map((a) => (a.id === id ? { ...a, notes: value } : a))
    );
    try {
      await updateApplication(id, { notes: value });
      return true;
    } catch {
      toast.error("Failed to update notes.");
      setApps(prev);
      return false;
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    const prev = apps;
    setApps((a) => a.filter((x) => x.id !== id));
    try {
      await deleteApplication(id);
      toast.success("Application removed.");
    } catch {
      setApps(prev);
      toast.error("Failed to remove application.");
    }
  }

  const filtered = useMemo(
    () => apps.filter((a) => matchesFilter(a.status, filter)),
    [apps, filter]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">My Applications</h1>
          <Badge variant="secondary" className="text-sm font-semibold">
            {apps.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unimportedCount !== null && unimportedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportBookmarks}
              disabled={importing}
              className="gap-1.5"
            >
              <Bookmark className="h-4 w-4" />
              Import from Bookmarks
              <span className="ml-1 inline-flex items-center justify-center text-[10px] font-semibold bg-[#9a1a27] text-white px-1.5 rounded-full leading-none py-0.5">
                {unimportedCount}
              </span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="gap-1.5 bg-[#9a1a27] text-white hover:bg-[#7d141f] border-[#9a1a27]"
          >
            <Plus className="h-4 w-4" />
            Add School
          </Button>
        </div>
      </div>

      {/* Add school search panel */}
      {showSearch && (
        <div className="mb-6 rounded-lg border bg-card p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search for a school by name..."
              className="pl-9"
              autoFocus
            />
          </div>
          {searching && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {searchResults.length > 0 && (
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {searchResults.map((school) => {
                const alreadyTracked = apps.some(
                  (a) => a.school_id === school.id
                );
                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => handleAddSchool(school.id)}
                    disabled={alreadyTracked}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      {school.name}
                      {school.country && (
                        <span className="text-muted-foreground ml-1.5">
                          · {school.country}
                        </span>
                      )}
                    </span>
                    {alreadyTracked ? (
                      <span className="text-xs text-muted-foreground">
                        Already tracked
                      </span>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {searchQuery && !searching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground">No schools found.</p>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors border ${
              filter === f.key
                ? "bg-[#9a1a27] text-white border-[#9a1a27]"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Applications list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-base font-medium text-muted-foreground">
            {apps.length === 0
              ? "No applications yet"
              : "No applications match this filter"}
          </p>
          {apps.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Click &quot;Add School&quot; to start tracking your first
              application.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              onDeadlineChange={handleDeadlineChange}
              onNotesChange={handleNotesChange}
              onDelete={handleDelete}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId}
              isFresh={freshIds.has(app.id)}
              globalReady={globalReady}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application card
// ---------------------------------------------------------------------------
function ApplicationCard({
  app,
  onStatusChange,
  onDeadlineChange,
  onNotesChange,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
  isFresh = false,
  globalReady,
}: {
  app: ApplicationRow;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDeadlineChange: (id: string, deadline: string) => void;
  onNotesChange: (id: string, notes: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isFresh?: boolean;
  globalReady: { essayDrafted: boolean; keyDocsUploaded: boolean };
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(app.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleNotesInput(val: string) {
    setLocalNotes(val);
    setNotesSaved(false);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      // B18 — mark Saved only once the write resolves; a failed save must not
      // display "Saved".
      const ok = await onNotesChange(app.id, val);
      setNotesSaved(ok);
    }, 800);
  }

  const schoolName = app.schools?.name ?? "Unknown School";
  const schoolCountry = app.schools?.country;
  const dl = app.deadline_at ? deadlineLabel(app.deadline_at) : null;

  // Readiness rollup (same 4 signals as the hub): deadline set, an essay
  // drafted, a document uploaded, status advanced to submitted-or-later.
  const SUBMITTED_PLUS = new Set<ApplicationStatus>([
    "submitted",
    "decision_pending",
    "accepted",
    "rejected",
    "waitlisted",
  ]);
  const readyScore =
    (app.deadline_at ? 1 : 0) +
    (globalReady.essayDrafted ? 1 : 0) +
    (globalReady.keyDocsUploaded ? 1 : 0) +
    (SUBMITTED_PLUS.has(app.status) ? 1 : 0);

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${isFresh ? "bg-[#FFF8E1] border-l-[3px] border-l-[#9a1a27]" : "bg-card"}`}>
      {/* Top row: school info + status + actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <Link
              href={`/schools/${app.school_id}`}
              className="text-sm font-semibold hover:underline underline-offset-2 flex items-center gap-1.5"
            >
              {isFresh && (
                <span className="text-[9px] font-bold uppercase tracking-wide bg-[#9a1a27] text-white px-1.5 py-0.5">
                  New
                </span>
              )}
              {schoolName}
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
            </Link>
            {schoolCountry && (
              <span className="text-xs text-muted-foreground">
                {schoolCountry}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Status select */}
          <div className="relative">
            <Select
              value={app.status}
              onValueChange={(v) => onStatusChange(app.id, v as ApplicationStatus)}
            >
              <SelectTrigger
                size="sm"
                className={`h-auto w-auto rounded-full px-3 py-1 text-xs font-medium border-0 gap-1 ${STATUS_CONFIG[app.status].className}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline */}
          <input
            type="date"
            value={app.deadline_at ?? ""}
            onChange={(e) => onDeadlineChange(app.id, e.target.value)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            title="Application deadline"
          />

          {/* Deadline countdown */}
          {dl && (
            <span className={`text-xs font-medium ${dl.color}`}>
              {dl.text}
            </span>
          )}

          {/* Notes toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-muted-foreground relative"
            onClick={() => setNotesOpen(!notesOpen)}
          >
            Notes
            {!notesOpen && localNotes.trim() && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </Button>

          {/* Delete */}
          {confirmDeleteId === app.id ? (
            <div className="flex items-center gap-1">
              <button
                className="h-7 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded transition-colors"
                onClick={() => onDelete(app.id)}
              >
                Confirm
              </button>
              <button
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded transition-colors"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteId(app.id)}
              className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              aria-label="Remove application"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notes section */}
      {notesOpen && (
        <div className="space-y-2">
          <textarea
            value={localNotes}
            onChange={(e) => handleNotesInput(e.target.value)}
            placeholder="Add notes about this application…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[60px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {notesSaved ? "Saved" : "Saving…"}
            </span>
            <div className="flex items-center gap-2">
              {localNotes.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                  onClick={async () => {
                    // Cancel any pending debounced save so it can't fire with
                    // the old text and re-add the notes we just cleared.
                    if (notesTimeout.current) clearTimeout(notesTimeout.current);
                    setLocalNotes("");
                    setNotesSaved(false);
                    const ok = await onNotesChange(app.id, "");
                    setNotesSaved(ok);
                  }}
                >
                  Clear Notes
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-3"
                onClick={async () => {
                  if (notesTimeout.current) clearTimeout(notesTimeout.current);
                  setNotesSaved(false);
                  const ok = await onNotesChange(app.id, localNotes);
                  setNotesSaved(ok);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Readiness bar + open-hub link */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1">
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <div className="h-full bg-[#9a1a27]" style={{ width: `${(readyScore / 4) * 100}%` }} />
          </div>
        </div>
        <span className="font-code text-[10px] uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">
          readiness {readyScore}/4
        </span>
        <Link
          href={`/applications/${app.id}`}
          className="font-code text-[11px] text-[#9a1a27] hover:underline whitespace-nowrap inline-flex items-center gap-1"
        >
          open <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
