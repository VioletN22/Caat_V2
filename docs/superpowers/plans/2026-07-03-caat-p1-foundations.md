# CAAT Phase 1 — Code-Health Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Read `docs/superpowers/specs/2026-07-03-caat-overhaul-design.md` (Workstream E + Decisions) first. Steps use `- [ ]`.

**Goal:** Pay down the architectural debt that de-risks every later phase: generate Supabase types, unify the client, split the 2,455-line communities god-module, extract shared helpers, and remove dead code/deps.

**Architecture:** A refactor phase. No behavior changes intended; the safety net is typecheck + build + the existing test suite + driving the touched surfaces. Each task ends green.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Supabase (`@supabase/ssr`), ESLint.

## Global Constraints

- Work in `caat-frontend/`. No em dashes / AI emoji / `rounded-full` in touched copy. No Claude co-author/committer.
- This branch is **stacked on Phase 2** (`fix/caat-p2-correctness`, which is stacked on Phase 0). It must inherit both. Verify before starting (Task 0).
- `*.sql` is gitignored (`.gitignore:87`); migration files need `git add -f`.
- Refactor discipline: keep each task's diff behavior-preserving; if a change alters behavior, that's a bug — stop and reconsider. Run `npm run typecheck && npm run build` after every task.
- Env for the app: copy `.env.local` from the primary checkout (`cp /Users/macbook01/projects/Caat_V2/caat-frontend/.env.local caat-frontend/.env.local`); `npm install` in the worktree. Test account: test@gmail.com / testtest123.

---

### Task 0: Confirm the stacked base

- [ ] `git log --oneline -12` must show both Phase 2 commits (e.g. "fix(dashboard): repair widget drag/resize") and Phase 0 commits (e.g. "fix(security): revoke anon exec..."). If it shows only develop, STOP and report — the base is wrong (should be `origin/fix/caat-p2-correctness`).
- [ ] Create the working branch: `git checkout -b refactor/caat-p1-foundations`.

---

### Task 1: Generate Supabase `Database` types (E1)

**Files:** Create `caat-frontend/types/database.ts`.

- [ ] **Step 1: Generate the types.** Set the access token from Keychain and run the Supabase CLI:
```bash
export SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s supabase-access-token -w)
cd caat-frontend
npx -y supabase@latest gen types typescript --project-id qgbdirrobbtfrwbwtvjm --schema public > types/database.ts
```
Expected: `types/database.ts` populated with a `Database` type covering `public` tables/functions. If the project is paused, restore it first (`POST /v1/projects/qgbdirrobbtfrwbwtvjm/restore`, wait for ACTIVE_HEALTHY).
- [ ] **Step 2: Sanity-check** the file includes `scholarships`, `schools`, `profiles`, `community_posts`, and the RPCs (`get_community_profile_extended`, `get_poll_vote_counts`). `grep -c "Row:" types/database.ts` should be > 30.
- [ ] **Step 3: Commit** — `git add types/database.ts && git commit -m "refactor: generate Supabase Database types"`.

---

### Task 2: Unify the Supabase client + fix server pages using the browser client (E2)

The repo has three client patterns and **8 server pages import the browser singleton** for data fetching (works only because those tables are anon-readable — a latent bug). Consolidate.

**Files:**
- Create: `caat-frontend/lib/supabase/server.ts`, `caat-frontend/lib/supabase/client.ts` (typed with `Database`)
- Modify: `app/page.tsx` (remove the hand-rolled inline client :9-19), and the 8 server pages: `app/(main)/majors/page.tsx`, `majors/[id]/page.tsx`, `scholarships/page.tsx`, `scholarships/[id]/page.tsx`, `schools/page.tsx`, `schools/[id]/page.tsx` (per spec E2 finding)
- Delete: `src/lib/supabaseClient.ts`, `src/context/AuthContext.tsx` (move to `components/providers/AuthContext.tsx`), then remove `src/`
- Modify: `eslint.config.mjs` (add `no-restricted-imports` for `@/src/lib/supabaseClient`)

**Interfaces:**
- Produces: `createServerClient()` (cookie-aware, typed) and `getBrowserClient()` (singleton, typed) from `lib/supabase/`. All server components use `createServerClient`; client components use `getBrowserClient`.

