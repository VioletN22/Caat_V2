# Profile-Driven Cohesion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CAAT's profile data actually drive Scholarships/Schools/Majors sort, add a one-click bookmark→application bridge, and unify deadlines across applications/scholarships/calendar events.

**Architecture:** Two pure-helper libraries (`lib/profile-match.ts`, `lib/unified-deadlines.ts`) hold all business logic and are unit-tested in isolation. UI components consume them. No schema changes. Server components fetch the user's profile and pass it as a prop to client components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Supabase SSR/browser SDK, Vitest for unit tests, Lucide icons.

---

## File map

### New files
- `caat-frontend/lib/profile-match.ts`
- `caat-frontend/lib/unified-deadlines.ts`
- `caat-frontend/tests/unit/profile-match.test.ts`
- `caat-frontend/tests/unit/unified-deadlines.test.ts`

### Modified files
- `caat-frontend/app/(main)/scholarships/page.tsx`
- `caat-frontend/app/(main)/scholarships/client.tsx`
- `caat-frontend/components/scholarships/scholarship-card.tsx`
- `caat-frontend/app/(main)/schools/page.tsx`
- `caat-frontend/app/(main)/majors/page.tsx`
- `caat-frontend/app/(main)/majors/client.tsx`
- `caat-frontend/components/majors/major-card.tsx`
- `caat-frontend/app/(main)/applications/api.ts`
- `caat-frontend/app/(main)/applications/client.tsx`
- `caat-frontend/components/dashboard/widgets/BookmarkedSchoolsWidget.tsx`
- `caat-frontend/components/dashboard/widgets/UpcomingDeadlinesWidget.tsx`
- `caat-frontend/components/dashboard/widgets/CalendarWidget.tsx`

### Conventions
- All commands run from `caat-frontend/` unless stated otherwise.
- Unit tests use `npm run test:unit` (Vitest, configured at `vitest.config.mts`).
- Commit after each task.

---

## Phase 1: Foundation libraries (TDD)

### Task 1: Scaffold `profile-match.ts` and the `reasonFor` template

**Files:**
- Create: `caat-frontend/lib/profile-match.ts`
- Create: `caat-frontend/tests/unit/profile-match.test.ts`

- [ ] **Step 1.1: Write failing tests for `reasonFor`**

File: `caat-frontend/tests/unit/profile-match.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { reasonFor, type MatchDimensions } from "@/lib/profile-match";

function dims(p: Partial<MatchDimensions> = {}): MatchDimensions {
  return {
    matchedMajor: null,
    matchedCountry: null,
    citizenshipEligible: false,
    levelMatches: false,
    ...p,
  };
}

describe("reasonFor()", () => {
  it("returns null when no dimension matches", () => {
    expect(reasonFor(dims())).toBeNull();
  });

  it("returns null when only level matches (level alone is too thin)", () => {
    expect(reasonFor(dims({ levelMatches: true }))).toBeNull();
  });

  it("returns major-only template", () => {
    expect(reasonFor(dims({ matchedMajor: "Engineering" }))).toBe(
      "Matches your Engineering"
    );
  });

  it("returns country-only template with country name", () => {
    expect(reasonFor(dims({ matchedCountry: "Australia" }))).toBe(
      "In your preferred country (Australia)"
    );
  });

  it("returns citizenship-only template", () => {
    expect(reasonFor(dims({ citizenshipEligible: true }))).toBe(
      "Open to your nationality"
    );
  });

  it("returns major+country template", () => {
    expect(
      reasonFor(dims({ matchedMajor: "Computer Science", matchedCountry: "United States" }))
    ).toBe("Matches your Computer Science in your preferred country");
  });

  it("returns major+citizenship template", () => {
    expect(
      reasonFor(dims({ matchedMajor: "Engineering", citizenshipEligible: true }))
    ).toBe("Matches Engineering, open to internationals");
  });

  it("returns country+citizenship template", () => {
    expect(
      reasonFor(dims({ matchedCountry: "Australia", citizenshipEligible: true }))
    ).toBe("In your preferred country, open to your nationality");
  });

  it("returns 'Strong match' template when 3+ dimensions match", () => {
    expect(
      reasonFor(
        dims({
          matchedMajor: "Engineering",
          matchedCountry: "United States",
          levelMatches: true,
        })
      )
    ).toBe("Strong match — your major, country and level");
  });

  it("returns 'Strong match' template when all 4 dimensions match", () => {
    expect(
      reasonFor(
        dims({
          matchedMajor: "Engineering",
          matchedCountry: "United States",
          citizenshipEligible: true,
          levelMatches: true,
        })
      )
    ).toBe("Strong match — your major, country and level");
  });
});
```

- [ ] **Step 1.2: Run test and verify it FAILS**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/profile-match.test.ts
```

Expected: every test fails (`Cannot find module '@/lib/profile-match'`).

- [ ] **Step 1.3: Create `profile-match.ts` with minimal implementation**

File: `caat-frontend/lib/profile-match.ts`

```ts
/**
 * Pure helpers for matching a user's profile against scholarships, schools,
 * and majors. Used to surface a "★ Matches your …" badge and sort matched
 * items to the top of browse pages.
 *
 * No React or Supabase dependencies — call from server or client.
 */

import type { ProfileRow } from "@/types/profile";
import type { ScholarshipRow } from "@/types/scholarships";
import type { Major } from "@/types/majors";

export interface MatchDimensions {
  /** The user target-major that matched, e.g. "Computer Science" */
  matchedMajor: string | null;
  /** The country that matched the user's preferred_countries, e.g. "Australia" */
  matchedCountry: string | null;
  /** True if the user's nationality is eligible for this item */
  citizenshipEligible: boolean;
  /** True if the user's stage (undergrad/postgrad) matches the item's level */
  levelMatches: boolean;
}

export interface MatchResult {
  /** Number of substantive dimensions matched. Used for sort order. 0 = no match. */
  score: number;
  /** Human-readable reason string. null when no substantive dimension matches. */
  reason: string | null;
}

/**
 * Generate the human-readable badge text from a set of matched dimensions.
 *
 * Templates (in order of specificity):
 *   - 3+ dimensions: "Strong match — your major, country and level"
 *   - major + country: "Matches your <major> in your preferred country"
 *   - major + citizenship: "Matches <major>, open to internationals"
 *   - country + citizenship: "In your preferred country, open to your nationality"
 *   - major only: "Matches your <major>"
 *   - country only: "In your preferred country (<country>)"
 *   - citizenship only: "Open to your nationality"
 *   - level only / nothing: null (level alone is too thin to surface)
 */
export function reasonFor(d: MatchDimensions): string | null {
  const substantiveCount =
    (d.matchedMajor ? 1 : 0) +
    (d.matchedCountry ? 1 : 0) +
    (d.citizenshipEligible ? 1 : 0);

  if (substantiveCount === 0) return null;

  const totalCount = substantiveCount + (d.levelMatches ? 1 : 0);
  if (totalCount >= 3) return "Strong match — your major, country and level";

  // 2-dimension templates
  if (d.matchedMajor && d.matchedCountry) {
    return `Matches your ${d.matchedMajor} in your preferred country`;
  }
  if (d.matchedMajor && d.citizenshipEligible) {
    return `Matches ${d.matchedMajor}, open to internationals`;
  }
  if (d.matchedCountry && d.citizenshipEligible) {
    return `In your preferred country, open to your nationality`;
  }

  // 1-dimension templates
  if (d.matchedMajor) return `Matches your ${d.matchedMajor}`;
  if (d.matchedCountry) return `In your preferred country (${d.matchedCountry})`;
  if (d.citizenshipEligible) return `Open to your nationality`;

  return null;
}

// matchScholarship, matchSchool, matchMajor land in subsequent tasks.
```

- [ ] **Step 1.4: Run tests and verify all PASS**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/profile-match.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add caat-frontend/lib/profile-match.ts caat-frontend/tests/unit/profile-match.test.ts
git commit -m "feat(match): add reasonFor template for profile-match badges"
```

---

### Task 2: Implement `matchScholarship`

**Files:**
- Modify: `caat-frontend/lib/profile-match.ts`
- Modify: `caat-frontend/tests/unit/profile-match.test.ts`

- [ ] **Step 2.1: Append failing tests for `matchScholarship`**

Add to `caat-frontend/tests/unit/profile-match.test.ts`:

