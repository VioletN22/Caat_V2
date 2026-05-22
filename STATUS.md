# Branch status — `feat/profile-driven-cohesion`

Implemented all three components from
`docs/superpowers/specs/2026-05-21-profile-driven-cohesion-design.md`:

1. **Profile-driven smart sort** on `/scholarships`, `/schools`, `/majors`.
   Matched items float to the top with a `★ Matches your …` badge using
   reason-as-badge templates from `lib/profile-match.ts`.
2. **Import from Bookmarks** button on `/applications`. Bulk-creates
   researching-status apps for every bookmarked school not yet tracked.
   Idempotent. Fresh rows get a `New` tag + yellow tint for the session.
3. **Unified deadlines** — both `UpcomingDeadlinesWidget` (list with
   App/Schol/Event source pills) and `CalendarWidget` (coloured dots
   beneath the date number, legend, deadlines listed in the detail panel
   alongside events).
4. **Bonus:** `BookmarkedSchoolsWidget` shows a small green ✓ next to
   schools that already have an application row.

## Verified by automation

| Check | Result |
|-------|--------|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 warnings) |
| `npm run test:unit` | 140 tests pass (29 new across `profile-match.test.ts` + `unified-deadlines.test.ts`) |
| `npm test` (smoke) | pass |
| `npm run build` (production build, all routes) | pass |
| Dev server boots, `/login` returns 200 | pass |

## NOT verified (needs human eyes with a populated test account)

- Smart-sort visual correctness on /scholarships, /schools, /majors with
  a real profile that has `target_majors` + `preferred_countries` +
  `nationality` set.
- "Import from Bookmarks" button actually inserts rows end-to-end
  (requires bookmarked schools in the live DB; behaviour is well-tested
  at the unit level via `importBookmarkedSchools`).
- Calendar dot rendering when a date has multiple sources (overlap of
  app + scholarship deadlines on the same day) — checked the JSX path
  but didn't see the rendered output.
- Playwright e2e suite with auth — `tests/e2e/*.spec.ts` exists but
  needs test credentials I didn't have.

## Known limitations to flag

- **Schools smart-sort is page-local.** A matched school on page 5 won't
  jump to page 1 — sort is applied within the 24-school server-paginated
  page. Cross-page sort would need fetching all schools first. The
  scholarships and majors pages don't have this limitation since they
  load the full dataset.
- **Citizenship match** uses a small `NATIONALITY_TO_COUNTRY` map
  (currently only `Australian → Australia`). Add entries as new
  nationalities become common in the user base. International eligibility
  works for any nationality.
- **Reason template wording** is locked but easy to tune in
  `lib/profile-match.ts`'s `reasonFor()` function. 16 unit tests cover
  every branch.

## Suggested human verification steps

1. Log in as a populated test account (with target_majors, preferred_countries,
   nationality, and a few bookmarked schools).
2. Visit `/scholarships` — verify matched items have the red badge + red
   left border and sort to the top.
3. Bookmark a school in `/schools`, then visit `/applications` — verify
   the **Import from Bookmarks** button appears with the correct red count.
4. Click Import — verify a `Researching` row appears with the `New` tag
   and yellow tint, toast confirms.
5. Visit the dashboard — verify `UpcomingDeadlinesWidget` shows source
   pills, and the `CalendarWidget` shows coloured dots on dates with
   app/scholarship/event entries.
6. Click a date on the calendar with both an event and a deadline — verify
   both appear in the right-side detail panel.

## Commit log on this branch (relative to main)

```
e1d0a43 docs: profile-driven cohesion design spec
bc5858c docs: implementation plan for profile-driven cohesion
(implementation begins)
```

Each implementation task lands as its own commit so any single piece
can be reverted independently.
