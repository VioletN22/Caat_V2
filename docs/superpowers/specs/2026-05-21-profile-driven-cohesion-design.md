# Profile-Driven Cohesion — Design

**Date:** 2026-05-21
**Branch:** `feat/profile-driven-cohesion`
**Status:** Draft, awaiting user review

## Problem

CAAT's profile collects rich student state (`nationality`, `preferred_countries`, `target_majors`, `graduation_year`, `school_name`, `curriculum`, test scores, ECs) but downstream features ignore it. Each table is a clean CRUD island keyed by `user_id`; the student's *context* doesn't flow between islands. The student becomes the join.

This spec covers three sharply-scoped fixes that together make the product feel like one cohesive tool instead of a set of forms.

### In scope

1. **Profile-driven smart-sort** on Scholarships, Schools, Majors. Matched items float to the top with a "★ Matches your X" badge. No filter is changed.
2. **Bulk import from bookmarks** — a button on `/applications` that creates `researching` applications for every bookmarked school not already tracked. Idempotent.
3. **Unified deadlines** — both the `UpcomingDeadlinesWidget` (list with source pills) and the `CalendarWidget` (coloured dots) pull from applications + bookmarked scholarships + calendar events.

### Out of scope (deliberately)

- Activities ↔ Resume bridge
- Recommenders ↔ Documents ↔ Applications triangulation
- Student-centric school detail page
- `default_resume_id` propagation
- Auto-applying filters (we picked smart sort instead — keeps user in control)
- Replacing bookmark with a "researching" application status (would require migration; the bulk-import button delivers the same end value without one)

---

## Component 1 — Profile-driven smart-sort

### Behaviour

On Scholarships, Schools, and Majors pages, items the student's profile suggests are relevant are sorted to the top with a red `★ Matches …` badge. Filters are **not** auto-applied; the existing filter UI is untouched. Sort is the only thing that changes.

The match-reason badge is a single sentence. Templating:

- **Major + country:** "Matches your *Computer Science* in your preferred country"
- **Major + citizenship eligibility:** "Matches *Engineering*, open to internationals"
- **Major only:** "Matches your *Engineering*"
- **Country only:** "In your preferred country (*Australia*)"
- **Citizenship only:** "Open to your nationality"
- **3+ dimensions match (Scholarships only — has the most dimensions):** "Strong match — your major, country and level"
- **Level alone** is too thin to surface (every undergrad scholarship would say it); never used as sole reason.

Templates live in a single `reasonFor(matches)` function exported from `lib/profile-match.ts`. Schools have at most 2 dimensions (country + target-major) so they never hit the "Strong match" template; that's fine.

A scholarship/school/major appears in the matched section only if **at least one substantive dimension matches** (major, country, or citizenship). Level alone does not qualify.

### Match dimensions per page

| Page | Dimensions |
|------|-----------|
| Scholarships | major (target_majors ∩ inferred field via existing `FIELD_PATTERNS`), country (`scholarship.country` ∈ `profile.preferred_countries`), citizenship (`profile.nationality` mapped via `DOMESTIC_CODES`), level (`graduation_year` → undergrad/postgrad) |
| Schools | country (`school.country` ∈ `profile.preferred_countries`); secondary: school offers a target major (`school_majors` join). Major signal alone is *not* enough — the matched section requires country match. Major match adds richness to the badge ("Matches your major, in your preferred country") |
| Majors | exact name match against `profile.target_majors` (case-insensitive); secondary: category contains a target major's category |

### Files