```ts
import { matchScholarship } from "@/lib/profile-match";
import type { ProfileRow } from "@/types/profile";
import type { ScholarshipRow } from "@/types/scholarships";

function makeProfile(p: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "u1",
    first_name: null, last_name: null, email: null, birth_date: null,
    phone: null, linkedin: null, github: null, avatar_url: null,
    nationality: null, current_location: null, school_name: null,
    curriculum: null, graduation_year: null,
    target_majors: null, preferred_countries: null, activities: null,
    default_resume_id: null,
    ...p,
  };
}

function makeScholarship(s: Partial<ScholarshipRow> = {}): ScholarshipRow {
  return {
    id: "s1", slug: null, external_id: null, external_url: null,
    title: "Some Scholarship", provider_name: "Some Uni", description: null,
    amount_value: null, amount_currency: null, amount_display: null,
    awards_count: null, frequency: null,
    study_level: [], funding_type: [],
    eligible_countries: [], excluded_countries: [],
    citizenships: [], eligible_genders: [],
    minimum_gpa: null, requires_essay: null,
    need_based: false, merit_based: false,
    school_name: null, country: null, state_region: null,
    application_open_at: null, deadline_at: null, start_term: null,
    is_recurring: false, is_active: true, is_featured: false,
    last_verified_at: null, source_last_synced_at: null,
    tags: [], eligibility_summary: null,
    application_requirements: null, contact_info: null, raw_payload: null,
    created_at: "", updated_at: "",
    ...s,
  };
}

describe("matchScholarship()", () => {
  it("returns score 0, reason null for null profile", () => {
    const result = matchScholarship(null, makeScholarship());
    expect(result).toEqual({ score: 0, reason: null });
  });

  it("returns no match when profile is empty", () => {
    const result = matchScholarship(makeProfile(), makeScholarship());
    expect(result.score).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("matches by major found in scholarship title", () => {
    const profile = makeProfile({ target_majors: ["Computer Science"] });
    const sch = makeScholarship({ title: "MIT Computer Science Award" });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBe(1);
    expect(result.reason).toBe("Matches your Computer Science");
  });

  it("matches by major found in description case-insensitively", () => {
    const profile = makeProfile({ target_majors: ["Engineering"] });
    const sch = makeScholarship({ title: "Generic Award", description: "Open to engineering students." });
    const result = matchScholarship(profile, sch);
    expect(result.reason).toBe("Matches your Engineering");
  });

  it("matches by country in preferred_countries", () => {
    const profile = makeProfile({ preferred_countries: ["United States", "Australia"] });
    const sch = makeScholarship({ country: "Australia" });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBe(1);
    expect(result.reason).toBe("In your preferred country (Australia)");
  });

  it("matches major + country", () => {
    const profile = makeProfile({
      target_majors: ["Engineering"],
      preferred_countries: ["United States"],
    });
    const sch = makeScholarship({
      title: "MIT Engineering Award",
      country: "United States",
    });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBe(2);
    expect(result.reason).toBe("Matches your Engineering in your preferred country");
  });

  it("identifies citizenship eligibility for international scholarship", () => {
    const profile = makeProfile({ nationality: "India" });
    const sch = makeScholarship({ citizenships: ["INTERNATIONAL"] });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBe(1);
    expect(result.reason).toBe("Open to your nationality");
  });

  it("treats empty citizenships array as 'no restriction' (eligible to all)", () => {
    const profile = makeProfile({ nationality: "India" });
    const sch = makeScholarship({ citizenships: [] });
    // No restriction means eligible, but we don't surface it as a reason on its
    // own — open-to-all isn't a match signal. Only explicit INTERNATIONAL or
    // matching domestic code should count.
    const result = matchScholarship(profile, sch);
    expect(result.reason).toBeNull();
  });

  it("matches Australian domestic code (AU)", () => {
    const profile = makeProfile({ nationality: "Australian" });
    const sch = makeScholarship({ country: "Australia", citizenships: ["AU"] });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.reason).not.toBeNull();
  });

  it("Strong match template when major + country + undergrad level all hit", () => {
    const profile = makeProfile({
      target_majors: ["Engineering"],
      preferred_countries: ["United States"],
      graduation_year: 2026,
    });
    const sch = makeScholarship({
      title: "Engineering Award",
      country: "United States",
      study_level: ["undergraduate"],
    });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBe(3);
    expect(result.reason).toBe("Strong match — your major, country and level");
  });

  it("level alone never triggers a match", () => {
    const profile = makeProfile({ graduation_year: 2026 });
    const sch = makeScholarship({ study_level: ["undergraduate"] });
    const result = matchScholarship(profile, sch);
    expect(result.score).toBe(0);
    expect(result.reason).toBeNull();
  });
});
```

- [ ] **Step 2.2: Run tests and verify they FAIL**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/profile-match.test.ts
```

Expected: new `matchScholarship` tests fail (function not exported). Existing `reasonFor` tests still pass.

- [ ] **Step 2.3: Implement `matchScholarship`**

Append to `caat-frontend/lib/profile-match.ts`:

```ts
// ─── Country / citizenship helpers ────────────────────────────────────────────
// Mirrors lib used by app/(main)/scholarships/client.tsx so behaviour stays in
// sync. Keep this list maintained as we add countries.

const DOMESTIC_CODES: Record<string, string[]> = {
  Australia: ["AU", "AU-PR"],
};

const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  Australian: "Australia",
  // Add more as the user base grows. Anything not listed falls through to
  // international-only matching.
};

function isCitizenshipEligible(
  nationality: string | null,
  scholarship: ScholarshipRow
): boolean {
  if (!nationality) return false;
  const cits = Array.isArray(scholarship.citizenships) ? scholarship.citizenships : [];
  // Empty = open to all. We deliberately don't count this as a match signal
  // since it provides no personalisation information.
  if (cits.length === 0) return false;

  const homeCountry = NATIONALITY_TO_COUNTRY[nationality];
  if (homeCountry && scholarship.country === homeCountry) {
    const domesticCodes = DOMESTIC_CODES[homeCountry] ?? [];
    if (domesticCodes.some((c) => cits.includes(c))) return true;
  }
  // Otherwise the user is international relative to this scholarship.
  return cits.includes("INTERNATIONAL");
}

function findMajorMatch(
  targetMajors: string[] | null | undefined,
  scholarship: ScholarshipRow
): string | null {
  if (!targetMajors?.length) return null;
  const haystack = [
    scholarship.title,
    scholarship.description ?? "",
    ...scholarship.tags,
  ]
    .join(" ")
    .toLowerCase();
  for (const m of targetMajors) {
    if (!m) continue;
    if (haystack.includes(m.toLowerCase())) return m;
  }
  return null;
}

function findCountryMatch(
  preferredCountries: string[] | null | undefined,
  country: string | null
): string | null {
  if (!preferredCountries?.length || !country) return null;
  return preferredCountries.includes(country) ? country : null;
}

function levelMatches(
  graduationYear: number | null | undefined,
  studyLevel: string[]
): boolean {
  if (!graduationYear || studyLevel.length === 0) return false;
  // Heuristic: someone with a graduation year on a high-school timeline is
  // undergrad-bound. We don't model postgrad explicitly here — adopters can
  // refine the heuristic when post-grad use-cases land.
  const now = new Date().getFullYear();
  const looksLikeHighSchooler = graduationYear >= now && graduationYear <= now + 5;
  if (looksLikeHighSchooler && studyLevel.includes("undergraduate")) return true;
  return false;
}

export function matchScholarship(
  profile: ProfileRow | null,
  s: ScholarshipRow
): MatchResult {
  if (!profile) return { score: 0, reason: null };

  const matchedMajor = findMajorMatch(profile.target_majors, s);
  const matchedCountry = findCountryMatch(profile.preferred_countries, s.country);
  const citizenshipEligible = isCitizenshipEligible(profile.nationality, s);
  const lvlMatch = levelMatches(profile.graduation_year, s.study_level);

  const dimensions: MatchDimensions = {
    matchedMajor,
    matchedCountry,
    citizenshipEligible,
    levelMatches: lvlMatch,
  };
  const reason = reasonFor(dimensions);
  const score = reason
    ? (matchedMajor ? 1 : 0) +
      (matchedCountry ? 1 : 0) +
      (citizenshipEligible ? 1 : 0) +
      (lvlMatch ? 1 : 0)
    : 0;
  return { score, reason };
}
```

- [ ] **Step 2.4: Run tests and verify all PASS**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/profile-match.test.ts
```

