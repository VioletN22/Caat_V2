# CAAT Phase 3 — Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Read the spec (Workstream C + Decisions) via `git show docs/caat-overhaul-spec:docs/superpowers/specs/2026-07-03-caat-overhaul-design.md`. Steps use `- [ ]`.

**Goal:** Fix the data-fetching patterns that make the flagship browse pages slow, in investor-demo-grade order (scholarships full-table fetch, schools request storm, tiptap in the feed bundle first).

**Architecture:** Behavior-preserving performance work on top of Phase 1's typed client and split modules. Verify each fix by driving the page and confirming the network/render behavior changed (fewer requests, smaller payload, server-rendered first paint), not just that it still works.

**Tech Stack:** Next.js 16 App Router (Server Components, `"use cache"`/`unstable_cache`, dynamic import), TypeScript, Supabase (typed `createServerClient` from `lib/supabase/server`), `@supabase/ssr` `getClaims`.

## Global Constraints

- Work in `caat-frontend/`. No em dashes / AI emoji / `rounded-full`. No Claude co-author/committer.
- **Stacked on Phase 1** (`refactor/caat-p1-foundations`, which includes P0+P2). Base your branch there (Task 0).
- Post-P1 structure: Supabase clients come from `lib/supabase/server` (`createServerClient`) and `lib/supabase/client` (`getBrowserClient`), typed with `Database`. Communities actions live in `app/(main)/communities/actions/*.ts` behind the `actions.ts` barrel. Scholarship filter logic is in `lib/scholarship-filters.ts`. The bookmark UI is the unified `components/BookmarkButton.tsx`.
- Decision #5: React Query is present but adopt it ONLY where cross-navigation caching clearly pays; default to server-rendering first-paint data. Do not blanket-add it.
- Env: `cp /Users/macbook01/projects/Caat_V2/caat-frontend/.env.local caat-frontend/.env.local`; `npm install`. Restore the Supabase project if paused (mgmt API + token `supabase-access-token`). Test account: test@gmail.com / testtest123.
- Run `npm run typecheck && npm run build` after every task.

---

### Task 0: Base the branch

- [ ] `git fetch origin && git checkout -b perf/caat-p3-performance origin/refactor/caat-p1-foundations`
- [ ] `git log --oneline -14` must show Phase 1 ("refactor: ...", "generate Supabase Database types"), Phase 2, and Phase 0 commits. If not, STOP and report.
- [ ] Copy this plan + read the spec: `mkdir -p docs/superpowers/plans && git show docs/caat-overhaul-spec:docs/superpowers/plans/2026-07-03-caat-p3-performance.md > docs/superpowers/plans/2026-07-03-caat-p3-performance.md && git add docs/superpowers/plans/2026-07-03-caat-p3-performance.md && git commit -m "docs: Phase 3 performance plan"`. Read the spec via `git show docs/caat-overhaul-spec:docs/superpowers/specs/2026-07-03-caat-overhaul-design.md`.

---

### Task 1: Scholarships — server-side pagination + filtering + cache (C1)

Today `app/(main)/scholarships/page.tsx:22-56` fetches the ENTIRE 4,224-row table (all ~40 cols) on every view and filters/paginates client-side (6/page). Move filtering + pagination to the server; cache the public list.

**Files:** `app/(main)/scholarships/page.tsx`, `app/(main)/scholarships/client.tsx`, `lib/scholarship-filters.ts` (reuse the extracted predicates server-side where possible).

- [ ] **Step 1:** Read the current page + client to map which filters exist (funding, level, citizenship, field, status, search, sort) and the page size. The status filter and per-user tracking are user-scoped; keep those client/user-side. The catalog list (title/amount/deadline/tags/school + the fields the card needs) is global.
- [ ] **Step 2:** Change `page.tsx` to read filter/sort/page from `searchParams` and query Supabase with server-side `.eq()/.in()/.ilike()/.order()/.range()` returning only card columns for the current page (drop `description`/`eligibility_summary` from the list query). Return `{ rows, totalCount }`.
- [ ] **Step 3:** Wrap the catalog query in a cache (`unstable_cache` or the `"use cache"` directive with a sensible `revalidate`, e.g. 1h — the catalog is global and changes only on scraper runs). Fetch per-user bookmarks/tracking separately (uncached, user-scoped) and merge for display — the page already fetches the profile/bookmarks.
- [ ] **Step 4:** Update `client.tsx` to render the server page's rows and drive filter/sort/page changes by updating `searchParams` (router.replace), not by re-filtering a giant in-memory array. This also fixes D6/M2 (per-keystroke full-table refetch) — debounce the search param update.
- [ ] **Step 5 (B12):** With server-side pagination in place, resolve the deferred B12: apply the profile match-sort at the query/order level so matched scholarships sort to the top across pages (not page-local). Do the same ordering approach for schools if trivially shared.
- [ ] **Step 6: Verify** — with `npm run dev`, open `/scholarships`: confirm (via the Network tab) the initial payload is small (one page, not 4,224 rows), filters/sort/pagination work and update the URL, and typing in search no longer refetches the whole table per keystroke. Confirm bookmark/tracking state still renders. `npm run build` passes.
- [ ] **Step 7: Commit** — `perf(scholarships): server-side pagination/filtering + cached catalog; fixes per-keystroke refetch and cross-page match sort`.