| Change | Path |
|--------|------|
| New | `caat-frontend/lib/profile-match.ts` — pure functions: `matchScholarship(profile, s)`, `matchSchool(profile, sch, schoolMajors)`, `matchMajor(profile, m)`. Each returns `{ score: number, reason: string \| null }`. Score sorts within the matched section; `reason: null` means no match. |
| Modify | `caat-frontend/app/(main)/scholarships/page.tsx` — fetch the user's profile server-side (via `createSupabaseServer`) and pass it to `ScholarshipsClient` as a prop. |
| Modify | `caat-frontend/app/(main)/scholarships/client.tsx` — compute match per row in `useMemo`, sort matched items first, pass `matchReason` to `ScholarshipCard`. |
| Modify | `caat-frontend/components/scholarships/scholarship-card.tsx` — accept optional `matchReason: string \| null` prop. When non-null, render a red badge above the university name and add a left border in `#9a1a27`. |
| Modify | `caat-frontend/app/(main)/schools/page.tsx` — fetch profile server-side; sort schools by match score then existing sort. Pass match info into the rendered card. Requires joining `school_majors` for target-major detection. |
| Modify | `caat-frontend/app/(main)/majors/page.tsx` — fetch profile, sort matched first. |
| Modify | `caat-frontend/app/(main)/majors/client.tsx` — accept profile prop; pin matches at top with badge. Bookmarked filter still works. |
| Modify | `caat-frontend/components/majors/major-card.tsx` — render match badge when matched. |

### Card visual (matched item)

```
┌────────────────────────────────────────┐
│ ★ Matches your major in your country   │  ← red badge, white text
│ MIT                                    │  ← existing university line
│ MIT Need-Based Aid                     │
│ Full Ride                              │
│ [FULL RIDE] [NEED-BLIND]               │
│ ...description...                      │
│ [View Details]                         │
└────────────────────────────────────────┘
 │ ← red 3px left border on matched cards
```

The badge is rendered as `<span class="bg-[#9a1a27] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1">★ Matches your major in your preferred country</span>`. Wraps to two lines on narrow cards.

### Sorting algorithm

Matched items first (by descending match score), then existing default order. Match score = count of matched dimensions (so a 3-dimension match outranks a 2-dimension match). Ties broken by the existing default sort. Implementation lives in `profile-match.ts`; tested in isolation. Simple is fine here — we can introduce weighted dimensions later if the sort feels off in practice.

### Edge cases

- Signed-out user (Schools/Majors pages are public-readable via current code): no profile, no matched section. Pages function exactly as today.
- Empty profile (no target_majors, no preferred_countries): no matched section. Same as signed-out.
- Profile with only one dimension filled: still sorts by that dimension. Single-reason templates handle this.
- Profile saved but page already loaded: smart sort recomputes on next navigation (no need for realtime push).

---

## Component 2 — Bulk import from bookmarks

### Behaviour

A new button at the top of `/applications`, between the existing `+ Add School` button and the page header. Visual: bordered (outline) button matching the existing secondary style.

- **Label:** `Import from Bookmarks` with a Lucide `Bookmark` icon (NOT the 📌 emoji)
- **Count badge:** Red pill on the right showing how many bookmarked schools are *not yet* in applications.
- **Visibility rules** (three states):
  - User has zero bookmarked schools at all → button hidden entirely.
  - User has bookmarks but they're all already tracked (count = 0) → button rendered but disabled/dimmed; no count badge.
  - User has bookmarks with some not tracked (count > 0) → button enabled with red count badge.
- **Click → no modal.** Direct insert + sonner toast: `✓ Added 3 schools as Researching — MIT, Stanford, Caltech`. Imported rows render in their normal grid position with a `New` tag and a subtle yellow tint (`bg-[#FFF8E1]`) that auto-fades on first navigation away.
- **Idempotent.** Re-clicking after some bookmarks are added inserts only the newly bookmarked, never-tracked schools. Already-tracked schools are skipped silently.
- **Bonus:** `BookmarkedSchoolsWidget` on the dashboard renders a small `✓ tracked` pill next to schools that already have an application row. This makes the import action feel less mysterious and gives the student a "you've handled this" signal at a glance.

### Files

