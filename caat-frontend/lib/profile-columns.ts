/**
 * Column allowlist for reading a user's profile. Kept in a server-agnostic
 * module (no `next/headers` imports) so both client code (profile API) and
 * server code (profile-server, schools page) can share the one definition.
 */
export const PROFILE_COLUMNS =
  "id, first_name, last_name, email, birth_date, phone, linkedin, github, avatar_url, nationality, current_location, school_name, curriculum, graduation_year, target_majors, preferred_countries, activities, default_resume_id";
