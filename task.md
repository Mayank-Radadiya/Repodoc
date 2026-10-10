# Repodoc — Task Breakdown & Execution Plan

> **Classification:** Architectural (greenfield project, multiple subsystems)
> **Rubric version:** v1.0 as defined in `idea.md`
> **Phases:** 1 (MVP Audit + Badge) → 2 (GitHub App + Fix-with-PR) → 3 (Stretch: Webhooks)
> **This document covers Phase 1 and Phase 2 only.** Phase 3 is deferred.

---

## Milestones

| # | Milestone | Gate Criteria |
|---|-----------|---------------|
| M1 | **Project scaffold boots** | `pnpm dev` serves a page at `localhost:3000`, linting/formatting pass, Prisma client generates |
| M2 | **Scoring engine complete** | All 12 rubric checks pass unit tests, pure functions with zero network calls |
| M3 | **GitHub service complete** | Single-call tree fetch + ETag caching works against live GitHub API |
| M4 | **Audit API works end-to-end** | `POST /api/audit` accepts `owner/repo`, returns scored `RepoReport` JSON |
| M5 | **Badge endpoint live** | `GET /api/badge/:owner/:repo` returns shields.io-compliant JSON |
| M6 | **Report UI complete** | User can paste a URL, see score gauge + categorized checks + badge snippet |
| M7 | **Database persistence** | Reports are saved, share links work, ETag cache hits skip re-scoring |
| M8 | **Phase 1 deployed** | Live on Vercel, public URL works |
| M9 | **Remediation engine complete** | Atomic Git Data API pipeline creates a PR with generated files |
| M10 | **Phase 2 deployed** | Authenticated users can "Fix All" and get a PR opened |

---

## Risks & Ambiguities

| # | Risk | Mitigation |
|---|------|------------|
| R1 | **GitHub unauthenticated rate limit (60 req/hr)** — MVP Phase 1 uses no auth, so aggressive testing or multiple users will hit limits fast | Phase 1: use a PAT via env var for development. Production: add optional token input or prompt GitHub OAuth early. Document this clearly. |
| R2 | **Recursive tree call may fail on very large repos** (>100k files, GitHub truncates response with `truncated: true`) | Detect `truncated` flag in response. Fall back to per-directory fetches for truncated repos, or cap and warn the user. Add a TODO for Phase 3. |
| R3 | **Project-type detection heuristics** — "library vs. app" detection from manifest files is fuzzy | Start with simple presence checks (`bin` field in `package.json` = CLI, `main`/`exports` = library). Don't over-engineer; mark as "best-effort" in UI. |
| R4 | **License auto-generation is legally sensitive** — wrong SPDX ID or template could mislead users | Never auto-select. Use exact SPDX template text from `choosealicense.com` API or bundled templates. Show disclaimer. |
| R5 | **Prisma + SQLite on Vercel** — SQLite doesn't work on Vercel serverless (ephemeral filesystem) | Use SQLite for local dev only. Require PostgreSQL (e.g., Neon/Supabase free tier) for production `DATABASE_URL`. Document in README. |
| R6 | **ETag caching requires persistent storage** — ETag for conditional requests needs to be stored between invocations | Store ETags in the `RepoReport` model. On re-audit, send `If-None-Match`; on `304`, return cached report. |
| R7 | **Fork + PR flow complexity** — Creating forks, waiting for fork readiness, cross-fork PRs | Defer fork flow to late Phase 2. Start with direct-push-only (user has write access). |

---

## Phase 1: MVP — Audit, Report & Badge

### 1.0 — Project Scaffold

- [ ] **1.0.1 — Initialize Next.js 15 project**
  - Run `npx create-next-app@latest` with: App Router, TypeScript, Tailwind CSS, ESLint, `src/` directory, import alias `@/*`
  - Use `pnpm` as package manager
  - **Acceptance:** `pnpm dev` boots, `localhost:3000` renders default page
  - **Depends on:** nothing

