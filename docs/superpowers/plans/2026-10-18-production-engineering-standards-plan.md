# Production Engineering Standards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the codebase to modern production-grade standards by removing dead code/dependencies/routes, modernizing GridDistortion to TypeScript, eliminating non-null assertions with type guards, and tuning the test throttle to run in under 30 seconds.

**Architecture:** A 7-task refactoring plan executed with continuous verification. First, dependencies and package manifest are streamlined. Next, dead UI components, hooks, barrel exports, and temporary preview routes are pruned. Then GridDistortion is converted to native TypeScript and non-null assertions are eliminated. Finally, the Octokit write-rate limiter is tuned for Vitest, followed by full verification (Knip, ESLint, TypeScript typecheck, 2,224+ unit/integration tests).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Bun, Vitest, Octokit, WebGL2.

**Spec:** [`docs/superpowers/specs/2026-10-18-production-engineering-standards-design.md`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/docs/superpowers/specs/2026-10-18-production-engineering-standards-design.md)

## Global Constraints

- Preserve all existing behavior and prop contracts across all pages, APIs, and client components.
- Maintain 100% test pass rate across all 2,224+ existing unit and integration tests.
- Add meaningful comments only where logic is non-obvious (e.g. WebGL buffer lifecycles, GitHub throttle bypass logic). Avoid redundant/obvious comments.
- Follow established project conventions (Next.js server-only / use-client directives, path alias `@/*`).

---

### Task 1: Streamline `package.json` Dependencies and Sync Lockfile

**Files:**
- Modify: `package.json`
- Modify: `bun.lockb` or `bun.lock`

**Interfaces:**
- Consumes: Existing dependency configuration in `package.json`.
- Produces: Cleaned `package.json` without `cn`, `@daypicker/react`, `@octokit/plugin-throttling`, `tw-animate-css`; with `@types/gsap` in `devDependencies`; with `@octokit/request-error` in `dependencies` and `yaml` in `devDependencies`.

- [ ] **Step 1: Update `package.json`**

Edit `package.json`:
- Remove `"@daypicker/react": "^10.0.2"`
- Remove `"@octokit/plugin-throttling": "^11.0.5"`
- Remove `"cn": "^0.4.0"`
- Remove `"@types/gsap": "^3.0.0"` from `dependencies` and add it to `devDependencies`
- Add `"@octokit/request-error": "^6.1.6"` to `dependencies`
- Remove `"tw-animate-css": "^1.4.0"` from `devDependencies`
- Add `"yaml": "^2.7.0"` to `devDependencies`

- [ ] **Step 2: Run `bun install` to sync lockfile**

Run: `bun install`
Expected: Successfully resolves and updates lockfile without errors.

- [ ] **Step 3: Run quick test to verify package resolution**

Run: `bun run test:run lib/__tests__/smoke.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock*
git commit -m "chore(deps): streamline dependencies and declare direct imports"
```

---

### Task 2: Prune Dead UI Components, Hook, and Barrel Files

**Files:**
- Delete: 33 files in `components/ui/`:
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
- Delete: `hooks/use-media-query.ts`
- Delete: `components/landing/data/index.ts`
- Delete: `components/landing/index.ts`
- Delete: `lib/scoring/index.ts`

**Interfaces:**
- Consumes: None (none of these files are imported by active application code or tests).
- Produces: Lean UI directory with only the 21 active components (`accordion`, `avatar`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `input`, `label`, `menu`, `radio-group`, `scroll-area`, `separator`, `sheet`, `skeleton`, `spinner`, `tabs`, `textarea`, `toggle`, `tooltip`).

- [ ] **Step 1: Delete the 33 unreferenced UI components and hook**

Run:
```bash
rm -f components/ui/{alert-dialog,alert,autocomplete,badge,breadcrumb,calendar,checkbox-group,combobox,command,context-menu,drawer,empty,field,fieldset,form,frame,group,input-group,kbd,meter,number-field,otp-field,pagination,popover,preview-card,progress,select,sidebar,slider,switch,table,toast,toggle-group,toolbar}.tsx
rm -f hooks/use-media-query.ts
```

