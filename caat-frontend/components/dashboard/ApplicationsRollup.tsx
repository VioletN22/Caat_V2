"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { fetchApplications, fetchGlobalReadinessSignals } from "@/app/(main)/applications/api";
import { STATUS_CONFIG, type ApplicationRow, type ApplicationStatus } from "@/types/applications";

/**
 * Per-application readiness rollup for the dashboard (roadmap item 6),
 * replacing the old generic checklist. Shows the soonest 3 applications with
 * the same 4-signal readiness as the hub (deadline set, an essay drafted, key
 * docs uploaded, status reached submitted), plus a deadline countdown.
 */

const SUBMITTED_PLUS = new Set<ApplicationStatus>([
  "submitted",
  "decision_pending",
  "accepted",
  "rejected",
  "waitlisted",
]);

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
function deadlineLabel(dateStr: string | null) {
  if (!dateStr) return { text: "no date", cls: "text-muted-foreground" };
  const d = daysUntil(dateStr);
  const cls = d < 0 || d <= 7 ? "text-[#9a1a27]" : d <= 30 ? "text-amber-500" : "text-green-600";
  return { text: d < 0 ? `${Math.abs(d)}d over` : d === 0 ? "today" : `${d}d`, cls };
}

export function ApplicationsRollup() {
  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [signals, setSignals] = useState({ essayDrafted: false, keyDocsUploaded: false });
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetchApplications()
      .then((a) => { if (!cancelled) setApps(a); })
      .catch(() => { if (!cancelled) { setError(true); setApps([]); } });
    fetchGlobalReadinessSignals().then((s) => { if (!cancelled) setSignals(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [reloadKey]);

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="space-y-0">
          <CardTitle className="text-base">Your applications</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            compact
            message="Couldn't load your applications."
            onRetry={() => { setApps(null); setReloadKey((k) => k + 1); }}
          />
        </CardContent>
      </Card>
    );
  }

  if (apps === null) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="space-y-0">
          <CardTitle className="text-base">Your applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (apps.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="space-y-0">
          <CardTitle className="text-base">Your applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No applications yet.</p>
            <Link href="/schools" className="text-sm text-[#9a1a27] hover:underline">
              Add a school to get started
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const readiness = (a: ApplicationRow) =>
    (a.deadline_at ? 1 : 0) +
    (signals.essayDrafted ? 1 : 0) +
    (signals.keyDocsUploaded ? 1 : 0) +
    (SUBMITTED_PLUS.has(a.status) ? 1 : 0);

  // Soonest deadlines first; applications without a deadline sink to the bottom.
  const sorted = [...apps].sort((a, b) => {
    if (!a.deadline_at && !b.deadline_at) return 0;
    if (!a.deadline_at) return 1;
    if (!b.deadline_at) return -1;
    return a.deadline_at.localeCompare(b.deadline_at);
  });
  const top = sorted.slice(0, 3);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Your applications</CardTitle>
        <Link href="/applications" className="text-sm text-[#9a1a27] hover:underline inline-flex items-center gap-1">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {top.map((a) => {
            const score = readiness(a);
            const dl = deadlineLabel(a.deadline_at);
            return (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={`/applications/${a.id}`} className="flex items-center justify-between gap-3 group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:underline">
                        {a.schools?.name ?? "School"}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {STATUS_CONFIG[a.status].label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full max-w-[280px] rounded-full bg-muted mt-2">
                      <div className="h-full rounded-full bg-[#9a1a27]" style={{ width: `${(score / 4) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-mono ${dl.cls}`}>{dl.text}</div>
                    <div className="text-xs text-muted-foreground">{score} of 4</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
