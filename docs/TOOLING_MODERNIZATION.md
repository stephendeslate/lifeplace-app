# Tooling Modernization

This document covers 11 tooling improvements implemented across the LifePlace monorepo. Each section explains what changed, before/after usage, why it's better, and impact.

---

## Table of Contents

1. [EditorConfig](#1-editorconfig)
2. [Node Version Pinning](#2-node-version-pinning)
3. [Dependabot](#3-dependabot)
4. [Ruff Upgrade](#4-ruff-upgrade)
5. [mypy Type Checking](#5-mypy-type-checking)
6. [uv Package Manager](#6-uv-package-manager)
7. [ESLint for Mobile App](#7-eslint-for-mobile-app)
8. [Environment Variable Validation](#8-environment-variable-validation)
9. [Turborepo](#9-turborepo)
10. [Prettier](#10-prettier)
11. [expo-updates OTA](#11-expo-updates-ota)

---

## 1. EditorConfig

**Files:** `.editorconfig`

**What changed:** Added a `.editorconfig` file at the project root that standardizes indent style, charset, line endings, and trailing whitespace rules across all editors (VS Code, WebStorm, vim, etc.).

**Before:**
- Each developer's editor had its own formatting settings
- Inconsistent indentation across files (tabs vs spaces, 2 vs 4)

**After:**
- All editors automatically use 2-space indent for TS/JS/YAML, 4-space for Python/Dockerfile, tabs for Makefile
- UTF-8 charset, LF line endings enforced universally

**Why it's better:** Eliminates formatting noise in diffs. New contributors get correct settings without manual configuration.

**Impact:** Zero risk. Purely additive.

---

## 2. Node Version Pinning

**Files:** `.nvmrc`, `.node-version`

**What changed:** Added version files that pin Node.js to version 20, matching CI (`ci-cd.yml` and `mobile-tests.yml`).

**Before:**
```bash
# Developer manually checks CI config for correct Node version
node --version  # Could be anything
```

**After:**
```bash
nvm use          # Reads .nvmrc → switches to Node 20
fnm use          # Reads .node-version → switches to Node 20
```

**Why it's better:** Prevents "works on my machine" issues from Node version mismatches. Every tool (nvm, fnm, volta, asdf) reads at least one of these files.

**Impact:** Zero risk. Informational files only.

---

## 3. Dependabot

**Files:** `.github/dependabot.yml`

**What changed:** Configured GitHub Dependabot to automatically open PRs for dependency updates across all ecosystems:

| Ecosystem | Directory | Schedule |
|-----------|-----------|----------|
| pip | `/backend` | Weekly (Monday) |
| npm | `/frontend/admin-crm` | Weekly (Tuesday) |
| npm | `/frontend/client-portal` | Weekly (Tuesday) |
| npm | `/frontend/shared` | Weekly (Wednesday) |
| npm | `/mobile-app` | Weekly (Wednesday) |
| github-actions | `/` | Monthly |

Updates are grouped (django, mui, tanstack, expo, react-native, minor-and-patch) to reduce PR noise.

**Before:**
- Dependencies updated manually, often months behind
- No systematic tracking of outdated packages

**After:**
- Automated weekly PRs with grouped updates
- CI tests run on each Dependabot PR before merge

**Why it's better:** Reduces security exposure from stale dependencies. Smaller, incremental updates are safer than large version jumps.

**Impact:** Low risk. PRs require manual merge — nothing auto-deploys.

---

## 4. Ruff Upgrade

**Files:** `backend/requirements.txt`, `.pre-commit-config.yaml`, `pyproject.toml`, ~510 backend Python files (reformatted)

**What changed:** Upgraded Ruff from 0.1.9 to 0.15.2. This brought new lint rules, better formatting, and deprecated config migration (`known-django` → `[tool.ruff.lint.isort.sections]`).

**Before:**
```bash
ruff check backend/   # v0.1.9 — limited rule set
ruff format backend/  # v0.1.9 — basic formatting
```

**After:**
```bash
ruff check backend/   # v0.15.2 — expanded rules, better diagnostics
ruff format backend/  # v0.15.2 — improved formatting consistency
```

**Why it's better:** 6 major versions of improvements — faster execution, more bugs caught, better isort integration. The formatter now handles more edge cases correctly.

**Impact:** Medium. All existing code was reformatted and auto-fixed. The `.git-blame-ignore-revs` approach can be used if needed.

---

## 5. mypy Type Checking

**Files:** `backend/requirements.txt` (added stubs), `pyproject.toml` (mypy config), `.pre-commit-config.yaml` (mypy hook), `.github/workflows/ci-cd.yml` (mypy CI step)

**What changed:** Added gradual mypy type checking with django-stubs and DRF stubs. Scoped to `core/domains/` and non-blocking (`|| true` in CI).

**Before:**
- No static type checking for Python code
- Type errors only caught at runtime

**After:**
```bash
cd backend
mypy core/domains/ --config-file=../pyproject.toml  # Gradual type checking
```

Pre-commit hook runs mypy on `services.py` files only. CI runs it non-blocking.

**Why it's better:** Catches type errors before they hit production. Django-stubs provides typed models, querysets, and views. Gradual adoption means no disruption — scope expands over time.

**Impact:** Low. Non-blocking everywhere. Pre-commit scoped to services.py only.

---

## 6. uv Package Manager

**Files:** `backend/Dockerfile`, `.github/workflows/ci-cd.yml`, `pyproject.toml` (added `[project.dependencies]`)

**What changed:** Replaced `pip install` with `uv pip install` in Docker builds and CI. uv is a Rust-based drop-in pip replacement that is 10-100x faster.

**Before:**
```dockerfile
# Dockerfile
RUN pip install --no-cache-dir -r requirements.txt  # ~45-90 seconds
```
```yaml
# CI
- run: pip install -r requirements.txt  # ~60 seconds
```

**After:**
```dockerfile
# Dockerfile
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
RUN uv pip install --system --no-cache -r requirements.txt  # ~5-10 seconds
```
```yaml
# CI
- uses: astral-sh/setup-uv@v4
- run: uv pip install --system -r requirements.txt  # ~5-10 seconds
```

`requirements.txt` is kept as the source of truth. `pyproject.toml` now also has a `[project.dependencies]` section for future migration.

**Why it's better:** Docker builds and CI runs are significantly faster. uv is fully compatible with pip — zero behavioral changes, just speed.

**Impact:** Low. Drop-in replacement. Falls back to pip if uv is unavailable.

---

## 7. ESLint for Mobile App

**Files:** `mobile-app/eslint.config.mjs`, `mobile-app/package.json`, `.pre-commit-config.yaml`, `.github/workflows/mobile-tests.yml`

**What changed:** Added ESLint 9.x flat config to the mobile app (previously had no linting). Includes TypeScript-ESLint and react-hooks plugins with React Native-specific globals.

**Before:**
```bash
cd mobile-app
# No lint command available
```

**After:**
```bash
cd mobile-app
npm run lint      # ESLint check
npm run lint:fix  # ESLint autofix
```

Runs in pre-commit (on mobile-app TS/TSX changes) and in CI (`mobile-tests.yml`).

**Why it's better:** Catches unused variables, missing hook dependencies, and other common React Native bugs at lint time rather than runtime.

**Impact:** Medium. New violations need to be addressed. Runs in CI on every PR touching `mobile-app/`.

---

## 8. Environment Variable Validation

**Files:** `frontend/admin-crm/src/env.ts`, `frontend/client-portal/src/env.ts`, `mobile-app/src/env.ts`, updated `*/utils/api.ts` files

**What changed:** Added Zod-based runtime validation for environment variables in all 3 apps. Each app has an `env.ts` that validates and types all `VITE_*` or `EXPO_PUBLIC_*` variables.

**Before:**
```typescript
// Scattered throughout codebase — no validation, no types
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**After:**
```typescript
// src/env.ts — single source of truth
import { env } from '@/env';
const apiUrl = env.VITE_API_URL;  // Typed, validated, with fallback
```

Behavior:
- **Development:** Logs warnings for missing/invalid vars
- **Production:** Throws on invalid values (catches misconfigurations at startup, not at runtime)

**Why it's better:** Type-safe env access. Missing variables caught immediately at app startup rather than causing cryptic failures deep in the code. Single file documents all env vars each app uses.

**Impact:** Low. Uses `safeParse` — warns but doesn't break. Key API files migrated; remaining files can be migrated incrementally.

---

## 9. Turborepo

**Files:** `package.json` (root), `turbo.json`, `.gitignore`, `.github/workflows/ci-cd.yml`, `frontend/shared/package.json`

**What changed:** Added Turborepo for monorepo orchestration of the 3 frontend workspaces (admin-crm, client-portal, shared). CI consolidated from 2 separate test jobs into 1 Turbo-powered job.

**Before:**
```yaml
# CI: Two separate jobs, each manually installing shared + app
test-admin-crm:
  - cd frontend/shared && npm install
  - cd ../admin-crm && npm install --force
  - npm run type-check && npm run lint && npm run test && npm run build

test-client-portal:
  # Same pattern repeated...
```

```bash
# Local: Manual per-app commands
cd frontend/admin-crm && npm run test
cd ../client-portal && npm run test
```

**After:**
```yaml
# CI: Single job with Turbo caching
test-frontends:
  - npm install --force
  - npx turbo run type-check lint format:check test
  - npx turbo run build --filter=admin-crm
  - npx turbo run build --filter=client-portal
```

```bash
# Local: Run across all workspaces from root
npm run test          # Tests all frontend packages in parallel
npm run lint          # Lints all frontend packages
npm run type-check    # Type-checks all frontend packages
npm run build         # Builds with dependency ordering (shared first)
```

**Why it's better:**
- **Caching:** Turbo caches task outputs — unchanged packages skip entirely on re-run
- **Parallelism:** Independent tasks (lint, type-check, test) run in parallel automatically
- **Dependency ordering:** `build` respects `^build` dependency — shared always builds before consuming apps
- **Simpler CI:** One job instead of two, with consistent install patterns

**Impact:** High. CI pipeline restructured. Deploy jobs updated to use workspace installs.

---

## 10. Prettier

**Files:** `.prettierrc`, `.prettierignore`, `package.json` (root), `frontend/*/package.json`, `.pre-commit-config.yaml`, `.github/workflows/ci-cd.yml`

**What changed:** Added Prettier for consistent code formatting across all frontend packages. Configured with single quotes, trailing commas, 100-char print width, and LF line endings.

**Before:**
- No automated formatting — style depended on individual developer settings
- Mixed quote styles across files

**After:**
```bash
# From root
npm run format        # Auto-format all frontend code
npm run format:check  # Check formatting (CI)

# Per-package
cd frontend/admin-crm
npm run format        # Format this package
npm run format:check  # Check this package
```

CI enforces formatting via `npx turbo run format:check`. Pre-commit checks formatting on staged frontend files.

**Why it's better:** Eliminates all style debates. PRs contain only meaningful changes, not formatting noise. Works alongside ESLint (Prettier handles formatting, ESLint handles logic).

**Impact:** Medium. Initial format run will touch many files — use `.git-blame-ignore-revs` to exclude from blame.

---

## 11. expo-updates OTA

**Files:** `mobile-app/app.json`, `mobile-app/eas.json`, `mobile-app/package.json`, `.github/workflows/mobile-ota.yml`

**What changed:** Configured expo-updates for Over-The-Air JavaScript updates. This allows pushing JS bundle updates directly to user devices without going through app store review.

**Before:**
- Every JavaScript change required a full native build + app store submission
- Bug fixes took days to reach users (app store review)

**After:**
```bash
# Push an OTA update to preview testers
eas update --channel preview --message "Fix payment flow bug"

# Push an OTA update to production
eas update --channel production --message "Fix critical checkout issue"
```

Or use the GitHub Actions workflow (Actions tab → Mobile OTA Update → Run workflow → select channel + message).

Channels map to build profiles:
| Build Profile | Channel | Use Case |
|---|---|---|
| development | development | Local dev builds |
| preview | preview | Internal testing |
| production | production | App Store releases |

**Why it's better:** Critical JS-only fixes can reach users in minutes instead of days. No app store review needed for JavaScript changes. Falls back to embedded bundle if update fails.

**Impact:** Medium. Requires `expo-updates` native module — next `eas build` will include it. Runtime version policy (`appVersion`) ensures native-incompatible updates are never applied.

---

## New Developer Workflow Summary

### First-time setup
```bash
nvm use                                    # Switch to Node 20 (reads .nvmrc)
npm install --force                        # Install all frontend workspaces
cd mobile-app && npm install               # Install mobile deps separately
source venv/bin/activate && cd backend
uv pip install -r requirements.txt         # Fast Python install
pre-commit install                         # Install git hooks
```

### Daily development
```bash
# Frontend (from root)
npm run lint                               # Lint all frontend packages
npm run type-check                         # Type-check all packages
npm run test                               # Test all packages
npm run format                             # Format all frontend code
npx turbo run build --filter=admin-crm     # Build specific app

# Backend
cd backend && source ../venv/bin/activate
ruff check . --fix                         # Lint + autofix
ruff format .                              # Format
mypy core/domains/ --config-file=../pyproject.toml  # Type check

# Mobile
cd mobile-app
npm run lint                               # ESLint
npm test                                   # Jest
eas update --channel preview --message "..." # OTA update
```

### CI Pipeline (on PR)
1. `test-backend` — uv install, Django tests, system checks, mypy (non-blocking)
2. `test-frontends` — Turbo type-check, lint, format:check, test, build both apps
3. On merge to main: deploy backend (Fly.io), deploy frontends (Cloudflare Pages), create Sentry releases
