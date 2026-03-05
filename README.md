## Caat V2 Monorepo

This repository currently contains multiple Next.js applications:

- `caat-frontend`
- `my-app`

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
  - The CI workflow is designed to be safe for pull requests and does **not** require any secrets.
  - If you later add steps that need secrets (for example, deployments), add them behind `if:` guards so external PRs can still run safely.

### Running checks locally

From the repository root, change into the subproject you want to work on and run the same commands that CI does.

#### `caat-frontend`

```bash
cd caat-frontend

# Lint
npm run lint

# Typecheck
npm run typecheck

# Tests (currently a placeholder that simply notes there are no tests yet)
npm test

# Build
npm run build
```

#### `my-app`

```bash
cd my-app

# Lint
npm run lint

# Typecheck
npm run typecheck

# Tests (currently a placeholder that simply notes there are no tests yet)
npm test

# Build
npm run build
```

As you add more tests or additional tooling (for example, e2e tests or storybook), you can:

- Update each subproject's `package.json` with new scripts (for example, `test:e2e`)
- Extend `.github/workflows/ci.yml` by adding new steps that run these scripts, guarded by `if: ${{ matrix.project.scripts.<name> }}` so the workflow remains scalable and non-breaking.