Expected: all `reasonFor` + `matchScholarship` tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add caat-frontend/lib/profile-match.ts caat-frontend/tests/unit/profile-match.test.ts
git commit -m "feat(match): implement matchScholarship for profile-driven sort"
```

---

### Task 3: Implement `matchSchool` and `matchMajor`

**Files:**
- Modify: `caat-frontend/lib/profile-match.ts`
- Modify: `caat-frontend/tests/unit/profile-match.test.ts`

- [ ] **Step 3.1: Append failing tests**

```ts
import { matchSchool, matchMajor } from "@/lib/profile-match";
import type { Major } from "@/types/majors";

interface SchoolForMatch {
  id: number; name: string; country: string | null;
}

describe("matchSchool()", () => {
  const school = (s: Partial<SchoolForMatch> = {}): SchoolForMatch => ({
    id: 1, name: "Some Uni", country: null, ...s,
  });

  it("returns no match for null profile", () => {
    expect(matchSchool(null, school())).toEqual({ score: 0, reason: null });
  });

  it("returns no match when school country not in preferred_countries", () => {
    const profile = makeProfile({ preferred_countries: ["United States"] });
    const result = matchSchool(profile, school({ country: "Canada" }));
    expect(result.score).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("matches when school country IS in preferred_countries", () => {
    const profile = makeProfile({ preferred_countries: ["United States"] });
    const result = matchSchool(profile, school({ country: "United States" }));
    expect(result.score).toBe(1);
    expect(result.reason).toBe("In your preferred country (United States)");
  });

  it("matches major + country when offeredMajors include a target_major (case-insensitive)", () => {
    const profile = makeProfile({
      target_majors: ["Computer Science"],
      preferred_countries: ["United States"],
    });
    const result = matchSchool(
      profile,
      school({ country: "United States" }),
      ["computer science", "biology"]
    );
    expect(result.score).toBe(2);
    expect(result.reason).toBe("Matches your Computer Science in your preferred country");
  });

  it("country alone still counts if offeredMajors is undefined", () => {
    const profile = makeProfile({
      target_majors: ["Engineering"],
      preferred_countries: ["Australia"],
    });
    const result = matchSchool(profile, school({ country: "Australia" }));
    expect(result.score).toBe(1);
    expect(result.reason).toBe("In your preferred country (Australia)");
  });
});

describe("matchMajor()", () => {
  const major = (m: Partial<Major> = {}): Major => ({
    id: "m1", name: "Computer Science", category: "Engineering",
    description: null, career_paths: [], typical_coursework: [],
    qs_ranking_url: null, created_at: "", ...m,
  });

  it("returns no match for null profile", () => {
    expect(matchMajor(null, major())).toEqual({ score: 0, reason: null });
  });

  it("matches when major name appears in target_majors (case-insensitive)", () => {
    const profile = makeProfile({ target_majors: ["computer science"] });
    const result = matchMajor(profile, major({ name: "Computer Science" }));
    expect(result.score).toBe(1);
    expect(result.reason).toBe("Matches your Computer Science");
  });

  it("no match when target_majors don't include this major's name", () => {
    const profile = makeProfile({ target_majors: ["Biology"] });
    const result = matchMajor(profile, major({ name: "Computer Science" }));
    expect(result.score).toBe(0);
    expect(result.reason).toBeNull();
  });
});
```

- [ ] **Step 3.2: Run tests, verify they FAIL**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/profile-match.test.ts
```

Expected: new tests fail.

- [ ] **Step 3.3: Implement `matchSchool` and `matchMajor`**

Append to `caat-frontend/lib/profile-match.ts`:

```ts
// ─── School match ────────────────────────────────────────────────────────────
// Schools have two possible dimensions: country (required for a match) and
// whether the school offers one of the user's target majors. Major signal
// alone is NOT sufficient — country is the gate.

export interface SchoolForMatch {
  id: number;
  name: string;
  country: string | null;
}

export function matchSchool(
  profile: ProfileRow | null,
  school: SchoolForMatch,
  offeredMajors?: string[]
): MatchResult {
  if (!profile) return { score: 0, reason: null };

  const matchedCountry = findCountryMatch(profile.preferred_countries, school.country);
  if (!matchedCountry) return { score: 0, reason: null };

  let matchedMajor: string | null = null;
  if (offeredMajors?.length && profile.target_majors?.length) {
    const offered = offeredMajors.map((m) => m.toLowerCase());
    for (const tm of profile.target_majors) {
      if (!tm) continue;
      if (offered.includes(tm.toLowerCase())) {
        matchedMajor = tm;
        break;
      }
    }
  }

  const dimensions: MatchDimensions = {
    matchedMajor,
    matchedCountry,
    citizenshipEligible: false,
    levelMatches: false,
  };
  const reason = reasonFor(dimensions);
  const score = reason
    ? (matchedMajor ? 1 : 0) + (matchedCountry ? 1 : 0)
    : 0;
  return { score, reason };
}

// ─── Major match ─────────────────────────────────────────────────────────────
// Pure name-equality (case-insensitive) against the user's target_majors.

export function matchMajor(
  profile: ProfileRow | null,
  major: Major
): MatchResult {
  if (!profile?.target_majors?.length) return { score: 0, reason: null };
  const lowercased = profile.target_majors.map((m) => m.toLowerCase());
  if (!lowercased.includes(major.name.toLowerCase())) {
    return { score: 0, reason: null };
  }
  return {
    score: 1,
    reason: `Matches your ${major.name}`,
  };
}
```

- [ ] **Step 3.4: Run tests, verify all PASS**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/profile-match.test.ts
```

- [ ] **Step 3.5: Commit**

```bash
git add caat-frontend/lib/profile-match.ts caat-frontend/tests/unit/profile-match.test.ts
git commit -m "feat(match): implement matchSchool and matchMajor"
```

---

### Task 4: Create `unified-deadlines.ts`

**Files:**
- Create: `caat-frontend/lib/unified-deadlines.ts`
- Create: `caat-frontend/tests/unit/unified-deadlines.test.ts`

- [ ] **Step 4.1: Write failing tests for the pure merge/sort helper**

We isolate the I/O (Supabase fetch) from the pure transform so the transform is unit-testable. The Supabase call returns three arrays of raw rows; the pure helper merges and sorts them.

File: `caat-frontend/tests/unit/unified-deadlines.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  mergeDeadlines,
  type RawAppDeadline,
  type RawScholarshipDeadline,
  type RawEventDeadline,
} from "@/lib/unified-deadlines";

describe("mergeDeadlines()", () => {
  it("returns empty array when all sources are empty", () => {
    expect(mergeDeadlines([], [], [], "2026-05-21")).toEqual([]);
  });

  it("filters past-dated items relative to today", () => {
    const apps: RawAppDeadline[] = [
      { id: "a1", school_name: "Past Uni", deadline_at: "2026-05-01", status: "applying" },
      { id: "a2", school_name: "Future Uni", deadline_at: "2026-06-01", status: "applying" },
    ];
    const result = mergeDeadlines(apps, [], [], "2026-05-21");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Future Uni");
  });

  it("filters out apps with withdrawn or rejected status", () => {
    const apps: RawAppDeadline[] = [
      { id: "a1", school_name: "Withdrawn Uni", deadline_at: "2026-06-01", status: "withdrawn" },
      { id: "a2", school_name: "Rejected Uni", deadline_at: "2026-06-01", status: "rejected" },
      { id: "a3", school_name: "Active Uni", deadline_at: "2026-06-01", status: "applying" },
    ];
    const result = mergeDeadlines(apps, [], [], "2026-05-21");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Active Uni");
  });

  it("merges all three sources and sorts by date ascending", () => {
    const apps: RawAppDeadline[] = [
      { id: "a1", school_name: "Late App", deadline_at: "2026-08-01", status: "applying" },
    ];
    const schols: RawScholarshipDeadline[] = [
      { id: "s1", title: "Mid Scholarship", deadline_at: "2026-07-01" },
    ];
    const events: RawEventDeadline[] = [
      { id: "e1", title: "Early Event", event_date: "2026-06-01" },
    ];
    const result = mergeDeadlines(apps, schols, events, "2026-05-21");
    expect(result.map((r) => r.title)).toEqual([
      "Early Event",
      "Mid Scholarship",
      "Late App",
    ]);
  });

  it("labels each item with its source", () => {
    const result = mergeDeadlines(
      [{ id: "a1", school_name: "Uni", deadline_at: "2026-06-01", status: "applying" }],
      [{ id: "s1", title: "Schol", deadline_at: "2026-06-02" }],
      [{ id: "e1", title: "Event", event_date: "2026-06-03" }],
      "2026-05-21"
    );
    expect(result[0].source).toBe("app");
    expect(result[1].source).toBe("scholarship");
    expect(result[2].source).toBe("event");
  });

  it("namespaces ids by source to avoid collisions", () => {
    const result = mergeDeadlines(
      [{ id: "1", school_name: "U", deadline_at: "2026-06-01", status: "applying" }],
      [{ id: "1", title: "S", deadline_at: "2026-06-02" }],
      [{ id: "1", title: "E", event_date: "2026-06-03" }],
      "2026-05-21"
    );
    expect(result.map((r) => r.id)).toEqual(["app-1", "sch-1", "evt-1"]);
  });

  it("preserves time_start/time_end on events", () => {
    const events: RawEventDeadline[] = [
      { id: "e1", title: "SAT", event_date: "2026-06-01", time_start: "09:00", time_end: "12:00" },
    ];
    const result = mergeDeadlines([], [], events, "2026-05-21");
    expect(result[0].timeStart).toBe("09:00");
    expect(result[0].timeEnd).toBe("12:00");
  });

  it("today's deadline counts as future (not filtered)", () => {
    const apps: RawAppDeadline[] = [
      { id: "a1", school_name: "Today Uni", deadline_at: "2026-05-21", status: "applying" },
    ];
    const result = mergeDeadlines(apps, [], [], "2026-05-21");
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 4.2: Run tests, verify FAIL**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/unified-deadlines.test.ts
```

- [ ] **Step 4.3: Create `unified-deadlines.ts`**

File: `caat-frontend/lib/unified-deadlines.ts`

```ts
/**
 * Unified deadlines — merge user_school_applications, bookmarked
 * scholarships, and calendar_events into one chronological feed.
 *
 * The fetch and the pure merge are split so the merge can be unit-tested
 * without hitting Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DeadlineSource = "app" | "scholarship" | "event";

export interface UnifiedDeadline {
  /** Namespaced id: "app-<uuid>", "sch-<uuid>", "evt-<uuid>" */
  id: string;
  source: DeadlineSource;
  title: string;
  /** ISO date "YYYY-MM-DD" */
  dateISO: string;
  /** Where to navigate when this row is clicked */
  href: string;
  /** Optional times — only events have these */
  timeStart?: string;
  timeEnd?: string;
}

// Raw inputs for the pure merge function.
export interface RawAppDeadline {
  id: string;
  school_name: string;
  deadline_at: string;
  status: string;
}
export interface RawScholarshipDeadline {
  id: string;
  title: string;
  deadline_at: string;
}
export interface RawEventDeadline {
  id: string;
  title: string;
  event_date: string;
  time_start?: string | null;
  time_end?: string | null;
}

const HIDDEN_APP_STATUSES = new Set(["withdrawn", "rejected"]);

/**
 * Pure merge — no I/O. Combines three raw arrays into a sorted UnifiedDeadline list.
 * Filters past-dated items relative to `todayISO` (inclusive: today is kept).
 */
export function mergeDeadlines(
  apps: RawAppDeadline[],
  scholarships: RawScholarshipDeadline[],
  events: RawEventDeadline[],
  todayISO: string
): UnifiedDeadline[] {
  const merged: UnifiedDeadline[] = [];

  for (const a of apps) {
    if (HIDDEN_APP_STATUSES.has(a.status)) continue;
    if (a.deadline_at < todayISO) continue;
    merged.push({
      id: `app-${a.id}`,
      source: "app",
      title: a.school_name,
      dateISO: a.deadline_at,
      href: "/applications",
    });
  }

  for (const s of scholarships) {
    if (s.deadline_at < todayISO) continue;
    merged.push({
      id: `sch-${s.id}`,
      source: "scholarship",
      title: s.title,
      dateISO: s.deadline_at.slice(0, 10), // tolerate timestamptz
      href: `/scholarships/${s.id}`,
    });
  }

  for (const e of events) {
    if (e.event_date < todayISO) continue;
    merged.push({
      id: `evt-${e.id}`,
      source: "event",
      title: e.title,
      dateISO: e.event_date,
      href: "/dashboard",
      timeStart: e.time_start ?? undefined,
      timeEnd: e.time_end ?? undefined,
    });
  }

  merged.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return merged;
}

/**
 * Fetch + merge. Pass a Supabase client (browser or server) and userId.
 * Returns sorted UnifiedDeadline list filtered to today and later.
 */
export async function fetchUnifiedDeadlines(
  supabase: SupabaseClient,
  userId: string
): Promise<UnifiedDeadline[]> {
  const todayISO = new Date().toISOString().split("T")[0];

  const [appRes, schRes, evtRes] = await Promise.all([
    supabase
      .from("user_school_applications")
      .select("id, deadline_at, status, schools(name)")
      .eq("user_id", userId)
      .not("deadline_at", "is", null),
    supabase
      .from("user_bookmarked_scholarships")
      .select("scholarship_id, scholarships(id, title, deadline_at)")
      .eq("user_id", userId),
    supabase
      .from("calendar_events")
      .select("id, title, event_date, time_start, time_end")
      .eq("user_id", userId),
  ]);

  const apps: RawAppDeadline[] = (appRes.data ?? []).flatMap((row: unknown) => {
    const r = row as {
      id: string;
      deadline_at: string;
      status: string;
      schools: { name: string } | null;
    };
    if (!r.deadline_at || !r.schools) return [];
    return [{ id: r.id, school_name: r.schools.name, deadline_at: r.deadline_at, status: r.status }];
  });

  const schols: RawScholarshipDeadline[] = (schRes.data ?? []).flatMap((row: unknown) => {
    const r = row as {
      scholarship_id: string;
      scholarships: { id: string; title: string; deadline_at: string | null } | null;
    };
    if (!r.scholarships?.deadline_at) return [];
    return [{ id: r.scholarships.id, title: r.scholarships.title, deadline_at: r.scholarships.deadline_at }];
  });

  const evts: RawEventDeadline[] = (evtRes.data ?? []).map((row: unknown) => {
    const r = row as {
      id: string;
      title: string;
      event_date: string;
      time_start: string | null;
      time_end: string | null;
    };
    return { id: r.id, title: r.title, event_date: r.event_date, time_start: r.time_start, time_end: r.time_end };
  });

  return mergeDeadlines(apps, schols, evts, todayISO);
}
```

- [ ] **Step 4.4: Run tests, verify PASS**

```bash
cd caat-frontend && npm run test:unit -- tests/unit/unified-deadlines.test.ts
```

- [ ] **Step 4.5: Commit**

```bash
git add caat-frontend/lib/unified-deadlines.ts caat-frontend/tests/unit/unified-deadlines.test.ts
git commit -m "feat(deadlines): add unified-deadlines merge helper with tests"
```

---

## Phase 2: Smart-sort UI wiring

### Task 5: Add match badge to `ScholarshipCard`

**Files:**
- Modify: `caat-frontend/components/scholarships/scholarship-card.tsx`

- [ ] **Step 5.1: Add `matchReason` prop and render badge**

In `caat-frontend/components/scholarships/scholarship-card.tsx`, change the `Props` interface and add the badge:

Replace the `Props` interface:

```ts
interface Props {
  scholarship: Scholarship;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  /** When set, render a red "★ For You" badge above the university line */
  matchReason?: string | null;
}
```

Update the function signature destructure:

```ts
export default function ScholarshipCard({
  scholarship,
  isBookmarked,
  onToggleBookmark,
  matchReason,
}: Props) {
```

In the JSX, replace the `<Card …>` opening with:

```tsx
<Card className={`flex flex-col h-[420px] overflow-hidden hover:shadow-lg transition-shadow ${matchReason ? "border-l-[3px] border-l-[#9a1a27]" : ""}`}>
```

Add the badge before the existing top row (immediately inside `<CardHeader className="pb-3 gap-2">`):

```tsx
{matchReason && (
  <span className="inline-block self-start bg-[#9a1a27] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 leading-tight">
    ★ {matchReason}
  </span>
)}
```

- [ ] **Step 5.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

Expected: pass.

- [ ] **Step 5.3: Commit**

```bash
git add caat-frontend/components/scholarships/scholarship-card.tsx
git commit -m "feat(scholarships): add matchReason badge prop to ScholarshipCard"
```

---

### Task 6: Wire smart-sort into Scholarships page

**Files:**
- Modify: `caat-frontend/app/(main)/scholarships/page.tsx`
- Modify: `caat-frontend/app/(main)/scholarships/client.tsx`

- [ ] **Step 6.1: Fetch profile in the server page and pass to client**

In `caat-frontend/app/(main)/scholarships/page.tsx`, add server-side profile fetch:

At the top, add imports:

```ts
import { createSupabaseServer } from "@/lib/supabase-server";
import type { ProfileRow } from "@/types/profile";
```

Add a helper function near the top of the file (above `ScholarshipsPage`):

```ts
async function fetchProfile(): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, birth_date, phone, linkedin, github, avatar_url, nationality, current_location, school_name, curriculum, graduation_year, target_majors, preferred_countries, activities, default_resume_id")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}
```

In the page component, call it and pass to client:

```ts
export default async function ScholarshipsPage() {
  const [{ data, error }, profile] = await Promise.all([
    fetchAllScholarships(),
    fetchProfile(),
  ]);

  if (error) {
    return (
      <div className="p-10 text-[#9a1a27]">
        Unable to load scholarships. Please try again later.
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Scholarships" />
      <Suspense>
        <ScholarshipsClient scholarships={data ?? []} profile={profile} />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 6.2: Accept profile prop in client and compute matches**

In `caat-frontend/app/(main)/scholarships/client.tsx`:

Add imports (near the top with the other imports):

```ts
import type { ProfileRow } from "@/types/profile";
import { matchScholarship, type MatchResult } from "@/lib/profile-match";
```

Change the `Props` interface:

```ts
interface Props {
  scholarships: ScholarshipRow[];
  profile: ProfileRow | null;
}
```

Update destructure in the component signature:

```ts
export default function ScholarshipsClient({ scholarships, profile }: Props) {
```

After the existing `fieldsByRow` and `availableFields` useMemos, add a matchByRow useMemo:

```ts
const matchByRow = useMemo(() => {
  const map = new Map<string, MatchResult>();
  for (const s of scholarships) {
    map.set(s.id, matchScholarship(profile, s));
  }
  return map;
}, [scholarships, profile]);
```

Update the `filtered` useMemo. After the existing filter chain, sort matched items first. Replace the `return scholarships.filter(...)` block's surrounding code so that after filtering we sort:

Add a new useMemo *after* `filtered`:

```ts
const sorted = useMemo(() => {
  return [...filtered].sort((a, b) => {
    const aScore = matchByRow.get(a.id)?.score ?? 0;
    const bScore = matchByRow.get(b.id)?.score ?? 0;
    return bScore - aScore; // matched (higher score) first
  });
}, [filtered, matchByRow]);
```

Replace every subsequent reference to `filtered` *after pagination logic* with `sorted`. Specifically:

- `const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));` → keep as `filtered` (count doesn't change)
- `const paginated = filtered.slice(...)` → change to `const paginated = sorted.slice(...)`
- The "filtered.length" results-count display stays as `filtered.length`

Update the card render to pass `matchReason`:

```tsx
<ScholarshipCard
  key={row.id}
  scholarship={rowToCard(row)}
  isBookmarked={bookmarkedIds.has(row.id)}
  onToggleBookmark={handleToggleBookmark}
  matchReason={matchByRow.get(row.id)?.reason ?? null}
/>
```

- [ ] **Step 6.3: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 6.4: Commit**

```bash
git add caat-frontend/app/(main)/scholarships/page.tsx caat-frontend/app/(main)/scholarships/client.tsx
git commit -m "feat(scholarships): smart-sort by profile match, render match badge"
```

---

### Task 7: Wire smart-sort into Schools page

**Files:**
- Modify: `caat-frontend/app/(main)/schools/page.tsx`

The Schools page is a server component that renders cards directly. We'll fetch the profile and matched school_majors, compute matches server-side, sort, and inline-render the badge.

- [ ] **Step 7.1: Add profile fetch, school_majors join, and sort**

In `caat-frontend/app/(main)/schools/page.tsx`, add imports near the top:

```ts
import { createSupabaseServer } from "@/lib/supabase-server";
import type { ProfileRow } from "@/types/profile";
import { matchSchool } from "@/lib/profile-match";
```

Add a helper near the top:

```ts
async function fetchProfileAndOfferedMajors(): Promise<{
  profile: ProfileRow | null;
  offeredMajorsBySchool: Map<number, string[]>;
}> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, offeredMajorsBySchool: new Map() };

  const profileRes = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, birth_date, phone, linkedin, github, avatar_url, nationality, current_location, school_name, curriculum, graduation_year, target_majors, preferred_countries, activities, default_resume_id")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileRes.data as ProfileRow | null) ?? null;

  // Only fetch school_majors if the user has target_majors — otherwise it's
  // wasted bandwidth.
  if (!profile?.target_majors?.length) {
    return { profile, offeredMajorsBySchool: new Map() };
  }

  const sjRes = await supabase
    .from("school_majors")
    .select("school_id, majors(name)");
  const map = new Map<number, string[]>();
  for (const row of (sjRes.data ?? []) as unknown as {
    school_id: number;
    majors: { name: string } | null;
  }[]) {
    if (!row.majors) continue;
    const list = map.get(row.school_id) ?? [];
    list.push(row.majors.name);
    map.set(row.school_id, list);
  }
  return { profile, offeredMajorsBySchool: map };
}
```

In the page body (the non-bookmarked branch, right after the existing `schools` data is fetched), compute matches and sort:

```ts
const { profile, offeredMajorsBySchool } = await fetchProfileAndOfferedMajors();

const schoolsWithMatch = (schools ?? []).map((sch) => ({
  ...sch,
  __match: matchSchool(profile, sch, offeredMajorsBySchool.get(sch.id) ?? undefined),
}));

// Matched items first, then keep existing order within each group.
schoolsWithMatch.sort((a, b) => (b.__match.score - a.__match.score));
```

Replace the `{schools.map((school) => …)}` block with `{schoolsWithMatch.map((school) => …)}`, and inside the `<CardHeader>`, before the existing `<div className="flex items-start justify-between gap-2">`, add:

```tsx
{school.__match.reason && (
  <span className="inline-block self-start bg-[#9a1a27] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 leading-tight mb-2">
    ★ {school.__match.reason}
  </span>
)}
```

And add the left-border treatment to the Card className:

```tsx
<Card
  key={school.id}
  className={`flex flex-col h-full hover:shadow-lg transition-shadow ${school.__match.reason ? "border-l-[3px] border-l-[#9a1a27]" : ""}`}
>
```

Also update the existing emptiness check / count display (line "Showing {count || 0} results in …") — no change needed; pagination still works against the server count.

- [ ] **Step 7.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

If TS complains that `school` (the iteration variable) doesn't carry `__match`, lift the type:

```ts
type SchoolRowWithMatch = (typeof schools)[number] & {
  __match: ReturnType<typeof matchSchool>;
};
const schoolsWithMatch: SchoolRowWithMatch[] = (schools ?? []).map(...);
```

- [ ] **Step 7.3: Commit**

```bash
git add caat-frontend/app/(main)/schools/page.tsx
git commit -m "feat(schools): smart-sort by preferred-country + target-major match"
```

---

### Task 8: Wire smart-sort into Majors page

**Files:**
- Modify: `caat-frontend/app/(main)/majors/page.tsx`
- Modify: `caat-frontend/app/(main)/majors/client.tsx`

- [ ] **Step 8.1: Fetch profile in the page**

In `caat-frontend/app/(main)/majors/page.tsx`, add imports:

```ts
import { createSupabaseServer } from "@/lib/supabase-server";
import type { ProfileRow } from "@/types/profile";
```

Add a helper:

```ts
async function fetchProfile(): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, birth_date, phone, linkedin, github, avatar_url, nationality, current_location, school_name, curriculum, graduation_year, target_majors, preferred_countries, activities, default_resume_id")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}
```

Fetch in parallel with majors and pass to client:

```ts
export default async function MajorsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  const initialFilter = (params.category ?? "All") as FilterView;

  const [majorsRes, profile] = await Promise.all([
    (await import("@/src/lib/supabaseClient")).supabase.from("majors").select("*").order("name"),
    fetchProfile(),
  ]);
  const { data: majors, error } = majorsRes;

  if (error) {
    return <div className="p-10 text-[#9a1a27]">Unable to load majors. Please try again later.</div>;
  }

  return (
    <>
      <PageHeader title="Majors" />
      <Suspense>
        <MajorsClient majors={majors ?? []} initialFilter={initialFilter} profile={profile} />
      </Suspense>
    </>
  );
}
```

Note: the dynamic `import()` inside the `Promise.all` keeps the existing browser supabase client. If you prefer, use `createSupabaseServer()` for consistency. Both work.

- [ ] **Step 8.2: Accept profile in MajorsClient and sort**

In `caat-frontend/app/(main)/majors/client.tsx`:

Add imports:

```ts
import type { ProfileRow } from "@/types/profile";
import { matchMajor, type MatchResult } from "@/lib/profile-match";
```

Change props:

```ts
interface Props {
  majors: Major[];
  initialFilter?: FilterView;
  profile: ProfileRow | null;
}
```

Update destructure:

```ts
export default function MajorsClient({ majors, initialFilter = "All", profile }: Props) {
```

After the existing `filtered` useMemo, add:

```ts
const matchByMajor = useMemo(() => {
  const map = new Map<string, MatchResult>();
  for (const m of majors) {
    map.set(m.id, matchMajor(profile, m));
  }
  return map;
}, [majors, profile]);

const sorted = useMemo(() => {
  return [...filtered].sort((a, b) => {
    const aScore = matchByMajor.get(a.id)?.score ?? 0;
    const bScore = matchByMajor.get(b.id)?.score ?? 0;
    return bScore - aScore;
  });
}, [filtered, matchByMajor]);
```

Replace `{filtered.map((major) =>` in the render with `{sorted.map((major) =>` and pass `matchReason`:

```tsx
{sorted.map((major) => (
  <MajorCard
    key={major.id}
    major={major}
    isBookmarked={bookmarkedIds.has(major.id)}
    isSelected={compareIds.includes(major.id)}
    canSelect={compareIds.length < MAX_COMPARE || compareIds.includes(major.id)}
    onToggleSelect={handleToggleSelect}
    onToggleBookmark={handleToggleBookmark}
    matchReason={matchByMajor.get(major.id)?.reason ?? null}
  />
))}
```

Also update the results-count display: keep `filtered.length` (count doesn't change with sort).

- [ ] **Step 8.3: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 8.4: Commit**

```bash
git add caat-frontend/app/(main)/majors/page.tsx caat-frontend/app/(main)/majors/client.tsx
git commit -m "feat(majors): smart-sort target majors to top with match badge"
```

---

### Task 9: Add match badge to `MajorCard`

**Files:**
- Modify: `caat-frontend/components/majors/major-card.tsx`

- [ ] **Step 9.1: Add `matchReason` prop and badge**

In `caat-frontend/components/majors/major-card.tsx`:

Update the Props interface:

```ts
interface Props {
  major: Major;
  isBookmarked: boolean;
  isSelected: boolean;
  canSelect: boolean;
  onToggleSelect: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  matchReason?: string | null;
}
```

Update destructure:

```ts
export default function MajorCard({
  major,
  isBookmarked,
  isSelected,
  canSelect,
  onToggleSelect,
  onToggleBookmark,
  matchReason,
}: Props) {
```

Update the `<Card>` className to add the left-border treatment when matched:

```tsx
<Card
  className={`flex flex-col h-full hover:shadow-lg transition-shadow ${
    isSelected ? "ring-2 ring-primary" : ""
  } ${matchReason ? "border-l-[3px] border-l-[#9a1a27]" : ""}`}
>
```

In the CardHeader, add the badge as the first child:

```tsx
<CardHeader className="gap-2">
  {matchReason && (
    <span className="inline-block self-start bg-[#9a1a27] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 leading-tight">
      ★ {matchReason}
    </span>
  )}
  {/* existing category + bookmark row */}
  <div className="flex items-start justify-between gap-2">
    ...
  </div>
  ...
</CardHeader>
```

- [ ] **Step 9.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 9.3: Commit**

```bash
git add caat-frontend/components/majors/major-card.tsx
git commit -m "feat(majors): render match badge on MajorCard"
```

---

## Phase 3: Bookmark → Application bridge

### Task 10: Add bulk-import functions to applications API

**Files:**
- Modify: `caat-frontend/app/(main)/applications/api.ts`

- [ ] **Step 10.1: Add `fetchUnimportedBookmarkCount` and `importBookmarkedSchools`**

Append to `caat-frontend/app/(main)/applications/api.ts`:

```ts
/**
 * Number of bookmarked schools that the user does NOT yet have an application
 * for. Used to power the "Import from Bookmarks" button count badge.
 */
export async function fetchUnimportedBookmarkCount(): Promise<number> {
  const user = await getUser();

  const [bookmarkedRes, appsRes] = await Promise.all([
    supabase
      .from("user_bookmarked_schools")
      .select("school_id")
      .eq("user_id", user.id),
    supabase
      .from("user_school_applications")
      .select("school_id")
      .eq("user_id", user.id),
  ]);

  if (bookmarkedRes.error) throw new Error(bookmarkedRes.error.message);
  if (appsRes.error) throw new Error(appsRes.error.message);

  const existing = new Set((appsRes.data ?? []).map((r) => r.school_id as number));
  return (bookmarkedRes.data ?? []).filter(
    (b) => !existing.has(b.school_id as number)
  ).length;
}

/**
 * Bulk-create "researching"-status applications for every bookmarked school
 * the user does not already have an application for. Idempotent — schools
 * already tracked are skipped silently.
 *
 * Returns the newly-created ApplicationRow[] so the caller can render them
 * with a "fresh" visual treatment.
 */
export async function importBookmarkedSchools(): Promise<{
  added: ApplicationRow[];
  skipped: number;
}> {
  const user = await getUser();

  const [bookmarkedRes, appsRes] = await Promise.all([
    supabase
      .from("user_bookmarked_schools")
      .select("school_id")
      .eq("user_id", user.id),
    supabase
      .from("user_school_applications")
      .select("school_id")
      .eq("user_id", user.id),
  ]);

  if (bookmarkedRes.error) throw new Error(bookmarkedRes.error.message);
  if (appsRes.error) throw new Error(appsRes.error.message);

  const existing = new Set((appsRes.data ?? []).map((r) => r.school_id as number));
  const toInsert = (bookmarkedRes.data ?? [])
    .map((r) => r.school_id as number)
    .filter((id) => !existing.has(id));

  if (toInsert.length === 0) {
    return { added: [], skipped: (bookmarkedRes.data ?? []).length };
  }

  const rows = toInsert.map((school_id) => ({
    user_id: user.id,
    school_id,
    status: "researching" as const,
  }));

  const { data, error } = await supabase
    .from("user_school_applications")
    .insert(rows)
    .select("*, schools(id, name, country)");

  if (error) throw new Error(error.message);

  return {
    added: (data ?? []) as unknown as ApplicationRow[],
    skipped: (bookmarkedRes.data ?? []).length - (data?.length ?? 0),
  };
}
```

- [ ] **Step 10.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 10.3: Commit**

```bash
git add caat-frontend/app/(main)/applications/api.ts
git commit -m "feat(applications): add fetchUnimportedBookmarkCount + importBookmarkedSchools"
```

---

### Task 11: Add "Import from Bookmarks" button + fresh-row state

**Files:**
- Modify: `caat-frontend/app/(main)/applications/client.tsx`

- [ ] **Step 11.1: Wire button into the page header and handle the import**

In `caat-frontend/app/(main)/applications/client.tsx`:

Add imports near the existing ones:

```ts
import { Bookmark } from "lucide-react";
import {
  fetchUnimportedBookmarkCount,
  importBookmarkedSchools,
} from "./api";
```

(`Bookmark` is already exported by `lucide-react`; the other two are from the api file.)

Inside `ApplicationsClient`, after the existing useStates for `apps`/`loading`/`filter`, add:

```ts
const [unimportedCount, setUnimportedCount] = useState<number | null>(null);
const [importing, setImporting] = useState(false);
const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
```

In the existing initial-load useEffect, after `fetchApplications().then(setApps)…`, refresh the count:

```ts
useEffect(() => {
  fetchApplications()
    .then(setApps)
    .catch(() => toast.error("Failed to load applications."))
    .finally(() => setLoading(false));
  fetchUnimportedBookmarkCount()
    .then(setUnimportedCount)
    .catch(() => setUnimportedCount(0));
}, []);
```

Add a handler near the other handlers:

```ts
async function handleImportBookmarks() {
  if (importing) return;
  setImporting(true);
  try {
    const { added } = await importBookmarkedSchools();
    if (added.length === 0) {
      toast.info("All bookmarked schools are already in your applications.");
    } else {
      setApps((prev) => [...added, ...prev]);
      setFreshIds(new Set(added.map((a) => a.id)));
      const names = added.map((a) => a.schools?.name ?? "Unknown").join(", ");
      toast.success(
        `Added ${added.length} school${added.length === 1 ? "" : "s"} as Researching — ${names}`,
        { duration: 6000 }
      );
    }
    const newCount = await fetchUnimportedBookmarkCount();
    setUnimportedCount(newCount);
  } catch {
    toast.error("Failed to import bookmarks.");
  } finally {
    setImporting(false);
  }
}
```

In the page header JSX, replace the existing `<Button size="sm" onClick={() => setShowSearch(!showSearch)} …>+ Add School</Button>` block with a button group. Find the existing markup:

```tsx
<Button
  size="sm"
  onClick={() => setShowSearch(!showSearch)}
  className="gap-1.5 bg-[#9a1a27] text-white hover:bg-[#7d141f] border-[#9a1a27]"
>
  <Plus className="h-4 w-4" />
  Add School
</Button>
```

Replace with:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  {unimportedCount !== null && unimportedCount > 0 && (
    <Button
      size="sm"
      variant="outline"
      onClick={handleImportBookmarks}
      disabled={importing}
      className="gap-1.5"
    >
      <Bookmark className="h-4 w-4" />
      Import from Bookmarks
      <span className="ml-1 inline-flex items-center justify-center text-[10px] font-semibold bg-[#9a1a27] text-white px-1.5 rounded-full leading-none py-0.5">
        {unimportedCount}
      </span>
    </Button>
  )}
  <Button
    size="sm"
    onClick={() => setShowSearch(!showSearch)}
    className="gap-1.5 bg-[#9a1a27] text-white hover:bg-[#7d141f] border-[#9a1a27]"
  >
    <Plus className="h-4 w-4" />
    Add School
  </Button>
</div>
```

**Simplification decision:** since `fetchUnimportedBookmarkCount` returns 0 when (a) no bookmarks exist or (b) all are tracked, we hide the button in both cases. The spec listed "dimmed when all tracked" as a nice-to-have but it's indistinguishable from "no bookmarks" at the data layer without an extra query. Hiding is the simplest correct behaviour; revisit later if students complain about the disappearing button.

Render the "fresh" treatment on imported rows. In the `ApplicationCard` invocation in the existing map:

```tsx
{filtered.map((app) => (
  <ApplicationCard
    key={app.id}
    app={app}
    onStatusChange={handleStatusChange}
    onDeadlineChange={handleDeadlineChange}
    onNotesChange={handleNotesChange}
    onDelete={handleDelete}
    confirmDeleteId={confirmDeleteId}
    setConfirmDeleteId={setConfirmDeleteId}
    isFresh={freshIds.has(app.id)}
  />
))}
```

Pass `isFresh` through to `ApplicationCard` — add to its Props:

```ts
function ApplicationCard({
  app,
  onStatusChange,
  onDeadlineChange,
  onNotesChange,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
  isFresh = false,
}: {
  app: ApplicationRow;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDeadlineChange: (id: string, deadline: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isFresh?: boolean;
}) {
```

Update the wrapper div in `ApplicationCard`:

```tsx
<div className={`rounded-lg border p-4 space-y-3 ${isFresh ? "bg-[#FFF8E1] border-l-[3px] border-l-[#9a1a27]" : "bg-card"}`}>
```

Add the "New" tag inline with the school name. Inside the `<Link>` block:

```tsx
<Link
  href={`/schools/${app.school_id}`}
  className="text-sm font-semibold hover:underline underline-offset-2 flex items-center gap-1.5"
>
  {isFresh && (
    <span className="text-[9px] font-bold uppercase tracking-wide bg-[#9a1a27] text-white px-1.5 py-0.5">
      New
    </span>
  )}
  {schoolName}
  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
</Link>
```

- [ ] **Step 11.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 11.3: Commit**

```bash
git add caat-frontend/app/(main)/applications/client.tsx
git commit -m "feat(applications): Import from Bookmarks button with fresh-row state"
```

---

### Task 12: Add "✓ tracked" indicator in BookmarkedSchoolsWidget

**Files:**
- Modify: `caat-frontend/components/dashboard/widgets/BookmarkedSchoolsWidget.tsx`

- [ ] **Step 12.1: Fetch tracked school_ids alongside bookmarks**

Modify the load() function to fetch tracked school IDs too:

```ts
const [dataRes, countRes, trackedRes] = await Promise.all([
  supabase
    .from("user_bookmarked_schools")
    .select("school_id, schools(id, name, country)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(DISPLAY_LIMIT),
  supabase
    .from("user_bookmarked_schools")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id),
  supabase
    .from("user_school_applications")
    .select("school_id")
    .eq("user_id", user.id),
]);
```

Add a new state:

```ts
const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());
```

After parsing `dataRes`, parse trackedRes:

```ts
const tracked = new Set((trackedRes.data ?? []).map((r) => r.school_id as number));
setTrackedIds(tracked);
```

Update the badge render to show the indicator:

```tsx
{schools.map((school) => {
  const isTracked = trackedIds.has(school.id);
  return (
    <Link key={school.id} href={`/schools/${school.id}`}>
      <Badge
        variant="secondary"
        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
      >
        {school.name}
        {school.country && (
          <span className="ml-1 opacity-60">· {school.country}</span>
        )}
        {isTracked && (
          <span className="ml-1.5 text-[#15803d] font-semibold" title="Already in your applications">
            ✓
          </span>
        )}
      </Badge>
    </Link>
  );
})}
```

- [ ] **Step 12.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 12.3: Commit**

```bash
git add caat-frontend/components/dashboard/widgets/BookmarkedSchoolsWidget.tsx
git commit -m "feat(dashboard): show ✓ tracked indicator on bookmarked schools"
```

---

## Phase 4: Unified deadlines UI

### Task 13: Refactor UpcomingDeadlinesWidget to use unified-deadlines + source pills

**Files:**
- Modify: `caat-frontend/components/dashboard/widgets/UpcomingDeadlinesWidget.tsx`

- [ ] **Step 13.1: Replace fetch logic with `fetchUnifiedDeadlines`; add source pills**

Replace the existing file contents with:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/src/lib/supabaseClient";
import {
  fetchUnifiedDeadlines,
  type UnifiedDeadline,
} from "@/lib/unified-deadlines";

function daysUntil(dateISO: string): number {
  const target = new Date(dateISO + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function dotColor(days: number) {
  if (days <= 7) return "bg-[#9a1a27]";
  if (days <= 30) return "bg-amber-500";
  return "bg-green-500";
}

function countdownText(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  return `${days}d`;
}

function countdownColor(days: number) {
  if (days <= 7) return "text-[#9a1a27]";
  if (days <= 30) return "text-amber-500";
  return "text-green-600 dark:text-green-400";
}

const SOURCE_STYLES: Record<UnifiedDeadline["source"], { label: string; className: string }> = {
  app: { label: "App", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  scholarship: { label: "Schol", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  event: { label: "Event", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const DISPLAY_LIMIT = 8;

export function UpcomingDeadlinesWidget() {
  const [items, setItems] = useState<UnifiedDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const all = await fetchUnifiedDeadlines(supabase, user.id);
        setItems(all.slice(0, DISPLAY_LIMIT));
      } catch {
        // Silently fail — widget is non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
        <p className="text-xs text-muted-foreground">
          Bookmark scholarships, set deadlines on your applications, or add a calendar event.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const days = daysUntil(item.dateISO);
        const style = SOURCE_STYLES[item.source];
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor(days)}`} />
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${style.className}`}>
              {style.label}
            </span>
            <span className="flex-1 min-w-0 truncate">{item.title}</span>
            <span className={`text-xs font-medium shrink-0 tabular-nums ${countdownColor(days)}`}>
              {countdownText(days)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 13.2: Typecheck + run all unit tests**

```bash
cd caat-frontend && npm run typecheck && npm run test:unit
```

Expected: all pass.

- [ ] **Step 13.3: Commit**

```bash
git add caat-frontend/components/dashboard/widgets/UpcomingDeadlinesWidget.tsx
git commit -m "feat(dashboard): unify UpcomingDeadlines across apps/schol/events with source pills"
```

---

### Task 14: Add coloured deadline dots to CalendarWidget

**Files:**
- Modify: `caat-frontend/components/dashboard/widgets/CalendarWidget.tsx`

- [ ] **Step 14.1: Fetch unified deadlines and render dots on calendar dates**

In `caat-frontend/components/dashboard/widgets/CalendarWidget.tsx`:

Add imports near the top:

```ts
import {
  fetchUnifiedDeadlines,
  type UnifiedDeadline,
} from "@/lib/unified-deadlines";
```

Add a new state inside `CalendarWidget`:

```ts
const [deadlines, setDeadlines] = useState<UnifiedDeadline[]>([]);
```

Inside the existing `useEffect(() => { async function load() { … } load(); }, [])`, after the existing events query, fetch deadlines:

```ts
const { data: { user: uForDeadlines } } = await supabase.auth.getUser();
if (uForDeadlines) {
  try {
    const all = await fetchUnifiedDeadlines(supabase, uForDeadlines.id);
    // Exclude "event" source — events come from calendar_events which the widget
    // already renders natively. We only want apps + scholarships as overlays.
    setDeadlines(all.filter((d) => d.source !== "event"));
  } catch {
    // non-critical
  }
}
```

(Place this inside the same `load()` function, right after `setEvents(...)`.)

Build per-source date sets next to the existing `datesWithEvents`:

```ts
const datesWithApp = new Set(
  deadlines.filter((d) => d.source === "app").map((d) => d.dateISO)
);
const datesWithSchol = new Set(
  deadlines.filter((d) => d.source === "scholarship").map((d) => d.dateISO)
);
```

Update the `<Calendar>` `modifiers` and `modifiersClassNames`:

```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md p-0"
  modifiers={{
    hasEvent: (d) => datesWithEvents.has(toDateKey(d)),
    hasApp: (d) => datesWithApp.has(toDateKey(d)),
    hasSchol: (d) => datesWithSchol.has(toDateKey(d)),
  }}
  modifiersClassNames={{
    hasEvent: "after:content-[''] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-green-600",
    hasApp:   "before:content-[''] before:absolute before:bottom-0.5 before:left-[35%] before:w-1 before:h-1 before:rounded-full before:bg-blue-600",
    hasSchol: "[&_>span]:relative [&_>span]:after:content-[''] [&_>span]:after:absolute [&_>span]:after:bottom-[-3px] [&_>span]:after:left-[65%] [&_>span]:after:w-1 [&_>span]:after:h-1 [&_>span]:after:rounded-full [&_>span]:after:bg-purple-600",
  }}
/>
```

(The selectors above use multiple pseudo-elements per cell so all three colours can show side-by-side. Adjust if the existing Calendar primitive's DOM is incompatible — the alternative is a small custom day-renderer.)

Below the Calendar, add a legend strip:

```tsx
<div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 px-1">
  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" />App</span>
  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-600" />Schol</span>
  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-600" />Event</span>
</div>
```

(Place just below the closing `</Calendar>` and above the "Add event" button.)

In the right-side detail panel, extend `eventsForDay` rendering to also list deadlines for the selected date. Compute:

```ts
const deadlinesForDay = deadlines.filter((d) => d.dateISO === selectedKey);
```

In the empty-day branch, change the condition: show empty state only if BOTH `eventsForDay.length === 0` AND `deadlinesForDay.length === 0`. Above the existing event `<ul>`, add a deadline list:

```tsx
{deadlinesForDay.length > 0 && (
  <ul className="space-y-2 mb-2">
    {deadlinesForDay.map((d) => (
      <li key={d.id} className="rounded-lg border bg-card p-3 text-xs">
        <Link href={d.href} className="font-medium hover:underline">
          {d.title}
        </Link>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {d.source === "app" ? "Application deadline" : "Scholarship deadline"}
        </div>
      </li>
    ))}
  </ul>
)}
```

Add the `Link` import at the top:

```ts
import Link from "next/link";
```

- [ ] **Step 14.2: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

- [ ] **Step 14.3: Commit**

```bash
git add caat-frontend/components/dashboard/widgets/CalendarWidget.tsx
git commit -m "feat(dashboard): overlay app + scholarship deadlines on calendar widget"
```

---

## Phase 5: Final verification

### Task 15: Full typecheck, lint, unit tests, smoke tests

**Commands run from `caat-frontend/`:**

- [ ] **Step 15.1: Typecheck**

```bash
cd caat-frontend && npm run typecheck
```

Expected: exit 0.

- [ ] **Step 15.2: Lint**

```bash
cd caat-frontend && npm run lint
```

Expected: exit 0 (warnings OK; fix any errors).

- [ ] **Step 15.3: Unit tests**

```bash
cd caat-frontend && npm run test:unit
```

Expected: all tests pass, including the two new test files.

- [ ] **Step 15.4: Smoke tests (existing test script)**

```bash
cd caat-frontend && npm test
```

Expected: smoke tests pass.

- [ ] **Step 15.5: If anything fails — fix the smallest commit that's red, commit the fix, re-run.**

Don't proceed to dev-server checks until 15.1–15.4 all pass.

---

### Task 16: Dev server boot + manual sanity check

- [ ] **Step 16.1: Boot the dev server in the background**

```bash
cd caat-frontend && npm run dev
```

(Run in background; wait ~10s for Next.js to compile.)

- [ ] **Step 16.2: Confirm the server is reachable**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

Expected: `200`.

- [ ] **Step 16.3: Check for build errors in dev server output**

If the server logs any compile errors, fix them before declaring done.

- [ ] **Step 16.4: Stop the dev server.**

- [ ] **Step 16.5: Write a STATUS.md at the repo root summarising what was implemented and what still needs human verification:**

File: `~/Caat_V2/STATUS.md`

Contents:
```markdown
# Status — feat/profile-driven-cohesion

Implemented (all three components from docs/superpowers/specs/2026-05-21-profile-driven-cohesion-design.md):

- Profile-driven smart sort on /scholarships, /schools, /majors
- "Import from Bookmarks" button on /applications
- Unified deadlines on dashboard (UpcomingDeadlines + Calendar widgets)
- ✓ tracked indicator on BookmarkedSchoolsWidget

## Verified
- typecheck: pass
- lint: pass
- unit tests: pass (X tests across profile-match + unified-deadlines + existing)
- smoke tests: pass
- dev server boots, /login returns 200

## NOT verified (needs human eyes with a populated profile)
- Smart-sort visual correctness on Scholarships/Schools/Majors
- "Import from Bookmarks" button actually inserts rows (requires bookmarked schools in DB)
- Calendar dot rendering across multiple sources on same date
- E2E playwright run with auth (requires test credentials I didn't have)

## Suggested next steps for the human
1. Log in as a populated test account.
2. Visit /scholarships — verify matched items have red badge + sort to top.
3. Bookmark some schools, then visit /applications — verify Import button appears with correct count.
4. Click Import — verify rows appear, "New" tag is visible, toast confirms.
5. Visit dashboard — verify deadline widget shows source pills, calendar shows coloured dots.
```

Commit STATUS.md:

```bash
git add STATUS.md
git commit -m "docs: status summary for profile-driven-cohesion branch"
```

---

## Self-review checklist

Verify before declaring complete:

- [ ] Every spec component (Component 1, 2, 3) has at least one corresponding task.
- [ ] No "TODO", "TBD", or placeholder text in any task body.
- [ ] Every code block in steps is complete (no `// ...` placeholders for code).
- [ ] Type names used in later tasks match what's defined in earlier tasks (`MatchResult`, `UnifiedDeadline`, `RawAppDeadline`).
- [ ] Each task has a final commit step.
- [ ] STATUS.md captures verification limits honestly.
