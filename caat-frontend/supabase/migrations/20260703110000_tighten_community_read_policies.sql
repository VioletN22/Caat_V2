-- A10: stop de-anonymising poll voters and exposing private-group rosters, while
-- preserving the PUBLIC aggregate counts the feed and group pages depend on.
--
-- Both tables currently power public counts by reading raw rows under a permissive
-- `true` SELECT policy: poll tallies read every vote row (enrichPosts), and group
-- member counts read every member row (group discover + group page). So SELECT
-- cannot simply be scoped to the owner without breaking those counts. Instead:
--   * poll votes: SELECT is restricted to the voter; tallies move to a SECURITY
--     DEFINER aggregate RPC (get_poll_vote_counts) that returns counts only, never
--     user ids.
--   * group members: SELECT is allowed for the group creator, members of the group
--     (full roster, via a SECURITY DEFINER helper that avoids policy self-recursion),
--     and anyone for PUBLIC groups (so public member counts still work). Private
--     group rosters are hidden from non-members.

-- ── poll votes ─────────────────────────────────────────────────────────────────
create or replace function public.get_poll_vote_counts(post_ids uuid[])
returns table(post_id uuid, option_id text, votes bigint)
language sql stable security definer set search_path to 'public'
as $$
  select v.post_id, v.option_id, count(*)::bigint
  from public.community_poll_votes v
  where v.post_id = any(post_ids)
  group by v.post_id, v.option_id;
$$;
revoke execute on function public.get_poll_vote_counts(uuid[]) from public;
grant execute on function public.get_poll_vote_counts(uuid[]) to authenticated;

drop policy if exists "Users can read all votes" on public.community_poll_votes;
create policy poll_votes_select_own on public.community_poll_votes
  for select to authenticated using (user_id = auth.uid());

-- ── group members ──────────────────────────────────────────────────────────────
-- All visibility logic lives in ONE SECURITY DEFINER function so the members SELECT
-- policy never reads community_groups or community_group_members under RLS. That
-- avoids TWO recursion traps:
--   1. self-reference: a member check that reads community_group_members inside its
--      own policy;
--   2. cross-table: community_groups.groups_select itself does EXISTS(... FROM
--      community_group_members ...), so reading community_groups under RLS from the
--      members policy loops back here.
-- MUST be plpgsql (sql functions get inlined, dropping the definer context). The
-- owner (postgres) has rolbypassrls, so the internal reads see every row.
create or replace function public.can_view_group_members(p_group_id uuid, p_user_id uuid)
returns boolean
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  return exists (
    select 1 from public.community_groups g
    where g.id = p_group_id
      and (g.is_private = false or g.creator_id = p_user_id)
  ) or exists (
    select 1 from public.community_group_members m
    where m.group_id = p_group_id and m.user_id = p_user_id
  );
end;
$$;
revoke execute on function public.can_view_group_members(uuid, uuid) from public;
grant execute on function public.can_view_group_members(uuid, uuid) to authenticated;

drop policy if exists "members_select" on public.community_group_members;
create policy group_members_select_visible on public.community_group_members
  for select to authenticated
  using (public.can_view_group_members(group_id, auth.uid()));
