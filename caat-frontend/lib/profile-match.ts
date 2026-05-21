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
  matchedMajor: string | null;
  matchedCountry: string | null;
  citizenshipEligible: boolean;
  levelMatches: boolean;
}

export interface MatchResult {
  score: number;
  reason: string | null;
}

export function reasonFor(d: MatchDimensions): string | null {
  const substantiveCount =
    (d.matchedMajor ? 1 : 0) +
    (d.matchedCountry ? 1 : 0) +
    (d.citizenshipEligible ? 1 : 0);

  if (substantiveCount === 0) return null;

  const totalCount = substantiveCount + (d.levelMatches ? 1 : 0);
  if (totalCount >= 3) return "Strong match — your major, country and level";

  if (d.matchedMajor && d.matchedCountry) {
    return `Matches your ${d.matchedMajor} in your preferred country`;
  }
  if (d.matchedMajor && d.citizenshipEligible) {
    return `Matches ${d.matchedMajor}, open to internationals`;
  }
  if (d.matchedCountry && d.citizenshipEligible) {
    return `In your preferred country, open to your nationality`;
  }

  if (d.matchedMajor) return `Matches your ${d.matchedMajor}`;
  if (d.matchedCountry) return `In your preferred country (${d.matchedCountry})`;
  if (d.citizenshipEligible) return `Open to your nationality`;

  return null;
}

// ─── Country / citizenship helpers ────────────────────────────────────────────

const DOMESTIC_CODES: Record<string, string[]> = {
  Australia: ["AU", "AU-PR"],
};

const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  Australian: "Australia",
};

function isCitizenshipEligible(
  nationality: string | null,
  scholarship: ScholarshipRow
): boolean {
  if (!nationality) return false;
  const cits = Array.isArray(scholarship.citizenships) ? scholarship.citizenships : [];
  if (cits.length === 0) return false;

  const homeCountry = NATIONALITY_TO_COUNTRY[nationality];
  if (homeCountry && scholarship.country === homeCountry) {
    const domesticCodes = DOMESTIC_CODES[homeCountry] ?? [];
    if (domesticCodes.some((c) => cits.includes(c))) return true;
  }
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

// ─── School match ────────────────────────────────────────────────────────────

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
