# Codebase Audit & Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the codebase into a clean Next.js root layout, eliminate `src/` and redundant shims, normalize imports to `@/lib/*`, modularize oversized report UI components, fix all ESLint warnings, and verify that all ~2,223 tests and builds pass cleanly.

**Architecture:** Relocate all modules from `src/lib/` to `lib/`, remove shims in `src/components/report` and `lib/templates`, replace all `@/src/lib/*` imports across the codebase with `@/lib/*`. Then decompose `category-breakdown.tsx` and `badge-snippet.tsx` into single-responsibility subcomponents, fix hook dependencies in `GridDistortion.jsx`, and run complete typecheck, lint, and test suites.

**Tech Stack:** Next.js 16.4 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Prisma, Vitest, Lucide React, Base UI.

**Spec:** `docs/superpowers/specs/2026-10-18-codebase-audit-refactor-design.md`

## Global Constraints
- Target directory layout: Next.js root layout (`app/`, `components/`, `lib/`, `hooks/`, `prisma/`, `public/`), with zero `src/` directory.
- All backend module imports must use the `@/lib/*` alias.
- Public route signatures and exported component props must maintain 100% backward compatibility.
- Zero TypeScript compiler errors (`bunx tsc --noEmit`).
- Zero ESLint errors or warnings (`bun run lint`).
- All existing tests in the test suite must pass without regressions.

---

### Task 1: Consolidate `src/lib/` into root `lib/`, merge utilities, and remove shims

**Files:**
- Create/Move:
  - `lib/scoring/` (from `src/lib/scoring/`)
  - `lib/templates/` (replace shims in `lib/templates/` with real implementations from `src/lib/templates/`)
  - `lib/github/` (from `src/lib/github/`)
  - `lib/remediation/` (from `src/lib/remediation/`)
  - `lib/audit.ts` (from `src/lib/audit.ts`)
  - `lib/badge.ts` (from `src/lib/badge.ts`)
  - `lib/constants.ts` (from `src/lib/constants.ts`)
  - `lib/dashboard.ts` (from `src/lib/dashboard.ts`)
  - `lib/remediation-feedback.ts` (from `src/lib/remediation-feedback.ts`)
  - `lib/report-validation.ts` (from `src/lib/report-validation.ts`)
  - `lib/reports.ts` (from `src/lib/reports.ts`)
  - `lib/request-audit.ts` (from `src/lib/request-audit.ts`)
  - `lib/request-remediation.ts` (from `src/lib/request-remediation.ts`)
  - `lib/types.ts` (from `src/lib/types.ts`)
  - `lib/__tests__/` (merge from `src/lib/__tests__/`)
- Modify: `lib/utils.ts` (ensure full implementations of `cn`, `parseGitHubUrl`, and type `ParsedGitHubUrl` live directly in `lib/utils.ts`)
- Delete:
  - `src/components/report/`
  - `src/lib/`
  - `src/`
  - `lib/templates/*.ts` (shims)
  - All `.gitkeep` files in `lib/scoring/`, `lib/github/`, `lib/remediation/`, `lib/templates/`, `app/api/audit/`, `app/api/badge/`, `components/report/`

**Interfaces:**
- Consumes: Existing files in `src/lib/` and `lib/utils.ts`.
- Produces: Fully populated root `lib/` directory with zero dependency on `src/`.

- [ ] **Step 1: Merge real utility implementation into `lib/utils.ts`**
Copy the contents of `src/lib/utils.ts` into `lib/utils.ts` so `cn` and `parseGitHubUrl` are defined natively in `lib/utils.ts`.

- [ ] **Step 2: Move modules from `src/lib/` into `lib/`**
Move `scoring`, `github`, `remediation`, and all root files (`audit.ts`, `badge.ts`, `constants.ts`, `dashboard.ts`, `remediation-feedback.ts`, `report-validation.ts`, `reports.ts`, `request-audit.ts`, `request-remediation.ts`, `types.ts`, and test files) from `src/lib/` to `lib/`. Overwrite the shim `lib/templates/` directory with `src/lib/templates/`.

- [ ] **Step 3: Remove `src/` directory and orphaned `.gitkeep` files**
Delete `src/components/report`, delete `src/`, and delete the empty `.gitkeep` files in `lib/` and `app/api/`.

- [ ] **Step 4: Commit structural relocation**
```bash
git add lib/ src/ app/api/ components/report/
git commit -m "refactor(lib): consolidate src/lib into root lib and remove shims"
```

---

### Task 2: Normalize all imports to `@/lib/*` across the entire codebase

**Files:**
- Modify:
  - All files in `app/**`
  - All files in `components/**`
  - All files in `lib/**`

**Interfaces:**
- Consumes: Consolidated root `lib/` modules from Task 1.
- Produces: Clean codebase where no file imports from `@/src/lib` or `../../src/lib`.

- [ ] **Step 1: Replace `@/src/lib/` with `@/lib/` across all `.ts` and `.tsx` files**
Execute replacement across `app/`, `components/`, and `lib/`:
Replace `@/src/lib/` -> `@/lib/`.
Also replace any relative references like `../../src/lib/` -> `@/lib/`.

- [ ] **Step 2: Verify TypeScript compilation**
Run: `bunx tsc --noEmit`
Expected: Exits with code 0 (no errors).