| Change | Path |
|--------|------|
| Modify | `caat-frontend/app/(main)/applications/api.ts` — add `importBookmarkedSchools(): Promise<{ added: string[]; skipped: number }>` and `fetchUnimportedBookmarkCount(): Promise<number>`. |
| Modify | `caat-frontend/app/(main)/applications/client.tsx` — fetch unimported count on mount; render `Import from Bookmarks` button next to `+ Add School`. Wire click handler. Apply "fresh" visual treatment (yellow tint + `New` tag) to rows whose `id` is in the most-recent import result for the current session. |
| Modify | `caat-frontend/components/dashboard/widgets/BookmarkedSchoolsWidget.tsx` — fetch tracked school_ids alongside bookmarks; render a `✓ tracked` pill on matching items. |

### Database behaviour

No schema change. Insert logic:

```ts
// Pseudocode
const bookmarked = await supabase.from("user_bookmarked_schools").select("school_id").eq("user_id", uid);
const existing = await supabase.from("user_school_applications").select("school_id").eq("user_id", uid);
const existingIds = new Set(existing.map(r => r.school_id));
const toInsert = bookmarked.filter(b => !existingIds.has(b.school_id));
if (toInsert.length === 0) return { added: [], skipped: bookmarked.length };
const { data } = await supabase.from("user_school_applications").insert(
  toInsert.map(b => ({ user_id: uid, school_id: b.school_id, status: "researching" }))
).select("*, schools(id, name, country)");
return { added: data, skipped: bookmarked.length - toInsert.length };
```

The race condition where the same school could be inserted twice is bounded by RLS + the user's session (only the user themselves clicks). A unique constraint on `(user_id, school_id)` would make this bulletproof; the spec does NOT mandate adding one since it's outside the schema-no-change goal, but the implementation should handle a constraint-violation error gracefully if one exists.

### Edge cases

- Zero bookmarked schools: button is hidden entirely (not just dimmed) — nothing to import, no need to confuse.
- All bookmarks already tracked: button dimmed with count `0`, no click.
- User toggles bookmark off after import: imported application row stays. Bookmarks and applications are independent post-import.
- Network failure mid-insert: toast shows partial-failure error; rows that did insert stay; user can re-click safely (idempotent).

---

## Component 3 — Unified deadlines

Both the `UpcomingDeadlinesWidget` and `CalendarWidget` get upgraded; they share a fetch helper.

### Behaviour — UpcomingDeadlinesWidget

The existing widget already merges scholarships + applications. We add:

- `calendar_events` as a third source
- A coloured **source pill** on each row: `App` (blue), `Schol` (purple), `Event` (green) — matching existing CAAT colour vocabulary
- Existing dot, label, and countdown stay

Layout per row: `[Δ-days countdown] [src pill] [title]                               [date subtle]`

### Behaviour — CalendarWidget

The Calendar component currently shows only `calendar_events`. We add coloured dots on dates that have:

- An application deadline (blue dot)
- A bookmarked scholarship deadline (purple dot)
- A custom event (green dot — already present)

Multiple dots stack horizontally beneath the day number. Clicking a date opens the existing detail panel which lists all events/deadlines for that day (currently events-only; we extend the list).

A small legend strip below the calendar grid: `● App   ● Schol   ● Event`.

### Scope decision: which scholarships?

**Bookmarked scholarships only.** Showing all 847 scholarship deadlines would drown both widgets. If you (the student) care about a scholarship enough to want a deadline reminder, bookmark it. This matches the current widget behaviour.

### Files

| Change | Path |
|--------|------|
| New | `caat-frontend/lib/unified-deadlines.ts` — `fetchUnifiedDeadlines(userId): Promise<DeadlineItem[]>`. Returns merged, sorted list with `source: "app" \| "scholarship" \| "event"`. Pure async helper, no React. |
| Modify | `caat-frontend/components/dashboard/widgets/UpcomingDeadlinesWidget.tsx` — call `fetchUnifiedDeadlines`, render source pill instead of the existing right-side text. |
| Modify | `caat-frontend/components/dashboard/widgets/CalendarWidget.tsx` — call `fetchUnifiedDeadlines` alongside the existing `calendar_events` query; build a per-date map; render dots; extend the detail panel to show app/scholarship deadlines too. |

