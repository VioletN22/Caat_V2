-- F5 - Self-serve account deletion.
--
-- The anon/authenticated client CANNOT delete a Supabase auth user, so this is a
-- SECURITY DEFINER function owned by `postgres` (which has DELETE on auth.users).
-- It wipes every row the caller owns across the app's tables, scoped strictly to
-- auth.uid(), then deletes the caller's auth.users row. All FKs to auth.users are
-- ON DELETE CASCADE except documents, user_bookmarked_majors, community_groups
-- (creator_id) and dashboard_layouts (which points at profiles), so those are
-- deleted explicitly first to avoid a constraint failure or orphaned rows.
--
-- Storage objects (uploaded documents) are not removed here; that is a separate
-- follow-up (storage cleanup / retention job).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'delete_own_account: no authenticated user';
  end if;

  -- Community interactions the user authored (children first; several cascade,
  -- but we delete explicitly so the wipe is exhaustive and order-independent).
  delete from public.community_comment_likes where user_id = v_uid;
  delete from public.community_likes where user_id = v_uid;
  delete from public.community_poll_votes where user_id = v_uid;
  delete from public.community_saves where user_id = v_uid;
  delete from public.community_reports where reporter_id = v_uid;
  delete from public.community_follows where follower_id = v_uid or followee_id = v_uid;
  delete from public.community_group_requests where user_id = v_uid;
  delete from public.community_group_members where user_id = v_uid;
  delete from public.community_blocks where blocker_id = v_uid or blocked_id = v_uid;
  delete from public.notifications where user_id = v_uid or actor_id = v_uid;
  delete from public.community_comments where user_id = v_uid;
  delete from public.community_posts where user_id = v_uid;
  delete from public.community_groups where creator_id = v_uid; -- NO ACTION fk
  delete from public.community_profile_settings where user_id = v_uid;

  -- Application / planning data.
  delete from public.calendar_events where user_id = v_uid;
  delete from public.user_todos where user_id = v_uid;
  delete from public.user_recommenders where user_id = v_uid;
  delete from public.user_scholarships where user_id = v_uid;
  delete from public.user_school_applications where user_id = v_uid;
  delete from public.user_school_notes where user_id = v_uid;
  delete from public.user_bookmarked_schools where user_id = v_uid;
  delete from public.user_bookmarked_scholarships where user_id = v_uid;
  delete from public.user_bookmarked_majors where user_id = v_uid; -- NO ACTION fk

  -- Essays and documents.
  delete from public.custom_essay_prompts where user_id = v_uid;
  delete from public.essay_drafts where user_id = v_uid;
  delete from public.documents where user_id = v_uid; -- NO ACTION fk

  -- Dashboard config (dashboard_layouts fk -> profiles SET NULL, so delete it).
  delete from public.dashboard_layouts where user_id = v_uid;
  delete from public.user_dashboard_widgets where user_id = v_uid;

  -- Resume (resume_sections cascade from resumes; profiles.default_resume_id
  -- SET NULL). Standardised tests (subjects cascade from scores).
  delete from public.resumes where user_id = v_uid;
  delete from public.standardised_test_scores where profile_id = v_uid;

  -- Profile row (profiles.id fk -> auth.users CASCADE, but delete explicitly).
  delete from public.profiles where id = v_uid;

  -- Finally the auth user itself (cascades any remaining auth.* rows).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'F5: deletes the calling authenticated user''s data across all owned tables and their auth.users row. Scoped to auth.uid(). SECURITY DEFINER.';