- [ ] **1.0.2 — Install and configure shadcn/ui**
  - Run `pnpm dlx shadcn@latest init`
  - Configure with default style, CSS variables enabled
  - Add initial components: `button`, `input`, `card`, `badge`, `separator`, `tabs`, `dialog`
  - **Acceptance:** A shadcn `<Button>` renders on the page without errors
  - **Depends on:** 1.0.1

- [x] **1.0.3 — Set up Prisma with SQLite for local dev**
  - Install `prisma` + `@prisma/client`
  - Create `prisma/schema.prisma` with the schema from `idea.md` (use `sqlite` provider for dev)
  - Add `DATABASE_URL="file:./dev.db"` to `.env` (gitignored)
  - Add `.env.example` with placeholder
  - Run `npx prisma db push` to generate local DB
  - Create `src/lib/db.ts` — singleton Prisma client (standard Next.js pattern to avoid hot-reload connection leaks)
  - **Acceptance:** `npx prisma studio` opens and shows empty `User` and `RepoReport` tables
  - **Depends on:** 1.0.1

- [x] **1.0.4 — Set up Vitest**
  - Install `vitest` and `@testing-library/react` (for later UI tests)
  - Create `vitest.config.ts` with path aliases matching `tsconfig.json`
  - Add `"test": "vitest"` and `"test:run": "vitest run"` scripts to `package.json`
  - Create a trivial `src/lib/__tests__/smoke.test.ts` that passes
  - **Acceptance:** `pnpm test:run` passes
  - **Depends on:** 1.0.1

- [x] **1.0.5 — Create project directory structure**
  - Create the following directory skeleton (empty `.gitkeep` or index files):
    ```
    src/
      app/                  # Next.js App Router pages
        api/                # API routes
          audit/
          badge/
      lib/
        github/             # GitHub API service
        scoring/            # Scoring engine (pure functions)
        remediation/        # Remediation engine (Phase 2)
        templates/          # File templates for remediation (Phase 2)
        constants.ts        # Shared constants (rubric version, thresholds)
        types.ts            # Shared TypeScript interfaces
      components/
        ui/                 # shadcn components (auto-generated)
        report/             # Report-specific components
    ```
  - **Acceptance:** Directory structure exists, no import errors
  - **Depends on:** 1.0.1, 1.0.2

- [ ] **1.0.6 — Define shared TypeScript types**
  - Create `src/lib/types.ts` with interfaces from `idea.md`:
    - `CheckResult` (id, name, category, pointsAwarded, maxPoints, passed, evidence, remediation)
    - `AuditReport` (owner, repo, defaultBranch, healthScore, rubricVersion, checks: CheckResult[], generatedAt)
    - `RepoTree` (sha, tree: TreeEntry[], truncated)
    - `TreeEntry` (path, mode, type, sha, size?)
    - `GitHubTreeResponse` (raw API shape)
    - `BadgeResponse` (schemaVersion, label, message, color)
  - Create `src/lib/constants.ts`:
    - `RUBRIC_VERSION = "1.0.0"`
    - `BADGE_COLORS` threshold map
    - `REPODOC_BRANCH = "repodoc/health-remediation"`
  - **Acceptance:** Types compile with `tsc --noEmit`, no `any` types
  - **Depends on:** 1.0.1

---

### 1.1 — GitHub Service

- [ ] **1.1.1 — Implement `fetchDefaultBranch(owner, repo)`**
  - In `src/lib/github/client.ts`
  - Calls `GET /repos/{owner}/{repo}` → extracts `default_branch`
  - Accepts optional `token` param for authenticated requests
  - Returns `{ defaultBranch: string, description: string | null, topics: string[] }`
  - Throws typed error on 404 (repo not found) or rate limit (403)
  - **Acceptance:** Unit test with mocked fetch (or integration test against a known repo)
  - **Depends on:** 1.0.6

