-- A1: communities is authenticated-only. Revoke anon EXECUTE on both community
-- profile RPCs, and make the extended RPC honor each show_* visibility flag.
--
-- Visibility fallback (no community_profile_settings row) uses each column's real
-- DB default, which is asymmetric:
--   show_graduation_year  default true  (visible when unset)
--   show_school_name      default true  (visible when unset)
--   show_preferred_countries default false (hidden when unset)
--   show_target_majors       default false (hidden when unset)
-- Coalescing all four to `true` (as an earlier draft did) would leak countries and
-- majors for every user who never opened settings, so each flag falls back to its
-- own default instead.

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
    case when coalesce(s.show_preferred_countries, false) then p.preferred_countries end,
    case when coalesce(s.show_target_majors, false) then p.target_majors end
  from public.profiles p
  left join public.community_profile_settings s on s.user_id = p.id
  where p.id = target_id;
$$;