---

### Task 2: Schools — kill the per-card N+1 request storm (C2)

`app/(main)/schools/school-bookmark-button.tsx:26-46` (now folded into the unified `BookmarkButton`) calls `auth.getUser()` + a bookmark query per card → ~48 requests per /schools load.

**Files:** `app/(main)/schools/page.tsx`, `components/BookmarkButton.tsx`, the schools card component.

- [ ] **Step 1:** In `schools/page.tsx` (server), resolve the user once and fetch the full set of the user's bookmarked school ids in ONE query (`user_bookmarked_schools where user_id = ...`). Pass an `initialBookmarked` boolean down to each card / `BookmarkButton`.
- [ ] **Step 2:** Make `BookmarkButton` accept `initialBookmarked` and skip its per-mount `getUser()` + per-card fetch when the initial state is provided (mirror the communities page pattern at `app/(main)/communities/page.tsx`). Keep the optimistic toggle.
- [ ] **Step 3: Verify** — `/schools` load fires a small constant number of requests (not ~48); bookmark icons render immediately with correct state; toggling still works. `npm run build` passes.
- [ ] **Step 4: Commit** — `perf(schools): fetch bookmark set once server-side, remove per-card N+1`.

---

### Task 3: Get tiptap out of the communities feed bundle (C4)

`components/communities/PostCard.tsx` + `CreatePostForm.tsx` statically import `RichTextEditor` (tiptap + 5 extensions) so the whole editor ships in the initial /communities JS.

**Files:** `components/communities/PostCard.tsx`, `components/communities/CreatePostForm.tsx`.

- [ ] **Step 1:** Convert the `RichTextEditor` import to `const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false })`. Mount it only when the composer/edit is actually opened.
- [ ] **Step 2:** Replace any client-side `htmlToText` that pulls sanitize-html into the client with a browser `DOMParser`/`textContent` approach; keep sanitize-html server-only.
- [ ] **Step 3: Verify** — `npm run build` and inspect the build output: the /communities route's first-load JS drops (tiptap no longer in the initial chunk). Composer still opens and edits/saves a post correctly.
- [ ] **Step 4: Commit** — `perf(communities): dynamically import the rich-text editor out of the feed bundle`.

---

### Task 4: Auth round-trip storm (C5, C6, C14)

`getUser()` is a network call made in middleware + AuthContext + sidebar + every fetcher. Resolve once; use local JWT verification where possible.

**Files:** `middleware.ts`, `components/providers/AuthContext.tsx`, `components/app-sidebar.tsx`, `app/(main)/*/api.ts` fetchers, `app/page.tsx`, `app/(main)/dashboard/page.tsx`.

- [ ] **Step 1 (C5 middleware):** Replace `supabase.auth.getUser()` in `middleware.ts` with `getClaims()` (local asymmetric JWT verification, @supabase/ssr) for the auth gate; reserve full `getUser()` for sensitive mutations.
- [ ] **Step 2 (C5 app):** Resolve the user once server-side and pass it into `AuthContext` as an initial value; have client fetchers accept `user.id` instead of each calling `getUser()`. Remove the sidebar's independent `getUser()` + profile fetch (use the provided user/profile).
- [ ] **Step 3 (C6 dashboard):** Move widget-layout + rollup data fetching into the server `dashboard/page.tsx` and pass down, instead of the 3-tier client waterfall; dedupe the overlapping queries between `ApplicationsRollup` and `UpcomingDeadlinesWidget`.
- [ ] **Step 4 (C14 landing):** In `app/page.tsx`, only call `getUser()` when the sb auth cookie is present (cheap local check); otherwise render the static landing directly.
- [ ] **Step 5: Verify** — navigating between (main) pages fires far fewer `/auth/v1/user` calls (watch Network); dashboard first paint is faster (server-rendered); landing loads without an auth round-trip for logged-out visitors. Login/session still work. `npm run build` passes.
- [ ] **Step 6: Commit** — `perf(auth): getClaims in middleware, resolve user once, server-render dashboard + landing`.