- [ ] **1.1.2 — Implement `fetchRepoTree(owner, repo, sha)`**
  - In `src/lib/github/client.ts`
  - Calls `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
  - Accepts optional `etag` param → sends `If-None-Match` header
  - Returns `{ tree: TreeEntry[], sha: string, etag: string, truncated: boolean, notModified: boolean }`
  - On `304 Not Modified` → returns `{ notModified: true }` with no tree data
  - Detects `truncated: true` and logs a warning (no fallback in Phase 1)
  - **Acceptance:** Unit test with mocked responses for: success, 304, truncated, 404, 403
  - **Depends on:** 1.0.6, 1.1.1

- [ ] **1.1.3 — Implement `GitHubService` facade**
  - In `src/lib/github/service.ts`
  - Combines `fetchDefaultBranch` + `fetchRepoTree` into a single `getRepoData(owner, repo, cachedEtag?)` method
  - Returns `{ defaultBranch, description, topics, tree, treeSha, etag, truncated }`
  - Handles the `304` path: returns `null` tree when cache is fresh
  - **Acceptance:** Integration test calling `getRepoData("torvalds", "linux")` returns a valid tree (or similar stable public repo)
  - **Depends on:** 1.1.1, 1.1.2

---

### 1.2 — Scoring Engine

> **Design principle:** Every check is a pure function `(tree: Set<string>, metadata: RepoMetadata) → CheckResult`. Zero network calls. All checks are individually unit-testable.

- [ ] **1.2.1 — Implement tree-to-set utility**
  - In `src/lib/scoring/utils.ts`
  - `buildPathSet(tree: TreeEntry[]): Set<string>` — lowercased paths for case-insensitive matching
  - `findFile(paths: Set<string>, candidates: string[]): string | null` — returns first match from candidate list
  - `findFilesInDir(paths: Set<string>, dirPrefix: string, extension?: string): string[]`
  - **Acceptance:** Unit tests for case-insensitive matching, directory filtering
  - **Depends on:** 1.0.6

- [ ] **1.2.2 — Implement Documentation checks (25 pts)**
  - In `src/lib/scoring/checks/documentation.ts`
  - `checkReadmePresence(paths)` → 8 pts — checks for `README.md`, `readme.md`, `README`, etc.
  - `checkReadmeHeadings(tree, paths)` → 10 pts — fetches README blob content, parses markdown headings, checks for `Installation`/`Setup` AND `Usage`/`Quickstart` (case-insensitive). **Note:** This is the ONE check that needs file content, not just tree presence. Accept raw README content as a parameter to keep the function pure.
  - `checkArchitectureDescription(tree, paths)` → 4 pts — checks for headings like `Architecture`, `Overview`, `Design`, `How it works` in README
  - `checkContributing(paths)` → 3 pts — checks for `CONTRIBUTING.md`
  - **Acceptance:** Unit tests for each check covering pass/fail scenarios, edge cases (no README, README without headings, etc.)
  - **Depends on:** 1.2.1

- [ ] **1.2.3 — Implement Project Hygiene checks (20 pts)**
  - In `src/lib/scoring/checks/hygiene.ts`
  - `checkLicense(paths)` → 10 pts — checks for `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `LICENCE`, `COPYING`
  - `checkGitignore(paths)` → 5 pts — checks for `.gitignore`
  - `checkCodeOfConduct(paths)` → 5 pts — checks for `CODE_OF_CONDUCT.md`
  - **Acceptance:** Unit tests, including edge cases like `licence` (British spelling)
  - **Depends on:** 1.2.1

- [ ] **1.2.4 — Implement Testing & CI checks (25 pts)**
  - In `src/lib/scoring/checks/testing.ts`
  - `checkCIWorkflow(paths)` → 15 pts — checks for any `.yml`/`.yaml` file under `.github/workflows/`
  - `checkTestDirectory(paths)` → 10 pts — checks for `test/`, `tests/`, `__tests__/`, `spec/`, `*_test.go`, `*_test.rs`, `test_*.py`, or `"test"` script in `package.json` (pass manifest content as param)
  - **Acceptance:** Unit tests for various language ecosystems
  - **Depends on:** 1.2.1

