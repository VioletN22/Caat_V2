"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { getClientUserId } from "@/lib/current-user";

/**
 * Dashboard onboarding card (roadmap item 7). Guides a new student through the
 * few steps that make the app actually work — the profile powers all matching,
 * so we push them to fill it, add a school, and bookmark a scholarship. The
 * card auto-hides once all three are done, and can be dismissed early. Dismissal
 * is stored in localStorage (no schema needed).
 */

const DISMISS_KEY = "caat-onboarding-dismissed";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1");

    (async () => {
      const userId = await getClientUserId();
      if (!userId) return;

      const [profileRes, appsRes, scholRes] = await Promise.all([
        supabase.from("profiles").select("target_majors, preferred_countries").eq("id", userId).maybeSingle(),
        supabase.from("user_school_applications").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("user_bookmarked_scholarships").select("scholarship_id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const p = profileRes.data as { target_majors: string[] | null; preferred_countries: string[] | null } | null;
      const profileDone = !!(p?.target_majors?.length && p?.preferred_countries?.length);

      setSteps([
        {
          id: "profile",
          label: "Complete your profile",
          description: "Add your majors and preferred countries. This powers all your matches.",
          href: "/profile",
          done: profileDone,
        },
        {
          id: "school",
          label: "Add your first school",
          description: "Start tracking an application.",
          href: "/schools",
          done: (appsRes.count ?? 0) > 0,
        },
        {
          id: "scholarship",
          label: "Bookmark a scholarship",
          description: "See the awards matched to your profile.",
          href: "/scholarships",
          done: (scholRes.count ?? 0) > 0,
        },
      ]);
    })();
  }, []);

  if (dismissed || !steps) return null;
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null; // all set — nothing to nudge

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="shadow-sm border-[#9a1a27] dark:border-[#e06b78]/20">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Finish setting up
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {doneCount} of {steps.length}
          </span>
        </CardTitle>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 w-full rounded-full bg-muted mb-4">
          <div
            className="h-full rounded-full bg-[#9a1a27] transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <ul className="divide-y">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 text-[#9a1a27] dark:text-[#e06b78] shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className={`font-medium text-sm ${s.done ? "text-muted-foreground line-through" : ""}`}>
                    {s.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
              </div>
              {!s.done ? (
                <Link
                  href={s.href}
                  className="shrink-0 inline-flex items-center gap-1 text-sm text-[#9a1a27] dark:text-[#e06b78] hover:underline"
                >
                  Go <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