---

### Task 5: Server-render first paint for client-shell pages (C8)

`profile`, `applications`, `documents`, `essays` are whole-page client shells fetching post-hydration.

**Files:** the server `page.tsx` wrappers + their `client.tsx`/shell for profile, applications, documents, essays.

- [ ] **Step 1:** For each, move the first-paint data (profile row; applications list; documents list; essay prompt list) into the server page and pass as initial props; keep mutations client-side. Mirror how scholarships/schools/communities already do it.
- [ ] **Step 2: Verify** — each page shows real content on first paint (no skeleton flash for instant queries); mutations still work. `npm run build` passes.
- [ ] **Step 3: Commit** — `perf: server-render first-paint data for profile/applications/documents/essays`.

---

### Task 6: Remaining query + asset wins (C7, C9, C11, C12, C13, C15, C16)

Smaller, independent fixes; group into a few commits.

- [ ] **C7** `schools/page.tsx:52-54` — filter `school_majors` by the current page's school ids (`.in("school_id", pageIds)`) instead of fetching the whole join table. Verify /schools still badges matches correctly.
- [ ] **C9** `communities/actions/*.ts` (post detail path) — batch the profiles RPC + liked + saved + resume-title into one `Promise.all` after the post fetch. Verify the post detail page renders the same.
- [ ] **C11** trending feed — cache the trending result 1-5 min (global key; apply block filter after). Verify trending still updates.
- [ ] **C10** — already addressed (P2 added the counts-only `get_poll_vote_counts` RPC used by `enrichPosts`). Confirm it's in use; no work needed beyond verifying.
- [ ] **C12** `schools/page.tsx:104-108` — switch `count:"exact"` to `count:"estimated"` (or cache the count per filter combo); add a `pg_trgm` GIN index on `schools.name` via a new migration `caat-frontend/supabase/migrations/2026..._schools_name_trgm.sql` (`create extension if not exists pg_trgm; create index ... using gin (name gin_trgm_ops);`), apply it via the mgmt API, and `git add -f` it. Verify schools search is still correct.
- [ ] **C13** `majors/page.tsx:30` — select only list columns (not `*`); cache the majors list (static, 90 rows). Verify majors list renders.
- [ ] **C15** `app/layout.tsx` — trim the 5 Google font families to the 2-3 actually used across the app (grep for each font's usage first). Verify no visual regression on landing + app.
- [ ] **C16** `components/landing/DemoPlayer.tsx:53-59` — replace the raw `<img>` YouTube thumbnail with `next/image` (add `i.ytimg.com` to `images.remotePatterns` in `next.config.ts`). Verify the demo thumbnail renders.
- [ ] **Commit** each sub-group with a `perf(...)` message.

---

## Phase verification gate

- [ ] `npm run typecheck` PASS, `npm run lint` clean (no new warnings), `npm run test:unit` PASS, `npm test` PASS, `npm run build` PASS.
- [ ] Scholarships initial payload is one page, not the whole table (C1); /schools no longer fires ~48 requests (C2); /communities first-load JS no longer includes tiptap (C4).
- [ ] Fewer `/auth/v1/user` calls per navigation (C5); dashboard + client-shell pages server-render first paint (C6/C8).
- [ ] All touched pages still work when driven, with correct data.

## PR

**Title:** `perf: Phase 3 — data-fetching and bundle performance`

**Body:**
```
Phase 3 of the CAAT overhaul (spec Workstream C). Behavior-preserving performance:
- Scholarships: server-side pagination/filtering + cached catalog (was fetching all 4,224 rows/view); fixes per-keystroke refetch and enables cross-page match sort (B12)
- Schools: fetch the bookmark set once server-side, removing the ~48-request per-card N+1
- Communities: dynamically import the rich-text editor out of the feed bundle
- Auth: getClaims in middleware, resolve the user once, server-render dashboard/landing/client-shell pages
- Smaller wins: filtered school_majors, batched post-detail fetch, trending cache, estimated count + pg_trgm index, majors columns, trimmed fonts, next/image demo thumbnail

Stacked on #143 (P1), #142 (P2), #141 (P0) — merge in order P0 -> P2 -> P1 -> P3.
React Query left per-page per Decision #5.
```
