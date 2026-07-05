# CAAT Phase 2 — Correctness Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Read `docs/superpowers/specs/2026-07-03-caat-overhaul-design.md` (Workstream B + Decisions) first. Steps use `- [ ]`.

**Goal:** Fix the user-facing correctness bugs from the audit — the broken dashboard grid, the anonymity leak, the autosave data-loss cluster, and the batch of medium/low logic bugs — with no reliance on the P1 refactor (touch the code as it is today).

**Architecture:** Targeted fixes across dashboard, communities, essays/resume/notes autosave, profile, scholarships, applications. Each fix is verified by driving the actual flow with the live test account, not just typecheck.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, tiptap, dnd-kit.

## Global Constraints

- Work in `caat-frontend/`. No em dashes / AI emoji / `rounded-full` in any touched copy. No Claude co-author/committer.
- Verify with the live test account `test@gmail.com` / `testtest123`; restore the Supabase project if paused (see index).
- Prefer adding a unit test where logic is pure (timezone, funding filter); use a driven manual/e2e check where the bug is UI-state.

---

### Task 1: Fix the dashboard grid (B1) — pointer capture wedges the whole grid

`WidgetGrid.tsx` calls `setPointerCapture(e.pointerId)` on the **handle** (`:159` drag, `:184` resize) while the move/up handlers live on a sibling overlay div (`:390-391`). Capture retargets all events to the handle, so the overlay never fires: the ghost never moves, `drag`/`resize` state never clears, and the `z-20` overlay stays mounted forever, blocking every widget control until reload. Layout can never be saved.

**Files:**
- Modify: `caat-frontend/components/dashboard/WidgetGrid.tsx` (:159, :184, overlay :385-395, add a useEffect)

**Interfaces:**
- Produces: drag + resize work; on pointer-up the layout persists via the existing `saveDashboardWidgets` path (`DashboardShell.tsx:178-210`).

- [ ] **Step 1: Reproduce (manual)**

`cd caat-frontend && npm run dev`, sign in, go to `/dashboard`, press a widget's drag handle and move. Confirm the ghost does not move and afterward the widgets are unclickable (bug reproduced).

- [ ] **Step 2: Remove the two `setPointerCapture` calls**

Delete `(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);` at both `:159` (drag pointerdown) and `:184` (resize pointerdown).

- [ ] **Step 3: Make the move/up handlers work from `window` and attach them while active**

Refactor `handleOverlayPointerMove` / `handleOverlayPointerUp` so their bodies read `clientX`/`clientY` from a plain `PointerEvent` (they already only use `e.clientX/clientY`). Then add, near the other hooks:

```tsx
useEffect(() => {
  if (!drag && !resize) return;
  const move = (e: PointerEvent) => handleOverlayPointerMove(e);
  const up = (e: PointerEvent) => handleOverlayPointerUp(e);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
}, [drag, resize]);
```

Keep the visual overlay div for the cursor, but it no longer needs `onPointerMove`/`onPointerUp` (leave them or remove — the window listeners are authoritative). Ensure the handler references (`drag`, `resize`, `getCanvasRect`, setState) are stable or included so the latest state is read; if they close over stale state, store the active drag/resize in a ref that the window handlers read.

- [ ] **Step 4: Verify drag, resize, and persistence**

With `npm run dev`: drag a widget to a new cell — ghost follows, drops, snaps. Resize a widget. Reload the page — the new layout persists (proves `saveDashboardWidgets` fired). Confirm all widget controls (remove, todo checkboxes) remain clickable after a drag (overlay unmounts).

- [ ] **Step 5: Commit**

```bash
git add caat-frontend/components/dashboard/WidgetGrid.tsx
git commit -m "fix(dashboard): repair widget drag/resize pointer capture wedging the grid"
```

---

### Task 2: Stop the anonymous-post name leak (B2)

`app/(main)/communities/profile/[userId]/page.tsx:47-52,88-95` attaches the profile owner's real name to every post and filters only `is_hidden` — `is_anonymous` is never consulted. Anonymous posts show the author's real name.

**Files:**
- Modify: `caat-frontend/app/(main)/communities/profile/[userId]/page.tsx`

- [ ] **Step 1: Reproduce (manual)**

