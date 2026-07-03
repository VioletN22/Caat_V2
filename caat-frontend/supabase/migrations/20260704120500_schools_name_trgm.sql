-- C12: /schools search uses a leading-wildcard ilike ('%q%'), which a btree
-- index cannot serve. Add a pg_trgm GIN index on schools.name so the search
-- is index-backed. pg_trgm is already installed on this project.
create extension if not exists pg_trgm;

create index if not exists idx_schools_name_trgm
  on public.schools
  using gin (name gin_trgm_ops);
