# CAAT Phase 0 — Security & Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Read `docs/superpowers/specs/2026-07-03-caat-overhaul-design.md` (Workstream A + Decisions) first.

**Goal:** Close the remaining security and privacy holes found in the audit (the live PII leak on test-score tables was already fixed by an earlier migration).

**Architecture:** A mix of Supabase-side changes (RPC grants + policy SQL, applied via the management API and captured as committed migrations) and app-code changes in `caat-frontend`. Each task ends with a concrete verification — a live management-API query for DB changes, or a driven auth/UI flow for code changes.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS + PostgREST + Auth), Cloudflare Turnstile, Upstash rate limiting.

## Global Constraints

- Work in `caat-frontend/` for app code; repo root for docs/migrations.
- Brand rules on any UI copy: no em dashes, no AI emoji, no `rounded-full` on buttons/chips.
- No Co-Authored-By Claude / no "Claude Code" committer.
- DB SQL runs via `POST https://api.supabase.com/v1/projects/qgbdirrobbtfrwbwtvjm/database/query` with Keychain token `supabase-access-token`. Restore the project first if paused (`POST /v1/projects/qgbdirrobbtfrwbwtvjm/restore`, wait for `ACTIVE_HEALTHY`).
- `*.sql` is gitignored (`.gitignore:87`); migration files must be `git add -f`.
- Every DB change is ALSO written as a committed migration under `caat-frontend/supabase/migrations/` (Workstream E9), because the live DB is the only current source of truth for policies.

## Helper for DB steps

Define this shell function once per session (used by several tasks):

```bash
TOKEN=$(security find-generic-password -s supabase-access-token -w)
REF=qgbdirrobbtfrwbwtvjm
q() { curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"query\": $(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")}"; }
```

---

### Task 1: Lock down the community profile RPCs (A1)

Both `get_community_profile_extended` and `get_public_profiles` are `SECURITY DEFINER` with `EXECUTE` granted to `anon`, and the extended one returns school/grad-year/countries/majors while **ignoring** the user's `community_profile_settings` visibility flags. Communities is authenticated-only, so anon must have no access, and the extended RPC must honor each `show_*` flag.