- [ ] **Step 2: Delete unused barrel files**

Run:
```bash
rm -f components/landing/data/index.ts components/landing/index.ts lib/scoring/index.ts
```

- [ ] **Step 3: Run TypeScript typecheck to verify zero broken imports**

Run: `bun x tsc --noEmit`
Expected: Exits with code 0 (no errors).

- [ ] **Step 4: Commit**

```bash
git add components/ui hooks/ components/landing lib/scoring
git commit -m "chore(ui): prune unused UI primitives, unused hook, and dead barrel files"
```

---

### Task 3: Prune Temporary QA Preview Routes and Dead Mock Fixtures

**Files:**
- Delete: `app/report-design-preview/page.tsx` (and remove directory `app/report-design-preview`)
- Delete: `app/dashboard-preview/page.tsx` (and remove directory `app/dashboard-preview`)
- Modify: `components/landing/data/sample-report.ts`
- Modify: `components/landing/data/steps.ts`

**Interfaces:**
- Consumes: None.
- Produces: Pruned mock files without unused exports (`categoryDefinitions`, `passedChecks`, `projectedScore`, `badgeMarkdown`, `MOCK_PR_STAGES`).

- [ ] **Step 1: Delete temporary preview routes**

Run:
```bash
rm -rf app/report-design-preview app/dashboard-preview
```

- [ ] **Step 2: Prune unused exports from landing mock data**

In `components/landing/data/sample-report.ts`:
- Remove exported unused constants: `categoryDefinitions`, `passedChecks`, `projectedScore`, `badgeMarkdown`.
In `components/landing/data/steps.ts`:
- Remove exported unused constant: `MOCK_PR_STAGES`.

- [ ] **Step 3: Run ESLint and TypeScript to verify no broken consumers**

Run: `bun run lint && bun x tsc --noEmit`
Expected: Both exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/ components/landing/data/
git commit -m "chore(landing): remove temporary preview routes and dead mock fixtures"
```

---

### Task 4: Migrate `GridDistortion` to Strict Native TypeScript

**Files:**
- Create: `components/GridDistortion/GridDistortion.tsx`
- Modify: `components/GridDistortion/index.ts`
- Delete: `components/GridDistortion/GridDistortion.jsx`
- Delete: `components/GridDistortion/GridDistortion.d.ts`
- Test: `app/page.tsx` (uses GridDistortion)

**Interfaces:**
- Consumes: WebGL2 context from canvas element, `imageSrc`, interactive drag/push/swirl props.
- Produces: Strictly typed `GridDistortion` component and `GridDistortionProps` interface.

- [ ] **Step 1: Create `components/GridDistortion/GridDistortion.tsx`**

Write `components/GridDistortion/GridDistortion.tsx` with:
- Strict TypeScript types (`WebGL2RenderingContext`, `WebGLProgram`, `WebGLShader`, `WebGLTexture`, `WebGLBuffer`).
- Clean cleanup in `useEffect` returning proper dispose callbacks.
- Replace `console.warn` with graceful fallback handling and optional `onError?: (error: unknown) => void` prop.
- Proper prop interface:
```ts
export interface GridDistortionProps {
  imageSrc: string;
  grid?: number;
  mouse?: number;
  strength?: number;
  relaxation?: number;
  className?: string;
  onError?: (error: unknown) => void;
}
```

- [ ] **Step 2: Update `components/GridDistortion/index.ts` and remove old `.jsx` & `.d.ts`**

Update `index.ts`:
```ts
export { default } from "./GridDistortion";
export * from "./GridDistortion";
```
Delete `GridDistortion.jsx` and `GridDistortion.d.ts`.

- [ ] **Step 3: Run TypeScript typecheck and lint**

Run: `bun run lint && bun x tsc --noEmit`
Expected: Both exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/GridDistortion/
git commit -m "refactor(GridDistortion): migrate from JSX to native typed TypeScript component"
```

---

### Task 5: Eliminate Non-Null Assertions (`!`) via Type Guards

