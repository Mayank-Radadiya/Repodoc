# User Dashboard & Direct Repository Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated `/dashboard` page where logged-in users view their GitHub profile data and audit metrics, search and filter their public repositories, and execute repository health audits directly in-place without manually pasting repository links.

**Architecture:** Server Component loader (`app/dashboard/page.tsx` + `src/lib/dashboard.ts`) securely obtains the GitHub OAuth token via `getGitHubSession()`, queries GitHub API for profile and repository metadata, joins with existing Prisma `RepoReport` records, and supplies clean DTOs to an interactive Client Component (`<DashboardView />`). Each repository card supports one-click audit via `requestAudit` (`/api/audit`) and updates in-place. Navigation components (`AuthControls` and navbar) add direct entry points to the dashboard.

**Tech Stack:** Next.js 16 (App Router), React 19, NextAuth v5 (Auth.js), Octokit / GitHub REST API, Prisma 6 (SQLite), Tailwind CSS v4, Motion (motion/react), Lucide React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-user-dashboard-repos-audit-design.md`

## Global Constraints
- Token security: `accessToken` must remain server-side only in encrypted session claims; never pass `accessToken` to Client Components, JSON props, or browser logs.
- Next.js conventions: Follow App Router patterns (`import "server-only"` in server modules, `"use client"` where hooks/state are needed).
- Maintain 100% test pass rate across all existing test suites.
- Clean typography and design matching the Repodoc aesthetic (frosted glass, slate/blue color palette, Lucide icons).

---

### Task 1: Dashboard Types & Server Data Loader

**Files:**
- Create: `src/lib/dashboard.ts`
- Test: `src/lib/__tests__/dashboard.test.ts`

**Interfaces:**
- Consumes: `getGitHubSession()` from `@/lib/auth`, `prisma` from `@/src/lib/db`, `createOctokit` from `@/src/lib/github/client`
- Produces:
  ```typescript
  export interface UserProfileData {
    username: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    location: string | null;
    company: string | null;
    website: string | null;
    publicReposCount: number;
    followersCount: number;
    followingCount: number;
    githubUrl: string;
    joinedAt: string;
  }

  export interface DashboardRepoItem {
    id: number;
    name: string;
    fullName: string;
    owner: string;
    description: string | null;
    isPrivate: boolean;
    language: string | null;
    starsCount: number;
    forksCount: number;
    defaultBranch: string;
    updatedAt: string;
    githubUrl: string;
    hasReport: boolean;
    healthScore: number | null;
    shareId: string | null;
    lastAuditedAt: string | null;
  }

  export interface DashboardData {
    user: UserProfileData;
    repositories: DashboardRepoItem[];
    stats: {
      totalRepos: number;
      auditedCount: number;
      unauditedCount: number;
      averageScore: number | null;
    };
  }

  export async function getDashboardData(token: string, username: string): Promise<DashboardData>;
  ```

- [ ] **Step 1: Write the failing test**
  Create `src/lib/__tests__/dashboard.test.ts` testing:
  - Successful fetch and transformation of GitHub user and repo data.
  - Integration with Prisma `repoReport` lookup by owner.
  - Aggregation of statistics (`totalRepos`, `auditedCount`, `unauditedCount`, `averageScore`).
  - Graceful handling of null/empty fields and rate limiting.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun vitest run src/lib/__tests__/dashboard.test.ts`
  Expected: FAIL with module `src/lib/dashboard` not found.

