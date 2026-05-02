-- Migration: communities_v8_public_profile_lookup
--
-- Fixes the community feed showing every other user's post as "Anonymous"
-- even when the post was made with the anonymous toggle off, AND fixes the
-- broader case where every cross-user community read (profile pages,
-- comments, notifications, followers, following, who-to-follow, group join
-- requests) silently returns no rows.
--
-- Root cause: profiles.RLS only permits a user to SELECT their own row, so
-- any code path that does .from("profiles").in("id", <other users>) gets
-- back an empty array. In the feed, that nulls out post.author and
-- PostCard's non-anonymous branch falls back to "Anonymous" name + "A"
-- initial avatar, indistinguishable from a genuine anonymous post.
--
-- Fix: two SECURITY DEFINER functions that expose only the columns each
-- caller actually needs. RLS on the underlying profiles table stays locked
-- down — sensitive columns (email, phone, birth_date, nationality, etc.)
-- remain owner-only.

-- ─────────────────────────────────────────
-- get_public_profiles(uuid[])
--   Returns the 5 fields used everywhere in the community UI to render an
--   author chip: id, name, avatar, is_verified.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  is_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    COALESCE(p.is_verified, false) AS is_verified
  FROM public.profiles p
  WHERE p.id = ANY(user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

-- ─────────────────────────────────────────
-- get_community_profile_extended(uuid)
--   Returns the extra fields the /communities/profile/[userId] page needs:
--   graduation_year, school_name, preferred_countries, target_majors. The
--   community_profile_settings row separately controls which of these the
--   client actually displays — that gating still lives in the JS code, the
--   function just makes the underlying read possible despite profiles RLS.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_community_profile_extended(target_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  graduation_year integer,
  school_name text,
  preferred_countries text[],
  target_majors text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.graduation_year,
    p.school_name,
    p.preferred_countries,
    p.target_majors
  FROM public.profiles p
  WHERE p.id = target_id;
$$;

REVOKE ALL ON FUNCTION public.get_community_profile_extended(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_profile_extended(uuid) TO authenticated;
