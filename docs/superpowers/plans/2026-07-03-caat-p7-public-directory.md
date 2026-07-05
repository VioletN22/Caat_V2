# CAAT Phase 7a — Public Scholarship Directory (SEO acquisition)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Read the spec (Workstream F/Phase 7 + Decisions) via `git show docs/caat-overhaul-spec:docs/superpowers/specs/2026-07-03-caat-overhaul-design.md`. Steps use `- [ ]`.

**Goal:** Turn the 4,224-scholarship catalog into a public, SEO-indexable directory (`/scholarships` + `/scholarships/[slug]` outside the authed area) with OG cards, JSON-LD, and a signup CTA — the best account-free acquisition channel. No AI.

**Architecture:** New public routes that server-render from the public-read `scholarships` table (same data the authed app uses), fully separate from the authed `(main)/scholarships` experience. Indexed via the sitemap; each page has social + structured metadata and a conversion CTA into signup.

**Tech Stack:** Next.js 16 App Router (public Server Components, generateMetadata, next/og, JSON-LD), Supabase (typed `createServerClient`, public-read tables), TypeScript.

## Global Constraints

- Work in `caat-frontend/`. Brand rules: no em dashes, no AI emoji, no `rounded-full` on buttons/chips. No Claude co-author/committer.
- **Stacked on Phase 5 code** (`feat/caat-p5-launch-code`). Base your branch there (Task 0).
- These routes MUST be public (no auth, not under `(main)`) and MUST NOT expose any user data — only catalog scholarship fields. Robots already allows non-`(main)` routes (P5).
- Launch cohort AU high-schoolers → AU unis (Decision #1): copy/CTA AU-focused.
- Do NOT run git against the primary checkout; stay in your worktree; never `cd` out and `git add -A`.
- Env: `cp /Users/macbook01/projects/Caat_V2/caat-frontend/.env.local caat-frontend/.env.local`; `npm install`. Restore Supabase if paused. Test both logged-out (the target audience) and logged-in.
- Run `npm run typecheck && npm run build` after each task.

---

### Task 0: Base the branch

- [ ] `git fetch origin && git checkout -b feat/caat-p7-public-directory origin/feat/caat-p5-launch-code`
- [ ] `git log --oneline -22` must show Phase 5 ("feat: Phase 5 (code)"), P6, P4, P3, P1, P2, P0. If not, STOP and report.
- [ ] `git show docs/caat-overhaul-spec:docs/superpowers/plans/2026-07-03-caat-p7-public-directory.md > docs/superpowers/plans/2026-07-03-caat-p7-public-directory.md && git add docs/superpowers/plans/2026-07-03-caat-p7-public-directory.md && git commit -m "docs: Phase 7a public directory plan"`. Read the spec via git show.

---

### Task 1: Public scholarship detail page (`/scholarships/[slug]`)

**Files:** new public route, e.g. `app/(public)/scholarships/[slug]/page.tsx` (a route group that does NOT require auth; confirm the middleware matcher does not gate it), plus a shared read helper.

- [ ] **Step 1:** Confirm the auth middleware only protects `(main)` (or an explicit matcher) and does NOT gate `/scholarships/[slug]` as a public route. If it would, adjust the matcher so the public directory is reachable logged-out. (The authed detail stays at `app/(main)/scholarships/[id]`.)
- [ ] **Step 2:** Create the public detail page: `generateStaticParams`-free (dynamic) or ISR-cached; fetch the scholarship by `slug` from the public-read `scholarships` table using the typed `createServerClient`. Render ONLY catalog fields (title, provider, amount, deadline, eligibility summary, study level, funding type, link out, tags). No user data. If not found, `notFound()` (the branded 404 from P4 handles it).
- [ ] **Step 3:** `generateMetadata` per scholarship: title `"<Scholarship name> | CAAT"`, a real description (amount + deadline + who it's for), and OG/Twitter tags. Add a per-scholarship `opengraph-image.tsx` via next/og (name + amount + deadline on the brand card) OR reuse a templated card.
- [ ] **Step 4:** Add JSON-LD structured data (schema.org, e.g. a `Course`/`FinancialProduct`/`Grant`-appropriate type or `WebPage` with relevant properties) in a `<script type="application/ld+json">` for rich results.
- [ ] **Step 5:** Add a clear conversion CTA: a "Track this scholarship" / "Save to your list" button that routes a logged-out visitor to `/signup?next=/scholarships/<slug>` (or the authed tracker), and for logged-in users deep-links into the authed tracker. AU-focused copy, no em dashes, no rounded-full.
- [ ] **Step 6: Verify** — logged OUT, load `/scholarships/<a-real-slug>`: it renders (no auth redirect), shows catalog data, the CTA points to signup; `curl` the page and confirm `<title>`, OG tags, and the JSON-LD block are present; `/scholarships/<bad-slug>` shows the branded 404. `npm run build` passes.
- [ ] **Step 7: Commit** — `feat(public): SEO-indexable public scholarship detail pages`.

---

### Task 2: Public directory index (`/scholarships`)

**Files:** new `app/(public)/scholarships/page.tsx` (public index) — note this must not collide with the authed `(main)/scholarships`; the public one is the logged-out landing for the directory.

- [ ] **Step 1:** Build a public, server-rendered, paginated index of scholarships (reuse the Phase 3 `search_scholarships`/catalog query, but the PUBLIC, non-personalized variant — no profile match-sort for logged-out users; sort by deadline or featured). Include basic facets (country, study level, funding type) via searchParams. Each row links to `/scholarships/[slug]`.
- [ ] **Step 2:** `generateMetadata` for the index (title "Scholarships | CAAT", description); add a hero + signup CTA for logged-out visitors. For logged-in visitors, either redirect to the authed `/scholarships` or show a "go to your tracker" link (decide and keep it simple — a link is fine).
- [ ] **Step 3: Verify** — logged out, `/scholarships` lists scholarships with working pagination/facets and links into detail pages; SEO title/description present. `npm run build` passes.
- [ ] **Step 4: Commit** — `feat(public): public scholarship directory index`.

---

### Task 3: Sitemap + internal linking

**Files:** `app/sitemap.ts` (created in P5).

- [ ] **Step 1:** Extend `app/sitemap.ts` to include the public directory index and a URL per scholarship slug (query the slugs from Supabase at build/request time; cap or paginate the sitemap if the count is large — 4,224 URLs is fine in one sitemap, under the 50k limit). Include `lastModified` from the scholarship's `updated_at` where available.
- [ ] **Step 2:** Add internal links so crawlers discover pages: link the public index from the landing footer (a "Browse scholarships" link) and cross-link related scholarships (same school / same field) from each detail page.
- [ ] **Step 3: Verify** — `curl /sitemap.xml` includes the directory + scholarship URLs; the landing footer links to the public directory. `npm run build` passes.
- [ ] **Step 4: Commit** — `feat(seo): scholarships in sitemap + internal linking from landing and related items`.

---

## Phase verification gate

- [ ] `npm run typecheck` PASS, `npm run lint` clean, `npm run test:unit` PASS, `npm test` PASS, `npm run build` PASS.
- [ ] Logged-out users can browse `/scholarships` and `/scholarships/[slug]`; no user data is exposed; bad slug → branded 404.
- [ ] Each page has correct `<title>`, OG/Twitter tags, and JSON-LD; sitemap includes the scholarship URLs; CTA routes logged-out visitors to signup.

## PR

**Title:** `feat: Phase 7a — public scholarship directory for SEO acquisition`

**Body:**
```
Phase 7a of the CAAT overhaul (spec Phase 7 / growth). Account-free acquisition channel:
- Public, SEO-indexable /scholarships and /scholarships/[slug] pages rendering the catalog (no user data), separate from the authed tracker
- Per-page metadata, next/og OG images, JSON-LD structured data
- Signup CTA routing logged-out visitors into the funnel
- Scholarship URLs added to the sitemap + internal linking from the landing and related items

Stacked on #147/#146/#145/#144/#143/#142/#141 — merge in order.
```