- [ ] **Step 1:** Create `lib/supabase/server.ts` (port the existing `lib/supabase-server.ts` factory, add `<Database>` generic) and `lib/supabase/client.ts` (port `src/lib/supabaseClient.ts`, add `<Database>`). Keep `lib/supabase-server.ts` re-exporting from the new location temporarily to avoid a big-bang import change, OR update imports directly — prefer updating imports.
- [ ] **Step 2:** Update the 8 server pages to import the typed `createServerClient` from `lib/supabase/server` instead of the browser singleton. Replace `app/page.tsx`'s inline client with `createServerClient`.
- [ ] **Step 3:** Move `AuthContext` to `components/providers/`, update its imports, delete `src/`. Add the ESLint `no-restricted-imports` rule banning `@/src/lib/supabaseClient`.
- [ ] **Step 4: Verify** — `npm run typecheck && npm run lint && npm run build` all pass. With `npm run dev`, load `/majors`, `/scholarships`, `/schools` and one detail page each — they render correctly (data still fetched, now server-side + typed).
- [ ] **Step 5: Commit** — `refactor: unify Supabase client, type it, migrate server pages off the browser singleton`.

---

### Task 3: Split the communities god-module (E3)

`app/(main)/communities/actions.ts` is 2,455 lines / 46 actions / 9 domains. Split into focused files.

**Files:**
- Create: `app/(main)/communities/actions/{posts,comments,feed,follows,groups,moderation,notifications,profiles}.ts` and `app/(main)/communities/actions/_shared.ts` (the `enrichPosts` helper, `canAccessGroup`, cap constants, `fetchBlockedIds`).
- Keep `app/(main)/communities/actions.ts` as a barrel re-exporting everything (so existing imports keep working), OR update call sites — prefer the barrel to minimize churn, then migrate imports opportunistically.

- [ ] **Step 1:** Create `_shared.ts` with the shared helpers/constants. Move each domain's actions into its file (posts: create/fetch/edit; comments; feed: main/group/trending/search; follows; groups: the whole subsystem; moderation; notifications; profiles). Preserve every function name and signature exactly (later phases and the app depend on them).
- [ ] **Step 2:** Make `actions.ts` a barrel: `export * from "./actions/posts"` etc., so all existing `import { ... } from ".../actions"` keep resolving.
- [ ] **Step 3: Verify** — `npm run typecheck && npm run lint && npm run build` pass; `npm run test:unit` pass (the community-schema tests still resolve). With `npm run dev`, exercise the community feed, create a post, comment, vote in a poll, open a group — all still work (behavior preserved).
- [ ] **Step 4: Commit** — `refactor: split communities/actions.ts into domain modules behind a barrel`.

---

### Task 4: Extract shared data helpers (E5)

**Files:** Create `caat-frontend/lib/profile-server.ts` (`fetchProfileServer()` + `PROFILE_COLUMNS`); create a single `components/BookmarkButton.tsx`.

