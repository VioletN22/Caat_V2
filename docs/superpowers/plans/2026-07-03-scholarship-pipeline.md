# Scholarship Ingestion Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Read `docs/superpowers/specs/2026-07-03-caat-overhaul-design.md` (Workstream H + Decision #8) first. This work happens in a **separate repo** (`stealth-startup-2026/scholarship-scraper`), not `Caat_V2`, and runs on the **mac mini** (Claude CLI on subscription). Steps use `- [ ]`.

**Goal:** Turn the per-university bespoke scrapers into a config-driven pipeline where adding a university is ~30 lines of JSON, not a new scraper — with a real idempotent load stage (replacing the manual Supabase-dashboard ceremony) and QA gates, wired into helm's scraper cockpit.

**Architecture:** Separate DISCOVERY (per-source declarative config) from EXTRACTION (generic, one wide LLM call via a provider interface) from LOAD (fully shared, idempotent upsert, never-delete). Extraction uses the `claude` CLI on Violet's Max subscription (Decision #8), so the pipeline runs on the mini via helm's local backend, not GitHub Actions.

**Tech Stack:** Python 3, requests + BeautifulSoup (+ Playwright for `render_js`), the `claude` CLI (subprocess, subscription auth), Supabase Postgres (`public.scholarships`, `scholarship_sources`, `scholarship_schools`, `schools`).

## Global Constraints