**Files:**
- Modify: `components/dashboard/dashboard-model.ts`
- Modify: `components/dashboard/dashboard-insights.tsx`
- Modify: `lib/remediation/fork-api.ts`
- Test: `components/dashboard/__tests__/dashboard-model.test.ts`
- Test: `components/dashboard/__tests__/dashboard-insights.test.tsx`
- Test: `lib/remediation/__tests__/fork-api.test.ts`

**Interfaces:**
- Consumes: `DashboardRepository`, `DashboardInsights`, `deadlineTimer` timeout handle.
- Produces: Safe type narrowing without force-unwrapping operators (`!`).

- [ ] **Step 1: Add type guard in `components/dashboard/dashboard-model.ts`**

In `components/dashboard/dashboard-model.ts`:
Define type predicate:
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
Update line 58:
```ts
latestAudits: repos
  .filter(hasValidAuditDate)
  .sort((a, b) => Date.parse(b.lastAuditedAt) - Date.parse(a.lastAuditedAt) || a.name.localeCompare(b.name))
  .slice(0, 4),
```

- [ ] **Step 2: Safe handling in `components/dashboard/dashboard-insights.tsx`**

In `components/dashboard/dashboard-insights.tsx`:
Change `<time dateTime={repo.lastAuditedAt!}>` to:
`<time dateTime={repo.lastAuditedAt ?? undefined}>`

- [ ] **Step 3: Safe timer check in `lib/remediation/fork-api.ts`**

In `lib/remediation/fork-api.ts`:
Change:
```ts
let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
```
And in `finally` block:
```ts
if (deadlineTimer !== undefined) {
  clearTimeout(deadlineTimer);
}
```

- [ ] **Step 4: Run tests covering modified files**

Run:
```bash
bun run test:run components/dashboard/__tests__/dashboard-model.test.ts components/dashboard/__tests__/dashboard-insights.test.tsx lib/remediation/__tests__/fork-api.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ lib/remediation/fork-api.ts
git commit -m "fix(types): eliminate non-null assertions using type guards and safe optional handling"
```

---

### Task 6: Optimize Test Octokit Throttling for Vitest Velocity

**Files:**
- Modify: `lib/github/client.ts`
- Test: `lib/remediation/__tests__/git-api.test.ts`
- Test: `lib/github/__tests__/client.test.ts`

**Interfaces:**
- Consumes: `process.env.VITEST` flag.
- Produces: Configures Octokit throttle plugin to bypass Bottleneck `write` delay during unit tests while retaining production rate limiting.

- [ ] **Step 1: Update throttle configuration in `lib/github/client.ts`**

In `lib/github/client.ts`:
Configure `throttle`:
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
},
```

- [ ] **Step 2: Run `git-api.test.ts` to verify speed and correctness**

Run: `bun run test:run lib/remediation/__tests__/git-api.test.ts`
Expected: 56 test suites (375 tests) PASS in under 10 seconds (down from ~7 minutes).

- [ ] **Step 3: Run client tests to verify error mapping**

Run: `bun run test:run lib/github/__tests__/client.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/github/client.ts
git commit -m "perf(test): bypass Octokit write limiter during Vitest runs for rapid test feedback"
```

---

### Task 7: Full Repository Verification and Quality Gates

**Files:**
- All files in repository

**Interfaces:**
- Consumes: The complete codebase.
- Produces: Verified production-grade state.

- [ ] **Step 1: Run dead code and unused dependency audit with Knip**

Run: `bun x knip --no-exit-code`
Expected: Confirms zero unused dependencies and zero unreferenced UI components.

- [ ] **Step 2: Run strict TypeScript compilation**

Run: `bun x tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 3: Run ESLint**

Run: `bun run lint`
Expected: Exits with code 0.

- [ ] **Step 4: Run full test suite**

Run: `bun run test:run`
Expected: All 81 test files and 2,224+ tests PASS in under 30 seconds.

- [ ] **Step 5: Verify git status and commit any remaining changes**

Run: `git status`
Expected: Clean working tree on branch main.