- [ ] **Step 3: Run targeted unit tests to verify module resolution**
Run: `bunx vitest run lib/__tests__/utils.test.ts lib/auth/__tests__/callbacks.test.ts components/report/__tests__/categories.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit import normalization**
```bash
git add app/ components/ lib/
git commit -m "refactor(imports): normalize all module imports from @/src/lib to @/lib"
```

---

### Task 3: Modularize `components/report/category-breakdown.tsx`

**Files:**
- Create:
  - `components/report/check-row.tsx`
  - `components/report/evidence-excerpt.tsx`
  - `components/report/__tests__/check-row.test.tsx`
- Modify:
  - `components/report/category-breakdown.tsx`
  - `components/report/__tests__/category-breakdown.test.tsx`

**Interfaces:**
- Consumes: `RubricCheck`, `CategoryScore` from `@/lib/types`.
- Produces:
  - `CheckRow`: component rendering a single check item with status badge, points, and trigger buttons.
  - `EvidenceExcerpt`: component rendering diff/markdown excerpt text.
  - Refactored `CategoryBreakdown` with reduced LOC (<250 lines) and identical UI behavior.

- [ ] **Step 1: Write unit tests for `CheckRow` and `EvidenceExcerpt`**
Create `components/report/__tests__/check-row.test.tsx` testing rendering of passed, failed, and warning check states, and toggling evidence excerpt.

- [ ] **Step 2: Run test to verify it fails**
Run: `bunx vitest run components/report/__tests__/check-row.test.tsx`
Expected: FAIL (modules not created).

- [ ] **Step 3: Implement `evidence-excerpt.tsx` and `check-row.tsx`**
Extract rendering from `category-breakdown.tsx` into the new components with proper accessibility attributes (`aria-expanded`, `aria-label`).

- [ ] **Step 4: Refactor `category-breakdown.tsx` to use `CheckRow`**
Simplify `category-breakdown.tsx` so it focuses strictly on filtering, search, and category accordion state.

- [ ] **Step 5: Run tests to verify all tests pass**
Run: `bunx vitest run components/report/__tests__/check-row.test.tsx components/report/__tests__/category-breakdown.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit component decomposition**
```bash
git add components/report/
git commit -m "refactor(report): decompose category-breakdown into check-row and evidence-excerpt"
```

---

### Task 4: Modularize `components/report/badge-snippet.tsx`

**Files:**
- Create:
  - `components/report/badge-format-selector.tsx`
  - `components/report/badge-copy-button.tsx`
  - `components/report/__tests__/badge-format-selector.test.tsx`
- Modify:
  - `components/report/badge-snippet.tsx`
  - `components/report/__tests__/badge-snippet.test.tsx`

**Interfaces:**
- Consumes: Badge formats (`markdown`, `html`, `url`), snippet strings.
- Produces:
  - `BadgeFormatSelector`: segmented controls for format selection.
  - `BadgeCopyButton`: clipboard button with timeout feedback and live region.
  - Refactored `BadgeSnippet` with clean presentation layout and identical props.

- [ ] **Step 1: Write unit tests for `BadgeFormatSelector` and `BadgeCopyButton`**
Create `components/report/__tests__/badge-format-selector.test.tsx` testing format selection and copy trigger.

- [ ] **Step 2: Run test to verify it fails**
Run: `bunx vitest run components/report/__tests__/badge-format-selector.test.tsx`
Expected: FAIL (modules not created).

- [ ] **Step 3: Implement `badge-format-selector.tsx` and `badge-copy-button.tsx`**
Extract format tabs and copy button with clipboard API and toast/alert feedback.

- [ ] **Step 4: Refactor `badge-snippet.tsx` to compose the subcomponents**
Simplify `badge-snippet.tsx` to manage preview display, dialog integration, and subcomponent composition.

- [ ] **Step 5: Run tests to verify all pass**
Run: `bunx vitest run components/report/__tests__/badge-snippet.test.tsx components/report/__tests__/badge-format-selector.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit badge snippet decomposition**
```bash
git add components/report/
git commit -m "refactor(report): decompose badge-snippet into format-selector and copy-button"
```

---

### Task 5: Fix code quality and ESLint warnings

**Files:**
- Modify:
  - `components/GridDistortion/GridDistortion.jsx`
  - `components/landing/sections/steps/atomic-pr-visual.tsx`
  - `components/landing/sections/steps/rubric-audit-visual.tsx`

**Interfaces:**
- Consumes: Existing component code.
- Produces: Warning-free, clean ESLint pass.

- [ ] **Step 1: Fix `GridDistortion.jsx` hook dependencies**
In `components/GridDistortion/GridDistortion.jsx`, store `onReady` in a ref (`useRef(onReady)`) or memoize the callback so the `useEffect` doesn't trigger unnecessary re-initialization or omit dependencies.

- [ ] **Step 2: Remove unused variables in landing step visual components**
In `components/landing/sections/steps/atomic-pr-visual.tsx`, remove unused `simulatedSuccess`.
In `components/landing/sections/steps/rubric-audit-visual.tsx`, remove unused import `ShieldCheck`.

- [ ] **Step 3: Run ESLint**
Run: `bun run lint`
Expected: PASS with 0 errors and 0 warnings.

- [ ] **Step 4: Commit lint fixes**
```bash
git add components/GridDistortion/ components/landing/
git commit -m "fix(lint): resolve react-hooks/exhaustive-deps and unused variables"
```

---

### Task 6: Comprehensive verification and production build

**Files:**
- Test / Verify: Entire repository.

**Interfaces:**
- Consumes: All completed refactorings from Tasks 1-5.
- Produces: Production-ready codebase with clean build and passing tests.

- [ ] **Step 1: Run TypeScript typecheck**
Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run ESLint**
Run: `bun run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run full Vitest test suite**
Run: `bun run test:run`
Expected: All test suites pass.

- [ ] **Step 4: Run production Next.js build**
Run: `bun run build`
Expected: Successful build output with all static and dynamic pages generated.

- [ ] **Step 5: Final review and report**
Review `git status` and `git log` to summarize all architectural improvements in the completion report.
