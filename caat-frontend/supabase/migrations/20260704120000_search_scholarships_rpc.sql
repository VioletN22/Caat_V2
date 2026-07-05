-- C1/M2/D6/B12: move the scholarships browse query server-side.
--
-- Before this, app/(main)/scholarships/page.tsx fetched the ENTIRE scholarships
-- table (4,224 rows x ~40 cols, including full description/eligibility text) on
-- every view, serialized it into the RSC payload, then filtered/paginated/
-- match-sorted it client-side. This RPC pushes filtering, the profile
-- match-sort, and pagination into Postgres so only one page is returned.
--
-- The profile match-sort (B12) depends on a per-row text scan of
-- title+description+tags for the user's target majors. Doing that here costs
-- nothing over the wire (it runs inside Postgres) and lets matched rows sort to
-- the top ACROSS pages, which a client-side page-local sort could never do.
--
-- Filter + score logic mirrors, exactly, the client predicates that used to run
-- in scholarships/client.tsx:
--   * lib/scholarship-filters.ts  (FUNDING_MAP, LEVEL_MAP, CITIZENSHIP_MAP, field overlap)
--   * lib/profile-match.ts        (matchScholarship: major/country/citizenship/level)
-- The single divergence point is DOMESTIC_CODES (Australia -> AU/AU-PR), kept
-- inline below to match lib/scholarship-filters.ts::DOMESTIC_CODES.
--
-- Profile-only derivations that need alias tables (country aliases, nationality
-- -> home country) are computed in JS and passed in as already-normalised
-- params, so this function only does the per-row work.
--
-- Returns a single row: `data` is a jsonb array of the page's full scholarship
-- rows (everything the card + badge need), `total_count` is the full filtered
-- count for pagination.