**Files:**
- Create: `caat-frontend/supabase/migrations/20260703100000_secure_community_profile_rpcs.sql`
- (No app code change — callers already pass the caller's session.)

**Interfaces:**
- Produces: `get_community_profile_extended(target_id uuid)` returns the same columns, but hidden fields are NULL per the target's `community_profile_settings`; `EXECUTE` on both RPCs is `authenticated`-only.

- [ ] **Step 1: Confirm the current hole (verify it fails the right way)**

```bash
# (define q() first). Anon must currently be able to exec — this is the bug.
curl -s -X POST "https://qgbdirrobbtfrwbwtvjm.supabase.co/rest/v1/rpc/get_community_profile_extended" \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY caat-frontend/.env.local | cut -d= -f2)" \
  -H 'Content-Type: application/json' -d '{"target_id":"00000000-0000-0000-0000-000000000000"}' -o /dev/null -w '%{http_code}\n'
```
Expected now: `200` (anon can call it — the vulnerability).

- [ ] **Step 2: Write the migration**

```sql
-- caat-frontend/supabase/migrations/20260703100000_secure_community_profile_rpcs.sql
-- A1: communities is authenticated-only. Revoke anon EXECUTE on both community
-- profile RPCs, and make the extended RPC honor each show_* visibility flag.

revoke execute on function public.get_community_profile_extended(uuid) from anon;
revoke execute on function public.get_public_profiles(uuid[]) from anon;

create or replace function public.get_community_profile_extended(target_id uuid)
returns table(id uuid, first_name text, last_name text, avatar_url text,
              graduation_year integer, school_name text,
              preferred_countries text[], target_majors text[])
language sql stable security definer set search_path to 'public'
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    case when coalesce(s.show_graduation_year, true) then p.graduation_year end,
    case when coalesce(s.show_school_name, true) then p.school_name end,
    case when coalesce(s.show_preferred_countries, true) then p.preferred_countries end,
    case when coalesce(s.show_target_majors, true) then p.target_majors end
  from public.profiles p
  left join public.community_profile_settings s on s.user_id = p.id
  where p.id = target_id;
$$;
```

Note: verify the real `get_public_profiles` signature before running (`\df` equivalent): run `q "select p.proname, pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_public_profiles';"` and adjust the `revoke` arg types if they differ from `uuid[]`.

- [ ] **Step 3: Apply the migration**

```bash
q "$(cat caat-frontend/supabase/migrations/20260703100000_secure_community_profile_rpcs.sql)"
```
Expected: `[]` (success, no error object).

- [ ] **Step 4: Verify anon is blocked and flags are honored**

```bash
# Anon exec now blocked:
curl -s -X POST "https://qgbdirrobbtfrwbwtvjm.supabase.co/rest/v1/rpc/get_community_profile_extended" \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY caat-frontend/.env.local | cut -d= -f2)" \
  -H 'Content-Type: application/json' -d '{"target_id":"00000000-0000-0000-0000-000000000000"}' -o /dev/null -w '%{http_code}\n'
```
Expected: `401` or `403` (no longer `200`).

```bash
# Flags honored: set a real profile's show_school_name=false, then confirm school_name comes back NULL
# via an authenticated call. Pick a profile id that has a school_name set:
q "select p.id from public.profiles p where p.school_name is not null limit 1;"
# temporarily hide it, then call the RPC as the service role to confirm the CASE logic:
q "insert into public.community_profile_settings (user_id, show_school_name) values ('<that-id>', false) on conflict (user_id) do update set show_school_name=false;"
q "select school_name from public.get_community_profile_extended('<that-id>');"
```
Expected: `school_name` is `null`. Then restore: `q "update public.community_profile_settings set show_school_name=true where user_id='<that-id>';"` (or delete the row if you inserted it).

- [ ] **Step 5: Commit**

```bash
git add -f caat-frontend/supabase/migrations/20260703100000_secure_community_profile_rpcs.sql
git commit -m "fix(security): revoke anon exec on community profile RPCs, honor visibility flags"
```

---

### Task 2: Stop private-group posts leaking via search and profile feeds (A3)

`searchPostsAction` (`app/(main)/communities/actions.ts:717-756`) and `fetchPostsByUserAction` (`:668-713`) never filter `group_id`, so a non-member surfaces private-group post bodies. The main feed uses `.is("group_id", null)`; apply the same to these two.

**Files:**
- Modify: `caat-frontend/app/(main)/communities/actions.ts` (searchPostsAction ~717-756, fetchPostsByUserAction ~668-713)
- Test: `caat-frontend/tests/e2e/community-features.spec.ts` (add a case) — or manual verification (see Step 4).

**Interfaces:**
- Consumes: existing `canAccessGroup(supabase, groupId, userId)` at `actions.ts:48`.
- Produces: both feeds return only `group_id IS NULL` posts (public posts). Group-internal posts are reachable only from within the group view, which already gates on `canAccessGroup`.

- [ ] **Step 1: Add the group filter to `searchPostsAction`**

In the `q` builder in `searchPostsAction`, after `.eq("is_hidden", false)` add:

```ts
    .is("group_id", null)
```

- [ ] **Step 2: Add the same filter to `fetchPostsByUserAction`**

In `fetchPostsByUserAction` (~668-713), find its `community_posts` select chain and add `.is("group_id", null)` alongside its existing filters (it currently filters only visibility). This makes a user's profile show only their public posts, never their private-group posts.

- [ ] **Step 3: Typecheck + build**

Run (from `caat-frontend/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Verify the leak is closed (manual, live)**

Using the test account, create a private group, post inside it, then as the same account search for a word in that post and open your own profile page. Confirm the private-group post does NOT appear in search results or on the profile feed (it should only appear inside the group). Steps:
```bash
cd caat-frontend && npm run dev
```
Drive `/communities` in a browser signed in as `test@gmail.com`: create/enter a private group, post "phase0secretword", then use the search box for "phase0secretword" and visit `/communities/profile/<your-user-id>`. Neither should show the post.

- [ ] **Step 5: Commit**

```bash
git add "caat-frontend/app/(main)/communities/actions.ts"
git commit -m "fix(security): exclude private-group posts from search and profile feeds"
```

---

### Task 3: Make CAPTCHA + rate-limit unbypassable on auth (A2)

Today `preflightAuthAction` runs the checks but the Supabase auth call happens client-side and separately, so an attacker skips the preflight and calls Supabase directly. Fix by enabling **Supabase's native CAPTCHA** (enforced by the auth server itself) and passing the Turnstile token into the auth calls. Supabase's built-in auth rate limits then apply to the direct path too.

**Files:**
- Modify: `caat-frontend/components/login-form.tsx` (~57 the `signInWithPassword` call)
- Modify: `caat-frontend/components/signup-form.tsx` (the `signUp` call, ~82-86)
- Modify: `caat-frontend/app/forgot-password/page.tsx` (the `resetPasswordForEmail` call, ~44)
- Supabase dashboard: Auth > Attack Protection (manual, documented below)

**Interfaces:**
- Consumes: the existing `captchaToken` state already present in each form (the token from `TurnstileWidget`).
- Produces: all three auth calls pass `options.captchaToken`; Supabase rejects tokenless auth attempts server-side.

- [ ] **Step 1: Enable native CAPTCHA on the Supabase project (manual)**

In the Supabase dashboard for project `qgbdirrobbtfrwbwtvjm`: Authentication > Attack Protection > enable "Enable CAPTCHA protection", provider **Turnstile**, paste the **Turnstile secret key** (the same secret `verifyTurnstile` uses — from the project's env/secret store). Save. This makes the Auth server require a valid Turnstile token on sign-in/sign-up/reset. Document in the PR body that this dashboard change was made (it is not in code).

- [ ] **Step 2: Pass the token in `login-form.tsx`**

Change the sign-in call to include the token:

```ts
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: captchaToken ?? undefined },
      })