- [ ] **1.2.5 — Implement Community & Metadata checks (15 pts)**
  - In `src/lib/scoring/checks/community.ts`
  - `checkIssueTemplates(paths)` → 4 pts — checks for files in `.github/ISSUE_TEMPLATE/` or `.github/ISSUE_TEMPLATE.md`
  - `checkPRTemplate(paths)` → 4 pts — checks for `.github/PULL_REQUEST_TEMPLATE.md` or `.github/PULL_REQUEST_TEMPLATE/`
  - `checkRepoMetadata(description, topics)` → 7 pts — checks that description is non-empty (4 pts) and at least 1 topic exists (3 pts)
  - **Acceptance:** Unit tests
  - **Depends on:** 1.2.1

- [ ] **1.2.6 — Implement Security Baseline checks (15 pts)**
  - In `src/lib/scoring/checks/security.ts`
  - `checkSecurityPolicy(paths)` → 10 pts — checks for `SECURITY.md` or `.github/SECURITY.md`
  - `checkDependencyScanning(paths)` → 5 pts — checks for `.github/dependabot.yml`, `.github/dependabot.yaml`, `renovate.json`, `.renovaterc`, `.renovaterc.json`
  - **Acceptance:** Unit tests
  - **Depends on:** 1.2.1

- [ ] **1.2.7 — Implement `ScoringEngine.run()` orchestrator**
  - In `src/lib/scoring/engine.ts`
  - Accepts `{ paths: Set<string>, readmeContent?: string, manifestContent?: string, description?: string, topics?: string[] }`
  - Runs all check functions, collects `CheckResult[]`
  - Computes `healthScore` as sum of `pointsAwarded`
  - Returns `AuditReport` object
  - **Acceptance:** Unit test with a synthetic tree that scores exactly 100/100, and another that scores 0/100. Verify total never exceeds 100.
  - **Depends on:** 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6

- [ ] **1.2.8 — Implement README content fetcher**
  - In `src/lib/github/client.ts`
  - `fetchFileContent(owner, repo, sha): Promise<string>` — fetches blob content via `GET /repos/{owner}/{repo}/git/blobs/{sha}` (base64 decode)
  - Used by the audit API to fetch README content for heading analysis (task 1.2.2)
  - **Acceptance:** Unit test with mocked base64 response
  - **Depends on:** 1.0.6

---

### 1.3 — Audit API Route

