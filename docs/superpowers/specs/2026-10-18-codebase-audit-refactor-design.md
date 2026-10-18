# Production-Grade Codebase Audit & Refactor Design

**Date:** 2026-10-18  
**Status:** Approved  
**Classification:** Architectural Refactor  

---

## 1. Overview & Objectives

Repodoc is a Next.js 16 (App Router) web application designed to audit GitHub repositories for community health, documentation, CI workflows, and licensing compliance, offering an automated remediation flow ("Fix All with PR").

The codebase is functional with comprehensive test coverage (~2,223 tests across 79 test suites), but has architectural inconsistencies, legacy folder splits, and oversized component modules that increase cognitive load and risk deployment/maintenance issues.

### Key Goals
1. **Eliminate Folder Split**: Unify the codebase into a clean, standard Next.js root layout. Migrate all backend business logic from `src/lib/*` to root `lib/*`, eliminate all re-export shims and empty `.gitkeep` placeholders, and remove the `src/` directory.
2. **Normalize Import Paths**: Replace all `@/src/lib/*` and ad-hoc relative imports with clean, consistent `@/lib/*` imports across all routes, components, and tests.
3. **Decompose Monolithic UI Components**: Split oversized components (`category-breakdown.tsx`, `badge-snippet.tsx`) into focused, single-responsibility subcomponents while preserving all prop contracts, visual aesthetics, and behaviors.
4. **Clean Code Hygiene**: Resolve all active ESLint warnings (missing dependencies in `GridDistortion.jsx`, unused variables in landing visual steps).
5. **Zero Behavioral Regressions**: Preserve all existing test coverage, passing all unit tests, integration tests, TypeScript type checks, and Next.js production builds.

---

## 2. Directory Structure & Architecture

### Current State
```
Repodoc/
├── app/               (App Router pages, layouts, api handlers)
├── components/        (UI components: auth, dashboard, landing, report, ui, GridDistortion)
├── lib/               (Partial: auth, db, site, segmented-control, report-metadata, shims for templates/utils, .gitkeeps)
├── src/
│   ├── components/    (Legacy shims re-exporting @/components/report)
│   └── lib/           (Core business logic: scoring, github, remediation, templates, audit, badge, dashboard, types, etc.)
└── ...
```

### Target Production State
```
Repodoc/
├── app/               (App Router pages, layouts, api handlers)
├── components/        (Domain and shared UI components)
│   ├── auth/
│   ├── dashboard/
│   ├── landing/
│   ├── report/        (Modularized report views and subcomponents)
│   ├── ui/            (Base UI primitives)
│   └── GridDistortion/
├── hooks/             (Shared custom React hooks)
├── lib/               (Consolidated business logic, services, utilities)
│   ├── auth/          (NextAuth configuration, callbacks, session, claims)
│   ├── github/        (Octokit client, tree service, caching)
│   ├── remediation/   (Atomic Git data API, fork engine, remediation orchestrator)
│   ├── scoring/       (Health check rules, category scoring engine, rubric)
│   ├── templates/     (License, CI, gitignore, security, conduct file generators)
│   ├── audit.ts
│   ├── badge.ts
│   ├── constants.ts
│   ├── dashboard.ts
│   ├── db.ts          (Prisma client instance)
│   ├── remediation-feedback.ts
│   ├── report-metadata.ts
│   ├── report-validation.ts
│   ├── reports.ts
│   ├── request-audit.ts
│   ├── request-remediation.ts
│   ├── segmented-control.ts
│   ├── site.ts
│   ├── types.ts
│   └── utils.ts       (cn, parseGitHubUrl, styling helpers)
├── prisma/            (Schema, migrations, SQLite dev database)
├── public/            (Static assets)
├── types/             (Global type declarations)
└── docs/              (Documentation and specifications)
```

### Module Migration Table

| Source Location | Target Location | Description |
|---|---|---|
| `src/lib/scoring/` | `lib/scoring/` | Full scoring engine, check rules (`documentation`, `security`, `community`, `hygiene`, `testing`), and check tests |
| `src/lib/templates/` | `lib/templates/` | Template generators (`licenses`, `ci`, `gitignore`, `security`, `conduct`) |
| `src/lib/github/` | `lib/github/` | GitHub client, tree fetcher, caching layer, and integration tests |
| `src/lib/remediation/` | `lib/remediation/` | PR remediation engine, atomic Git commit/tree/blob API, fork API |
| `src/lib/audit.ts` | `lib/audit.ts` | Core audit executor function |
| `src/lib/badge.ts` | `lib/badge.ts` | Badge calculation and shields.io payload generator |
| `src/lib/constants.ts` | `lib/constants.ts` | Rubric limits, branch constants, status definitions |
| `src/lib/dashboard.ts` | `lib/dashboard.ts` | Dashboard audit aggregation, caching, and model mapping |
| `src/lib/remediation-feedback.ts` | `lib/remediation-feedback.ts` | Remediation result feedback builder |
| `src/lib/report-validation.ts` | `lib/report-validation.ts` | Report schema validators |
| `src/lib/reports.ts` | `lib/reports.ts` | Report database query and persistence service |
| `src/lib/request-audit.ts` | `lib/request-audit.ts` | Request handler and parser for audit requests |
| `src/lib/request-remediation.ts` | `lib/request-remediation.ts` | Request handler for remediation triggers |
| `src/lib/types.ts` | `lib/types.ts` | Core domain types (`RepoReport`, `RubricCheck`, `TreeEntry`, etc.) |
| `src/lib/utils.ts` | `lib/utils.ts` | Merged utility functions (`cn`, `parseGitHubUrl`, `ParsedGitHubUrl`) |
| `src/lib/__tests__/` | `lib/__tests__/` | General unit and integration tests |

