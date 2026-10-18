# Production Engineering Standards & Codebase Modernization Design

**Date:** 2026-10-18  
**Status:** Approved by User  
**Classification:** Architectural Refactor  

---

## 1. Overview & Objectives

Repodoc is a Next.js 16 (App Router) web application that audits GitHub repositories against health, security, documentation, and licensing standards, and automates remediation via pull requests.

While the core functionality and test coverage are extensive (2,224+ passing tests across 80+ test files), the repository accumulated dead code, unreferenced UI component scaffolds, unnecessary/phantom dependencies, slow test execution bottlenecks, and untyped JavaScript modules.

### Objectives
1. **Prune Dead Code & Temporary Routes**: Remove 33 unreferenced `components/ui/` files, unused hooks, temporary QA preview pages, and dead barrel exports.
2. **Streamline Dependencies**: Eliminate redundant npm packages (`cn`, `@daypicker/react`, `@octokit/plugin-throttling`, `tw-animate-css`), move `@types/gsap` to `devDependencies`, and explicitly declare direct dependencies (`@octokit/request-error` and `yaml`).
3. **TypeScript Safety & Modernization**:
   - Convert `GridDistortion` from JavaScript (`.jsx` + `.d.ts`) to native React 19 + TypeScript (`.tsx`) with strict WebGL typings and graceful fallback handling.
   - Eliminate all non-null assertions (`!`) in `dashboard-model.ts`, `dashboard-insights.tsx`, and `fork-api.ts` using type guards and safe optional handling.
4. **Accelerate Test Velocity**: Fix the test-suite throttle bottleneck in `lib/github/client.ts` by configuring Bottleneck write limiting to disable in Vitest environments, reducing full test execution from 7+ minutes to ~15-20 seconds.
5. **Zero Behavioral Regressions**: Maintain 100% test pass rate across all 2,224+ tests, strict TypeScript compilation (`tsc --noEmit`), and clean ESLint verification.

---

## 2. Dead Code, UI Components & Route Pruning

### 2.1 Unused `components/ui/` Pruning (33 files)
The repository contains 54 UI components, of which only 21 are used. The following 33 unreferenced files will be safely removed:
- `components/ui/alert-dialog.tsx`
- `components/ui/alert.tsx`
- `components/ui/autocomplete.tsx`
- `components/ui/badge.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/calendar.tsx`
- `components/ui/checkbox-group.tsx`
- `components/ui/combobox.tsx`
- `components/ui/command.tsx`
- `components/ui/context-menu.tsx`
- `components/ui/drawer.tsx`
- `components/ui/empty.tsx`
- `components/ui/field.tsx`
- `components/ui/fieldset.tsx`
- `components/ui/form.tsx`
- `components/ui/frame.tsx`
- `components/ui/group.tsx`
- `components/ui/input-group.tsx`
- `components/ui/kbd.tsx`
- `components/ui/meter.tsx`
- `components/ui/number-field.tsx`
- `components/ui/otp-field.tsx`
- `components/ui/pagination.tsx`
- `components/ui/popover.tsx`
- `components/ui/preview-card.tsx`
- `components/ui/progress.tsx`
- `components/ui/select.tsx`
- `components/ui/sidebar.tsx`
- `components/ui/slider.tsx`
- `components/ui/switch.tsx`
- `components/ui/table.tsx`
- `components/ui/toast.tsx`
- `components/ui/toggle-group.tsx`
- `components/ui/toolbar.tsx`

