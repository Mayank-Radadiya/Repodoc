# Comprehensive Bug Audit & Application Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve confirmed runtime bugs, sort regressions, server crashes on corrupt data, remediation retry-after handling, and React 19 hook violations across the application with comprehensive test coverage.

**Architecture:** Fix the dashboard comparator to sort by health score with tie-breaking, wrap server page data fetches in safe try/catch fallbacks enabling client-side healing and 404s, expand remediation request error parsing to capture HTTP 503 Retry-After and server JSON messages, and clean up React hook violations and timer lifecycle issues.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript, Vitest, Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-18-comprehensive-bug-audit-design.md`

## Global Constraints

- Preserve all existing public and exported APIs and docstrings.
- Do not mask errors with generic messages when informative server messages are available.
- All code changes must strictly adhere to React 19 hooks rules (unconditional invocation at top level).
- Tests must use Vitest and Testing Library.
- Full verification suite (`bunx tsc --noEmit`, `bun run lint`, `bun run test:run`, `bun run build`) must pass cleanly.

---

### Task 1: Clean Up Linter Warnings from Prior Refactoring

**Files:**
- Modify: `components/report/__tests__/badge-format-selector.test.tsx:5`
- Modify: `components/report/category-breakdown.tsx:4-9`

**Interfaces:**
- Consumes: None
- Produces: Clean lint baseline with 0 warnings

- [ ] **Step 1: Check existing lint warnings**

Run: `bun run lint`
Expected: 2 warnings: unused `FORMATS` in `badge-format-selector.test.tsx` and unused `ChevronDown` in `category-breakdown.tsx`.

- [ ] **Step 2: Remove unused imports**

In `components/report/__tests__/badge-format-selector.test.tsx`, change:
```tsx
import {
  BadgeFormatSelector,
  FORMATS,
  type BadgeSnippetFormat,
} from "../badge-format-selector";
```
to:
```tsx
import {
  BadgeFormatSelector,
  type BadgeSnippetFormat,
} from "../badge-format-selector";
```

In `components/report/category-breakdown.tsx`, change:
```tsx
import {
  ArrowUpDown,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
```
to:
```tsx
import {
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
```

- [ ] **Step 3: Run linter to verify 0 warnings**

Run: `bun run lint`
Expected: PASS with 0 errors and 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add components/report/__tests__/badge-format-selector.test.tsx components/report/category-breakdown.tsx
git commit -m "style(lint): remove unused imports in badge-format-selector test and category-breakdown"
```

---

### Task 2: Dashboard Health Score Sorting & Tie-Breaking

**Files:**
- Modify: `components/dashboard/dashboard-view.tsx:83-86`
- Test: `components/dashboard/__tests__/dashboard-view.test.tsx`

**Interfaces:**
- Consumes: `DashboardRepoItem` with `healthScore?: number`, `updatedAt: string`
- Produces: Deterministic sorting when `sortBy === "score"` in `filteredAndSortedRepos`

- [ ] **Step 1: Write the failing test for health score sorting and tie-breaking**

In `components/dashboard/__tests__/dashboard-view.test.tsx`, add a dedicated test verifying sorting by health score:
```tsx
  it("sorts repositories by health score descending, breaks ties with updatedAt, and puts unaudited at bottom", () => {
    const reposWithScores = {
      ...sampleDashboardData,
      repositories: [
        {
          ...sampleDashboardData.repositories[0],
          id: "r1",
          name: "repo-low-score",
          healthScore: 60,
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          ...sampleDashboardData.repositories[1],
          id: "r2",
          name: "repo-high-score",
          healthScore: 95,
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          ...sampleDashboardData.repositories[2],
          id: "r3",
          name: "repo-tie-recent",
          healthScore: 80,
          updatedAt: "2026-06-01T00:00:00Z",
        },
        {
          ...sampleDashboardData.repositories[0],
          id: "r4",
          name: "repo-tie-older",
          healthScore: 80,
          updatedAt: "2026-02-01T00:00:00Z",
        },
        {
          ...sampleDashboardData.repositories[1],
          id: "r5",
          name: "repo-unaudited",
          healthScore: undefined,
          hasReport: false,
          updatedAt: "2026-10-01T00:00:00Z",
        },
      ],
    };

    render(<DashboardView initialData={reposWithScores} />);

    const sortSelect = screen.getByLabelText(/sort repositories/i);
    fireEvent.change(sortSelect, { target: { value: "score" } });

    const cardTitles = repositories().getAllByRole("link", {
      name: /^repo-/i,
    });
    expect(cardTitles.map((el) => el.textContent?.trim())).toEqual([
      "repo-high-score",
      "repo-tie-recent",
      "repo-tie-older",
      "repo-low-score",
      "repo-unaudited",
    ]);
  });
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `bun run test:run components/dashboard/__tests__/dashboard-view.test.tsx`
Verify whether tie-breaking fails without explicit comparator fallback.

- [ ] **Step 3: Implement the robust score comparator with tie-breaker in dashboard-view.tsx**

In `components/dashboard/dashboard-view.tsx:83-85`, replace:
```tsx
      if (sortBy === "score") {
        return (b.healthScore ?? -1) - (a.healthScore ?? -1);
      }
```
with:
```tsx
      if (sortBy === "score") {
        const scoreA = a.healthScore ?? -1;
        const scoreB = b.healthScore ?? -1;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
```

- [ ] **Step 4: Run tests to verify it passes**

Run: `bun run test:run components/dashboard/__tests__/dashboard-view.test.tsx`
Expected: PASS with all tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/dashboard-view.tsx components/dashboard/__tests__/dashboard-view.test.tsx
git commit -m "fix(dashboard): implement deterministic health score sorting with tie-breaker"
```

---

### Task 3: Server-Side Page Fault-Tolerance and Healing

**Files:**
- Modify: `app/report/[owner]/[repo]/page.tsx:20-25`
- Test: `app/report/[owner]/[repo]/__tests__/page.test.tsx`
- Modify: `app/share/[shareId]/page.tsx:14-19`
- Test: `app/share/[shareId]/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `findReportByRepository(owner, repo)` and `findReportByShareId(shareId)` from `@/lib/reports`
- Produces: Resilient Server Components that recover from corrupted DB rows instead of returning 500 error

- [ ] **Step 1: Write the failing tests**

In `app/report/[owner]/[repo]/__tests__/page.test.tsx`, add a test for corrupted repository report handling:
```tsx
  it("renders ReportController with initialReport={null} when findReportByRepository throws", async () => {
    vi.mocked(findReportByRepository).mockRejectedValueOnce(
      new Error("Stored repository report is invalid."),
    );

    const ui = await ReportPage({
      params: Promise.resolve({ owner: "facebook", repo: "react" }),
    });

    render(ui);
    expect(screen.getByTestId("report-controller")).toBeDefined();
    expect(screen.getByTestId("initial-report").textContent).toBe("null");
  });
```

In `app/share/[shareId]/__tests__/page.test.tsx`, add a test for corrupted share report handling:
```tsx
  it("invokes notFound when findReportByShareId throws an error", async () => {
    vi.mocked(findReportByShareId).mockRejectedValueOnce(
      new Error("Stored repository report is invalid."),
    );

    await expect(
      SharePage({ params: Promise.resolve({ shareId: "valid_share_id" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:run app/report/[owner]/[repo]/__tests__/page.test.tsx app/share/[shareId]/__tests__/page.test.tsx`
Expected: FAIL (unhandled rejection / error thrown).

- [ ] **Step 3: Implement fault-tolerant error handling**

In `app/report/[owner]/[repo]/page.tsx`, update `ReportPage`:
```tsx
export default async function ReportPage({ params }: ReportPageProps) {
  const { owner, repo } = await params;
  if (!isRepositoryCoordinates(owner, repo)) notFound();
  let report = null;
  try {
    report = await findReportByRepository(owner, repo);
  } catch {
    report = null;
  }
  return <ReportController owner={owner} repo={repo} initialReport={report} />;
}
```

In `app/share/[shareId]/page.tsx`, update `getSharedReport`:
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:run app/report/[owner]/[repo]/__tests__/page.test.tsx app/share/[shareId]/__tests__/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/report/[owner]/[repo]/page.tsx app/report/[owner]/[repo]/__tests__/page.test.tsx app/share/[shareId]/page.tsx app/share/[shareId]/__tests__/page.test.tsx
git commit -m "fix(pages): handle corrupted report records gracefully with self-healing and 404"
```

---

### Task 4: Remediation 503 Retry-After Handling and Error Message Preservation

**Files:**
- Modify: `lib/request-remediation.ts:139-164`
- Test: `lib/__tests__/request-remediation.test.ts`

**Interfaces:**
- Consumes: HTTP responses from `/api/remediate`
- Produces: `RemediationRequestError` with accurate `retryAt`, `code`, and descriptive `message`

- [ ] **Step 1: Write the failing tests**

In `lib/__tests__/request-remediation.test.ts`, add test cases for:
1. HTTP 503 with `Retry-After: 15` header and server JSON `{ error: "GitHub is still preparing your fork..." }`.
2. HTTP 400 with server JSON `{ error: "Invalid branch configuration" }`.
```ts
  it("parses Retry-After header and preserves server error message on HTTP 503", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "GitHub is still preparing your fork. Wait briefly and submit remediation again.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "15",
          },
        },
      ),
    );

    const now = Date.now();
    await expect(
      requestRemediation(
        { owner: "octocat", repo: "hello-world", fixes: ["license"] },
        { fetcher },
      ),
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof RemediationRequestError)) return false;
      expect(err.status).toBe(503);
      expect(err.message).toBe(
        "GitHub is still preparing your fork. Wait briefly and submit remediation again.",
      );
      expect(err.retryAt).toBeGreaterThanOrEqual(now + 14000);
      expect(err.retryAt).toBeLessThanOrEqual(now + 16000);
      return true;
    });
  });

  it("preserves server JSON error message on HTTP 400", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Selected license template is unknown or invalid.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      requestRemediation(
        { owner: "octocat", repo: "hello-world", fixes: ["license"] },
        { fetcher },
      ),
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof RemediationRequestError)) return false;
      expect(err.status).toBe(400);
      expect(err.message).toBe(
        "Selected license template is unknown or invalid.",
      );
      return true;
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run lib/__tests__/request-remediation.test.ts`
Expected: FAIL (retryAt is undefined, message is generic).

- [ ] **Step 3: Implement Retry-After on 503 and JSON error parsing in request-remediation.ts**

In `lib/request-remediation.ts`, replace lines 139-164 with:
```ts
  if (!response.ok) {
    let code: RemediationFeedbackCode | undefined;
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
      // Fall back to safe status guidance for non-JSON errors.
    }
    const message = code
      ? REMEDIATION_FEEDBACK[code]
      : (serverMessage || errorMessage(response.status));

    const retryDeadline = [429, 503].includes(response.status)
      ? retryAt(response.headers.get("Retry-After"))
      : undefined;

    throw new RemediationRequestError(
      message,
      response.status,
      retryDeadline,
      code,
    );
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:run lib/__tests__/request-remediation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/request-remediation.ts lib/__tests__/request-remediation.test.ts
git commit -m "fix(remediation): parse 503 Retry-After deadline and preserve server error messages"
```

---

### Task 5: React 19 Hook Ordering & Component Cleanups

**Files:**
- Modify: `components/report/url-input.tsx:70-77`
- Modify: `components/landing/sections/steps/atomic-pr-visual.tsx:18-32`
- Test: `components/report/__tests__/url-input.test.tsx`

**Interfaces:**
- Consumes: React hooks (`useRouter`, `useRef`, `useEffect`)
- Produces: Safe hook execution complying with React 19 rules, leak-free timers

- [ ] **Step 1: Check existing url-input tests**

Run: `bun run test:run components/report/__tests__/url-input.test.tsx`
Verify existing tests pass.

- [ ] **Step 2: Fix useRouter invocation in url-input.tsx**

In `components/report/url-input.tsx:70-77`, change:
```tsx
  let nextRouter: { push: (url: string) => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    nextRouter = useRouter();
  } catch {
    // Graceful fallback when rendered outside Next.js AppRouterContext (e.g., in unit tests)
  }
  const activeRouter = router ?? nextRouter;
```
to:
```tsx
  const nextRouter = useRouter();
  const activeRouter = router ?? nextRouter;
```

- [ ] **Step 3: Fix timer leaks and reference error in atomic-pr-visual.tsx**

In `components/landing/sections/steps/atomic-pr-visual.tsx`:
Add `useEffect` and `useRef` to manage timeouts and cancel them on unmount.
Remove the undefined `setSimulatedSuccess(true)` call:
```tsx
import { useState, useRef, useEffect } from "react";
...
export function AtomicPrVisual() {
  const [activeStage, setActiveStage] = useState<number>(3);
  const [isSimulating, setIsSimulating] = useState(false);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timerIds.current.forEach((id) => clearTimeout(id));
      timerIds.current = [];
    };
  }, []);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStage(1);

    const t1 = setTimeout(() => {
      setActiveStage(2);
    }, 600);

    const t2 = setTimeout(() => {
      setActiveStage(3);
      setIsSimulating(false);
    }, 1300);

    timerIds.current.push(t1, t2);
  };
```

- [ ] **Step 4: Run tests and typecheck**

Run: `bun run test:run components/report/__tests__/url-input.test.tsx`
Run: `bunx tsc --noEmit`
Run: `bun run lint`
Expected: All pass with 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add components/report/url-input.tsx components/landing/sections/steps/atomic-pr-visual.tsx
git commit -m "fix(ui): enforce top-level hook call in url-input and prevent timer leaks in atomic-pr-visual"
```

---

### Task 6: Verification & Full Pipeline Quality Gate

**Files:**
- None (verification across entire repository)

**Interfaces:**
- Consumes: All project files and tests
- Produces: Complete verification proof and build confirmation

- [ ] **Step 1: Run TypeScript full typecheck**

Run: `bunx tsc --noEmit`
Expected: Exit code 0, 0 errors.

- [ ] **Step 2: Run ESLint**

Run: `bun run lint`
Expected: Exit code 0, 0 errors, 0 warnings.

- [ ] **Step 3: Run targeted test suites and complete fast tests**

Run: `bun run test:run components/report components/dashboard app lib`
Expected: All tests pass.

- [ ] **Step 4: Run Next.js production build**

Run: `bun run build`
Expected: Successful build output with all static and dynamic routes compiled.

- [ ] **Step 5: Next.js Agent Feedback check (per AGENTS.md rule)**

If any qualifying Next.js framework issues arose during the session, run:
`node node_modules/next/dist/bin/next internal agent-feedback-instructions`
Otherwise proceed.
