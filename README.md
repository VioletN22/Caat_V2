## Caat V2 Monorepo

This repository contains the main Next.js application:

- `caat-frontend` — the CAAT admissions portal (Next.js + TypeScript + Supabase)

Each subproject is a standalone Next.js + TypeScript app with its own `package.json`, lockfile, and configuration.

### CI

This repo uses GitHub Actions for continuous integration. The main workflow lives in `.github/workflows/ci.yml`.

- **When it runs**
  - On every push to `develop` and `main`
  - On every pull request targeting `develop` or `main`

- **What it does**
  - Automatically discovers all subprojects that have a `package.json` (excluding build artifacts)
  - For each discovered project, in parallel:
    - Installs dependencies (preferring `npm ci` / lockfile-based installs)
    - Runs `lint` (if the project defines a `lint` script)
    - Runs `typecheck` (if the project defines a `typecheck` script)
    - Runs `test` (if the project defines a `test` script)
    - Runs `build` (if the project defines a `build` script)

If any subproject fails one of these steps, the overall CI check fails, so problems in one app cannot be hidden by success in another.

- **Secrets**
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set as GitHub Actions secrets in the repository settings so that `next build` can run in CI.

### Running checks locally

From the repository root, change into the subproject you want to work on and run the same commands that CI does.

#### `caat-frontend`

```bash
cd caat-frontend

# Install dependencies
npm install

# Lint
npm run lint

# Typecheck
npm run typecheck

# Tests
npm test

# Build
npm run build
```

As you add more tests or additional tooling (for example, e2e tests or storybook), you can:

- Update `caat-frontend/package.json` with new scripts (for example, `test:e2e`)
- Extend `.github/workflows/ci.yml` by adding new steps that run these scripts, guarded by `if: ${{ matrix.project.scripts.<name> }}` so the workflow remains scalable and non-breaking.