- [ ] **Step 3: Write minimal implementation**
  Create `src/lib/dashboard.ts` implementing `getDashboardData`:
  - Uses `createOctokit(token)` to call `octokit.rest.users.getAuthenticated()` and `octokit.rest.repos.listForAuthenticatedUser({ sort: "updated", per_page: 100, affiliation: "owner" })`.
  - Queries `prisma.repoReport.findMany({ where: { owner: username.toLowerCase() } })`.
  - Matches each repository by `repo.name.toLowerCase() == report.repo.toLowerCase()`.
  - Calculates stats summary and returns `DashboardData`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun vitest run src/lib/__tests__/dashboard.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/dashboard.ts src/lib/__tests__/dashboard.test.ts
  git commit -m "feat(dashboard): add server data loader and types"
  ```

---

### Task 2: Repository Card Component (`DashboardRepoCard`)

**Files:**
- Create: `components/dashboard/dashboard-repo-card.tsx`
- Test: `components/dashboard/__tests__/dashboard-repo-card.test.tsx`

**Interfaces:**
- Consumes: `DashboardRepoItem` from `@/src/lib/dashboard`, `requestAudit` from `@/src/lib/request-audit`
- Produces:
  ```typescript
  export interface DashboardRepoCardProps {
    repo: DashboardRepoItem;
    onAuditComplete?: (updatedRepo: DashboardRepoItem) => void;
    fetcher?: typeof fetch;
  }

  export function DashboardRepoCard(props: DashboardRepoCardProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**
  Create `components/dashboard/__tests__/dashboard-repo-card.test.tsx` testing:
  - Renders repository name, description, language, stars, and forks.
  - Displays "Not audited yet" and "Audit Repository" button for unaudited repo.
  - Displays health score gauge/badge, "View Report" link, and "Re-audit" button for audited repo.
  - Clicking "Audit Repository" or "Re-audit" calls `requestAudit`, enters loading state with spinner, and invokes `onAuditComplete` with updated report data.
  - Displays error banner/message if audit fails and allows retry.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun vitest run components/dashboard/__tests__/dashboard-repo-card.test.tsx`
  Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**
  Create `components/dashboard/dashboard-repo-card.tsx`:
  - Renders card with rounded corners, frosted glass background, hover border transition.
  - Renders top row: repo name with link to GitHub (`ExternalLink`), visibility badge (`Public`), formatted relative time.
  - Renders middle row: description with clamp-2, language indicator dot, stars count, forks count.
  - Renders action row:
    - Audited: score badge with color coding (>=80 green, 50-79 amber, <50 red), "View Report" button (`/report/{owner}/{repo}`), "Re-audit" button.
    - Unaudited: "Not audited yet" badge, "Audit Repository" primary button.
    - Loading state: spinner (`Loader2` animated), "Auditing…", disabled buttons.
    - Error state: inline alert with error message and retry button.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun vitest run components/dashboard/__tests__/dashboard-repo-card.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add components/dashboard/dashboard-repo-card.tsx components/dashboard/__tests__/dashboard-repo-card.test.tsx
  git commit -m "feat(dashboard): add repository card component with in-place audit"
  ```

---

### Task 3: Profile Header & Filter Toolbar Components

**Files:**
- Create: `components/dashboard/dashboard-profile-card.tsx`
- Create: `components/dashboard/dashboard-toolbar.tsx`
- Test: `components/dashboard/__tests__/dashboard-profile-card.test.tsx`
- Test: `components/dashboard/__tests__/dashboard-toolbar.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface DashboardProfileCardProps {
    user: UserProfileData;
    stats: DashboardData["stats"];
  }
  export function DashboardProfileCard(props: DashboardProfileCardProps): React.JSX.Element;

  export type AuditStatusFilter = "all" | "audited" | "unaudited";
  export type RepoSortOption = "updated" | "stars" | "score" | "name";

  export interface DashboardToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: AuditStatusFilter;
    onStatusFilterChange: (status: AuditStatusFilter) => void;
    selectedLanguage: string;
    onLanguageChange: (language: string) => void;
    languages: string[];
    sortBy: RepoSortOption;
    onSortChange: (sort: RepoSortOption) => void;
    totalFiltered: number;
  }
  export function DashboardToolbar(props: DashboardToolbarProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write failing tests**
  Create `components/dashboard/__tests__/dashboard-profile-card.test.tsx` testing:
  - User avatar, name, `@username`, bio, location, company, website, joined date rendering.
  - Metric cards: total repos, followers, audited repos count, average health score.
  Create `components/dashboard/__tests__/dashboard-toolbar.test.tsx` testing:
  - Search input firing `onSearchChange`.
  - Filter tabs (`All`, `Audited`, `Needs Audit`) calling `onStatusFilterChange`.
  - Language select calling `onLanguageChange`.
  - Sort select calling `onSortChange`.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `bun vitest run components/dashboard/__tests__/dashboard-profile-card.test.tsx components/dashboard/__tests__/dashboard-toolbar.test.tsx`
  Expected: FAIL with modules not found.

- [ ] **Step 3: Write implementations**
  - Implement `components/dashboard/dashboard-profile-card.tsx`.
  - Implement `components/dashboard/dashboard-toolbar.tsx`.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `bun vitest run components/dashboard/__tests__/dashboard-profile-card.test.tsx components/dashboard/__tests__/dashboard-toolbar.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add components/dashboard/dashboard-profile-card.tsx components/dashboard/dashboard-toolbar.tsx components/dashboard/__tests__/dashboard-profile-card.test.tsx components/dashboard/__tests__/dashboard-toolbar.test.tsx
  git commit -m "feat(dashboard): add profile card and toolbar components"
  ```

---

### Task 4: Interactive Dashboard View Component (`DashboardView`)

**Files:**
- Create: `components/dashboard/dashboard-view.tsx`
- Create: `components/dashboard/index.ts`
- Test: `components/dashboard/__tests__/dashboard-view.test.tsx`

**Interfaces:**
- Consumes: `DashboardProfileCard`, `DashboardToolbar`, `DashboardRepoCard`, `DashboardData`
- Produces:
  ```typescript
  export interface DashboardViewProps {
    initialData: DashboardData;
    fetcher?: typeof fetch;
  }
  export function DashboardView(props: DashboardViewProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**
  Create `components/dashboard/__tests__/dashboard-view.test.tsx` testing:
  - Renders user profile card and repository cards.
  - Search query filters visible repositories in real time.
  - Status filter toggles between All, Audited, and Needs Audit.
  - Sorting reorders repository cards correctly.
  - In-place audit updates repository card and recalculates stats (auditedCount, averageScore).
  - Empty search state displays friendly message with "Clear filters" button.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun vitest run components/dashboard/__tests__/dashboard-view.test.tsx`
  Expected: FAIL with module not found.

- [ ] **Step 3: Write implementation**
  Create `components/dashboard/dashboard-view.tsx`:
  - Manages `repos` state initialized from `initialData.repositories`.
  - Manages `stats` state dynamically recalculated whenever repos update.
  - Manages `search`, `statusFilter`, `selectedLanguage`, `sortBy`.
  - Extracts unique languages from `repos`.
  - Filters and sorts repositories.
  - Implements `handleAuditComplete` updating the audited repo in state and recomputing stats.
  - Renders empty state when zero matches.
  - Create `components/dashboard/index.ts` barrel export.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun vitest run components/dashboard/__tests__/dashboard-view.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add components/dashboard/dashboard-view.tsx components/dashboard/index.ts components/dashboard/__tests__/dashboard-view.test.tsx
  git commit -m "feat(dashboard): add interactive dashboard view component"
  ```

---

### Task 5: Dashboard Page, Layout, Loading Skeleton & Route Protection

**Files:**
- Create: `app/dashboard/layout.tsx`
- Create: `app/dashboard/loading.tsx`
- Create: `app/dashboard/page.tsx`
- Test: `app/dashboard/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `getGitHubSession()` from `@/lib/auth`, `getDashboardData()` from `@/src/lib/dashboard`, `<DashboardView />` from `@/components/dashboard`
- Produces: Next.js App Router `/dashboard` page and layout.

- [ ] **Step 1: Write the failing test**
  Create `app/dashboard/__tests__/page.test.tsx` testing:
  - When user is unauthenticated (`getGitHubSession` returns null), redirects to `/api/auth/signin?callbackUrl=/dashboard`.
  - When user is authenticated, calls `getDashboardData` and renders `DashboardView` with loaded data.
  - Handles error from `getDashboardData` gracefully with error message card.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun vitest run app/dashboard/__tests__/page.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Write implementation**
  - Create `app/dashboard/layout.tsx`: Includes Repodoc navigation and background styling.
  - Create `app/dashboard/loading.tsx`: Skeleton placeholders for profile card, filter bar, and repository cards.
  - Create `app/dashboard/page.tsx`: Server Component calling `getGitHubSession()`, `redirect()`, and `getDashboardData()`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun vitest run app/dashboard/__tests__/page.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/dashboard/layout.tsx app/dashboard/loading.tsx app/dashboard/page.tsx app/dashboard/__tests__/page.test.tsx
  git commit -m "feat(dashboard): add dashboard page, layout, loading state, and auth protection"
  ```

---

### Task 6: Navigation & AuthControls Integration

**Files:**
- Modify: `components/auth/auth-controls.tsx`
- Modify: `components/landing/sections/navigation.tsx`
- Test: `components/auth/__tests__/auth-controls.test.tsx`

**Interfaces:**
- In `AuthControls`: Add a "Dashboard" MenuItem with `<LayoutDashboard />` icon that routes to `/dashboard`.
- In `LandingNavigation`: When session is authenticated, display a "Dashboard" link in the desktop and mobile nav menus.

- [ ] **Step 1: Write failing test update**
  Update `components/auth/__tests__/auth-controls.test.tsx` to verify that when signed in, the menu contains a "Dashboard" action linking to `/dashboard`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun vitest run components/auth/__tests__/auth-controls.test.tsx`
  Expected: FAIL (missing "Dashboard" menu item).

- [ ] **Step 3: Implement changes**
  - In `components/auth/auth-controls.tsx`: Import `LayoutDashboard` from `lucide-react`, import `useRouter` from `next/navigation`, add `MenuItem` navigating to `/dashboard`.
  - In `components/landing/sections/navigation.tsx`: Include "Dashboard" link when user is authenticated.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun vitest run components/auth/__tests__/auth-controls.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add components/auth/auth-controls.tsx components/landing/sections/navigation.tsx components/auth/__tests__/auth-controls.test.tsx
  git commit -m "feat(nav): add dashboard entry point to auth controls and landing navigation"
  ```

---

### Task 7: Full System Verification

- [ ] **Step 1: Run complete test suite**
  Run: `bun run test:run`
  Expected: 100% passing tests (all existing 2,151+ tests plus new dashboard tests).

- [ ] **Step 2: Run linter**
  Run: `bun run lint`
  Expected: No lint errors.

- [ ] **Step 3: Run Next.js build**
  Run: `bun run build`
  Expected: Successful production build with `/dashboard` route generated.

- [ ] **Step 4: Commit any final refinements**
  ```bash
  git commit -m "chore: complete user dashboard and direct repo audit feature" --allow-empty
  ```
