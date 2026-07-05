import type { ScholarshipRow } from "@/types/scholarships";

// Funding criteria — how the scholarship picks recipients / what it covers.
export const FUNDING_MAP: Record<string, (s: ScholarshipRow) => boolean> = {
  "Merit-Based": (s) => s.merit_based,
  "Need-Based": (s) => s.need_based,
  "Full Ride": (s) => s.funding_type.includes("full_ride"),
};

// Study level — which academic stage the scholarship is for.
export const LEVEL_MAP: Record<string, (s: ScholarshipRow) => boolean> = {
  Undergraduate: (s) => s.study_level.includes("undergraduate"),
  Postgraduate: (s) => s.study_level.includes("postgraduate"),
};

// Combined funding + level predicates. Single source of truth for the
// eligibility rules (used by unit tests; the UI reads FUNDING_MAP/LEVEL_MAP
// separately to drive their own dropdowns).
export const ELIGIBILITY_MAP: Record<string, (s: ScholarshipRow) => boolean> = {
  ...FUNDING_MAP,
  ...LEVEL_MAP,
};

// Citizenship eligibility — country-relative.
//
// The scrapers write raw codes (AU, AU-PR, INTERNATIONAL) into the
// citizenships array. We translate to user-facing Domestic / International
// against each scholarship's country, so a UK or US uni added later "just
// works" — only DOMESTIC_CODES needs an entry for the new country.
//
// Empty citizenships means "no restriction" → eligible for both options.
export const DOMESTIC_CODES: Record<string, string[]> = {
  Australia: ["AU", "AU-PR"],
  // Future: "United Kingdom": ["UK", "GB"], "United States": ["US"], etc.
};

// Defensive read: PostgREST occasionally returns a missing/null array for
// freshly-added columns until its schema cache refreshes. Treat any
// non-array as "no restriction".
export function citizenshipsOf(s: ScholarshipRow): string[] {
  return Array.isArray(s.citizenships) ? s.citizenships : [];
}

export function isDomesticEligible(s: ScholarshipRow): boolean {
  const cits = citizenshipsOf(s);
  if (cits.length === 0) return true;
  const domesticCodes = s.country ? DOMESTIC_CODES[s.country] ?? [] : [];
  if (domesticCodes.some((c) => cits.includes(c))) return true;
  // Fallback for countries we haven't mapped: anything that isn't an
  // explicit INTERNATIONAL marker counts as domestic.
  if (domesticCodes.length === 0) {
    return cits.some((c) => c !== "INTERNATIONAL");
  }
  return false;
}

export function isInternationalEligible(s: ScholarshipRow): boolean {
  const cits = citizenshipsOf(s);
  if (cits.length === 0) return true;
  return cits.includes("INTERNATIONAL");
}

export const CITIZENSHIP_MAP: Record<string, (s: ScholarshipRow) => boolean> = {
  Domestic: isDomesticEligible,
  International: isInternationalEligible,
};

// Field of study — uni faculties don't share a clean taxonomy in the DB,
// so we infer from title + description + tags using broad keyword regexes.
// Pre-computed per scholarship to keep the filter hot path O(1).
export const FIELD_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Engineering", re: /\bengineer/i },
  { label: "Business", re: /\bbusiness|commerce|management|finance|accounting|marketing/i },
  { label: "Law", re: /\blaw\b|legal\b/i },
  { label: "Medicine & Health", re: /\bmedicin|medical|health|nursing|pharmacy|dentist|optometry|physiotherapy/i },
  { label: "Science", re: /\bscience\b|physics|chemistry|biology|biotech|veterinary/i },
  { label: "Arts & Humanities", re: /\barts\b|humanities|languages|culture|history|philosophy/i },
  { label: "Architecture & Design", re: /\barchitec|\bdesign\b|planning|urban/i },
  { label: "Education & Social Work", re: /\beducation|teaching|social work|psychology/i },
  { label: "Economics", re: /\beconomic/i },
  { label: "IT & Computing", re: /computer|computing|information technology|\bIT\b|software|data science/i },
  { label: "Music & Performing Arts", re: /\bmusic|conservatorium|performing arts|theatre|drama/i },
  { label: "Indigenous Studies", re: /indigenous|aboriginal|torres strait/i },
];

export function matchFieldsForRow(s: ScholarshipRow): string[] {
  if (s.field_of_study && s.field_of_study.length > 0) {
    return s.field_of_study.filter((f) => f !== "General");
  }
  const haystack = [s.title, s.description ?? "", ...s.tags].join(" ");
  return FIELD_PATTERNS.filter((p) => p.re.test(haystack)).map((p) => p.label);
}