- [ ] **1.3.1 — Implement `POST /api/audit` route**
  - In `src/app/api/audit/route.ts`
  - Request body: `{ owner: string, repo: string }`
  - Validates input (reject empty, sanitize: strip `github.com/` prefix if pasted as URL)
  - Calls `GitHubService.getRepoData()` → gets tree + metadata
  - Finds README in tree → calls `fetchFileContent()` for heading analysis
  - Calls `ScoringEngine.run()` with tree paths + README content + metadata
  - Returns `AuditReport` JSON (do NOT persist to DB yet — that's task 1.5.1)
  - Returns proper HTTP error codes: 400 (bad input), 404 (repo not found), 429 (rate limited)
  - **Acceptance:** `curl` against local dev server with a real repo returns valid scored JSON
  - **Depends on:** 1.1.3, 1.2.7, 1.2.8

- [ ] **1.3.2 — Add URL parsing utility**
  - In `src/lib/utils.ts`
  - `parseGitHubUrl(input: string): { owner: string, repo: string } | null`
  - Handles: `owner/repo`, `github.com/owner/repo`, `https://github.com/owner/repo`, `https://github.com/owner/repo/tree/main`, trailing slashes
  - **Acceptance:** Unit tests covering all formats above, plus invalid inputs
  - **Depends on:** 1.0.6

---

### 1.4 — Badge Endpoint

- [ ] **1.4.1 — Implement `GET /api/badge/[owner]/[repo]` route**
  - In `src/app/api/badge/[owner]/[repo]/route.ts`
  - Runs audit (or reads from cache — simplified: run fresh audit for MVP)
  - Returns `BadgeResponse` JSON with correct `schemaVersion: 1`
  - Sets `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
  - Color logic per thresholds in `idea.md`
  - **Acceptance:** `curl` returns valid shields.io JSON; passing URL to `https://img.shields.io/endpoint?url=...` renders a badge
  - **Depends on:** 1.3.1

---

### 1.5 — Database Persistence & Caching

- [ ] **1.5.1 — Add report persistence to audit route**
  - After scoring, save/upsert `RepoReport` in database
  - Generate `shareId` via `nanoid(8)`
  - Store `breakdown` as JSON, store `etag` for conditional caching
  - On re-audit of the same `owner/repo`: send cached ETag → on `304`, return cached report
  - **Acceptance:** Two successive audits of the same repo: first hits GitHub API, second returns `304` cached result. Both return the same `shareId`.
  - **Depends on:** 1.0.3, 1.3.1

- [ ] **1.5.2 — Implement `GET /api/report/[shareId]` route**
  - In `src/app/api/report/[shareId]/route.ts`
  - Looks up `RepoReport` by `shareId`
  - Returns full report JSON (or 404)
  - **Acceptance:** After an audit, the returned `shareId` can be used to fetch the same report
  - **Depends on:** 1.5.1

---

### 1.6 — Report UI

- [ ] **1.6.1 — Build URL input component**
  - In `src/components/report/url-input.tsx`
  - Text input with "Audit" button
  - Uses `parseGitHubUrl` for validation
  - Shows inline validation error for invalid URLs
  - Triggers audit API call, shows loading spinner
  - **Acceptance:** Component renders, validates input, calls API on submit
  - **Depends on:** 1.0.2, 1.3.2

- [ ] **1.6.2 — Build score gauge component**
  - In `src/components/report/score-gauge.tsx`
  - Circular or radial gauge displaying `healthScore / 100`
  - Color matches badge color thresholds
  - Animated on mount
  - **Acceptance:** Renders correct score and color for various values (0, 45, 62, 78, 95)
  - **Depends on:** 1.0.2

- [ ] **1.6.3 — Build category breakdown component**
  - In `src/components/report/category-breakdown.tsx`
  - Tab or accordion layout with 5 categories
  - Each category shows: category score (e.g., "18/25"), list of individual checks
  - Each check shows: pass/fail icon, name, points, evidence details (collapsible)
  - **Acceptance:** Renders correctly with mock `AuditReport` data
  - **Depends on:** 1.0.2

- [ ] **1.6.4 — Build badge embed snippet component**
  - In `src/components/report/badge-snippet.tsx`
  - Shows the markdown snippet for embedding the shields.io badge
  - Copy-to-clipboard button
  - Preview of what the badge looks like
  - **Acceptance:** Snippet is correct markdown, copy button works
  - **Depends on:** 1.0.2

- [ ] **1.6.5 — Build main report page**
  - In `src/app/page.tsx` (landing + audit input)
  - In `src/app/report/[owner]/[repo]/page.tsx` (report view)
  - Landing: hero text, URL input component
  - Report page: score gauge, category breakdown, badge snippet, share link, "Re-audit" button
  - Responsive layout (mobile-friendly)
  - **Acceptance:** Full user flow works: paste URL → see report → copy badge
  - **Depends on:** 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.3.1

- [ ] **1.6.6 — Build shareable report page**
  - In `src/app/share/[shareId]/page.tsx`
  - Fetches report from `/api/report/[shareId]`
  - Renders same report UI as 1.6.5 but read-only (no re-audit button)
  - **Acceptance:** Share link from audit page opens working read-only report
  - **Depends on:** 1.6.5, 1.5.2

---

### 1.7 — Phase 1 Polish & Deploy

- [ ] **1.7.1 — Add error handling and loading states**
  - Loading skeletons for report page
  - Error boundary for API failures
  - Friendly error messages for: repo not found, rate limited, network error
  - **Acceptance:** All error states render gracefully, no unhandled promise rejections
  - **Depends on:** 1.6.5

- [ ] **1.7.2 — Add basic SEO and metadata**
  - Open Graph tags for share links
  - Dynamic `<title>` on report pages: "Repodoc — {owner}/{repo} Health Report"
  - Favicon
  - **Acceptance:** Sharing a report URL on Twitter/Slack shows preview card
  - **Depends on:** 1.6.5

- [ ] **1.7.3 — Write README.md**
  - Project description, local dev setup instructions, env vars, architecture overview
  - **Acceptance:** A developer can clone and run locally by following the README
  - **Depends on:** all Phase 1 tasks

- [ ] **1.7.4 — Deploy to Vercel**
  - Configure production `DATABASE_URL` (PostgreSQL — Neon or Supabase free tier)
  - Run `npx prisma migrate deploy` or `prisma db push` against prod DB
  - Set environment variables in Vercel dashboard
  - Verify: audit flow works, badge endpoint works, share links work
  - **Acceptance:** Public URL serves working app, badge URL works with shields.io
  - **Depends on:** all Phase 1 tasks

---

## Phase 2: GitHub App & Atomic "Fix with PR"

### 2.0 — GitHub OAuth & App Setup

- [ ] **2.0.1 — Implement GitHub OAuth (NextAuth.js)**
  - Install `next-auth` with GitHub provider
  - Configure OAuth App on GitHub (callback URL, scopes)
  - Create `src/app/api/auth/[...nextauth]/route.ts`
  - On sign-in: upsert `User` record in database with `githubId`, `username`, `avatarUrl`
  - Store GitHub access token in session (needed for Git Data API calls on user's behalf)
  - **Acceptance:** User can sign in with GitHub, session persists, user record created in DB
  - **Depends on:** 1.0.3

- [ ] **2.0.2 — Add auth UI (sign-in/out, avatar)**
  - Header component with sign-in button (when logged out) / avatar + dropdown (when logged in)
  - Protect "Fix with PR" button behind auth gate
  - **Acceptance:** Sign in/out works, "Fix All" button appears only when authenticated
  - **Depends on:** 2.0.1

---

### 2.1 — Remediation Templates

- [ ] **2.1.1 — Create license templates**
  - In `src/lib/templates/licenses/`
  - Bundle SPDX-correct template text for: MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0
  - Each template has `{{year}}` and `{{fullname}}` placeholders
  - Utility: `renderLicense(spdxId, year, fullName): string`
  - **Acceptance:** Unit test — rendered MIT license contains correct year and name
  - **Depends on:** 1.0.6

- [ ] **2.1.2 — Create .gitignore templates**
  - In `src/lib/templates/gitignore/`
  - Detect language from manifest files in tree: `package.json` → Node, `Cargo.toml` → Rust, `go.mod` → Go, `setup.py`/`pyproject.toml` → Python, etc.
  - Bundle standard `.gitignore` content for each language (from github/gitignore repo)
  - Fallback: generic `.gitignore` if no manifest detected
  - **Acceptance:** Unit test — Node project gets `node_modules/` in gitignore
  - **Depends on:** 1.0.6, 1.2.1

- [ ] **2.1.3 — Create CI workflow template**
  - In `src/lib/templates/ci/`
  - Generate minimal `.github/workflows/ci.yml` based on detected language
  - Node: `actions/setup-node` + `npm test`
  - Python: `actions/setup-python` + `pytest`
  - Go: `actions/setup-go` + `go test ./...`
  - Rust: `actions-rs/toolchain` + `cargo test`
  - Fallback: basic checkout-only workflow
  - **Acceptance:** Unit test — generated YAML is valid, uses correct actions for detected language
  - **Depends on:** 1.0.6, 1.2.1

- [ ] **2.1.4 — Create SECURITY.md template**
  - In `src/lib/templates/security/`
  - Standard vulnerability reporting template with placeholder sections
  - **Acceptance:** Template renders without placeholders in output
  - **Depends on:** 1.0.6

- [ ] **2.1.5 — Create CODE_OF_CONDUCT.md template**
  - In `src/lib/templates/conduct/`
  - Contributor Covenant v2.1 (standard, widely adopted)
  - **Acceptance:** Template matches Contributor Covenant text
  - **Depends on:** 1.0.6

---

### 2.2 — Remediation Engine (Git Data API)

- [ ] **2.2.1 — Implement `createBlob(owner, repo, content, token)`**
  - In `src/lib/remediation/git-api.ts`
  - `POST /repos/{owner}/{repo}/git/blobs` with base64-encoded content
  - Returns blob SHA
  - **Acceptance:** Unit test with mocked API
  - **Depends on:** 1.0.6

- [ ] **2.2.2 — Implement `createTree(owner, repo, baseTreeSha, blobs, token)`**
  - Creates new tree with multiple blob entries
  - `POST /repos/{owner}/{repo}/git/trees` with `base_tree` set
  - **Acceptance:** Unit test with mocked API
  - **Depends on:** 2.2.1

- [ ] **2.2.3 — Implement `createCommit(owner, repo, treeSha, parentSha, message, token)`**
  - `POST /repos/{owner}/{repo}/git/commits`
  - Commit message: `chore(repodoc): resolve repository health audit findings`
  - **Acceptance:** Unit test with mocked API
  - **Depends on:** 2.2.2

- [ ] **2.2.4 — Implement `createOrUpdateBranch(owner, repo, sha, token)`**
  - Attempts `POST /git/refs` to create `refs/heads/repodoc/health-remediation`
  - On 422 (already exists): `PATCH /git/refs/heads/repodoc/health-remediation` to update
  - Idempotent — safe to call repeatedly
  - **Acceptance:** Unit test covering create + update paths
  - **Depends on:** 2.2.3

- [ ] **2.2.5 — Implement `openPullRequest(owner, repo, head, base, token)`**
  - `POST /repos/{owner}/{repo}/pulls`
  - Title: `chore(repodoc): resolve repository health audit findings`
  - Body: markdown summary of what was fixed (list of files added)
  - Handles 422 (PR already exists) — returns existing PR URL
  - **Acceptance:** Unit test covering create + already-exists paths
  - **Depends on:** 2.2.4

- [ ] **2.2.6 — Implement `RemediationEngine.execute()` orchestrator**
  - In `src/lib/remediation/engine.ts`
  - Input: `AuditReport` (with failed checks that have `canAutomate: true`), user selections, license choice
  - Verifies files don't already exist (from tree data)
  - Generates file content from templates
  - Calls: `createBlob` (for each file) → `createTree` → `createCommit` → `createOrUpdateBranch` → `openPullRequest`
  - Returns `{ prUrl: string, filesCreated: string[] }`
  - **Acceptance:** Integration test (mocked) — given 3 missing files, creates correct blob/tree/commit sequence and returns PR URL
  - **Depends on:** 2.2.1–2.2.5, 2.1.1–2.1.5

---

### 2.3 — Fix-with-PR UI & API

- [ ] **2.3.1 — Implement `POST /api/remediate` route**
  - In `src/app/api/remediate/route.ts`
  - Requires authenticated session (return 401 if not)
  - Request body: `{ owner, repo, fixes: string[], licenseChoice?: string }`
  - `fixes` is array of check IDs to remediate (e.g., `["license", "gitignore", "ci-workflow"]`)
  - Calls `RemediationEngine.execute()` with user's GitHub token
  - Returns `{ prUrl: string, filesCreated: string[] }`
  - **Acceptance:** Authenticated request creates a PR on a test repo
  - **Depends on:** 2.0.1, 2.2.6

- [ ] **2.3.2 — Build License Selector modal**
  - In `src/components/report/license-selector.tsx`
  - Modal dialog with radio buttons for MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0
  - Shows brief description of each license
  - Required before remediation if license check failed
  - **Acceptance:** Selection is passed through to remediation API, cannot proceed without choosing
  - **Depends on:** 1.0.2

- [ ] **2.3.3 — Build "Fix All" button and remediation flow**
  - In `src/components/report/fix-button.tsx`
  - Shows on report page when authenticated and automatable fixes exist
  - Checkbox list of available fixes (pre-checked)
  - On click: if license is needed → show license selector first → then call `/api/remediate`
  - Success: show link to created PR
  - Error: show error message with guidance
  - **Acceptance:** Full flow works: select fixes → choose license → PR created → link shown
  - **Depends on:** 2.3.1, 2.3.2, 2.0.2

---

### 2.4 — Phase 2 Polish & Deploy

- [ ] **2.4.1 — Add fork detection (stretch)**
  - In `RemediationEngine`: check `GET /repos/{owner}/{repo}` for `permissions.push`
  - If no push access: `POST /repos/{owner}/{repo}/forks`, wait for fork, branch on fork, create cross-fork PR
  - **Acceptance:** User without write access gets a fork-based PR
  - **Depends on:** 2.2.6

- [ ] **2.4.2 — Deploy Phase 2 to Vercel**
  - Configure GitHub App credentials in Vercel env vars
  - Configure NextAuth secrets
  - Test full flow: sign in → audit → fix → PR created
  - **Acceptance:** Production deployment, authenticated flow works end-to-end
  - **Depends on:** all Phase 2 tasks

---

## Task Dependency Graph (Simplified)

```
1.0.1 (Next.js init)
├── 1.0.2 (shadcn/ui)
├── 1.0.3 (Prisma)
├── 1.0.4 (Vitest)
├── 1.0.5 (dir structure) ← 1.0.2
└── 1.0.6 (types + constants)

1.0.6
├── 1.1.1 → 1.1.2 → 1.1.3 (GitHub Service)
├── 1.2.1 → 1.2.2–1.2.6 → 1.2.7 (Scoring Engine)
├── 1.2.8 (README fetcher)
└── 1.3.2 (URL parser)

1.1.3 + 1.2.7 + 1.2.8 → 1.3.1 (Audit API)

1.3.1 → 1.4.1 (Badge endpoint)
1.3.1 + 1.0.3 → 1.5.1 → 1.5.2 (DB persistence)
1.3.1 + 1.3.2 + 1.0.2 → 1.6.x (UI) → 1.7.x (Polish + Deploy)

Phase 2:
1.0.3 → 2.0.1 → 2.0.2 (Auth)
1.0.6 → 2.1.x (Templates) → 2.2.x (Git Data API) → 2.3.x (Fix UI)
```

---

## Implementation Notes for AI Agents

1. **Test-first:** Write unit tests before or alongside implementation for all `src/lib/` code. UI components can be tested after.
2. **Pure functions first:** The scoring engine (1.2.x) has zero external dependencies and can be built and fully tested before the GitHub service even works.
3. **Mock GitHub API in tests:** Use `vitest` mocking (`vi.fn()`) for all GitHub API calls. Do NOT make real API calls in unit tests.
4. **One file per check category:** Keep scoring checks in separate files by category — easier to test and modify independently.
5. **Environment variables needed:**
   - `DATABASE_URL` — Prisma connection string
   - `GITHUB_TOKEN` — optional PAT for higher rate limits in development
   - `NEXTAUTH_SECRET` — NextAuth session encryption (Phase 2)
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — OAuth (Phase 2)
6. **Do NOT implement Phase 3** (webhooks, Inngest, continuous daemon) until Phase 2 is deployed and stable.