```

- [ ] **Step 3: Pass the token in `signup-form.tsx`**

In the `supabase.auth.signUp({...})` call (~82-86), add `captchaToken` to its `options` object (it already passes `options`):

```ts
        options: {
          // ...existing options (emailRedirectTo etc.)...
          captchaToken: captchaToken ?? undefined,
        },
```

- [ ] **Step 4: Pass the token in `forgot-password/page.tsx`**

```ts
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken: captchaToken ?? undefined,
      })
```
(Add `redirectTo` only if not already present; the key addition is `captchaToken`.)

- [ ] **Step 5: Typecheck**

Run (from `caat-frontend/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Verify end to end (live)**

With `npm run dev`, complete a normal login as `test@gmail.com` — it must still succeed (token flows through). Then confirm the server-side enforcement: a raw `curl` sign-in against the Supabase auth endpoint WITHOUT a captcha token should now be rejected:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  "https://qgbdirrobbtfrwbwtvjm.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY caat-frontend/.env.local | cut -d= -f2)" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@gmail.com","password":"testtest123"}'
```
Expected: a `400`/`403` captcha-required error (NOT `200`). If it still returns `200`, the dashboard setting in Step 1 did not take — recheck before proceeding.

- [ ] **Step 7: Commit**

```bash
git add caat-frontend/components/login-form.tsx caat-frontend/components/signup-form.tsx "caat-frontend/app/forgot-password/page.tsx"
git commit -m "fix(security): enforce CAPTCHA server-side via Supabase native attack protection"
```

---

### Task 4: Fail closed when abuse-protection env is missing in prod (A4)

`lib/rate-limit.ts`, `lib/turnstile.ts`, `components/TurnstileWidget.tsx` all silently no-op when their env vars are unset. A prod misconfig disables protection undetectably.

**Files:**
- Modify: `caat-frontend/lib/rate-limit.ts:11-24,57`
- Modify: `caat-frontend/lib/turnstile.ts:14-17`

**Interfaces:**
- Produces: in production (`process.env.NODE_ENV === "production"`), missing `UPSTASH_*` / `TURNSTILE_SECRET_KEY` causes a thrown error at first use (fail closed) instead of `{ok:true}`. In dev, keep the permissive no-op.

- [ ] **Step 1: Read the two files to see the exact no-op branches**

Run: `sed -n '1,60p' caat-frontend/lib/rate-limit.ts; sed -n '1,40p' caat-frontend/lib/turnstile.ts`

- [ ] **Step 2: In `turnstile.ts`, fail closed in prod**

Replace the "no secret → `{ok:true}`" early return so that when `process.env.NODE_ENV === "production"` and `!process.env.TURNSTILE_SECRET_KEY`, it returns `{ ok: false, error: "CAPTCHA is not configured" }` (fail closed). Keep the `{ok:true}` bypass only when `NODE_ENV !== "production"`.

- [ ] **Step 3: In `rate-limit.ts`, fail closed in prod**

In `gate()` where it returns `{ok:true}` because Redis is unconfigured: when `NODE_ENV === "production"` and the Upstash env is absent, return `{ ok: false, error: "Rate limiting is not configured" }`. Keep the permissive path for non-production only. (This is a safety net; Task 3's native CAPTCHA is the primary control.)

- [ ] **Step 4: Verify (unit-level)**

Add/extend a unit test asserting: with `NODE_ENV="production"` and no secret, `verifyTurnstile(undefined)` resolves `ok:false`; with `NODE_ENV="test"`, it stays permissive. Run: `npm run test:unit -- turnstile` (create `tests/unit/turnstile.test.ts` if none). Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add caat-frontend/lib/turnstile.ts caat-frontend/lib/rate-limit.ts caat-frontend/tests/unit/turnstile.test.ts
git commit -m "fix(security): fail closed on missing CAPTCHA/rate-limit config in production"
```