create or replace function public.search_scholarships(
  p_search         text        default null,
  p_location       text        default null,
  p_funding        text[]      default '{}',
  p_levels         text[]      default '{}',
  p_citizenship    text[]      default '{}',
  p_fields         text[]      default '{}',
  p_universities   text[]      default '{}',
  p_open_only      boolean     default false,
  p_restrict_ids   uuid[]      default null,
  p_target_majors  text[]      default '{}',   -- lowercased in JS
  p_pref_countries text[]      default '{}',   -- alias-normalised + lowercased in JS
  p_home_country   text        default null,   -- NATIONALITY_TO_COUNTRY[nationality]
  p_domestic_codes text[]      default '{}',   -- DOMESTIC_CODES[home_country]
  p_grad_year      integer     default null,
  p_limit          integer     default 6,
  p_offset         integer     default 0
)
returns table(data jsonb, total_count bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  with base as (
    select
      s.*,
      case
        when (flags.f_major + flags.f_country + flags.f_citz) > 0
          then flags.f_major + flags.f_country + flags.f_citz + flags.f_level
        else 0
      end as _score
    from scholarships s
    cross join lateral (
      select
        -- matchedMajor: any target major is a substring of title+description+tags
        (case
          when cardinality(p_target_majors) > 0
           and exists (
             select 1 from unnest(p_target_majors) m
             where m <> ''
               and position(m in lower(
                 coalesce(s.title, '') || ' ' ||
                 coalesce(s.description, '') || ' ' ||
                 coalesce(array_to_string(s.tags, ' '), '')
               )) > 0
           )
          then 1 else 0
        end) as f_major,
        -- matchedCountry: normalised preferred country equals the row's country
        (case
          when cardinality(p_pref_countries) > 0
           and lower(trim(coalesce(s.country, ''))) = any(p_pref_countries)
          then 1 else 0
        end) as f_country,
        -- citizenshipEligible: isCitizenshipEligible(nationality, s) from profile-match.ts
        (case
          when jsonb_array_length(coalesce(s.citizenships, '[]'::jsonb)) = 0 then 0
          when (
                 p_home_country is not null
                 and lower(trim(coalesce(s.country, ''))) = lower(p_home_country)
                 and coalesce(s.citizenships, '[]'::jsonb) ?| coalesce(p_domestic_codes, '{}')
               )
               or coalesce(s.citizenships, '[]'::jsonb) @> '["INTERNATIONAL"]'::jsonb
          then 1 else 0
        end) as f_citz,
        -- levelMatches: high-schooler heuristic + undergraduate study level
        (case
          when p_grad_year is not null
           and p_grad_year between extract(year from now())::int and extract(year from now())::int + 5
           and s.study_level @> array['undergraduate']
          then 1 else 0
        end) as f_level
    ) flags
    where
      (p_restrict_ids is null or s.id = any(p_restrict_ids))
      and (not p_open_only or s.is_active)
      and (
        p_search is null
        or s.title ilike '%' || p_search || '%'
        or s.provider_name ilike '%' || p_search || '%'
      )
      and (
        p_location is null
        or s.country ilike '%' || p_location || '%'
        or s.school_name ilike '%' || p_location || '%'
        or s.state_region ilike '%' || p_location || '%'
      )
      and (
        cardinality(p_funding) = 0
        or ('Merit-Based' = any(p_funding) and s.merit_based)
        or ('Need-Based'  = any(p_funding) and s.need_based)
        or ('Full Ride'   = any(p_funding) and s.funding_type @> array['full_ride'])
      )
      and (
        cardinality(p_levels) = 0
        or ('Undergraduate' = any(p_levels) and s.study_level @> array['undergraduate'])
        or ('Postgraduate'  = any(p_levels) and s.study_level @> array['postgraduate'])
      )
      and (
        cardinality(p_citizenship) = 0
        or (
          'Domestic' = any(p_citizenship) and (
            jsonb_array_length(coalesce(s.citizenships, '[]'::jsonb)) = 0
            or (case
                  when s.country = 'Australia'
                    then coalesce(s.citizenships, '[]'::jsonb) ?| array['AU', 'AU-PR']
                  else exists (
                    select 1 from jsonb_array_elements_text(coalesce(s.citizenships, '[]'::jsonb)) e
                    where e <> 'INTERNATIONAL'
                  )
                end)
          )
        )
        or (
          'International' = any(p_citizenship) and (
            jsonb_array_length(coalesce(s.citizenships, '[]'::jsonb)) = 0
            or coalesce(s.citizenships, '[]'::jsonb) @> '["INTERNATIONAL"]'::jsonb
          )
        )
      )
      and (cardinality(p_fields) = 0 or s.field_of_study && p_fields)
      and (
        cardinality(p_universities) = 0
        or coalesce(nullif(trim(s.school_name), ''), trim(s.provider_name)) = any(p_universities)
      )
  ),
  page as (
    select *
    from base
    order by _score desc, is_active desc, is_featured desc, created_at desc
    limit greatest(p_limit, 0)
    offset greatest(p_offset, 0)
  )
  select
    coalesce(
      (
        select jsonb_agg(to_jsonb(page) - '_score'
                 order by page._score desc, page.is_active desc, page.is_featured desc, page.created_at desc)
        from page
      ),
      '[]'::jsonb
    ) as data,
    (select count(*) from base) as total_count;
$$;

grant execute on function public.search_scholarships(
  text, text, text[], text[], text[], text[], text[], boolean, uuid[],
  text[], text[], text, text[], integer, integer, integer
) to anon, authenticated;

-- The University filter dropdown used to be derived client-side from the full
-- table dump. With the table no longer shipped to the client, expose the small
-- distinct set of provider/school names (currently ~8) so the dropdown can be
-- populated without fetching every row. Global + tiny -> cached in the RSC.
create or replace function public.scholarship_universities()
returns setof text
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct coalesce(nullif(trim(school_name), ''), trim(provider_name)) as uni
  from scholarships
  where coalesce(nullif(trim(school_name), ''), trim(provider_name)) is not null
  order by uni;
$$;

grant execute on function public.scholarship_universities() to anon, authenticated;
