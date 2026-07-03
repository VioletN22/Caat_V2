# CAAT Overhaul — Plans Index & Execution Guide

> Companion to the spec: `docs/superpowers/specs/2026-07-03-caat-overhaul-design.md`. Read the spec's **Decisions** section first — it is binding.

This overhaul is executed as **one PR per phase into `develop`**, by a **separate Opus session per phase**, with a human review checkpoint between phases. Each phase plan is self-contained and cold-startable: an Opus session that has never seen this repo can open one plan file and execute it end to end.

## How to run a phase (hand this to a fresh Opus terminal)

Open a new terminal in the repo on **model Opus**, then paste:

```
Execute the implementation plan at docs/superpowers/plans/<PHASE-PLAN-FILE>.md.

Rules:
- First read docs/superpowers/specs/2026-07-03-caat-overhaul-design.md (the Decisions section is binding) for context.
- Work task by task, top to bottom. Use the superpowers:executing-plans skill.
- This repo uses PR-into-develop. Before starting, branch from develop:
  git fetch origin && git checkout develop && git pull && git checkout -b <phase-branch-name>
- Commit after each task with the message shown in the task.
- Do NOT push or open the PR until every task's verification gate has passed.
- Verify against the running app / live checks as each task specifies, not just typecheck.
- When the whole plan is done and the phase verification gate passes, push the branch and open a PR into develop with the title and body drafted at the bottom of the plan file. Then stop and report.
- If a task's verification fails and you cannot fix it in two attempts, stop and report which task and the exact failure. Do not proceed to later tasks.
```

Replace `<PHASE-PLAN-FILE>` and `<phase-branch-name>` per the table below.

## Shared setup every phase plan assumes

- **Working dir for the app:** `caat-frontend/`. Commands (`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm test`, `npm run build`, `npm run dev`) run from there.
- **Env:** `caat-frontend/.env.local` must hold `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The values are recoverable from the prod login-page JS if missing (see the `caat-overhaul` memory) — project ref `qgbdirrobbtfrwbwtvjm`.
- **Live test account:** `test@gmail.com` / `testtest123`. Use for manual/e2e verification.
- **Live DB / RLS work:** run SQL through the Supabase management API `POST https://api.supabase.com/v1/projects/qgbdirrobbtfrwbwtvjm/database/query` with the Keychain token `supabase-access-token` (service `supabase-access-token`). The project auto-pauses on the free tier; restore via `POST /v1/projects/qgbdirrobbtfrwbwtvjm/restore` and wait for `ACTIVE_HEALTHY` before DB checks.
- **Never** add a Co-Authored-By Claude trailer or "Claude Code" committer (user rule). Commit as the repo's configured author.
- **Brand rules (apply to any UI copy touched):** no em dashes, no AI-looking emoji, no giant pill radii (`rounded-full`) on buttons/chips.

## Phases

| Order | Phase | Plan file | Branch | Depends on | Status |
|-------|-------|-----------|--------|-----------|--------|
| 1 | **P0 — Security & privacy** | `2026-07-03-caat-p0-security.md` | `fix/caat-p0-security` | RLS hotfix (done) | **WRITTEN** |
| 2 | **P2 — Correctness cluster** | `2026-07-03-caat-p2-correctness.md` | `fix/caat-p2-correctness` | P0 merged | **WRITTEN** |
| — | **Scholarship pipeline** (parallel) | `2026-07-03-scholarship-pipeline.md` | `feat/scholarship-pipeline` (separate repo) | none | **WRITTEN** |
| 3 | P1 — Code-health foundations | `2026-07-03-caat-p1-foundations.md` | `refactor/caat-p1-foundations` | P0, P2 merged | TO WRITE |
| 4 | P3 — Performance | `2026-07-03-caat-p3-performance.md` | `perf/caat-p3` | P1 merged | TO WRITE |
| 5 | P4 — UX / mobile / a11y / brand | `2026-07-03-caat-p4-ux.md` | `fix/caat-p4-ux` | P2, P3 merged | TO WRITE |
| 6 | P5 — Launch infra | `2026-07-03-caat-p5-launch.md` | `feat/caat-p5-launch` | P0-P4 | TO WRITE |
| 7 | P6 — Tests & CI | `2026-07-03-caat-p6-tests.md` | `test/caat-p6` | threaded | TO WRITE |
| 8 | P7 — New non-AI features | `2026-07-03-caat-p7-features.md` | `feat/caat-p7-*` | P5 | TO WRITE |

**Priority (Decision #2): run P0 then P2 first.** P1 (foundations) is sequenced third because it de-risks P3+ — but P0/P2 come first per the security + data-loss priority, so P2's fixes are written to not depend on P1's typed-client refactor (they touch the code as it is today). The "TO WRITE" phase plans have their full task backlog already enumerated in the spec (each finding ID is a task); they are written on demand in later Fable/Opus sessions using the same format as the two written phases.

## Why P1 (foundations) is not first despite being highest-leverage

The spec calls E1/E2/E3 the highest-leverage refactors, but Decision #2 puts security + data-loss first, and those fixes are small and localized. Doing the big typed-client/god-module refactor before them would delay shipping the security fixes and create a large diff that conflicts with cofounders' in-flight branches. So: land the small high-severity fixes (P0, P2) as tight PRs, then do the foundation refactor (P1), then build the rest on the improved base.