- [ ] **Step 1:** Extract the 4×-duplicated profile fetch + 190-char select string into `fetchProfileServer()` + a `PROFILE_COLUMNS` const; replace the 4 call sites (`majors/page.tsx:9-19`, `scholarships/page.tsx:9-19`, `schools/page.tsx:41`, `profile/api.ts:29`).
- [ ] **Step 2:** Replace the three near-identical bookmark buttons (`majors/[id]/bookmark-button.tsx`, `scholarships/[id]/bookmark-button.tsx`, `schools/school-bookmark-button.tsx`) with one generic `<BookmarkButton table onToggle ... />`. (Note: the schools one's per-card N+1 is fixed in Phase 3 C2 — here just unify the component; keep behavior.)
- [ ] **Step 3: Verify** — typecheck/lint/build pass; bookmark toggles still work on all three pages.
- [ ] **Step 4: Commit** — `refactor: extract shared profile fetch + unified BookmarkButton`.

---

### Task 5: Move scholarship domain logic out of the UI (E6)

**Files:** Create `caat-frontend/lib/scholarship-filters.ts`; Modify `app/(main)/scholarships/client.tsx`; fix `tests/unit/scholarship-utils.test.ts`.

- [ ] **Step 1:** Extract the eligibility rules + `FUNDING_MAP`/`LEVEL_MAP`/`CITIZENSHIP_MAP` + `isDomesticEligible`/`matchFieldsForRow` (`client.tsx:68-142`) and `ELIGIBILITY_MAP` (`client.tsx:69`) into `lib/scholarship-filters.ts`. Import them back into `client.tsx`. NOTE: this must preserve the Phase 2 fixes to this file (B10 funding `.some()`, B11 status filter) — keep them.
- [ ] **Step 2:** Fix `tests/unit/scholarship-utils.test.ts:57-63` to import the real `ELIGIBILITY_MAP` from `lib/scholarship-filters` instead of re-declaring it locally. Add unit tests for `isDomesticEligible` and `matchFieldsForRow` now that they're testable.
- [ ] **Step 3: Verify** — `npm run test:unit` pass (incl. the corrected + new tests); scholarships page filtering still behaves (drive it).
- [ ] **Step 4: Commit** — `refactor: extract scholarship filter logic to lib with tests`.

---

### Task 6: Error-handling convention + dead code/deps (E7, E8)

**Files:** `lib/safe-error.ts`; `package.json`; remove unreferenced components.

- [ ] **Step 1 (E7):** Standardize on one boundary contract. Keep server actions returning `{ error }` objects (already the majority) and route the api-module `throw`s through `safe-error.ts` so messages are consistent; fix the few silent-swallow catches noted in the spec (`applications/client.tsx:172-173` — surface a user signal). Do not rewrite every catch; target the inconsistencies.
- [ ] **Step 2 (E8):** Remove unused deps: `@tanstack/react-table`, `recharts`, `vaul` (verify 0 imports first: `grep -rl "<dep>" app components lib hooks`). Per Decision #5, **keep `@tanstack/react-query`** (Opus decides per-page whether to use it later) — do NOT remove it. Remove unreferenced components `components/communities/ResumeAttachmentCard.tsx`, `components/ui/field.tsx`, `components/ui/item.tsx` after confirming 0 references. Clean the pre-existing unused-import lint warning in `applications/client.tsx` (`ChevronDown`).
- [ ] **Step 3: Verify** — `npm run typecheck && npm run lint && npm run test:unit && npm test && npm run build` all pass; `npm install` clean after dep removal.
- [ ] **Step 4: Commit** — `refactor: standardize error surfacing; remove dead deps and components`.

---

### Task 7: RLS/policy migrations in-repo housekeeping (E9)

Phase 0 already added two migrations. Ensure the directory is coherent.

- [ ] **Step 1:** Confirm `caat-frontend/supabase/migrations/` contains the three migrations (test-scores RLS, community RPC lockdown, community read policies). If `.gitignore:87` still ignores new `*.sql`, either narrow the ignore to allow `supabase/migrations/**` or continue `git add -f`. Prefer un-ignoring the migrations path: add `!caat-frontend/supabase/migrations/` after the `*.sql` line in `.gitignore`.
- [ ] **Step 2: Commit** — `chore: track supabase migrations in-repo (un-ignore migrations path)`.

---

## Phase verification gate

- [ ] `npm run typecheck` PASS, `npm run lint` clean (no NEW warnings), `npm run test:unit` PASS, `npm test` PASS, `npm run build` PASS.
- [ ] All touched surfaces still work when driven (majors/scholarships/schools pages + details, community feed/post/comment/poll/group, bookmarks, scholarship filters). This phase changes structure, not behavior.
- [ ] `git grep "@/src/lib/supabaseClient"` returns nothing (all migrated); `src/` is gone.

## PR

**Title:** `refactor: Phase 1 — code-health foundations (types, client, module split)`

**Body:**
```
Phase 1 of the CAAT overhaul (spec Workstream E). Behavior-preserving refactor:
- Generated Supabase Database types and threaded them through a unified lib/supabase client
- Migrated 8 server pages off the browser singleton (latent RLS-tightening hazard)
- Split communities/actions.ts (2,455 lines) into domain modules behind a barrel
- Extracted shared profile fetch + a unified BookmarkButton; moved scholarship filter logic to lib with tests
- Standardized error surfacing; removed dead deps (react-table, recharts, vaul) and components
- Un-ignored supabase/migrations so RLS policies are tracked

Stacked on #142 (Phase 2) and #141 (Phase 0) — merge P0 -> P2 -> P1 in order.
Kept @tanstack/react-query per Decision #5 (adopt per-page later).
```
