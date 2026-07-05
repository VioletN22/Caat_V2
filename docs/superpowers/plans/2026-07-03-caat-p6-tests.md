# CAAT Phase 6 — Tests & CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Read the spec (Workstream G + Decisions) via `git show docs/caat-overhaul-spec:docs/superpowers/specs/2026-07-03-caat-overhaul-design.md`. Steps use `- [ ]`.

**Goal:** Make CI actually protect the app: turn on the read-only e2e smoke for PRs, cover the untested critical paths with real tests, fix the fake-signal tests, and tighten the gates.

**Architecture:** Test + CI work on top of Phase 4. Prefer pure-logic unit tests (vitest, no DB) for the untested modules; use the existing read-only runtime smoke for route coverage. Do NOT create a new paid Supabase project (that decision is the user's — see Deferred).

**Tech Stack:** vitest (`tests/unit`), Playwright (`tests/e2e`), GitHub Actions (`.github/workflows/ci.yml` at repo root), `@testing-library/react` (installed, currently unused).

## Global Constraints

- App code in `caat-frontend/`; CI workflow at repo-root `.github/workflows/`.
- **Stacked on Phase 4** (`fix/caat-p4-ux`). Base your branch there (Task 0).
- Post-refactor structure: communities actions in `app/(main)/communities/actions/*.ts`; scholarship logic in `lib/scholarship-filters.ts`; typed clients in `lib/supabase/*`; `lib/local-date.ts`, `lib/profile-match.ts`, `lib/scholarship-filters.ts` are the pure-logic homes.
- No em dashes / AI emoji / rounded-full in any touched copy. No Claude co-author/committer. Do NOT run git against the primary checkout; stay in your worktree; never `cd` out and `git add -A`.
- Env: `cp /Users/macbook01/projects/Caat_V2/caat-frontend/.env.local caat-frontend/.env.local`; `npm install`. Test account: test@gmail.com / testtest123.
- Run `npm run test:unit && npm run build` after each task.

---

### Task 0: Base the branch

- [ ] `git fetch origin && git checkout -b test/caat-p6-tests origin/fix/caat-p4-ux`
- [ ] `git log --oneline -18` must show Phase 4 ("fix: ... UX"), P3, P1, P2, P0. If not, STOP and report.
- [ ] `git show docs/caat-overhaul-spec:docs/superpowers/plans/2026-07-03-caat-p6-tests.md > docs/superpowers/plans/2026-07-03-caat-p6-tests.md && git add -A docs/superpowers/plans && git commit -m "docs: Phase 6 tests plan"`. Read the spec via git show.

---

### Task 1: Turn on the read-only e2e smoke for PRs (G1)

`runtime-smoke.spec.ts` loads ~13 authed routes against a prod build and asserts <500 + no error page. It is read-only (safe against any environment) but is gated off (`ci.yml` `ENABLE_E2E_SMOKE`, off by default).

**Files:** `.github/workflows/ci.yml`; confirm `caat-frontend/playwright.config.ts` and `tests/e2e/auth.setup.ts`.

- [ ] **Step 1:** Read `.github/workflows/ci.yml` and find the e2e-smoke job gated by `vars.ENABLE_E2E_SMOKE == 'true'`. Change it to run on PRs by default (remove the gate, or set the repo variable). It depends on `auth.setup.ts` which needs `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` and the Supabase env — add these as workflow env from CI secrets (document in the PR that the repo needs secrets `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set; the smoke is read-only so it won't mutate data).
- [ ] **Step 2:** Since the smoke needs a real login, and the CI secrets may not be set yet, make the job resilient: if the auth setup can't get creds, it should FAIL loudly (not silently skip) so the gap is visible. Do not make it a silent pass.
- [ ] **Step 3: Verify** — `npx playwright test runtime-smoke.spec.ts --project=e2e` runs locally against `npm run build && npm start` with the test account and passes (read-only route loads). Confirm the ci.yml change is syntactically valid (`yamllint` or a dry parse).
- [ ] **Step 4: Commit** — `ci: run the read-only e2e runtime smoke on PRs`.

---

### Task 2: Cover untested critical logic with unit tests (G3)

Zero-test modules: applications CRUD (`app/(main)/applications/api.ts`), communities actions, `lib/scholarship-tracking.ts`, `auth-actions.ts`, `middleware.ts`. Prefer pure-logic unit tests; for DB-touching code, test the pure helpers and mock the Supabase client.

**Files:** new `tests/unit/*.test.ts`; possibly extract pure helpers where logic is entangled with I/O.

- [ ] **Step 1 (scholarship-tracking):** unit-test `lib/scholarship-tracking.ts` pure logic (status transitions, the tracking map shape) with a mocked Supabase client. Cover the Phase 2 rollback fix (bookmark + tracking map both revert on failure).
- [ ] **Step 2 (applications):** extract any pure transforms from `applications/api.ts`/client (status derivation, deadline formatting via `lib/local-date`) and unit-test them; test the optimistic-then-rollback contract with a mocked client. (`local-date` already has tests from P2 — extend if needed.)
- [ ] **Step 3 (communities permissions):** unit-test the permission/vote helpers now isolated in `actions/*.ts` and `_shared.ts` (e.g. `canAccessGroup` logic, anonymity handling in the profile feed from B2, the poll-count mapping) with mocked data. Focus on the branches that gate access.
- [ ] **Step 4 (essays autosave e2e — fix vacuous test):** `tests/e2e/essays.spec.ts:20-50` wraps every assertion in `if (isVisible)`, so it passes green with no textbox. Seed the test account with an essay prompt (or assert a prompt is present), then make the autosave assertions unconditional so the data-loss path is actually tested. If seeding isn't possible read-only, convert the conditional to an explicit `test.skip` with a reason (never a silent green).
- [ ] **Step 5: Verify** — `npm run test:unit` passes with the new tests (target the highest-risk branches, not 100% coverage). Report the new test count.
- [ ] **Step 6: Commit** — `test: cover scholarship-tracking, applications, communities permissions; fix vacuous essays autosave test`.

---

### Task 3: Fix fake-signal tests + gates (G4, G5)

**Files:** `caat-frontend/tests/smoke.test.cjs`, `caat-frontend/package.json`, `caat-frontend/vitest.config.mts`, `.github/workflows/ci.yml`, `eslint.config.mjs`.

- [ ] **Step 1 (G4 smoke):** `tests/smoke.test.cjs` only checks files exist on disk. Either repoint the `test` script to run `test:unit`, or replace the smoke with a minimal real behavioral check. Do not keep a file-existence check masquerading as a test. (The `ELIGIBILITY_MAP` duplication was already fixed in Phase 1.)
- [ ] **Step 2 (G5 lint blocking):** in `ci.yml`, remove `continue-on-error: true` from the lint job so lint failures block PRs. First ensure the current 15 pre-existing "unused eslint-disable" warnings are resolved (remove the stale directives) so the newly-blocking lint is green — otherwise blocking lint would fail on pre-existing noise.
- [ ] **Step 3 (G5 coverage):** add `@vitest/coverage-v8` as a dev dep, a `test:coverage` script, a `coverage` block in `vitest.config.mts`, and a CI step that prints the coverage summary (a soft threshold is fine to start — do not set a hard gate that fails the build yet).
- [ ] **Step 4: Verify** — `npm run test:coverage` produces a report; `npm run lint` is clean (0 warnings) so it can safely block; `npm test` now runs real tests; `npm run build` passes.
- [ ] **Step 5: Commit** — `ci: real smoke test, blocking lint, coverage reporting`.

---

## Deferred (needs the user — do NOT do here)

- **G2 — dedicated test Supabase project + nightly full e2e suite.** The mutation-heavy full suite (`nightly-e2e.yml`) needs its own Supabase project so it doesn't write to prod. Creating a new (billable) project and wiring its secrets is the user's decision. Leave `nightly-e2e.yml` as-is; note in the PR that enabling the full nightly suite is blocked on a dedicated test project. Also note the committed test credentials in `auth.setup.ts`/`auth-flows.spec.ts` should be rotated once a real CI secret is set.

## Phase verification gate

- [ ] `npm run typecheck` PASS, `npm run lint` clean (0 warnings, now blocking), `npm run test:unit` PASS (with new tests), `npm test` PASS (now a real signal), `npm run build` PASS, `npm run test:coverage` produces a report.
- [ ] `runtime-smoke.spec.ts` passes locally against a prod build with the test account.
- [ ] The essays autosave test is no longer vacuously green.

## PR

**Title:** `test: Phase 6 — real CI gates and coverage`

**Body:**
```
Phase 6 of the CAAT overhaul (spec Workstream G):
- Run the read-only e2e runtime smoke on PRs (was gated off)
- Unit tests for scholarship-tracking, applications transforms, communities permissions; fixed the vacuously-green essays autosave test
- Replaced the file-existence "smoke" with a real test signal; made lint blocking (after clearing pre-existing warnings); added coverage reporting

Deferred to the user: a dedicated test Supabase project to safely enable the mutation-heavy nightly full e2e suite, and rotating the committed test credentials once CI secrets are set.

Stacked on #145/#144/#143/#142/#141 — merge in order.
```
