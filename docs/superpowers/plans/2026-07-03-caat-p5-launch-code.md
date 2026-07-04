# CAAT Phase 5 (code subset) — SEO, Copy Truth, Account Deletion/Export

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Read the spec (Workstream F + Decisions) via `git show docs/caat-overhaul-spec:docs/superpowers/specs/2026-07-03-caat-overhaul-design.md`. Steps use `- [ ]`.

**Goal:** Land the launch-infra work that needs NO external accounts: social/SEO metadata (F3), the truth-in-copy pass (F4), and self-serve account deletion + data export (F5). The account-gated items (F1 email, F2 analytics/Sentry, F6 deadline emails, F7 demo seeding) are deferred to the human checklist and are NOT in this plan.

**Architecture:** Additive product-polish work on top of Phase 6. Verify by driving the pages and confirming the rendered `<head>`, the removed/true copy, and the delete/export flows end to end with the test account.

**Tech Stack:** Next.js 16 App Router (Metadata API, `next/og` `ImageResponse`, `sitemap.ts`, `robots.ts`), Supabase (typed `createServerClient`), TypeScript.

## Global Constraints

- Work in `caat-frontend/`. Binding brand rules: no em dashes, no AI emoji, no `rounded-full` on buttons/chips. No Claude co-author/committer.
- **Stacked on Phase 6** (`test/caat-p6-tests`). Base your branch there (Task 0).
- Launch cohort is AU high-schoolers → AU universities (Decision #1): copy uses UAC/ATAR framing where relevant.
- Do NOT run git against the primary checkout; stay in your worktree; never `cd` out and `git add -A`.
- Env: `cp /Users/macbook01/projects/Caat_V2/caat-frontend/.env.local caat-frontend/.env.local`; `npm install`. Restore Supabase if paused (mgmt token `supabase-access-token`). Test account: test@gmail.com / testtest123.
- Run `npm run typecheck && npm run build` after each task.

---

### Task 0: Base the branch

- [ ] `git fetch origin && git checkout -b feat/caat-p5-launch-code origin/test/caat-p6-tests`
- [ ] `git log --oneline -20` must show Phase 6 ("test:"), P4, P3, P1, P2, P0. If not, STOP and report.
- [ ] `git show docs/caat-overhaul-spec:docs/superpowers/plans/2026-07-03-caat-p5-launch-code.md > docs/superpowers/plans/2026-07-03-caat-p5-launch-code.md && git add docs/superpowers/plans/2026-07-03-caat-p5-launch-code.md && git commit -m "docs: Phase 5 launch-code plan"`. Read the spec via git show.

---

### Task 1: SEO + social metadata (F3)

Today the site has no OG/Twitter tags, no sitemap, no robots, title is just "CAAT".

**Files:** `app/layout.tsx`; new `app/opengraph-image.tsx` (or `.png`), `app/sitemap.ts`, `app/robots.ts`; per-page `metadata` exports where pages are server components; favicon assets in `app/`.

- [ ] **Step 1:** In `app/layout.tsx` set `metadata`: `metadataBase: new URL("https://www.mycaat.com")`, a descriptive default `title` with a template `{ default: "CAAT: College Application Assistance Tool", template: "%s | CAAT" }` (no em dash), a real `description`, and `openGraph` + `twitter` (`summary_large_image`) blocks. Keep copy AU-focused and em-dash-free.
- [ ] **Step 2:** Add a branded OG image via `next/og`: create `app/opengraph-image.tsx` using `ImageResponse` (1200×630) rendering the CAAT wordmark + tagline on the brand background (brand red `#9a1a27` / off-white). This needs no external asset. Add `app/twitter-image.tsx` re-exporting it or a variant.
- [ ] **Step 3:** Add `app/sitemap.ts` listing the public routes (landing, login, signup, help, privacy, terms, contact — and, if Task-adjacent public directory exists later, those; for now the marketing/auth/legal set). Add `app/robots.ts` allowing crawl of public routes and disallowing the authed `(main)` group, pointing at the sitemap.
- [ ] **Step 4:** Add per-page `metadata` (title/description) to the server-component pages that lack it (login, signup are client — give them a `layout.tsx` or convert the metadata via a small server wrapper; privacy/terms/contact already have some). Add a proper favicon set (`app/icon.png` / `app/apple-icon.png`) from the existing logo.
- [ ] **Step 5: Verify** — `npm run build`; run `npm start` and `curl -s http://localhost:3000 | grep -iE 'og:|twitter:|<title>'` shows OG/Twitter tags + a real title; `curl -s http://localhost:3000/sitemap.xml` and `/robots.txt` return content; `/opengraph-image` renders a PNG. No em dashes in any of it.
- [ ] **Step 6: Commit** — `feat(seo): metadata, OG image, sitemap, robots, favicons`.

---

### Task 2: Truth-in-copy pass (F4)

Remove product claims that aren't true.

**Files:** `components/landing/LandingPage.tsx`, `app/layout.tsx`, `app/signup/page.tsx`.

- [ ] **Step 1:** Remove/soften the AI claims: "AI-powered matching surfaces scholarships tailored to your profile" (`LandingPage.tsx:406-407,907`) and "98% match for your profile" (`:969`). Reword to what's true: profile-based matching / "matched to your profile" (no AI claim, since there is no AI engine). The scholarship match-sort from Phase 3 IS real profile matching, so "matched to your profile" is accurate; just drop "AI-powered" and the fake "98%".
- [ ] **Step 2:** The "10,000+ universities" claim (`:393,1002`, `signup/page.tsx:65`) is TRUE (the DB has 10,201 schools) — keep it, but confirm the number against the live `schools` count and adjust the wording if the count changed.
- [ ] **Step 3:** The "delete or export everything in one click" claim (`:1119-1121`) becomes true once Task 3 ships — keep it and ensure the wording matches the actual delete/export flow built in Task 3.
- [ ] **Step 4:** Strip em dashes from user-facing copy in `LandingPage.tsx` and the `app/layout.tsx` metadata description (spec notes `layout.tsx:39`).
- [ ] **Step 5:** Consider hiding the "Talk to an Advisor: Coming Soon" disabled button for launch (spec F1 note) — reads as vaporware; either hide it or leave it if it's a genuine near-term plan (leave it, just ensure the label is honest).
- [ ] **Step 6: Verify** — drive the landing page: no "AI-powered"/"98% match" claims remain; the delete/export claim matches Task 3; no em dashes. `npm run build` passes.
- [ ] **Step 7: Commit** — `fix(copy): remove untrue AI/match claims, align delete-export copy, strip em dashes`.

---

### Task 3: Account deletion + data export (F5)

Makes the privacy/landing claim true; a trust and (in some jurisdictions) legal requirement.

**Files:** new `app/(main)/settings/` (or extend profile) with a "Data & account" section; new server actions for export + delete; possibly a confirmation dialog.

- [ ] **Step 1 (export):** Add a server action `exportMyData()` that gathers the signed-in user's rows across their owned tables (profile, applications, essays, documents metadata, resumes + sections, bookmarks, scholarships tracking, calendar events, todos, recommenders, community posts/comments) into a single JSON object and returns it as a downloadable file (e.g. a Blob download client-side, or a route handler streaming `application/json`). Scope every query to `auth.uid()`.
- [ ] **Step 2 (delete):** Add a server action `deleteMyAccount()` that deletes the user's data and the auth user. Prefer a Supabase Edge Function or a `SECURITY DEFINER` RPC that cascades the deletes and calls `auth.admin.deleteUser` (the anon client cannot delete an auth user directly). If a service-role path isn't available client-side (it must not be), create a Postgres `SECURITY DEFINER` function `delete_own_account()` that deletes the caller's rows (using `auth.uid()`) across all owned tables, and document that the auth-user row removal needs the admin API (wire via an Edge Function, or note it as a follow-up if Edge Functions aren't set up — at minimum wipe all personal data and sign the user out). Capture the RPC as a tracked migration.
- [ ] **Step 3 (UI):** Add a "Data & account" section (in a new `/settings` page or the profile page) with an "Export my data" button (triggers the download) and a "Delete my account" button behind a real confirmation dialog (typed confirmation). Use brand styling, no rounded-full, no em dashes.
- [ ] **Step 4: Verify** — with the test account (or a throwaway one), Export downloads a JSON of that user's data (spot-check it contains their rows and NOT others'). For delete, verify on a THROWAWAY account only (create one, delete it, confirm its data is gone and it's signed out) — do NOT delete the shared test@gmail.com account. `npm run build` passes.
- [ ] **Step 5: Commit** — `feat(account): self-serve data export and account deletion`.

---

## Deferred to the human checklist (NOT in this plan — need accounts/decisions)

- **F1** transactional email (Resend SMTP on Supabase + SPF/DKIM on mycaat.com) — needs the Resend account + DNS.
- **F2** analytics + error tracking (Vercel Analytics / PostHog / Sentry) — needs accounts + keys.
- **F6** deadline reminder emails (Vercel cron) — depends on F1's email infra.
- **F7** demo seeding + testimonials — a data/content task best done with the founder.

## Phase verification gate

- [ ] `npm run typecheck` PASS, `npm run lint` clean, `npm run test:unit` PASS, `npm test` PASS, `npm run build` PASS.
- [ ] `<head>` has OG/Twitter + real titles; `/sitemap.xml` + `/robots.txt` + `/opengraph-image` serve.
- [ ] No "AI-powered"/"98% match" copy; delete/export copy is now true; no em dashes.
- [ ] Export downloads the user's own data; delete works on a throwaway account (test account NOT deleted).

## PR

**Title:** `feat: Phase 5 (code) — SEO/metadata, copy truth, account deletion and export`

**Body:**
```
Phase 5 code subset of the CAAT overhaul (spec Workstream F, the account-free parts):
- SEO/social: metadataBase, OG/Twitter tags, next/og OG image, sitemap.ts, robots.ts, favicons, per-page titles (F3)
- Copy truth: removed the untrue "AI-powered matching"/"98% match" claims, aligned the delete/export claim, stripped em dashes (F4)
- Self-serve data export + account deletion, making the privacy claim true (F5)

Deferred (need your accounts/decisions, see the handoff checklist): transactional email (Resend + DNS), analytics/error tracking (F2), deadline reminder emails (F6), demo seeding/testimonials (F7).

Stacked on #146/#145/#144/#143/#142/#141 — merge in order.
```