---

### Task 5: Tighten poll-vote and group-member read policies (A10)

`community_poll_votes` and `community_group_members` have `true` SELECT policies, de-anonymizing poll voters and exposing private-group rosters to any authenticated user.

**Files:**
- Create: `caat-frontend/supabase/migrations/20260703110000_tighten_community_read_policies.sql`

**Interfaces:**
- Produces: poll-vote rows readable only by their voter (aggregate counts come from the count query, not row reads); group-member rows readable only by members of that group or its creator.

- [ ] **Step 1: Inspect current policies**

```bash
q "select tablename, policyname, cmd, qual from pg_policies where tablename in ('community_poll_votes','community_group_members');"
```
Record the existing policy names to drop them by name.

- [ ] **Step 2: Confirm what the app actually needs before restricting**

Search the code for direct row reads (not counts) of these tables:
```bash
grep -rn "community_poll_votes\|community_group_members" caat-frontend/app caat-frontend/components caat-frontend/lib
```
If the app reads a member roster to render a group page, the new policy MUST still allow members to read their group's roster (the policy below does). If it reads individual poll-vote rows only to compute "did I vote", scope to `user_id = auth.uid()` (the policy below does). Adjust the policy to match real usage found here before applying.

- [ ] **Step 3: Write the migration**

```sql
-- caat-frontend/supabase/migrations/20260703110000_tighten_community_read_policies.sql
-- A10: poll votes readable only by the voter; group members readable only by
-- members of the same group or its creator. (Drop the permissive `true` policies
-- by their real names from Step 1 — placeholders below.)

drop policy if exists "<poll_votes_select_policy_name>" on public.community_poll_votes;
create policy poll_votes_select_own on public.community_poll_votes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "<group_members_select_policy_name>" on public.community_group_members;
create policy group_members_select_member on public.community_group_members
  for select to authenticated using (
    exists (select 1 from public.community_group_members m
            where m.group_id = community_group_members.group_id and m.user_id = auth.uid())
    or exists (select 1 from public.community_groups g
               where g.id = community_group_members.group_id and g.creator_id = auth.uid())
  );
```

- [ ] **Step 4: Apply + verify + regression-check the app**

```bash
q "$(cat caat-frontend/supabase/migrations/20260703110000_tighten_community_read_policies.sql)"
```
Expected `[]`. Then with `npm run dev` and the test account: open a poll and vote (the "you voted" state must still render — proves own-vote read works and counts still come from the count query), and open a group you're a member of (roster still renders). If either breaks, the policy is too tight — revisit Step 2.

- [ ] **Step 5: Commit**

```bash
git add -f caat-frontend/supabase/migrations/20260703110000_tighten_community_read_policies.sql
git commit -m "fix(security): restrict poll-vote and group-member row reads"
```

---

### Task 6: Quick-win hardening (A6, A7, A9)

Three small defense-in-depth fixes in one task.

