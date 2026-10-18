# Design Specification: User Dashboard & Direct Repository Audit

## 1. Overview & Goals
Provide authenticated users with a personalized workspace (`/dashboard`) that displays their GitHub profile details, audit summary metrics across their projects, and a searchable, filterable list of their public repositories. Users can trigger health audits directly from each repository card with live progress, immediately viewing updated scores and linking to full reports without manually pasting repository URLs into the home page composer.

---

## 2. Architecture & Data Flow

```
[Browser /dashboard]
       │
       ▼ (Server Component)
[app/dashboard/page.tsx]
       │
       ├─► getGitHubSession()  (Verify session & extract OAuth accessToken)
       │
       ├─► getDashboardData()  (server-only loader in src/lib/dashboard.ts)
       │       ├─► GitHub API GET /user (profile, bio, stats)
       │       ├─► GitHub API GET /user/repos (owned repositories)
       │       └─► Prisma DB query (existing RepoReports for user.username)
       │
       ▼ (HTML + Initial Props)
[components/dashboard/dashboard-view.tsx] (Client Component)
       │
       ├─► Live Search & Filter state (in memory)
       │
       └─► Audit Trigger -> requestAudit({ owner, repo }) -> POST /api/audit
               │
               ▼ (On Success)
       Updates repository card in-place with health score, shareId, and "View Report" button
```

### 2.1 Security Boundary
- The GitHub OAuth `accessToken` is stored in encrypted, HttpOnly JWT cookies.
- All requests using the token to access GitHub user details and repositories are executed server-side via `getGitHubSession()`.
- Client components only receive sanitized data transfer objects (`DashboardData`). Tokens are never leaked to client state or rendered into the DOM.

---

## 3. Data Models & DTOs

### 3.1 `UserProfileData`
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
```

### 3.2 `DashboardRepoItem`
```typescript
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
  // Repodoc Audit Metadata
  hasReport: boolean;
  healthScore: number | null;
  shareId: string | null;
  lastAuditedAt: string | null;
}
```

### 3.3 `DashboardData`
```typescript
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
```

---

## 4. Components & UI Design

### 4.1 Page Structure (`app/dashboard/page.tsx` & `app/dashboard/layout.tsx`)
- Server-rendered page protected by `getGitHubSession()`.
- Redirects unauthenticated users to `/api/auth/signin?callbackUrl=/dashboard`.
- Employs Next.js loading fallback (`app/dashboard/loading.tsx`) with pulse skeleton cards for profile and repo lists.

### 4.2 Profile Card (`components/dashboard/dashboard-profile-card.tsx`)
- **Avatar & Identity**: User avatar with high-resolution image, display name, `@username`, and formatted joined date.
- **Bio & Metadata**: Bio string, company (`Building2`), location (`MapPin`), website (`Globe`), and link to GitHub profile (`ExternalLink`).
- **Repodoc Metrics Grid**:
  - Total Repositories card
  - Followers & Following count card
  - Audited Repositories count & coverage percentage
  - Average Repository Health Score gauge

### 4.3 Filter & Search Toolbar (`components/dashboard/dashboard-toolbar.tsx`)
- **Search Input**: Instant filter by repository name or description.
- **Audit Status Tabs**: `All`, `Audited`, `Needs Audit`.
- **Language Dropdown**: Filter by programming language detected in repositories.
- **Sort Dropdown**: `Recently updated`, `Stars (high to low)`, `Health score (high to low)`, `Alphabetical`.

### 4.4 Repository Card (`components/dashboard/dashboard-repo-card.tsx`)
- **Header**: Repository name linking to GitHub, public/private badge, relative timestamp.
- **Body**: Description with clamp-2 line-overflow and metadata row (language dot, stars, forks).
- **Footer Actions**:
  - If audited: Colored health score badge (0–100), "View Report" button linking to `/report/[owner]/[repo]`, and a "Re-audit" button with refresh icon.
  - If not audited: "Not audited yet" badge and a primary "Audit Repository" button.
  - While auditing: Spinner indicator, "Auditing...", and disabled buttons to prevent double-clicks.

### 4.5 Navigation Enhancements
- **Navbar Integration**: When authenticated, `LandingNavigation` and header include a `Dashboard` link.
- **User Avatar Menu**: `AuthControls` dropdown menu includes a `Dashboard` item with `<LayoutDashboard />` icon navigating to `/dashboard`.

---

## 5. Audit Execution & State Updates

1. **Triggering**: Clicking `Audit` or `Re-audit` invokes `requestAudit({ owner: repo.owner, repo: repo.name })`.
2. **Local State**: Tracks `auditingRepoIds: Set<string>` to show spinner on the target card without locking the entire page.
3. **Response Handling**:
   - Updates target repository's `hasReport`, `healthScore`, `shareId`, and `lastAuditedAt`.
   - Recomputes overall dashboard stats (`auditedCount`, `averageScore`).
   - Surfaces a success toast or confirmation badge with one-click link to view the complete report.
4. **Error Handling**:
   - `429 Rate Limit`: Displays banner with countdown timer.
   - `404 / 502 / Tree Incomplete`: Displays card-level error badge with retry button.
   - `401 Unauthorized`: Prompts user to refresh GitHub sign-in.

---

## 6. Testing Strategy

1. **Server Loader Unit Tests (`src/lib/__tests__/dashboard.test.ts`)**:
   - Validates correct parsing of GitHub `/user` and `/user/repos` payloads.
   - Validates matching against Prisma `RepoReport` entries.
   - Handles empty repositories list, missing fields, and rate limit errors.
2. **Dashboard Component Tests (`components/dashboard/__tests__/dashboard-view.test.tsx`)**:
   - Renders user profile information and metrics.
   - Tests search filtering and category tab toggling (`Audited` vs `Needs Audit`).
   - Tests clicking "Audit" button on an unaudited repo card, verifying loading state and updated score display upon completion.
3. **Navigation Integration**:
   - Tests that `AuthControls` renders the "Dashboard" option when signed in.