### Type contract

```ts
// lib/unified-deadlines.ts
export type DeadlineSource = "app" | "scholarship" | "event";
export interface UnifiedDeadline {
  id: string;            // prefixed: "app-<uuid>", "sch-<uuid>", "evt-<uuid>"
  source: DeadlineSource;
  title: string;
  dateISO: string;       // YYYY-MM-DD
  href: string;          // /applications, /scholarships/<id>, /dashboard
  timeStart?: string;    // only events
  timeEnd?: string;
}
```

### Edge cases

- A school with an application deadline that's also a custom event on the same day: both appear (two dots on calendar, two rows in list). De-duplication is intentional — they're conceptually different items.
- Past deadlines: filtered out at the query level (`gte today`).
- Deadlines with no date (`deadline_at IS NULL` on `user_school_applications`): silently skipped, never appear here.

---

## Cross-cutting concerns

### Profile fetch — server-side

Components 1 (Scholarships/Schools/Majors) need the profile on the server. Each Server Component does:

```ts
const supabase = await createSupabaseServer();
const { data: { user } } = await supabase.auth.getUser();
const profile = user
  ? (await supabase.from("profiles").select("nationality, preferred_countries, target_majors, graduation_year").eq("id", user.id).maybeSingle()).data
  : null;
```

This is then passed as a prop to the client component for sort/match logic. A `null` profile (signed-out, missing row) means no matched section.

### Testing

| Test | Type | Path |
|------|------|------|
| `profile-match.ts` — every match dimension, reason templates, edge cases | Vitest unit | `caat-frontend/tests/unit/profile-match.test.ts` |
| `unified-deadlines.ts` — merge/sort, source labelling, date filtering | Vitest unit | `caat-frontend/tests/unit/unified-deadlines.test.ts` |
| Bulk import logic (idempotency, skip-existing, zero-bookmarks) | Vitest unit on the api.ts helper, mocking Supabase | `caat-frontend/tests/unit/import-bookmarks.test.ts` |
| End-to-end: bookmark school → import → application appears in /applications | Playwright | `caat-frontend/tests/e2e/import-bookmarks.spec.ts` |

The existing Playwright suite already covers bookmark, applications, scholarships flows separately; new spec adds the bridge.

### Performance

- Match scoring is O(scholarships × dimensions) per page render. For ~1000 scholarships and 4 dimensions, this is ~4000 simple comparisons — sub-millisecond in JS.
- Bulk import on 1000 bookmarked schools is one Supabase insert (chunked at 500 if Supabase has a row-count cap, which it does not at typical scale).
- Unified deadlines fetch is three parallel queries (`Promise.all`), already the pattern used by the existing widget.

### Visual style

All new UI uses existing CAAT vocabulary:

- Red accent: `#9a1a27`
- Borders: `border-[#E5E5E5]`
- Sharp corners (no `rounded-lg` on the new badge)
- Lucide icons (no emojis anywhere)
- Existing `TAG_COLORS` palette extended with `App` (blue), `Schol` (purple), `Event` (green) — colours already used elsewhere in the codebase, just formalising the deadline-source vocabulary

---

## Open decisions (flag before implementation)

- **Schools sort:** confirmed — country match required, target-major adds richness but isn't sufficient alone. Locked.
- **Match-reason templates:** the 6 templates above cover the common cases. The implementation should have a small unit-tested template function rather than scattered string concatenations.
- **Unified-deadlines scholarship scope:** bookmarked-only. Locked.
- **No schema changes** — all three components ship without a migration. Reduces blast radius.