- Repo: `stealth-startup-2026/scholarship-scraper`. Clone/work on the **mini** (keyless SSH as `violet`) where the Claude CLI is GUI-authenticated, or develop locally and run extraction on the mini.
- **No Anthropic API key, no DeepSeek** — extraction is the `claude` CLI on the subscription (Decision #8). Keep the old SDK path behind the provider interface but do not wire it.
- Preserve the existing 41-column schema (`scholarship_common.OUTPUT_FIELDNAMES`) and the working LLM stages (`classify_page`, `split_bundle`, `extract_requirements`, `verify_row`, `build_sub_rows`) — refactor, don't rewrite.
- Idempotency: natural key `(source_id, external_id)`; deterministic `uuid5`. Never hard-delete scholarships (bookmarks FK); mark gone rows `is_active=false`.
- Before editing any existing module, read it in full (`unsw/unsw_scraper.py`, `usyd/usyd_scraper.py`, `scholarship_common.py`, `requirements_extractor.py`, `CLAUDE.md`).

## Target file structure (new)

```
pipeline/
  __init__.py
  config.py          # SourceConfig dataclass + loader/validator for sources/*.json
  providers.py       # LLM provider interface; ClaudeCliProvider (default) + SdkProvider (dormant)
  discover.py        # strategy dispatch: html-list | json-feed | sitemap | search-api | url-template | custom
  fetch.py           # polite session, HTTP cache (ETag), Playwright for render_js
  segment.py         # hint-driven section extraction + full-page-text fallback
  extract.py         # one wide extract_scholarship() call; wraps classify/split; cross-checks
  validate.py        # row schema validation + sanity bounds
  load.py            # idempotent Supabase upsert (sources, schools link, scholarships), never-delete
  qa.py              # hard/soft gates; machine-readable report
  run.py             # CLI entrypoint: `python -m pipeline.run --source <id> [--limit N] [--dry-run]`
sources/
  usyd.json
  unsw.json
helm.json            # local-backend manifest (see Task 11)
tests/
  test_config.py test_discover.py test_extract_contract.py test_load.py golden/
```

Keep `scholarship_common.py` and `requirements_extractor.py`; `pipeline/` imports their still-generic functions.

---

### Task 1: LLM provider interface with a Claude-CLI default (Decision #8)

**Files:** Create `pipeline/providers.py`; Test `tests/test_extract_contract.py`.

**Interfaces:**
- Produces: `class LlmProvider(Protocol): def complete_json(self, system: str, user: str, schema: dict) -> dict`. `ClaudeCliProvider` shells out to `claude -p` (print mode) with a prompt instructing strict JSON matching `schema`, parses stdout as JSON (with a retry on parse failure). `get_provider(name="claude-cli")` factory; `SdkProvider` kept as a dormant stub raising `NotImplementedError` until an API key is ever chosen.

- [ ] **Step 1: Write a contract test** that stubs the CLI call and asserts `complete_json` returns a dict matching a tiny schema and retries once on invalid JSON. (Mock `subprocess.run` to return a JSON string, then a bad string then good.)
- [ ] **Step 2: Run it, expect fail** (`python -m pytest tests/test_extract_contract.py` → fail, module missing).
- [ ] **Step 3: Implement `ClaudeCliProvider`.** Invoke `claude -p "<prompt>"` via `subprocess.run` with a timeout; the prompt embeds the JSON schema and the page text and says "respond with only valid JSON". Parse stdout; on `JSONDecodeError` retry once with a "return ONLY JSON" reminder; raise after the second failure. Add a small concurrency guard (a semaphore) so batch runs don't exceed subscription limits.
- [ ] **Step 4: Run test, expect pass.**
- [ ] **Step 5: Live smoke on the mini** — a one-off script that calls `ClaudeCliProvider.complete_json` on a trivial schema and prints the result, run over SSH on the mini, to confirm the CLI is authenticated and returns JSON. If it errors with an auth/login message, the mini needs a GUI Claude login first (the forklore/Wren failure mode).
- [ ] **Step 6: Commit** (`feat: LLM provider interface with Claude-CLI subscription default`).

---

### Task 2: Source-config schema + loader

**Files:** Create `pipeline/config.py`, `sources/usyd.json`, `sources/unsw.json`; Test `tests/test_config.py`.

**Interfaces:**
- Produces: `@dataclass SourceConfig` with the fields from spec H.1 (identity, `discovery`, `fetch`, `detail`, `identity`, `defaults`); `load_source(source_id) -> SourceConfig` reads `sources/<id>.json`, validates required fields, and raises a clear error on a bad/missing config.

- [ ] **Step 1: Write `sources/usyd.json` and `sources/unsw.json`** by translating the two existing scrapers' constants into config (spec H.1 shows the USyd shape). USyd: `discovery.strategy="json-feed"`, the AEM feed URL, `record_path`, `url_field`, `dedupe_by`, `tag_mappings`; `award_code_regex=null`, `detail_slug_regex` for the slug. UNSW: `strategy="html-list"`, the search page URL, `link_pattern="/scholarships/id/"`, `award_code_regex="\\b((?:UG|PG|PU)[A-Z]{2}\\d{3,5})\\b"`, `state_region="nsw"`. Copy the real `SOURCE_ID` UUIDs from `unsw_scraper.py`/`usyd_scraper.py` into `source_uuid`.
- [ ] **Step 2: Write a test** asserting `load_source("usyd")` returns a `SourceConfig` with the expected discovery strategy and `source_uuid`, and that a missing file raises a clear error.
- [ ] **Step 3: Run (fail) → implement `config.py` (dataclass + loader + validation) → run (pass).**
- [ ] **Step 4: Commit** (`feat: declarative source config (sources/*.json) + loader`).

---

### Task 3: Generic discovery

**Files:** Create `pipeline/discover.py`; Test `tests/test_discover.py`.

**Interfaces:**
- Produces: `discover(config: SourceConfig, fetch) -> list[DiscoveredUrl]` dispatching on `config.discovery.strategy`. Implement `html-list` (fetch page, collect hrefs matching `link_pattern`, dedupe), `json-feed` (fetch JSON, walk `record_path`, read `url_field`, apply `dedupe_by`, carry `listing_metadata`), and `sitemap` (fetch sitemap.xml, filter URLs by prefix). Stub `search-api`, `url-template`, and `custom:<module>` (import a module implementing `discover(config)->[urls]`) with clear `NotImplementedError` messages so they're explicit backlog, not silent gaps.

- [ ] **Step 1: Tests** with recorded/fixture HTML and a small JSON feed fixture asserting `html-list` extracts the expected UNSW-style hrefs and `json-feed` extracts the expected USyd-style records + dedupe. (Use saved fixtures under `tests/fixtures/`, not live network.)
- [ ] **Step 2: Run (fail) → implement → run (pass).**
- [ ] **Step 3: Live check** — `python -m pipeline.run --source usyd --discover-only` prints the discovered URL count; compare to the ~1,059 the USyd scraper found (allow drift). Same for UNSW's ~87.
- [ ] **Step 4: Commit** (`feat: strategy-driven discovery (html-list, json-feed, sitemap)`).

---

### Task 4: Generic fetch layer

**Files:** Create `pipeline/fetch.py`.

**Interfaces:**
- Produces: `fetch_page(url, config) -> FetchedPage{html, status, from_cache}`; polite session (honest UA, `rate_limit_ms` delay, retries), an on-disk HTTP cache keyed on URL + ETag/Last-Modified, and a Playwright path when `config.fetch.render_js`. Respect `robots.txt` when `respect_robots`.

- [ ] **Step 1:** Implement with the existing `requests` + `BeautifulSoup` approach reused from the current scrapers; add caching and the Playwright branch. Reuse `scholarship_common` helpers where they exist.
- [ ] **Step 2: Live check** — fetch 3 USyd detail pages and 3 UNSW pages, confirm 200s and cache hits on a second run.
- [ ] **Step 3: Commit** (`feat: polite cached fetch layer with optional Playwright rendering`).

---

### Task 5: Generic segmentation

**Files:** Create `pipeline/segment.py`.

**Interfaces:**
- Produces: `segment(html, config) -> dict[str,str]` returning `{eligibility, application, amount, overview, full_text}` using `config.detail.content_selector` + `section_hints` (generalizing the two existing heading-walkers into one hint-driven function). When hints miss, populate `full_text` (capped) so extraction always has input.

- [ ] **Step 1:** Implement; port the heading-variant logic from `usyd_scraper.py` (h2/h3 walk) and `unsw_scraper.py` (flattened text) into one hint-driven walker.
- [ ] **Step 2: Live check** — segment a known bundled UNSW page and a clean USyd page; confirm the eligibility/amount sections are populated (or `full_text` fallback fires).
- [ ] **Step 3: Commit** (`feat: hint-driven section segmentation with full-text fallback`).

---

### Task 6: Generic extraction (one wide call) + keep classify/split

**Files:** Create `pipeline/extract.py`; reuse `requirements_extractor.classify_page/split_bundle/extract_requirements/verify_row` and `scholarship_common.build_sub_rows`.

**Interfaces:**
- Produces: `extract_scholarship(segments, config, provider) -> list[ScholarshipRow]`. One wide provider call fills amount value/display/currency, ISO open/close dates, study_level, citizenships, funding_type, need/merit/essay booleans, awards_count, start_term, must_meet, application_mode — replacing the per-uni regex heuristics (`parse_amount`, `infer_*`, date formats). Keep the existing classify→split flow for bundled pages (call `classify_page`; if bundled, `split_bundle` + `build_sub_rows`, each sub-row extracted). Keep the deterministic parsers as **cross-checks**: on amount disagreement, flag for QA (don't silently trust one).

- [ ] **Step 1:** Define the extraction JSON schema (mirror `OUTPUT_FIELDNAMES` subset the LLM fills). Implement `extract_scholarship` using the provider from Task 1.
- [ ] **Step 2: Golden-set test** — save 3-5 representative pages (clean, bundled, amount-in-table) under `tests/golden/`; assert extraction produces rows with non-empty external_id, a parseable deadline, and an amount, and that a bundled page yields >1 row. (Mock the provider with recorded outputs so the test is deterministic and offline.)
- [ ] **Step 3: Run (fail) → implement → run (pass).**
- [ ] **Step 4: Live check on the mini** — run extraction (real Claude CLI) over the 5 golden pages; eyeball the amounts/dates against the source. This is the quality gate for the subscription-CLI path.
- [ ] **Step 5: Commit** (`feat: generic wide LLM extraction; keep classify/split; regex cross-checks`).

---

### Task 7: Validate, dedup, deterministic ids

**Files:** Create `pipeline/validate.py`; extend `extract.py`/`run.py` for ids.

**Interfaces:**
- Produces: `validate_row(row) -> list[str]` (errors: bad types, empty external_id, unparseable date, amount outside `0 < x < 500000`); `row.id = uuid5(source_uuid, external_id)`; sub-award id `uuid5(parent_external_id, slug(sub_title))`. Within-run dedup by external_id.

- [ ] **Step 1:** Tests for validation (a row with empty external_id fails; a $2M amount fails sanity) and for deterministic id stability (same inputs → same uuid5).
- [ ] **Step 2: Run (fail) → implement → run (pass).**
- [ ] **Step 3: Commit** (`feat: row validation, deterministic uuid5 ids, in-run dedup`).

---

### Task 8: Idempotent Supabase load stage (the missing piece)

**Files:** Create `pipeline/load.py`; Test `tests/test_load.py`.

**Interfaces:**
- Consumes: `CAAT_SUPABASE_URL`, `CAAT_SUPABASE_SERVICE_ROLE_KEY` from env.
- Produces: `load(rows, config, discovered_external_ids)`: upsert `scholarship_sources` from config (`on_conflict=id`); ensure the `schools` row via `school_match` and upsert `scholarship_schools` links; upsert `scholarships` `on_conflict=(source_id, external_id)` preserving existing `id`; set `is_active=false` (with a reason in `raw_payload`) for rows in DB for this source but absent from `discovered_external_ids` (**never delete**); write `citizenships` (jsonb-vs-text[] handling from `gen_citizenships_update_sql.py`). Uses the Supabase REST upsert (`Prefer: resolution=merge-duplicates`) or `psycopg` — pick per what the repo already has.

- [ ] **Step 1: Test against a scratch source** — a `test_load.py` that upserts 2 fake rows twice and asserts the second run does not change row count or `id`s (idempotent), and that dropping one from the discovered set flips its `is_active` to false without deleting it. Run against the live CAAT DB using a throwaway `source_id` (clean up after), or a local Postgres if available.
- [ ] **Step 2: Run (fail) → implement → run (pass).**
- [ ] **Step 3: Verify bookmarks survive** — confirm a re-run preserves `scholarships.id` for an unchanged row (so `user_scholarships`/bookmark FKs stay valid). This is the whole reason for upsert-not-reimport.
- [ ] **Step 4: Commit** (`feat: idempotent Supabase load stage; never-delete, mark is_active=false`).

---

### Task 9: QA gates + machine-readable report

**Files:** Create `pipeline/qa.py`; wire into `run.py`.

**Interfaces:**
- Produces: `qa_gates(rows, prev_run, config) -> QaResult{passed, hard_failures, soft_warnings}`. Hard gates (block the load): discovery count drop >40% vs last run; any empty external_id; non-whitelisted external_id prefixes when `award_code_regex` set; <50% of active rows with an amount; zero must_meet coverage when a provider is configured; validation failure rate >5%. Soft (recorded, trended): regex/LLM bundle disagreement, amount disagreement, `verify_row` sampling, date-parse and dead-link rates. `run.py` prints a JSON report (counts, gate results, cache-hit rate, cost=n/a on subscription) to stdout for helm's log.

- [ ] **Step 1:** Tests for the hard gates (a row set with 60% missing amounts fails; an empty external_id fails).
- [ ] **Step 2: Run (fail) → implement → run (pass).**
- [ ] **Step 3:** Wire `run.py` so a hard-gate failure aborts the load and exits non-zero (helm shows a failed run); soft warnings go in the report.
- [ ] **Step 4: Commit** (`feat: QA gates + machine-readable run report`).

---

### Task 10: Port USyd and UNSW to the pipeline (prove the abstraction)

**Files:** `sources/usyd.json`, `sources/unsw.json` (from Task 2), `pipeline/run.py`.

- [ ] **Step 1: Full dry run** — `python -m pipeline.run --source usyd --limit 20 --dry-run` on the mini: discovers, fetches, segments, extracts (real CLI), validates, runs QA, but does NOT load. Inspect the report + a sample of rows.
- [ ] **Step 2: Compare to the legacy output** — spot-check 10 rows against the existing `australia/usyd/usyd_scholarships.csv` to confirm parity (titles, amounts, deadlines). Same for UNSW `--limit 20`.
- [ ] **Step 3: Small real load** — run without `--dry-run` on a `--limit 20` slice into the live DB; verify the rows appear correctly in CAAT's `/scholarships` and that a re-run is idempotent.
- [ ] **Step 4: Add a new uni as the acceptance test** — pick a third AU uni (e.g. Monash or UQ), write only `sources/<id>.json` (no new Python), run `--limit 10 --dry-run`, and confirm it produces valid rows. **This is the proof that expansion is now config-only.** If it needs code, the abstraction leaked — note what and where.
- [ ] **Step 5: Commit** (`feat: port USyd/UNSW to config; add <third-uni> as config-only`).

---

### Task 11: Wire into helm (local backend on the mini)

**Files:** Create `helm.json` in the scraper repo; set `hasScrapers` + link the repo in helm; launchd plists on the mini.

- [ ] **Step 1: Write `helm.json`** per spec H.6: `backend:"local"`, a `scrapers` array (one launchd job per source + `all`) each `{id, label, cwd, command:"python -m pipeline.run --source <id>", dryRunArgs:"--source <id> --limit 5 --dry-run", launchdLabel:"com.caat.scholarships.<id>", logPath, schedule}`, `secrets:["CAAT_SUPABASE_URL","CAAT_SUPABASE_SERVICE_ROLE_KEY"]` (no LLM key). Commit to the scraper repo.
- [ ] **Step 2: In helm**, set `hasScrapers: true` on the caat project row (`helm/lib/projects.ts`, the caat entry) and link the scraper repo via the cockpit's link flow. Store the two Supabase secrets in helm's secrets UI.
- [ ] **Step 3: Create launchd plists on the mini** for each source (weekly, staggered, off-peak Sydney time), running `pipeline.run`, writing to `logPath`. Detach long runs (nohup) so they exceed the daemon's ~10min dispatch cap; helm observes via the log + `companion_commands`.
- [ ] **Step 4: Verify in helm** — the caat cockpit shows a scrapers tab with per-source run buttons; trigger a `--dry-run` from helm and confirm the run log streams back and status resolves.
- [ ] **Step 5: Commit** (helm side + scraper `helm.json`).

---

## Plan-wide acceptance

- [ ] Adding a university is one `sources/<id>.json` (proven in Task 10 Step 4) — no new Python.
- [ ] A full run is idempotent: re-running preserves scholarship `id`s (bookmarks survive) and marks vanished awards `is_active=false` without deleting (Task 8).
- [ ] Extraction runs on Violet's subscription via the Claude CLI on the mini — no API key, no DeepSeek (Task 1, Task 6 Step 4).
- [ ] helm shows the pipeline in the caat scraper cockpit with per-source runs + logs (Task 11).
- [ ] QA hard-gate failure aborts the load and surfaces as a failed run (Task 9).

## Note on execution location

Tasks 1, 3-6, 10 need the Claude CLI, so their live checks run on the **mini** (keyless SSH as `violet`; the CLI must be GUI-authenticated — reconfirm before relying on it, per the forklore/Wren failure mode). Pure-logic tasks (2, 7, 8-config, 9) can be developed and unit-tested anywhere.