Sign in as the test account, post anonymously in a public topic, then visit `/communities/profile/<your-user-id>`. Confirm your real name appears on the anonymous post (bug).

- [ ] **Step 2: Honor `is_anonymous` when attaching the author**

Where each post's `author` (first/last name/avatar) is attached (~88-95), for any post with `is_anonymous === true` set the author to the same "Anonymous" shape `PostCard` uses for anonymous posts (null names / anonymous label), instead of the profile owner's real identity. Do not return real name/avatar for anonymous posts. Also apply the block gate this page skips (mirror `fetchPostsByUserAction`'s blocked-id exclusion).

- [ ] **Step 3: Prefer routing through the existing safe action**

If feasible, replace this page's direct `community_posts` query with `fetchPostsByUserAction` (which already handles anonymity + block gating + the private-group filter from P0 Task 2), rather than duplicating the logic. Only keep the direct query if the page needs fields the action doesn't return.

- [ ] **Step 4: Verify**

Re-check the profile page: the anonymous post now shows "Anonymous", non-anonymous posts show the real name. Confirm a blocked user's posts don't appear.

- [ ] **Step 5: Commit**

```bash
git add "caat-frontend/app/(main)/communities/profile/[userId]/page.tsx"
git commit -m "fix(communities): stop leaking real name on anonymous posts on profile pages"
```

---

### Task 3: School-notes autosave — stop per-keystroke stale saves (B3)

`SchoolNotesPanel.tsx:87-102` flush effect depends on `[value,lastSaved,schoolId]`, so its cleanup runs on every keystroke: it clears the just-scheduled debounce (debounced save never runs) and fires a raw save with the previous value; a slow older POST can overwrite a newer one; the indicator sticks on "Unsaved changes".

**Files:**
- Modify: `caat-frontend/app/(main)/schools/[id]/SchoolNotesPanel.tsx`

- [ ] **Step 1: Read the component**

Run: `cat "caat-frontend/app/(main)/schools/[id]/SchoolNotesPanel.tsx"`. Identify the debounce effect and the flush-on-unload effect.

- [ ] **Step 2: Decouple flush from keystrokes**

Give the flush/unload effect **empty deps** (`[]`) and have it read the current value and "dirty" status from refs (a `valueRef` updated on each change, a `dirtyRef`), so the effect registers the unload flush **once** and does not tear down/reschedule per keystroke. Keep a single debounced save (e.g. 1.5s) that fires only after typing pauses. On unmount / `beforeunload`, if `dirtyRef.current`, flush via `navigator.sendBeacon` or a `keepalive: true` fetch so tab-close doesn't cancel it.

- [ ] **Step 3: Verify (manual)**

Open a school detail page, type continuously into notes for several seconds. Confirm exactly one save fires ~1.5s after you stop (watch the Network tab), the indicator reaches "Saved", and reloading shows the final text (not an earlier stale value).

- [ ] **Step 4: Commit**

```bash
git add "caat-frontend/app/(main)/schools/[id]/SchoolNotesPanel.tsx"
git commit -m "fix(schools): debounce school-notes autosave off refs; keepalive flush on unload"
```

---

### Task 4: Essay autosave — no data loss on switch/unmount/in-flight (B4)

`EssaysShell.tsx:360-369` cleanup only `clearTimeout`s (no flush) → switching draft/prompt or navigating within 2s drops edits; `handleSave` early-returns while `saving` (`:178`), dropping content typed during an in-flight save.

**Files:**
- Modify: `caat-frontend/components/essays/EssaysShell.tsx`

- [ ] **Step 1: Flush before replacing content**

Before any state change that replaces `essayContent` — `handleSwitchDraft` (:202), the prompt-change effect (:135), `handleNewDraft` (:233), and on unmount — synchronously flush the current draft if dirty (await the save, or `sendBeacon` on unmount).

- [ ] **Step 2: Don't drop edits during an in-flight save**

Replace the `if (saving) return;` early-return with a dirty flag: if a save is in flight, mark `pendingSave = true`; when the in-flight save resolves, if `pendingSave`, run another save with the latest content. Key the autosave effect so newly typed content after a save always reschedules.

- [ ] **Step 3: Verify (manual)**

Type in a draft, and within 2s switch to another draft/prompt — the first draft's edits are saved (reload to confirm). Type rapidly through a save cycle — no characters lost after reload.

- [ ] **Step 4: Commit**

```bash
git add caat-frontend/components/essays/EssaysShell.tsx
git commit -m "fix(essays): flush autosave on switch/unmount and after in-flight save"
```

---

### Task 5: Resume-builder autosave + load-failure (B5)

Two bugs: debounce cleanup clears the timer with no flush (`ResumeBuilderShell.tsx:327-340`) so switch/new/navigate within 2s loses edits; and on `loadOrCreateResumeState()` throw (`:186-195`) it falls back to defaults with `resumeId=""`, after which autosave (`:329`) and Save (`:290`) **both early-return forever** — edits look saved but are lost on refresh.

**Files:**
- Modify: `caat-frontend/components/resume-builder/ResumeBuilderShell.tsx`

- [ ] **Step 1: Flush before switch/new/unmount**

In `switchResume` (:345-397) and `onNewResume` (:402-436), flush the outgoing resume's pending save (await) before `setSections(...)`. Add a `beforeunload`/unmount flush.

- [ ] **Step 2: Handle load failure explicitly**

On `loadOrCreateResumeState()` throw, do NOT silently fall back to an empty editor with `resumeId=""`. Set an error state and show a retry affordance; do not enable editing against a phantom resume. If a real resume exists, retry the load; only create-new on an explicit user action.

- [ ] **Step 3: Verify (manual)**

Edit a resume, switch to another within 2s — first resume's edits persist (reload to confirm). Simulate a load failure (e.g. temporarily point at a bad id) — the UI shows an error/retry, not a blank editor that silently discards work.

- [ ] **Step 4: Commit**

```bash
git add caat-frontend/components/resume-builder/ResumeBuilderShell.tsx
git commit -m "fix(resume): flush autosave before switch/unmount; surface load failure instead of silent data loss"
```

---

### Task 6: Custom GPA-scale input unmounts after one character (B6)

`StandardisedTestingCard.tsx:169-175` — the custom-scale input's `onChange` writes into `score_scale`, flipping the render condition false after one keystroke; multi-char values are impossible; input is uncontrolled.

**Files:**
- Modify: `caat-frontend/components/profile/StandardisedTestingCard.tsx`

- [ ] **Step 1: Add a separate controlled draft**

Introduce a `customScale` state (controlled), render the custom input from it while the Select value is "custom", and commit `customScale` into `score_scale` only on blur/save — never write raw keystrokes into the field that controls the input's visibility.

- [ ] **Step 2: Verify (manual)**

Choose "custom" scale, type "7.5" — the input stays mounted and accepts all characters; saving persists "7.5" (reload to confirm).

- [ ] **Step 3: Commit**

```bash
git add caat-frontend/components/profile/StandardisedTestingCard.tsx
git commit -m "fix(profile): keep custom GPA-scale input mounted via a separate controlled draft"
```

---

### Task 7: Community like/save/poll optimistic state reverts (B7)

`PostCard.tsx:68-86` seeds `useOptimistic` from props, but `toggleLikeAction`/`toggleSaveAction`/`castPollVoteAction` (`actions.ts:983/1038/1073`) call no `revalidatePath`, so base props never refresh and the like/save/vote snaps back on the next render.

**Files:**
- Modify: `caat-frontend/app/(main)/communities/actions.ts` (:983, :1038, :1073)

- [ ] **Step 1: Add revalidation to the three actions**

At the end of each of `toggleLikeAction`, `toggleSaveAction`, `castPollVoteAction`, after the successful DB write, call `revalidatePath("/communities")` (and the post detail path `/communities/[postId]` and profile path if those render the same post). Match how the follow actions (:842-863) already revalidate.

- [ ] **Step 2: Verify (manual)**

Like a post, navigate away and back (or refresh) — the like stays. Same for save and poll vote.

- [ ] **Step 3: Commit**

```bash
git add "caat-frontend/app/(main)/communities/actions.ts"
git commit -m "fix(communities): revalidate after like/save/poll so optimistic state persists"
```

---

### Task 8: Timezone off-by-one on deadlines (B9)

`lib/unified-deadlines.ts:97` computes "today" as UTC; `applications/[id]/client.tsx:58-60` and `scholarships/my-scholarships-panel.tsx:88-104,616` parse date-only strings as UTC midnight. Non-UTC users see deadlines a day early/late. Unit tests inject `todayISO`, masking it.

**Files:**
- Create: `caat-frontend/lib/local-date.ts` (a shared helper)
- Modify: `lib/unified-deadlines.ts:97`; `app/(main)/applications/[id]/client.tsx:58-60`; `app/(main)/scholarships/my-scholarships-panel.tsx:88-104,616`
- Test: `caat-frontend/tests/unit/local-date.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/local-date.test.ts
import { parseLocalDate, todayKey } from "@/lib/local-date";
import { describe, it, expect } from "vitest";

describe("parseLocalDate", () => {
  it("parses a date-only string at local midnight, not UTC", () => {
    const d = parseLocalDate("2026-03-23");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March
    expect(d.getDate()).toBe(23); // never 22 due to UTC shift
  });
});
```

- [ ] **Step 2: Run it, expect fail** — `npm run test:unit -- local-date` → FAIL (module not found).

- [ ] **Step 3: Implement the helper**

```ts
// lib/local-date.ts
/** Parse a YYYY-MM-DD string as a local-midnight Date (avoids UTC off-by-one). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
/** Today's date as YYYY-MM-DD in local time. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: Run test, expect pass** — `npm run test:unit -- local-date` → PASS.

- [ ] **Step 5: Replace the UTC parses at each call site** with `parseLocalDate` / `todayKey`. In `unified-deadlines.ts:97` use `todayKey()` instead of `new Date().toISOString().split("T")[0]`; in the two client files replace bare `new Date(s)` on date-only strings with `parseLocalDate(s)`.

- [ ] **Step 6: Verify** — `npm run test:unit` PASS; manually set a deadline for "today" and confirm the widget/calendar show it correctly (spot-check with the device clock).

- [ ] **Step 7: Commit**

```bash
git add caat-frontend/lib/local-date.ts caat-frontend/tests/unit/local-date.test.ts caat-frontend/lib/unified-deadlines.ts "caat-frontend/app/(main)/applications/[id]/client.tsx" "caat-frontend/app/(main)/scholarships/my-scholarships-panel.tsx"
git commit -m "fix(deadlines): parse date-only strings in local time to end the off-by-one"
```

---

### Task 9: Medium/low logic-bug batch

Each item is a small, spec-specified fix. Do them in sub-commits (grouped by file where sensible). After each, `npm run typecheck` must pass; verify the ones marked (verify) by driving the flow. For SUSPECTED items, do the one-step confirmation first.

- [ ] **B8 (verify column type first)** `app/(main)/profile/page.tsx:121` — confirm `birth_date` is a `date` column (`q "select data_type from information_schema.columns where table_name='profiles' and column_name='birth_date';"`); if so, change to `birth_date: data.birthDate || null`. Verify: save personal info with an empty DOB succeeds.
- [ ] **B10** `app/(main)/scholarships/client.tsx:415-418` — change funding `.every(...)` to `.some(...)`. Verify: checking Merit + Need widens (OR), not narrows.
- [ ] **B11** `app/(main)/scholarships/client.tsx:365-388` — include `statusFilter !== "all"` in `hasActiveFilters` and reset it in `clearAll()`. Verify: filtering to "Applied" shows a working Clear-all.
- [ ] **B12** `app/(main)/schools/page.tsx:146-154` — sort by match at the query level before pagination (depends on Phase 3's server-side pagination; if P3 not merged yet, leave a TODO comment referencing C1 and skip — do NOT half-fix). Note in the PR if skipped.
- [ ] **B13** `components/profile/RecommendersCard.tsx:106-111` + `recommenders-api.ts:50-55` — change `...trim() || undefined` to `|| null` for subject/notes. Verify: clearing a recommender's subject persists after reload.
- [ ] **B14** `app/(main)/schools/[id]/SchoolScholarshipsSection.tsx:84-85` — pass exact `school_name` (not `normalizeSchoolName`) to `?university=`, or normalize both sides at the filter. Verify: "View all N at University of Sydney" lands on populated results.
- [ ] **B15** `components/dashboard/widgets/CalendarWidget.tsx:138-142` — capture the event's date into form state in `openEdit`; save uses that, not the selected `date`. Verify: editing only the title of a Jan 10 event keeps it on Jan 10.
- [ ] **B16** `app/(main)/profile/page.tsx:170-188` — persist the new test-score row on creation (call `saveTestScores`) or mark it draft-only and exclude from `calcCompletion`. Verify: an added-then-not-saved score doesn't inflate completion or ghost after reload.
- [ ] **B17** `components/resume-builder/ResumePreviewPanel.tsx:470-477` — guard pagination on `offsetHeight > 0` and paginate from the visible surface. Verify: mobile Print/PDF produces correctly paginated pages, not one clipped page.
- [ ] **B18** `app/(main)/applications/client.tsx:452-455,224-234,212-222,605-609` — set "Saved" only after the mutation resolves; roll back on failure; add the missing `clearTimeout` to "Clear Notes". Verify: a failed save no longer shows "Saved".
- [ ] **Low batch (one commit):** L-status-rollback-throw (`applications/client.tsx:203-209`, snapshot `prev` instead of refetch in catch); L-hub-status-error-page (`applications/[id]/client.tsx:74-105`, clear `error`, don't conflate refetch failure with update failure); L-DST-days-left (use `Math.round` not `Math.ceil` in `applications/client.tsx:73-78`, `applications/[id]/client.tsx:44-49`, `UpcomingDeadlinesWidget.tsx:13-18`); L-scholarship-bookmark-tracking-map (`scholarships/client.tsx:316-348`, restore the tracking map on rollback); L-delete-user-scholarship-silent (`my-scholarships-panel.tsx:515-523`, surface an error toast); L-stale-page-empty-grid (clamp `page` state, not just display, scholarships `:248` + documents `:565-570`); L-clear-search-keeps-page (`schools/school-search.tsx:26-31`, reset `page` when clearing `q`); L-doc-storage-remove-ignored (`documents/api.ts:164-166,240`, log/handle the storage remove error); L-malformed-school-param (`documents/client.tsx:439`, `EssaysShell.tsx:74`, guard `NaN` school_id); L-guided-editor-uuid-per-render (`EducationGuided.tsx:75` + siblings, generate the placeholder id once via `useState`/`useRef`, not per render); L-scholarship-url-desync (`scholarships/client.tsx:250-260`, preserve existing filter params when rebuilding the URL).
- [ ] **SUSPECTED (confirm, then fix or note):** L-updateDraft-timestamp (`components/essays/api.ts:67-87` — add `updated_at` if no DB trigger sets it), L-todo-toggle-clobber (`TodoWidget.tsx:101-109`), L-major-detail-crash (`majors/[id]/page.tsx:139-145` — guard `.countries`), L-school-or-injection (`SchoolScholarshipsSection.tsx:66` — escape `,`/`()` in the `.or(...ilike...)`), L-double-add-application (`applications/client.tsx:180-196` — add an in-flight guard).

- [ ] **Commit** each sub-group with a descriptive `fix(...)` message.

---

## Phase verification gate

- [ ] `npm run typecheck` PASS, `npm run lint` clean, `npm run test:unit` PASS (incl. new `local-date` test), `npm test` PASS, `npm run build` PASS.
- [ ] Dashboard drag/resize works and persists (Task 1).
- [ ] Anonymous posts show "Anonymous" on profile pages (Task 2).
- [ ] Essays/resume/school-notes autosave loses nothing across switch/unmount/rapid typing (Tasks 3-5).
- [ ] Funding filter is OR; status filter clears; deadlines show on the correct local day.

## PR

**Title:** `fix: Phase 2 — correctness cluster (grid, anonymity, autosave, logic bugs)`

**Body:**
```
Phase 2 of the CAAT overhaul (spec Workstream B). Fixes the broken dashboard widget grid
(pointer-capture wedge), the anonymous-post name leak on profile pages, the autosave
data-loss cluster (essays/resume/school-notes), and ~20 medium/low logic bugs
(timezone off-by-one, funding AND-vs-OR, optimistic-revert, and more). Each fix verified
by driving the flow with the test account. See the plan for the per-finding list.
```