### Dead Code & Shim Removal
- Delete `src/components/report/` and its 7 shim re-export files (`badge-snippet.tsx`, `category-breakdown.tsx`, `fix-button.tsx`, `index.ts`, `license-selector.tsx`, `score-gauge.tsx`, `url-input.tsx`).
- Delete `src/lib/db.ts` (re-export of `../../lib/db`).
- Delete temporary re-export files in `lib/templates/` (`ci.ts`, `conduct.ts`, `gitignore.ts`, `licenses.ts`, `security.ts`, `index.ts`).
- Delete empty `.gitkeep` files in `lib/scoring/`, `lib/github/`, `lib/remediation/`, `lib/templates/`, `app/api/audit/`, `app/api/badge/`, `components/report/`.
- Remove directory `src/`.

---

## 3. Component Organization & Separation of Concerns

### Monolithic Component Modularization
1. **`components/report/category-breakdown.tsx` (552 LOC)**:
   - Extract `components/report/check-row.tsx`: Responsible for rendering a single rubric check item (status badge, title, points, status-specific action buttons).
   - Extract `components/report/evidence-excerpt.tsx`: Responsible for rendering the formatted markdown/diff excerpt when a check is expanded or previewed.
   - Retain `components/report/category-breakdown.tsx` as the coordinator: manages status filtering (`all`, `failed`, `passed`), search input filtering, accordion state, and category item ordering.

2. **`components/report/badge-snippet.tsx` (524 LOC)**:
   - Extract `components/report/badge-format-selector.tsx`: Format selection pills (`Markdown`, `HTML`, `Image URL`).
   - Extract `components/report/badge-copy-button.tsx`: Copy action button with success feedback, tooltip, and live region accessibility announcements.
   - Retain `components/report/badge-snippet.tsx` as the container: manages preview styling, dialog trigger, and embed code generator.

3. **`components/report/report-view.tsx` & active working tree enhancements**:
   - The active working tree already modularized `report-section-nav.tsx` and `report-share-menu.tsx` with full test coverage (325 passing tests in `components/report/`). Keep and formally integrate these components into the canonical component suite.

---

## 4. Code Quality & Lint Fixes

1. **`components/GridDistortion/GridDistortion.jsx`**:
   - Wrap `onReady` handler in stable callback or ref to avoid stale closure or infinite trigger cycles, resolving `react-hooks/exhaustive-deps`.
2. **`components/landing/sections/steps/atomic-pr-visual.tsx`**:
   - Remove unused variable `simulatedSuccess` to resolve `@typescript-eslint/no-unused-vars`.
3. **`components/landing/sections/steps/rubric-audit-visual.tsx`**:
   - Remove unused import `ShieldCheck` to resolve `@typescript-eslint/no-unused-vars`.

---

## 5. Invariants & Preservation Rules

- **Zero API Breakage**: Do NOT change route handler signatures (`/api/audit`, `/api/badge/[owner]/[repo]`, `/api/remediate`, `/api/report/[shareId]`).
- **Zero Prop Breakage**: All exported components in `components/report/index.ts` must maintain exact prop interfaces so page-level consumers require zero structural changes.
- **Strict TypeScript Compliance**: `bunx tsc --noEmit` must return 0 errors.
- **Strict ESLint Compliance**: `bun run lint` must return 0 errors and 0 warnings.
- **Complete Test Suite Passing**: All Vitest test suites must pass cleanly.

---

## 6. Implementation Sequence

1. **Step 1: Baseline Verification**: Confirm working tree state and typecheck baseline.
2. **Step 2: File Relocation**: Move all files from `src/lib/` to `lib/`, merging `utils.ts` and removing shims and empty `.gitkeep` files. Delete `src/`.
3. **Step 3: Import Normalization**: Find and replace all `@/src/lib/*` and relative imports across `app/`, `components/`, and `lib/` with `@/lib/*`.
4. **Step 4: Component Modularization**: Extract subcomponents in `components/report/` (`check-row.tsx`, `evidence-excerpt.tsx`, `badge-format-selector.tsx`, `badge-copy-button.tsx`) and update parent files.
5. **Step 5: ESLint Cleanliness**: Fix the 3 ESLint warnings in `GridDistortion.jsx` and landing visual steps.
6. **Step 6: Comprehensive Verification**: Run `bunx tsc --noEmit`, `bun run lint`, `bun run test:run`, and Next.js build verification.
