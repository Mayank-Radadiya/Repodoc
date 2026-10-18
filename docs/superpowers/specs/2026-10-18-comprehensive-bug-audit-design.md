# Comprehensive Bug Audit & Application Hardening Design

## Overview
This design specifies the resolution of confirmed bugs, runtime errors, race conditions, edge cases, and import breakage identified during the comprehensive application audit of Repodoc.

---

## 1. Import Normalization & Compilation Baseline

### Context
A previous refactoring commit moved `src/lib/` to `lib/`, but left 96 files across `app/`, `components/`, and `lib/` referencing the old `@/src/lib/*` path alias or relative references, resulting in TypeScript compilation errors.

### Design
- Normalize all import paths referencing `@/src/lib/*` to `@/lib/*`.
- Convert any lingering relative imports to `@/lib/*` or appropriate local paths within `lib/`.
- Validate with `bunx tsc --noEmit` to ensure a completely clean compilation baseline (0 errors) prior to functional code modifications.

---

## 2. Dashboard Health Score Sorting

### Problem
In `components/dashboard/dashboard-view.tsx`, the `filteredAndSortedRepos` memo handles sorting for `"stars"`, `"name"`, and defaults to `"updated"`. The `DashboardToolbar` presents an option for `"score"` ("Highest health score"), but `DashboardView` lacked a handler for `sortBy === "score"`, causing the UI to silently fall back to sorting by `updatedAt`.

### Design
Add an explicit comparator branch in `filteredAndSortedRepos`:
```ts
if (sortBy === "score") {
  const scoreA = a.healthScore ?? -1;
  const scoreB = b.healthScore ?? -1;
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}
```
- Repositories with higher scores appear first.
- Repositories with identical scores tie-break by most recent `updatedAt`.
- Unaudited / null-score repositories sort to the bottom.

---

## 3. Server-Side Page Fault Tolerance & Healing

### Problem
- `app/report/[owner]/[repo]/page.tsx` directly calls `await findReportByRepository(owner, repo)`. If the database row has corrupted breakdown JSON or fails rubric validation, `decodeReport` returns `null` and `findReportByRepository` throws `Error("Stored repository report is invalid.")`. This causes an unhandled 500 server crash.
- `app/share/[shareId]/page.tsx` calls `getSharedReport(shareId)`. If `findReportByShareId` throws for a corrupted row, the server similarly crashes with 500 instead of rendering a 404.

### Design
1. In `app/report/[owner]/[repo]/page.tsx`:
   Wrap `findReportByRepository` in a `try/catch` block:
   ```tsx
   let report = null;
   try {
     report = await findReportByRepository(owner, repo);
   } catch {
     report = null;
   }
   return <ReportController owner={owner} repo={repo} initialReport={report} />;
   ```
   If a corrupt record exists, `initialReport` defaults to `null`. `ReportController` mounts, triggers `runAudit()`, which fetches fresh data from GitHub and executes `saveReport()`, atomically repairing the database row.
2. In `app/share/[shareId]/page.tsx`:
   Wrap `findReportByShareId` inside `getSharedReport`:
   ```ts
   const getSharedReport = cache(async (shareId: string) => {
     if (!isShareId(shareId)) notFound();
     let report = null;
     try {
       report = await findReportByShareId(shareId);
     } catch {
       notFound();
     }
     if (!report) notFound();
     return report;
   });
   ```
   A corrupted share snapshot cleanly renders the standard 404 page rather than crashing the server.

---

## 4. Remediation Fork Readiness & Error Propagation

### Problem
- In `lib/request-remediation.ts`, when the backend returns HTTP 503 (`fork_not_ready`) with a `Retry-After: 15` header, `requestRemediation` only inspected `response.status === 429` for `Retry-After`. Consequently, `retryAt` was `undefined`, and `FixButton`'s 15-second countdown timer remained at 0.
- `requestRemediation` substituted generic status messages for 400, 404, 409, 500, 502, and 503, ignoring informative server error messages like `"GitHub is still preparing your fork. Wait briefly and submit remediation again."` or `"Your fork cannot safely be used for remediation."`.

### Design
1. Check `Retry-After` for both 429 and 503:
   ```ts
   const retryAfterHeader = response.headers.get("Retry-After");
   const retryDeadline = [429, 503].includes(response.status)
     ? retryAt(retryAfterHeader)
     : undefined;
   ```
2. Safely parse JSON error bodies for non-OK responses:
   ```ts
   let serverMessage: string | undefined;
   try {
     const payload: unknown = await response.json();
     if (payload && typeof payload === "object") {
       if ("error" in payload && typeof payload.error === "string") {
         serverMessage = payload.error;
       }
       if ("code" in payload && isRemediationFeedbackCode(payload.code)) {
         code = payload.code;
       }
     }
   } catch {
     // Non-JSON responses fall back to default guidance
   }
   ```
3. Use `code ? REMEDIATION_FEEDBACK[code] : (serverMessage || errorMessage(response.status))`.

---

## 5. React 19 Hook Ordering & Component Cleanups

### Problem
- `components/report/url-input.tsx`: `useRouter()` was enclosed in a `try/catch` block, violating React Hook rules.
- `components/landing/sections/steps/atomic-pr-visual.tsx`: Unmanaged `setTimeout` handles run after component unmount, causing potential memory leaks and state updates on unmounted components. `simulatedSuccess` is unused.
- `components/landing/sections/steps/rubric-audit-visual.tsx`: Unused import `ShieldCheck`.
- `components/GridDistortion/GridDistortion.jsx`: Missing `useEffect` hook dependencies.

### Design
1. In `url-input.tsx`: Call `const nextRouter = useRouter();` unconditionally at the top level.
2. In `atomic-pr-visual.tsx`: Store timeout IDs in `useRef<NodeJS.Timeout[]>` and clear them in a `useEffect` cleanup return. Remove unused `simulatedSuccess`.
3. In `rubric-audit-visual.tsx`: Remove unused `ShieldCheck` import.
4. In `GridDistortion.jsx`: Store `onReady` in a ref or memoize dependencies to satisfy exhaustive-deps cleanly.

---

## 6. Testing & Regression Strategy

### Unit and Integration Tests
1. `components/dashboard/__tests__/dashboard-view.test.tsx`:
   - Test sorting by `"score"` verifies that repos with health scores appear first in descending order, unaudited repos appear last, and ties sort by `updatedAt`.
2. `app/report/[owner]/[repo]/__tests__/page.test.tsx`:
   - Test that `ReportPage` returns `ReportController` with `initialReport={null}` when `findReportByRepository` throws an error.
3. `app/share/[shareId]/__tests__/page.test.tsx`:
   - Test that `SharePage` invokes `notFound()` when `findReportByShareId` throws an error.
4. `lib/__tests__/request-remediation.test.ts`:
   - Test that `requestRemediation` parses `retryAt` and server message on HTTP 503 with `Retry-After: 15`.

### Verification Pipeline
- `bunx tsc --noEmit` (0 errors)
- `bun run lint` (0 errors, 0 warnings)
- `bun run test:run` (all test suites pass)
- `bun run build` (production build succeeds)