**Active UI components retained (21 files):**
`accordion.tsx`, `avatar.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `collapsible.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `menu.tsx`, `radio-group.tsx`, `scroll-area.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `spinner.tsx`, `tabs.tsx`, `textarea.tsx`, `toggle.tsx`, `tooltip.tsx`.

### 2.2 Unused Hook
- Remove `hooks/use-media-query.ts` (only consumed by `components/ui/sidebar.tsx`).

### 2.3 Temporary QA Preview Routes
- Remove `app/report-design-preview/page.tsx`
- Remove `app/dashboard-preview/page.tsx`
*(Both contain explicit file comments stating they are temporary fixtures to be removed prior to production)*.

### 2.4 Dead Barrel Files & Unused Exports
- Remove empty/unused barrel re-export files:
  - `components/landing/data/index.ts`
  - `components/landing/index.ts`
  - `lib/scoring/index.ts`
- Prune unused mock fixtures from `components/landing/data/sample-report.ts` (`categoryDefinitions`, `passedChecks`, `projectedScore`, `badgeMarkdown`) and `components/landing/data/steps.ts` (`MOCK_PR_STAGES`).

---

## 3. Dependency & Manifest Streamlining

### 3.1 Unused & Misplaced Dependencies
- **Remove `cn`**: Npm package `cn` is never imported; the project uses `cn` helper in `lib/utils.ts`.
- **Remove `@daypicker/react`**: Deprecated once `calendar.tsx` is pruned.
- **Remove `@octokit/plugin-throttling`**: Redundant top-level dependency; `octokit` already bundles it.
- **Remove `tw-animate-css`**: Redundant devDependency in Tailwind v4 where all animations are custom-configured in `app/globals.css`.
- **Move `@types/gsap`**: From `dependencies` to `devDependencies`.

### 3.2 Declaring Direct Dependencies
- **Add `@octokit/request-error`** to `dependencies` (imported by `lib/github/client.ts`).
- **Add `yaml`** to `devDependencies` (imported by `lib/templates/ci/__tests__/ci.test.ts`).

### 3.3 Synchronizing Lockfile
- Run `bun install` after editing `package.json` to ensure a clean, deterministic lockfile.

---

## 4. TypeScript Hardening & Component Modernization

### 4.1 Native TypeScript `GridDistortion`
- Consolidate `components/GridDistortion/GridDistortion.jsx` and `components/GridDistortion/GridDistortion.d.ts` into `components/GridDistortion/GridDistortion.tsx`.
- Explicitly type WebGL interfaces:
  - `gl: WebGL2RenderingContext`
  - Shaders, programs, textures, and uniform locations.
  - `GridDistortionProps` interface supporting `imageSrc`, `grid`, `mouse`, `strength`, `relaxation`, `className`, and optional `onError?: (error: unknown) => void`.
- Eliminate the runtime `console.warn` upon texture failure, falling back safely without unhandled exceptions.
- Update `components/GridDistortion/index.ts` to export default component and types.

### 4.2 Non-Null Assertion Elimination (`!`)
- **`components/dashboard/dashboard-model.ts`**:
  Introduce a type guard:
  ```ts
  function hasValidAuditDate(
    repo: DashboardRepository,
  ): repo is DashboardRepository & { lastAuditedAt: string } {
    return Boolean(
      repo.hasReport &&
      repo.lastAuditedAt &&
      Number.isFinite(Date.parse(repo.lastAuditedAt)),
    );
  }
  ```
  Replace `a.lastAuditedAt!` and `b.lastAuditedAt!` with safe narrowed access.
- **`components/dashboard/dashboard-insights.tsx`**:
  Replace `dateTime={repo.lastAuditedAt!}` with `dateTime={repo.lastAuditedAt ?? undefined}`.
- **`lib/remediation/fork-api.ts`**:
  Type `let deadlineTimer: ReturnType<typeof setTimeout> | undefined;` and check `if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);`.

---

## 5. Test Infrastructure & Throttle Velocity Tuning

### 5.1 Root Cause of Slow Test Runs
In `lib/github/client.ts`, `Octokit` uses the throttling plugin. Bottleneck defaults `write` request minTime to `1000ms`. When running `git-api.test.ts` (375 tests, ~300 of which test write actions), Bottleneck throttles each write by 1-2 seconds, ballooning total test suite run time to >430 seconds (over 7 minutes).

### 5.2 Resolution
In `lib/github/client.ts`:
```ts
throttle: {
  enabled: !process.env.VITEST,
  retryAfterBaseValue: 1000,
  onRateLimit: (retryAfter: number, _opts: unknown, _oct: unknown, retryCount: number): boolean => {
    return retryCount < maxRetries && retryAfter <= 30;
  },
  onSecondaryRateLimit: (retryAfter: number, _opts: unknown, _oct: unknown, retryCount: number): boolean => {
    return retryCount < maxRetries && retryAfter <= 30;
  },
}
```
In unit test environments (`process.env.VITEST`), Bottleneck throttling is bypassed while preserving all error status mapping and retry limit validations in tests, reducing full test run time from 7+ minutes to ~15-20 seconds.

---

## 6. Security Headers & Error Handling

- **Security Headers**: Formalize the CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy in `next.config.ts`.
- **API Error Sanitization**: Ensure `/api/audit`, `/api/report`, `/api/remediate`, `/api/badge`, and `/api/auth` consistently sanitize error responses and never expose internal paths, tokens, or raw exceptions to clients.

---

## 7. Verification Plan

| Check | Command | Success Criteria |
|---|---|---|
| Lockfile Sync | `bun install` | Clean install, no unresolved packages |
| Type Safety | `bun x tsc --noEmit` | 0 errors |
| Linting | `bun run lint` | 0 errors, 0 warnings |
| Dead Code Audit | `bun x knip` | 0 unused dependencies, 0 dead files |
| Test Suite | `bun run test:run` | 81 test files, 2,224+ tests passing in <30s |