**Files:**
- Modify: `caat-frontend/app/(main)/communities/actions.ts` (updatePrivacySettingsAction ~869-889; comment insert ~1256-1262 and update ~1355)
- Modify: `caat-frontend/app/(main)/documents/api.ts:219-232` (reuploadDocument)
- Modify: an existing schema file for the Zod schema (mirror where post/comment schemas live)

- [ ] **Step 1: A9 — add the missing `user_id` scope to reupload**

In `reuploadDocument` (`documents/api.ts:219-232`), add `.eq("user_id", user.id)` to the `update().eq("id", doc.id)` chain, matching every other write in that file.

- [ ] **Step 2: A6 — validate `updatePrivacySettingsAction` input**

Add a Zod schema allow-listing exactly the four booleans (`show_graduation_year`, `show_school_name`, `show_preferred_countries`, `show_target_majors`) plus optional `pinned_post_id`, parse `settings` through it before the upsert, and upsert only the parsed fields (never spread raw caller input). Follow the pattern used by the post/comment schemas already in the communities module.

- [ ] **Step 3: A7 — sanitize comment HTML on store**

Comments are currently stored raw (`actions.ts:1256-1262`, `:1355`) and rendered as escaped text today. For defense in depth, run comment `text`/`content` through the same `lib/sanitize-html.ts` allow-list used for posts, on insert and update, so a future switch to HTML rendering can't become stored XSS.

- [ ] **Step 4: Typecheck + targeted verify**

Run: `npm run typecheck` (PASS). With `npm run dev`: toggle a privacy setting (still saves), post a comment (still renders), reupload a document (still works, and the row is user-scoped).

- [ ] **Step 5: Commit**

```bash
git add "caat-frontend/app/(main)/communities/actions.ts" "caat-frontend/app/(main)/documents/api.ts"
git commit -m "fix(security): validate privacy settings, sanitize comments, scope reupload to owner"
```

---

## Deferred to later phases (do NOT do here)

- **A5** (add app-layer ownership checks on sensitive reads) — structural, belongs with the P1 typed-client/data-layer refactor.
- **A8** (nonce-based CSP) — involved; separate hardening PR after launch.
- The **resume-sharing** fix (spec A-note, Decision #7) is a feature fix, handled in P2/P4 with the scoped `SECURITY DEFINER` RPC.

## Phase verification gate (all must pass before opening the PR)

- [ ] `npm run typecheck` PASS, `npm run lint` clean, `npm run test:unit` PASS, `npm test` PASS, `npm run build` PASS (from `caat-frontend/`).
- [ ] Anon can no longer exec `get_community_profile_extended` (Task 1 Step 4).
- [ ] Private-group posts absent from search + profile feeds (Task 2 Step 4).
- [ ] Tokenless raw auth call is rejected by Supabase (Task 3 Step 6).
- [ ] Poll-vote self-read + group roster still work; cross-user reads blocked (Task 5 Step 4).
- [ ] Normal login/signup/reset still succeed end to end for `test@gmail.com`.

## PR

**Title:** `fix(security): Phase 0 — close audited security & privacy holes`

**Body:**
```
Phase 0 of the CAAT overhaul (see docs/superpowers/specs/2026-07-03-caat-overhaul-design.md, Workstream A).

- Revoke anon EXECUTE on community profile RPCs; honor community_profile_settings visibility flags (A1)
- Exclude private-group posts from search and profile feeds (A3)
- Enforce CAPTCHA server-side via Supabase native attack protection; pass captchaToken on login/signup/reset (A2)
- Fail closed on missing CAPTCHA/rate-limit config in production (A4)
- Restrict poll-vote and group-member row reads (A10)
- Validate privacy-settings input, sanitize comment HTML, scope document reupload to owner (A6/A7/A9)

DB changes are captured as migrations under caat-frontend/supabase/migrations/ and were
applied to the live project. One manual dashboard change: Supabase Auth > Attack Protection >
CAPTCHA enabled with the Turnstile secret (required for A2; not expressible in code).

The live PII leak on standardised_test_scores/_subjects was already closed by
migration 20260703093000 (RLS enabled + owner policies).

Deferred: A5 (app-layer read scoping) to P1, A8 (nonce CSP) to a later hardening PR.
```
