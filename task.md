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

- [x] **1.1.1 — Implement `fetchDefaultBranch(owner, repo)`**
  - In `src/lib/github/client.ts`
  - Calls `GET /repos/{owner}/{repo}` → extracts `default_branch`
  - Accepts optional `token` param for authenticated requests
  - Returns `{ defaultBranch: string, description: string | null, topics: string[] }`
  - Throws typed error on 404 (repo not found) or rate limit (403)
  - **Acceptance:** Unit test with mocked fetch (or integration test against a known repo)
  - **Verified:** Repository endpoint, optional token + env fallback, `{defaultBranch, description, topics}` mapping, and typed 404/rate-limit errors covered by mocked tests. `npm run test:run` (107 passed; 1 opt-in live test skipped), `npm run lint`, and `npx tsc --noEmit --incremental false` pass.
  - **Depends on:** 1.0.6

- [x] **1.1.2 — Implement `fetchRepoTree(owner, repo, sha)`**
  - In `src/lib/github/client.ts`
  - Calls `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
  - Accepts optional `etag` param → sends `If-None-Match` header
  - Returns `{ tree: TreeEntry[], sha: string, etag: string, truncated: boolean, notModified: boolean }`
  - On `304 Not Modified` → returns `{ notModified: true }` with no tree data
  - Detects `truncated: true` and logs a warning (no fallback in Phase 1)
  - **Acceptance:** Unit test with mocked responses for: success, 304, truncated, 404, 403
  - **Verified:** Normalized nested entries, optional sizes, SHA/ref inputs, ETag/304 handling, truncation, malformed responses, HTTP errors, and rate limits covered by mocked tests. `bun run test:run` (100 passed; 1 opt-in live test skipped), `bun run lint`, and `tsc --noEmit --incremental false` pass.
  - **Depends on:** 1.0.6, 1.1.1

- [x] **1.1.3 — Implement `GitHubService` facade**
  - In `src/lib/github/service.ts`
  - Combines `fetchDefaultBranch` + `fetchRepoTree` into a single `getRepoData(owner, repo, cachedEtag?)` method
  - Returns `{ defaultBranch, description, topics, tree, treeSha, etag, truncated }`
  - Handles the `304` path: returns `null` tree when cache is fresh
  - **Acceptance:** Integration test calling `getRepoData("torvalds", "linux")` returns a valid tree (or similar stable public repo)
  - **Verified:** Typed client delegation, unchanged error propagation, tree normalization, fresh metadata on 304, and optional token passthrough (`getRepoData(owner, repo, cachedEtag?, token?)` → both clients) covered by unit tests. `bun run test:run` (107 passed; live test skipped by default), `bun run lint`, and `tsc --noEmit --incremental false` pass. Separate `RUN_GITHUB_INTEGRATION=1 bun run test:run src/lib/github/__tests__/service.integration.test.ts` passes against `octocat/Hello-World`, including ETag revalidation.
  - **Depends on:** 1.1.1, 1.1.2

---

### 1.2 — Scoring Engine

> **Design principle:** Every check is a pure function `(tree: Set<string>, metadata: RepoMetadata) → CheckResult`. Zero network calls. All checks are individually unit-testable.

- [x] **1.2.1 — Implement tree-to-set utility**
  - In `src/lib/scoring/utils.ts`
  - `buildPathSet(tree: TreeEntry[]): Set<string>` — lowercased paths for case-insensitive matching
  - `findFile(paths: Set<string>, candidates: string[]): string | null` — returns first match from candidate list
  - `findFilesInDir(paths: Set<string>, dirPrefix: string, extension?: string): string[]`
  - **Acceptance:** Unit tests for case-insensitive matching, directory filtering
  - **Verified:** Pure tree-to-set transformations, lowercased case-insensitivity, candidate priority preservation, directory prefixing with slash and case normalization, and extension filtering covered by unit tests (31 tests in `src/lib/scoring/__tests__/utils.test.ts`). `bun run test:run` (139 passed; 1 opt-in live test skipped), `bun run lint`, and `tsc --noEmit --incremental false` pass.
  - **Depends on:** 1.0.6

- [x] **1.2.2 — Implement Documentation checks (25 pts)**
  - In `src/lib/scoring/checks/documentation.ts`
  - `checkReadmePresence(paths)` → 8 pts — checks for `README.md`, `readme.md`, `README`, etc.
  - `checkReadmeHeadings(tree, paths)` → 10 pts — fetches README blob content, parses markdown headings, checks for `Installation`/`Setup` AND `Usage`/`Quickstart` (case-insensitive). **Note:** This is the ONE check that needs file content, not just tree presence. Accept raw README content as a parameter to keep the function pure.
  - `checkArchitectureDescription(tree, paths)` → 4 pts — checks for headings like `Architecture`, `Overview`, `Design`, `How it works` in README
  - `checkContributing(paths)` → 3 pts — checks for `CONTRIBUTING.md`
  - **Acceptance:** Unit tests for each check covering pass/fail scenarios, edge cases (no README, README without headings, etc.)
  - **Verified:** All four documentation checks, individual and aggregated scoring up to 25 pts, Markdown heading parser (ATX, Setext, HTML, code fence stripping), case-insensitive path lookups, actionable remediation objects, and edge cases covered by unit tests (41 tests in `src/lib/scoring/checks/__tests__/documentation.test.ts`). `bun run test:run` (325 passed; 1 opt-in live test skipped), `bun run lint`, and `npx tsc --noEmit` pass.
  - **Depends on:** 1.2.1

- [x] **1.2.3 — Implement Project Hygiene checks (20 pts)**
  - In `src/lib/scoring/checks/hygiene.ts`
  - `checkLicense(paths)` → 10 pts — checks for `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `LICENCE`, `COPYING`
  - `checkGitignore(paths)` → 5 pts — checks for `.gitignore`
  - `checkCodeOfConduct(paths)` → 5 pts — checks for `CODE_OF_CONDUCT.md`
  - **Acceptance:** Unit tests, including edge cases like `licence` (British spelling)
  - **Verified:** Pure hygiene evaluations for license (including British spelling `LICENCE`, `COPYING`, and nested `.github/` variants with required user prompt), root `.gitignore`, and code of conduct (root, `.github/`, and `docs/`) covered by unit tests (23 tests in `src/lib/scoring/checks/__tests__/hygiene.test.ts`). `npm run test:run` (162 passed; 1 opt-in live test skipped), `npm run lint`, and `npx tsc --noEmit` pass.
  - **Depends on:** 1.2.1

- [x] **1.2.4 — Implement Testing & CI checks (25 pts)**
  - In `src/lib/scoring/checks/testing.ts`
  - `checkCIWorkflow(paths)` → 15 pts — checks for any `.yml`/`.yaml` file under `.github/workflows/`
  - `checkTestDirectory(paths)` → 10 pts — checks for `test/`, `tests/`, `__tests__/`, `spec/`, `*_test.go`, `*_test.rs`, `test_*.py`, or `"test"` script in `package.json` (pass manifest content as param)
  - **Acceptance:** Unit tests for various language ecosystems
  - **Verified:** Automated CI workflow detection (15 pts) and testing infrastructure detection (10 pts) for Go, Rust, Python, Ruby, and JS/TS ecosystems covered by 38 unit tests in `src/lib/scoring/checks/__tests__/testing.test.ts`. Verified pure functions, strict typing, 25-point cap, non-execution disclaimers in evidence, and actionable remediation. `npm run test:run` (325 passed; 1 opt-in live test skipped), `npm run lint`, and `npx tsc --noEmit --incremental false` pass.
  - **Depends on:** 1.2.1

- [x] **1.2.5 — Implement Community & Metadata checks (15 pts)**
  - In `src/lib/scoring/checks/community.ts`
  - `checkIssueTemplates(paths)` → 4 pts — checks for files in `.github/ISSUE_TEMPLATE/` or `.github/ISSUE_TEMPLATE.md`
  - `checkPRTemplate(paths)` → 4 pts — checks for `.github/PULL_REQUEST_TEMPLATE.md` or `.github/PULL_REQUEST_TEMPLATE/`
  - `checkRepoMetadata(description, topics)` → 7 pts — checks that description is non-empty (4 pts) and at least 1 topic exists (3 pts)
  - **Acceptance:** Unit tests
  - **Verified:** Issue templates (4 pts), pull request templates (4 pts), and repository metadata (7 pts; 4 pts description + 3 pts topics) implemented with pure functions, strict typing, actionable remediations, and full rubric compliance. Unit tests cover presence, missing indicators, root vs nested paths, empty trees, metadata variations, and determinism (42 tests in `src/lib/scoring/checks/__tests__/community.test.ts`). `npm run test:run` (325 passed; 1 opt-in live test skipped), `npm run lint`, and `npx tsc --noEmit` pass cleanly.
  - **Depends on:** 1.2.1

- [x] **1.2.6 — Implement Security Baseline checks (15 pts)**
  - In `src/lib/scoring/checks/security.ts`
  - `checkSecurityPolicy(paths)` → 10 pts — checks for `SECURITY.md` or `.github/SECURITY.md`
  - `checkDependencyScanning(paths)` → 5 pts — checks for `.github/dependabot.yml`, `.github/dependabot.yaml`, `renovate.json`, `.renovaterc`, `.renovaterc.json`
  - **Acceptance:** Unit tests
  - **Verified:** Security policy (`SECURITY.md`, `.github/SECURITY.md`) and automated dependency scanning (`.github/dependabot.yml`, `.github/dependabot.yaml`, `renovate.json`, `.renovaterc`, `.renovaterc.json`) checks implemented with strict typing, candidate prioritization, case-insensitivity, deep content validation support, deterministic scoring capped at 15 pts, and actionable remediation instructions (automated for security policy, manual for dependency scanning). Covered by 42 unit tests in `src/lib/scoring/checks/__tests__/security.test.ts`. `npm run test:run` (324 passed; 1 opt-in live test skipped), `npm run lint`, and `npx tsc --noEmit` pass.
  - **Depends on:** 1.2.1

- [x] **1.2.7 — Implement `ScoringEngine.run()` orchestrator**
  - In `src/lib/scoring/engine.ts`
  - Accepts `{ paths: Set<string>, readmeContent?: string, manifestContent?: string, description?: string, topics?: string[] }`
  - Runs all check functions, collects `CheckResult[]`
  - Computes `healthScore` as sum of `pointsAwarded`
  - Returns `AuditReport` object
  - **Acceptance:** Unit test with a synthetic tree that scores exactly 100/100, and another that scores 0/100. Verify total never exceeds 100.
  - **Verified:** Pure orchestrator calls documentation (25 pts), project hygiene (20 pts), testing/CI (25 pts), community/metadata (15 pts), and security baseline (15 pts) aggregators once each with supplied data and zero network calls. Preserves all 14 check results, evidence, remediation, IDs, and category order; duplicate IDs and invalid numerical results throw rather than being silently discarded. Sums `pointsAwarded` without rescaling or rounding, with defensive per-check/category caps and [0, 100] bounds. Populates every `AuditReport` field using `RUBRIC_VERSION` and canonical UTC ISO timestamps. Fail-fast validation rejects malformed supplied path sources, optional field types, and timestamps before running checks; category errors propagate unchanged. Covered by 92 orchestrator tests, including 100/100 and 0/100 fixtures, exact rubric allocations, partial credit, all supported input formats, input preservation, source precedence, determinism, and timestamp validation. `bun run test:run src/lib/scoring` passes (309 tests); `bun run test:run` passes (511 tests; 1 opt-in live integration test skipped); `./node_modules/.bin/tsc --noEmit --incremental false` and `bun run lint` pass. Existing Vite configuration compatibility warning remains outside this task's scope.
  - **Depends on:** 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6

- [x] **1.2.8 — Implement README content fetcher**
  - In `src/lib/github/client.ts`
  - `fetchFileContent(owner, repo, sha): Promise<string>` — fetches blob content via `GET /repos/{owner}/{repo}/git/blobs/{sha}` (base64 decode)
  - Used by the audit API to fetch README content for heading analysis (task 1.2.2)
  - **Acceptance:** Unit test with mocked base64 response
  - **Verified:** Implemented `fetchFileContent(owner, repo, sha, token)` via `GET /repos/{owner}/{repo}/git/blobs/{sha}` with base64-to-UTF-8 decoding, multi-byte Unicode/emoji support, wrapped linebreaks, and strict typed error mapping. Implemented `findReadmeEntry(tree)` resolving candidate priority across root, `.github/`, and `docs/` case-insensitively for Git blobs. Implemented `fetchReadmeContent(owner, repo, treeOrSha, token)` and integrated `GitHubService.fetchFileContent` / `GitHubService.getReadmeContent` / `GitHubService.fetchReadmeContent` facade methods. Covered by unit tests in `src/lib/github/__tests__/client.test.ts` (179 passed) and `src/lib/github/__tests__/service.test.ts` (20 passed). Full test suite passes (443 passed, 1 skipped); `npm run lint` and `npx tsc --noEmit` pass with zero errors and zero warnings.

  - **Depends on:** 1.0.6

---

### 1.3 — Audit API Route

- [x] **1.3.1 — Implement `POST /api/audit` route**
  - In `app/api/audit/route.ts` (the active root `app/` directory takes precedence over `src/app/`)
  - Request body: `{ owner: string, repo: string }`
  - Validates input (reject empty, sanitize: strip `github.com/` prefix if pasted as URL)
  - Calls `GitHubService.getRepoData()` → gets tree + metadata
  - Finds README in tree → calls `fetchFileContent()` for heading analysis
  - Calls `ScoringEngine.run()` with tree paths + README content + metadata
  - Returns `AuditReport` JSON (persisted to DB + `shareId` since task 1.5.1; the original no-persistence note above is superseded)
  - Returns proper HTTP error codes: 400 (bad input), 404 (repo not found), 429 (rate limited)
  - **Acceptance:** `curl` against local dev server with a real repo returns valid scored JSON
  - **Verified:** Implemented strict JSON/input validation, GitHub prefix and repository URL normalization with matching-owner validation, fresh tree/metadata fetching, prioritized README discovery, concurrent README/root `package.json` blob fetching, and real scoring with no database persistence. Returns safe JSON errors for invalid input (400), missing resources (404), rate limits with available `Retry-After` timing (429), incomplete trees/other GitHub failures (502), and unexpected internal failures (500). All 79 route tests pass; `bun run test:run` passes (623 tests, 1 opt-in live test skipped); `./node_modules/.bin/tsc --noEmit --incremental false` and `bun run lint` pass. `curl` against the local dev server audits `octocat/Hello-World` successfully (HTTP 200, default branch `master`, 12/100, 14 checks with valid evidence/timestamp and matching score sum); owner mismatch returns HTTP 400. Root `package.json` lookup is case-insensitive in both the route and `auditRepository`. `bun run build -- --webpack` passes and includes `/api/audit`; default `bun run build` fails with a Turbopack CSS-processing port-permission panic in this sandbox, including on retry with elevated permissions.
  - **Depends on:** 1.1.3, 1.2.7, 1.2.8

- [x] **1.3.2 — Add URL parsing utility**
  - In `src/lib/utils.ts`
  - `parseGitHubUrl(input: string): { owner: string, repo: string } | null`
  - Handles: `owner/repo`, `github.com/owner/repo`, `https://github.com/owner/repo`, `https://github.com/owner/repo/tree/main`, trailing slashes
  - **Acceptance:** Unit tests covering all formats above, plus invalid inputs
  - **Verified:** Implemented `parseGitHubUrl` and `ParsedGitHubUrl` in `src/lib/utils.ts` and re-exported via root `lib/utils.ts` and `src/lib/types.ts`. Handles shorthand `owner/repo`, domain-prefixed URLs, HTTP/HTTPS schemes, deep links (`tree`, `blob`, `issues`, `pulls`), SSH/Git protocols (`git@github.com:`, `ssh://`, `git://`), `.git` suffixes, query parameters, hash fragments, whitespace trimming, and invalid/non-GitHub inputs. Covered by 33 unit tests in `src/lib/__tests__/utils.test.ts`. Full test suite passes (544 passed, 1 skipped); `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass with zero errors.
  - **Depends on:** 1.0.6

---

### 1.4 — Badge Endpoint

- [ ] **1.4.1 — Implement `GET /api/badge/[owner]/[repo]` route**
  - In `app/api/badge/[owner]/[repo]/route.ts` (the active root `app/` directory takes precedence over `src/app/`)
  - Runs audit (or reads from cache — simplified: run fresh audit for MVP)
  - Returns `BadgeResponse` JSON with correct `schemaVersion: 1`
  - Sets `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
  - Color logic per thresholds in `idea.md`
  - **Acceptance:** `curl` returns valid shields.io JSON; passing URL to `https://img.shields.io/endpoint?url=...` renders a badge
  - **Verified locally:** Preserved the fresh-audit endpoint with asynchronous Next.js route parameters, Shields.io JSON, the five color thresholds, and the exact success caching header. Malformed URI encoding now returns safe 400 badge JSON without invoking the audit; all error responses explicitly use `Cache-Control: no-store`. Added coverage for invalid/missing coordinates, encoded traversal/separators, exact success contracts and threshold boundaries, safe errors, and Retry-After precedence/reset/invalid timing. `bun run test:run app/api/badge/__tests__/route.test.ts src/lib/__tests__/badge.test.ts src/lib/__tests__/audit.test.ts` passes (87 tests); `bun run test:run` passes (732 tests, 1 opt-in live integration test skipped); `bun run lint` and `./node_modules/.bin/tsc --noEmit --incremental false` pass. `bun run build` encounters the previously documented Turbopack CSS-processing port-permission panic in this sandbox; `bun run build -- --webpack` passes and includes the dynamic badge route. Local curl against the production server for `octocat/Hello-World` returns HTTP 200 with `schemaVersion: 1`, label `repo health`, message `12/100`, color `red`, JSON content type, and the exact success cache header. Malformed encoded input returns HTTP 400 with safe error badge JSON and `Cache-Control: no-store`.
  - **Pending acceptance:** Public Shields.io rendering remains unverified and is deferred to deployment task 1.7.4 by agreement. Leave this task unchecked until the deployed endpoint renders through `https://img.shields.io/endpoint?url=...`.
  - **Depends on:** 1.3.1

---

### 1.5 — Database Persistence & Caching

- [x] **1.5.1 — Add report persistence to audit route**
  - After scoring, save/upsert `RepoReport` in database
  - Generate `shareId` via `nanoid(8)`
  - Store `breakdown` as JSON, store `etag` for conditional caching
  - On re-audit of the same `owner/repo`: send cached ETag → on `304`, return cached report
  - **Acceptance:** Two successive audits of the same repo: first hits GitHub API, second returns `304` cached result. Both return the same `shareId`.
  - **Verified (2026-10-13):** Revalidated the existing persistence implementation without replacement code or database changes. Case-normalized compound repository uniqueness and atomic Prisma upserts store full report JSON/ETags with eight-character `nanoid` share IDs, bounded uniqueness retries, and preservation of share IDs and user associations. The audit route revalidates usable current-rubric snapshots with `If-None-Match`; GitHub `304` returns HTTP 200 with the identical saved report and skips blob fetching, scoring, and writes. Missing ETags and invalid/outdated snapshots refresh without conditional headers; database failures return safe 500 errors. `bun run test:run app/api/audit/__tests__/route.test.ts src/lib/__tests__/reports.integration.test.ts` passes (101 tests), covering successive audits, real JSON round trips, concurrent creation, share-ID collisions, and failure paths. `bun run test:run` passes (732 tests, 1 opt-in live test skipped); `./node_modules/.bin/tsc --noEmit --incremental false` and `bun run lint` pass. `bun run build` reproduces the sandbox port-permission panic during Turbopack CSS processing; `bun run build -- --webpack` passes and includes the dynamic `/api/audit` route. Final diff review found no task-specific defects or whitespace errors. The report lookup endpoint remains task 1.5.2.
  - **Depends on:** 1.0.3, 1.3.1

- [x] **1.5.2 — Implement `GET /api/report/[shareId]` route**
  - In `app/api/report/[shareId]/route.ts` (the active root `app/` directory takes precedence over `src/app/`)
  - Looks up `RepoReport` by `shareId`
  - Returns full report JSON (or 404)
  - **Acceptance:** After an audit, the returned `shareId` can be used to fetch the same report
  - **Verified (2026-10-13):** Added a share-ID lookup using Prisma's unique index and the existing public report decoder, plus a GET handler with asynchronous Next.js route parameters. Returns the complete persisted audit JSON unchanged (including evidence, remediation, original timestamp, and share ID), JSON 404 for absent/malformed IDs, and safe JSON 500 for database failures or invalid stored reports. All responses use `Cache-Control: no-store`; lookup performs no GitHub requests, scoring, or writes and excludes database IDs, user associations, and ETags. Valid older-rubric snapshots and reports without ETags remain readable. Added 20 route/SQLite integration tests, including POST audit → GET identical report, case-sensitive IDs, malformed IDs without database queries, and error paths. `bun run test:run` passes (752 tests; 1 opt-in live GitHub integration test skipped); `./node_modules/.bin/tsc --noEmit --incremental false`, `bun run lint`, and `git diff --check` pass. `bun run build` reproduces the existing sandbox port-permission panic during Turbopack CSS processing; `bun run build -- --webpack` passes and registers the dynamic `/api/report/[shareId]` route.
  - **Depends on:** 1.5.1

---

### 1.6 — Report UI

- [x] **1.6.1 — Build URL input component**
  - In `src/components/report/url-input.tsx` (re-exports from root `components/report/url-input.tsx` for cross-alias compatibility)
  - Text input with "Audit" button
  - Uses `parseGitHubUrl` for validation
  - Shows inline validation error for invalid URLs
  - Triggers audit API call, shows loading spinner
  - **Acceptance:** Component renders, validates input, calls API on submit
  - **Verified (2026-10-13):** Implemented `UrlInput` with client-side validation via `parseGitHubUrl`, clear-on-change inline error presentation with `role="alert"` and `aria-invalid`/`aria-describedby`, accessible button with built-in loading spinner, and `POST /api/audit` submission handling. Supports optional `redirectToReport` (navigates to `/report/[owner]/[repo]`), `onAuditSuccess` and `onAuditError` callbacks, custom fetcher, and custom router injection. Covered by 15 unit/component tests in `components/report/__tests__/url-input.test.tsx`. Full test suite passes (771 passed, 1 opt-in live test skipped); `npx tsc --noEmit --incremental false`, `bun run lint`, and `bun run build -- --webpack` pass cleanly.
  - **Depends on:** 1.0.2, 1.3.2

- [x] **1.6.2 — Build score gauge component**
  - In `src/components/report/score-gauge.tsx` (re-exports from root `components/report/score-gauge.tsx` for cross-alias compatibility)
  - Circular or radial gauge displaying `healthScore / 100`
  - Color matches badge color thresholds
  - Animated on mount
  - **Acceptance:** Renders correct score and color for various values (0, 45, 62, 78, 95)
  - **Verified (2026-10-13):** Built `ScoreGauge` SVG circular progress gauge in `components/report/score-gauge.tsx` and re-exported via `src/components/report/score-gauge.tsx` and report package indices. Features responsive diameter sizing (`sm`: 80px, `md`: 128px, `lg`: 176px, custom numeric size), dynamic stroke width, full Shields.io threshold color mapping (`brightgreen`: `#10b981`, `green`: `#22c55e`, `yellow`: `#eab308`, `orange`: `#f97316`, `red`: `#ef4444`), on-mount progress animation with `motion/react` honoring `prefers-reduced-motion`, ARIA accessibility (`role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`), defensive input normalization (`Math.max(0, Math.min(100, Math.round(score)))` handling negative numbers, numbers > 100, decimals, and NaN), interchangeable `healthScore`/`score` props, and optional status descriptor and max-score toggles. Covered by 38 unit tests in `components/report/__tests__/score-gauge.test.tsx` verifying exact colors, strokes, and text for values 0, 45, 62, 78, 95, all threshold boundaries (0, 39, 40, 59, 60, 74, 75, 89, 90, 99, 100), edge-case normalization, sizes, geometry, and re-export integrity. Full test suite passes (809 passed, 1 opt-in live test skipped); `npx tsc --noEmit`, `bun run lint`, and `bun run build -- --webpack` pass cleanly.
  - **Depends on:** 1.0.2

- [x] **1.6.3 — Build category breakdown component**
  - In `src/components/report/category-breakdown.tsx` (re-exports from root `components/report/category-breakdown.tsx` for cross-alias compatibility)
  - Tab or accordion layout with 5 categories
  - Each category shows: category score (e.g., "18/25"), list of individual checks
  - Each check shows: pass/fail icon, name, points, evidence details (collapsible)
  - **Acceptance:** Renders correctly with mock `AuditReport` data
  - **Verified (2026-10-13):** Implemented `CategoryBreakdown` with typed `report` and optional `className` props, exported through both report barrels. Uses existing accordion/collapsible primitives and `calculateCategoryScores` for five rubric categories, Documentation initially expanded, multiple open categories, preserved check order and fractional partial credit, explicit pass/fail icons and text, and independently collapsible evidence details, found status, and file paths. Handles empty categories and evidence, escapes report text, uses responsive wrapping, accessible labels and panel associations, and reduced-motion styles. All 20 new component tests pass; `bun run test:run` passes (829 passed, 1 opt-in live test skipped); `./node_modules/.bin/tsc --noEmit --incremental false`, `bun run lint`, and `bun run build -- --webpack` pass. Existing Vite configuration compatibility warning remains outside this task's scope. Report-page integration remains task 1.6.5.
  - **Depends on:** 1.0.2

- [x] **1.6.4 — Build badge embed snippet component**
  - In `src/components/report/badge-snippet.tsx` (re-exports from root `components/report/badge-snippet.tsx` for cross-alias compatibility)
  - Shows the markdown snippet for embedding the shields.io badge
  - Copy-to-clipboard button
  - Preview of what the badge looks like
  - **Acceptance:** Snippet is correct markdown, copy button works
  - **Verified (2026-10-14):** Revalidated and refined the existing `BadgeSnippet` without changing its root/src exports or starting report-page integration. Shows the exact documented Markdown embed, optional HTML and image URL formats, and a local audit-score preview using the endpoint label and existing threshold palette; missing/non-finite scores display a neutral unavailable state. Added a README-focused responsive layout, shared keyboard-accessible tabs with unique panel associations, visible focus, reduced-motion support, and stronger dark-mode text contrast. Copy waits for clipboard completion, prevents duplicate writes, announces success, resets feedback by snippet, and provides manual-copy recovery on failure; the legacy fallback restores focus/selection and always removes its temporary textarea. Hardened HTTP(S) base URLs, dot segments, nested endpoint URL encoding, Markdown delimiters, and HTML attribute escaping. All 71 badge tests pass. `bun run test:run` passes (900 tests, 1 opt-in live GitHub test skipped); `bun run lint`, `./node_modules/.bin/tsc --noEmit --incremental false`, Prettier checks for the changed component/tests, and `bun run build` pass. The configured Turbopack build required execution outside the sandbox; its first run encountered stale development-generated validators after deleting the temporary preview route, resolved by removing those generated route-type cache files. Chromium verified correct clipboard contents, format switching by keyboard, independent instances, failure recovery, no page errors, and layout containment at 320/375/768/1200px; screenshots were reviewed in light and dark modes. The temporary preview route was removed. Report-page integration remains task 1.6.5.
  - **Depends on:** 1.0.2

- [x] **1.6.5 — Build main report page**
  - In `app/page.tsx` via the existing landing hero (landing + audit input)
  - In `app/report/[owner]/[repo]/page.tsx` (report view; active root App Router)
  - Landing: hero text, URL input component
  - Report page: score gauge, category breakdown, badge snippet, share link, "Re-audit" button
  - Responsive layout (mobile-friendly)
  - **Acceptance:** Full user flow works: paste URL → see report → copy badge
  - **Verified (2026-10-14):** Connected the existing landing hero to real audits with a visible associated label, responsive controls, and shared validated API requests. Added a server-loaded report route and reusable responsive view composing the score, category evidence, and badge snippet; saved reports load without GitHub requests regardless of ETag/rubric age, while missing reports audit once on the client. Added re-audit with cancellation and duplicate protection, previous-report preservation on failure, original audit metadata, deployment-origin report/badge copying with announced feedback and manual recovery, and safe loading/error/not-found states. Fixed narrow hero containment and reduced-motion gauge hydration. Added 37 tests covering request validation, landing integration, report rendering/refresh/cancellation, route errors, and repository persistence lookup. `bun run test:run` passes (937 tests; 1 opt-in live integration test skipped); `./node_modules/.bin/tsc --noEmit --incremental false`, `bun run lint`, Prettier checks for new/updated UI modules, `git diff --check`, and `bun run build` pass. Chromium completed a real `octocat/Hello-World` audit → report → badge copy, successful re-audit, rate-limit recovery, clipboard failure recovery, keyboard tabs, invalid coordinates, reduced-motion rendering without report hydration errors, and layout containment at 320/375/768/1440px including long names; screenshots reviewed. Browser verification used an isolated temporary SQLite database. Share copies the working report URL; read-only `/share/[shareId]` remains task 1.6.6. Existing unrelated workspace changes were preserved.
  - **Depends on:** 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.3.1

- [x] **1.6.6 — Build shareable report page**
  - In `app/share/[shareId]/page.tsx` (the active root `app/` directory takes precedence over `src/app/`)
  - Fetches report from database via `findReportByShareId` on the server and supports `/api/report/[shareId]` on the client
  - Renders same report UI as 1.6.5 but read-only (no re-audit button)
  - **Acceptance:** Share link from audit page opens working read-only report
  - **Verified (2026-10-14):** Created `app/share/layout.tsx` composing `ReportShell`, and `app/share/[shareId]/page.tsx` resolving persisted reports with strict share ID format validation (`/^[A-Za-z0-9_-]{8}$/`). Added `app/share/[shareId]/loading.tsx` providing Partial Prerendering Suspense boundaries, plus accessible `not-found.tsx` and `error.tsx` boundaries. Built `ShareController` rendering the score gauge, category breakdown, and badge snippet in read-only mode with a shared snapshot pill, "Copy share link" button with live feedback and manual clipboard fallback, and "View live report" navigation; strictly excludes the Re-audit button. Added `buildShareUrl` helper in `badge-snippet.tsx` and connected `ReportController` to render a direct Share link pointing to `/share/${report.shareId}`. Added 42 tests across `app/share/[shareId]/__tests__/page.test.tsx`, `components/report/__tests__/share-controller.test.tsx`, `components/report/__tests__/share-flow.integration.test.tsx`, `src/lib/__tests__/report-validation.test.ts`, and updated `report-controller.test.tsx` and `badge-snippet.test.tsx`. Full test suite passes (979 tests passed; 1 opt-in live test skipped); `./node_modules/.bin/tsc --noEmit --incremental false`, `bun run lint`, `git diff --check`, and `bun run build -- --webpack` pass cleanly.
  - **Depends on:** 1.6.5, 1.5.2

---

### 1.7 — Phase 1 Polish & Deploy

- [x] **1.7.1 — Add error handling and loading states**
  - Loading skeletons for report page
  - Error boundary for API failures
  - Friendly error messages for: repo not found, rate limited, network error
  - **Acceptance:** All error states render gracefully, no unhandled promise rejections
  - **Verified (2026-10-14):** Created high-fidelity loading skeletons in `ReportPending` mirroring the 3-column `ReportView` grid (category rows, radial gauge, badge snippet tabs, and header pills) with `motion-safe:animate-pulse` respecting reduced-motion and `role="status"` / `aria-busy="true"`. Built `ReportErrorCard` and `classifyReportError` in `report-error-card.tsx` with specialized friendly explanations for rate limits (429), repository not found / inaccessible (404), network offline/timeouts, and server failures, equipped with retry buttons and direct navigation to audit another repository. Upgraded `ReportController`, `ShareController`, `app/report/[owner]/[repo]/error.tsx`, and `app/share/[shareId]/error.tsx` to handle route and client errors without unhandled rejections. Added 10 tests across `report-error-card.test.tsx` and `report-pending.test.tsx`, and re-verified all controller error tests. Full test suite passes (989 passed, 1 opt-in live test skipped); `./node_modules/.bin/tsc --noEmit --incremental false`, `bun run lint`, `git diff --check`, and `bun run build -- --webpack` pass cleanly.
  - **Depends on:** 1.6.5

- [ ] **1.7.2 — Add basic SEO and metadata**
  - Open Graph tags for share links
  - Dynamic `<title>` on report pages: "Repodoc — {owner}/{repo} Health Report"
  - Favicon
  - **Acceptance:** Sharing a report URL on Twitter/Slack shows preview card
  - **Implemented and locally verified (2026-10-14):** Added a typed report metadata helper and server-generated metadata on live and shared report routes: exact absolute repository titles, repository descriptions, route-specific canonical/Open Graph URLs, and explicit Open Graph/Twitter large-image metadata reusing the existing 1200×630 branded PNG and branded favicon assets. Live metadata requires no database or network calls; shared metadata and page rendering share a request-memoized persisted-report lookup, preserving invalid/missing-share and database-error behavior. Documented `NEXT_PUBLIC_SITE_URL` in `.env.example`. Added 16 metadata tests; `bun run test:run` passes (1005 tests; 1 opt-in live test skipped), TypeScript, lint, changed-module Prettier checks, and `git diff --check` pass. `bun run build` failed because the environment denies Turbopack CSS worker port binding, including on an escalated retry; `bun run build -- --webpack` passes. Production-server checks with an isolated temporary SQLite database verified both report routes' metadata in the initial HTML head for Twitterbot and Slackbot, invalid/missing routes' noindex metadata, the shared 1200×630 PNG response (39,296 bytes), both favicon responses, and preserved homepage metadata; the social image was visually reviewed.
  - **Pending:** Actual Twitter/Slack preview cards require a publicly accessible deployment. Task remains unchecked until that acceptance criterion is verified; deployment remains task 1.7.4.
  - **Depends on:** 1.6.5

- [x] **1.7.3 — Write README.md**
  - Project description, local dev setup instructions, env vars, architecture overview
  - **Acceptance:** A developer can clone and run locally by following the README
  - **Verified (2026-10-14):** Created comprehensive production-grade [README.md](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/README.md) including executive overview, key architectural pillars (single-roundtrip tree traversal, ETag caching and 304 resiliency, AST/heading structural parsing, Shields.io endpoint integration, shareable snapshots), complete Mermaid architecture/sequence diagram, annotated repository directory map, full 100-point Scoring Rubric v1.0 table across all 5 dimensions, Shields.io badge API specification and Markdown/HTML embed snippets with threshold palette, comprehensive environment variables table with defaults and descriptions, step-by-step local clone & boot instructions for Bun/npm/pnpm, Prisma SQLite database setup (`npx prisma db push`), development workflows/command reference, production deployment guidelines for Vercel + PostgreSQL (Neon/Supabase), and Phase 2 roadmap preview. Validated against Repodoc's own Rubric engine (`checkReadmePresence`, `checkReadmeHeadings`, and `checkArchitectureDescription` all pass with full points). Standard [LICENSE](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/LICENSE) (MIT) added. All 989 automated tests pass with 0 failures; `npm run lint`, `npx tsc --noEmit`, `git diff --check`, and `npm run build` pass cleanly.
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
  - Create `app/api/auth/[...nextauth]/route.ts` (the active App Router is at the repository root)
  - On sign-in: upsert `User` record in database with `githubId`, `username`, `avatarUrl`
  - Store GitHub access token in encrypted session JWT claims, accessible only through server code (needed for Git Data API calls on user's behalf)
  - **Acceptance:** User can sign in with GitHub, session persists, user record created in DB
  - **Implemented and automatically verified (2026-10-17):** Pinned NextAuth v5.0.0-beta.32; added lazy GitHub OAuth configuration with support for both `NEXTAUTH_*` and standard Auth.js v5 `AUTH_*` aliases (`AUTH_SECRET`, `AUTH_URL`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`), built-in auth routes/pages, Prisma user upserts, typed public sessions, and the server-only `getGitHubSession()` helper (which gracefully returns `null` when unconfigured). Requests `read:user user:email public_repo workflow`; enables PKCE/state, 30-day encrypted cookies, HTTPS Secure cookies in production, provider expiry handling, sanitized errors, and credential-free browser sessions. All 74 auth tests pass, including mocked OAuth callbacks against temporary SQLite, persistence, profile changes preserving associations, private email, CSRF/state rejection, sign-out, provider expiry, and environment alias resolution. Live dev server verified on port 3000: `GET /api/auth/providers` advertises GitHub, `GET /api/auth/csrf` issues tokens, and `POST /api/auth/signin/github` returns 302 to GitHub with registered OAuth Client ID (`Iv23li...`), PKCE, and state. Full suite: `bun run test:run` passes (1348 passed, 1 opt-in live test skipped). TypeScript (`--noEmit --incremental false`), `bun run lint` (0 errors, 3 existing UI warnings), and `bun run build -- --webpack` pass cleanly.
  - **Pending:** Complete live interactive browser consent and sign-in with a personal GitHub account. The automated flow and live OAuth endpoint redirection are verified; task checkbox remains unchecked until interactive browser session acceptance is completed by the user. Header/avatar controls remain task 2.0.2.
  - **Depends on:** 1.0.3

- [ ] **2.0.2 — Add auth UI (sign-in/out, avatar)**
  - Header component with sign-in button (when logged out) / avatar + dropdown (when logged in)
  - Protect "Fix with PR" button behind auth gate
  - **Acceptance:** Sign in/out works, "Fix All" button appears only when authenticated
  - **Agreed scope:** Show a disabled Fix All entry point only on live reports for authenticated users with failing automatable findings, with the explanation "Pull request creation is not available yet." Implementing the enabled PR workflow remains task 2.3.3 and its dependencies. Shared snapshots stay read-only, and score previews remain public.
  - **Implemented and automatically verified (2026-10-17):** Added client `AuthProvider` (`SessionProvider`) in `app/layout.tsx` keeping static landing pages prerenderable, responsive header `AuthControls` mounted in landing navigation and report shell, user avatar with uppercase initials fallback, account menu dropdown with username and sign-out, pending state and accessible error alerts, current-page return destinations, theme-scoped menu positioning, reusable `AuthGate`, and disabled `FixButton` gated behind authentication. Added 29 UI/session integration tests covering state transitions, focus/cross-tab synchronization, keyboard navigation (Escape/focus restoration), avatar error fallback, sanitized error messages, repeat submission prevention, and the fix visibility matrix. Full test suite: `bun run test:run` passes (1348 passed, 1 opt-in live test skipped); TypeScript (`--noEmit --incremental false`), `bun run lint` (0 errors), and `bun run build -- --webpack` pass cleanly.
  - **Pending live acceptance:** The header controls redirect to GitHub's authorization page as verified on port 3000. Interactive manual sign-in in a physical browser with a live GitHub user account is required to verify the visual avatar and post-login UI transition on a live display. This task remains unchecked until live human interaction is completed.
  - **Depends on:** 2.0.1

---

### 2.1 — Remediation Templates

- [x] **2.1.1 — Create license templates**
  - In `src/lib/templates/licenses/`
  - Bundle SPDX-correct template text for: MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0
  - Each template has `{{year}}` and `{{fullname}}` placeholders
  - Utility: `renderLicense(spdxId, year, fullName): string`
  - **Acceptance:** Unit test — rendered MIT license contains correct year and name
  - **Verified & Audited (2026-10-17):** Bundled five complete SPDX texts pinned to license-list-data v3.27.0 with verified SHA-256 integrity digests and a pure, synchronous `renderLicense` utility. Supports `GPL-3.0` as an alias for `GPL-3.0-only`, validates attribution inputs, and substitutes tokens literally in one pass. Exported canonical `LICENSE_TARGET_PATH = "LICENSE"`, re-exported individual templates, and added root-alias shim `lib/templates/licenses.ts`. All 53 license unit tests pass.
  - **Depends on:** 1.0.6

- [x] **2.1.2 — Create .gitignore templates**
  - In `src/lib/templates/gitignore/`
  - Detect language from manifest files in tree: `package.json` → Node, `Cargo.toml` → Rust, `go.mod` → Go, `setup.py`/`pyproject.toml` → Python, etc.
  - Bundle standard `.gitignore` content for each language (from github/gitignore repo)
  - Fallback: generic `.gitignore` if no manifest detected
  - **Acceptance:** Unit test — Node project gets `node_modules/` in gitignore
  - **Verified & Audited (2026-10-17):** Added pure `detectLanguages(paths)` and `renderGitignore(paths)` utilities with exact manifest-basename detection at any depth, deterministic Node/Rust/Go/Python composition, and a generic fallback. Bundled complete github/gitignore presets pinned to commit `361f1e6afa729dc58ec33bf0849772a03ddf6822` under CC0-1.0. Fixed case-insensitivity on raw un-lowercased Sets (`path.slice(...).toLowerCase()`), broadened input support to `Set<string> | readonly TreeEntry[] | RepoTree`, exported `GITIGNORE_TARGET_PATH = ".gitignore"`, and created root-alias shim `lib/templates/gitignore.ts`. All 41 gitignore unit tests pass, including real Git matching and mixed nested projects.
  - **Depends on:** 1.0.6, 1.2.1

- [x] **2.1.3 — Create CI workflow template**
  - In `src/lib/templates/ci/`
  - Generate minimal `.github/workflows/ci.yml` based on detected language
  - Node: `actions/setup-node` + `npm test`
  - Python: `actions/setup-python` + `pytest`
  - Go: `actions/setup-go` + `go test ./...`
  - Rust: `actions-rs/toolchain` + `cargo test`
  - Fallback: basic checkout-only workflow
  - **Acceptance:** Unit test — generated YAML is valid, uses correct actions for detected language
  - **Verified & Audited (2026-10-17):** Implemented pure `detectLanguage(paths)`, `renderCIWorkflow(language, options)`, and `generateCIWorkflow(paths, options)` targeting `.github/workflows/ci.yml`. Fixed critical YAML syntax bug where unquoted workflow names with colons (e.g. `"CI: Build & Test"`) broke `yaml.parse`, fixed regex character class escaping in `formatYamlScalar`, safely serialized branch names with `JSON.stringify`, and added injection protection against newlines in options. All 32 CI tests pass with 100% valid YAML across Node, Python, Go, Rust, and Generic workflows.
  - **Depends on:** 1.0.6, 1.2.1

- [x] **2.1.4 — Create SECURITY.md template**
  - In `src/lib/templates/security/`
  - Standard vulnerability reporting template with placeholder sections
  - **Acceptance:** Template renders without placeholders in output
  - **Verified & Audited (2026-10-17):** Implemented pure, synchronous `renderSecurityPolicy(options)` generator and `SecurityPolicyOptions` supporting custom project names, contact methods (email `mailto:`, advisory URLs), customizable supported versions table, response SLA windows, and optional additional info. Guarantees zero unrendered placeholders in output and normalizes to LF line endings. Exported `SECURITY_POLICY_TARGET_PATH = "SECURITY.md"` and `SECURITY_POLICY_TEMPLATE`, created root-alias shim `lib/templates/security.ts`, and verified compatibility with Rubric v1.0 `checkSecurityPolicy` (10/10 points). All 19 security policy unit tests pass.
  - **Depends on:** 1.0.6

- [x] **2.1.5 — Create CODE_OF_CONDUCT.md template**
  - In `src/lib/templates/conduct/`
  - Contributor Covenant v2.1 (standard, widely adopted)
  - **Acceptance:** Template matches Contributor Covenant text
  - **Verified & Audited (2026-10-17):** Implemented pure, synchronous `renderCodeOfConduct(options?)` generator bundling the verbatim canonical Contributor Covenant v2.1 text pinned to EthicalSource/contributor_covenant commit `7255a28d23d5bc296de2e4e4e9bb5ee1126f1345` with verified SHA-256 digest `369bf7301883368fc19203bd0f1233fed2b83f0378ad19c4d0708bf61925339b`. Supports explicit contact method substitution with single-pass safe replacement and strict validation against multiline or blank inputs. Exported `CODE_OF_CONDUCT_TARGET_PATH = "CODE_OF_CONDUCT.md"` and verified root-alias shim `lib/templates/conduct.ts`. All 31 conduct unit tests pass. Added unified barrel export `src/lib/templates/index.ts` and `lib/templates/index.ts` with 4 integration tests (180 total template tests pass; full suite passes 1362 tests, 1 skipped). TypeScript (`tsc --noEmit`), ESLint (`bun run lint`), and production build (`bun run build -- --webpack`) pass cleanly with 0 errors.
  - **Depends on:** 1.0.6

---

### 2.2 — Remediation Engine (Git Data API)

- [x] **2.2.1 — Implement `createBlob(owner, repo, content, token)`**
  - In `src/lib/remediation/git-api.ts`
  - `POST /repos/{owner}/{repo}/git/blobs` with base64-encoded content
  - Returns blob SHA
  - **Acceptance:** Unit test with mocked API
  - **Verified (2026-10-17):** Added server-only `createBlob(owner, repo, content, token): Promise<string>` using shared Octokit configuration, path validation, and typed error normalization. Requires an explicit nonempty caller token (no environment fallback), preserves UTF-8 text including empty content through base64 encoding, and validates the returned SHA. All 44 mocked API tests pass, covering payload/headers, Unicode, invalid input and responses, sanitized HTTP/network errors, and bounded rate-limit retries with timing metadata. `bun run test:run src/lib/remediation src/lib/github` passes (244 tests; 1 opt-in live test skipped); `bun run test:run` passes (1406 tests; 1 skipped); `tsc --noEmit --incremental false` and `bun run build -- --webpack` pass. `bun run lint` passes with 3 existing warnings in unrelated UI files. No live GitHub objects were created.
  - **Depends on:** 1.0.6

- [x] **2.2.2 — Implement `createTree(owner, repo, baseTreeSha, blobs, token)`**
  - Creates new tree with multiple blob entries
  - `POST /repos/{owner}/{repo}/git/trees` with `base_tree` set
  - **Acceptance:** Unit test with mocked API
  - **Verified (2026-10-17):** Added server-only `createTree(owner, repo, baseTreeSha, blobs, token): Promise<string>` and exported `TreeBlob` (`path`, `sha`) in `src/lib/remediation/git-api.ts`. Preserves the required base tree, maps existing blobs to regular-file entries (`100644`, `blob`), requires an explicit caller token, validates inputs and returned SHA, rejects duplicate/invalid relative paths, and reuses sanitized errors and bounded retries. Added 75 mocked API tests covering payload/headers, Unicode and immutable inputs, extra-property filtering, malformed inputs/responses, HTTP/network errors, retry limits/metadata, and `createBlob` → `createTree` composition. `bun run test:run src/lib/remediation src/lib/github` passes (319 tests; 1 opt-in live test skipped); `bun run test:run` passes (1481 tests; 1 skipped); `./node_modules/.bin/tsc --noEmit --incremental false` passes when rerun after the build (the overlapping initial check encountered regenerating `.next` types); `bun run build -- --webpack` passes; `bun run lint` passes with 3 existing UI warnings. No live GitHub objects were created. Existing-file checks remain the responsibility of task 2.2.6.
  - **Depends on:** 2.2.1

- [x] **2.2.3 — Implement `createCommit(owner, repo, treeSha, parentSha, message, token)`**
  - `POST /repos/{owner}/{repo}/git/commits`
  - Commit message: `chore(repodoc): resolve repository health audit findings`
  - **Acceptance:** Unit test with mocked API
  - **Verified (2026-10-17):** Added server-only `createCommit(owner, repo, treeSha, parentSha, message, token): Promise<string>` using shared Octokit configuration, input validation, sanitized errors, and bounded rate-limit retries. Posts the supplied message verbatim with the tree SHA and exactly one parent, requires an explicit caller token, validates the returned commit SHA, and leaves author/committer attribution to GitHub. Added 59 mocked API tests covering the specified remediation message, custom/multiline/Unicode messages, payload/headers, invalid inputs/responses, HTTP/network errors, retry bounds/metadata, and `createBlob` → `createTree` → `createCommit` composition. `bun run test:run src/lib/remediation src/lib/github` passes (378 tests; 1 opt-in live test skipped); `bun run test:run` passes (1540 tests; 1 skipped); `bun run lint` passes with 3 existing UI warnings; `bun run build -- --webpack`, post-build `./node_modules/.bin/tsc --noEmit --incremental false`, and `git diff --check` pass. No live GitHub objects were created. Branch updates and PR creation remain subsequent tasks.
  - **Depends on:** 2.2.2

- [x] **2.2.4 — Implement `createOrUpdateBranch(owner, repo, sha, token)`**
  - Attempts `POST /git/refs` to create `refs/heads/repodoc/health-remediation`
  - On 422 (already exists): `PATCH /git/refs/heads/repodoc/health-remediation` to update
  - Idempotent — safe to call repeatedly
  - **Acceptance:** Unit test covering create + update paths
  - **Verified (2026-10-17):** Added server-only `createOrUpdateBranch(owner, repo, sha, token): Promise<void>` using `REPODOC_BRANCH`, shared input validation, explicit caller authentication, sanitized errors, and bounded rate-limit retries. Creates the fixed branch first, falls back on HTTP 422 to a forced update of only `repodoc/health-remediation`, and validates the returned reference and commit SHA. Forced updates intentionally replace divergent history on this generated branch. Added 83 mocked API tests covering create/update payloads and headers, repeated calls, SHA replacement, URL encoding, invalid inputs/responses, HTTP/network failures at both stages, retry limits/metadata, and blob → tree → commit → branch composition. `bun run test:run src/lib/remediation src/lib/github` passes (461 tests; 1 opt-in live test skipped); `bun run test:run` passes (1623 tests; 1 skipped); `bun run lint` passes with 3 existing UI warnings; `bun run build -- --webpack`, post-build `./node_modules/.bin/tsc --noEmit --incremental false`, changed-file ESLint, and `git diff --check` pass. The repeated-call test also passes separately with a timeout allowing for real Octokit throttling. Existing Vite configuration compatibility warning remains unchanged. No live GitHub objects were created.
  - **Depends on:** 2.2.3

- [x] **2.2.5 — Implement `openPullRequest(owner, repo, head, base, token)`**
  - `POST /repos/{owner}/{repo}/pulls`
  - Title: `chore(repodoc): resolve repository health audit findings`
  - Body: markdown summary of what was fixed (list of files added)
  - Handles 422 (PR already exists) — returns existing PR URL
  - **Acceptance:** Unit test covering create + already-exists paths
  - **Verified (2026-10-17):** Added server-only `openPullRequest(owner, repo, head, base, token): Promise<string>` using explicit caller authentication, shared Octokit configuration, sanitized errors, and bounded retries. Compares branches to derive a sorted, Markdown-safe added-file summary, creates a PR with the specified title, and validates its HTTPS GitHub PR URL. Rejects comparisons at the 300-file limit to avoid incomplete summaries. On create-stage 422, paginates open PRs filtered by head/base and returns only a matching PR (owner casing ignored, branch casing preserved); otherwise retains the original error. Supports qualified fork heads without provisioning forks and preserves existing PR descriptions. Added 114 mocked API tests covering creation, existing-PR recovery, pagination, malformed inputs/responses, URL safety, rate-limit metadata/retries, and blob → tree → commit → branch → PR composition. `bun run test:run --maxWorkers=1 --reporter=verbose` passes (1737 tests; 1 opt-in live GitHub test skipped); `bun run build -- --webpack`, post-build `./node_modules/.bin/tsc --noEmit --incremental false`, changed-file ESLint, and `git diff --check` pass. `bun run lint` passes with 3 existing UI warnings. Multi-worker test invocations remained silent and were interrupted; single-worker validation completed successfully. Existing Vite configuration compatibility warning remains unchanged. No live GitHub objects were created.
  - **Depends on:** 2.2.4

- [x] **2.2.6 — Implement `RemediationEngine.execute()` orchestrator**
  - In `src/lib/remediation/engine.ts`
  - Input: `AuditReport` (with failed checks that have `canAutomate: true`), user selections, license choice
  - Verifies files don't already exist (from tree data)
  - Generates file content from templates
  - Calls: `createBlob` (for each file) → `createTree` → `createCommit` → `createOrUpdateBranch` → `openPullRequest`
  - Returns `{ prUrl: string, filesCreated: string[] }`
  - **Acceptance:** Integration test (mocked) — given 3 missing files, creates correct blob/tree/commit sequence and returns PR URL
  - **Verified (2026-10-17):** Added server-only `RemediationEngine` with static and instance `execute(input)` methods, typed inputs/results/errors, and support for the five existing automated templates. Validates the report, caller token, selected failed automatable checks, explicit license choice/holder, and conduct contact before network calls; defaults the license year to the current UTC year. Added `fetchBaseCommit` to resolve a branch reference and its exact commit tree. Refreshes the default branch and complete tree, rejects mismatched/truncated snapshots and remediation-as-default branches, skips already-resolved findings using existing presence checks, and rejects incompatible destinations/ancestors case-insensitively without losing conflicting entries that differ only by case. Uses fixed template paths, renders all files before writes, and performs sequential blobs → one tree → one commit → remediation branch → PR, preserving sanitized GitHub errors and retry metadata; returns typed `no_changes` when nothing remains. Added 101 mocked tests, including the required three-file integration with real templates/Git helpers, all five fixes, input validation, fresh language/branch detection, stale findings, path conflicts, existing branch/PR recovery, snapshot validation, and failure short-circuiting. Focused tests pass (101 tests); `bun run test:run --maxWorkers=1 --reporter=verbose` passes (1838 tests; 1 opt-in live GitHub test skipped); `bun run build -- --webpack`, post-build `./node_modules/.bin/tsc --noEmit --incremental false`, changed-module ESLint, new-file Prettier checks, and diff whitespace checks pass. `bun run lint` passes with 3 existing unrelated UI warnings. GitHub writes were mocked; API/UI and fork provisioning remain their later tasks.
  - **Depends on:** 2.2.1–2.2.5, 2.1.1–2.1.5

---

### 2.3 — Fix-with-PR UI & API

- [ ] **2.3.1 — Implement `POST /api/remediate` route**
  - In `app/api/remediate/route.ts` (the active App Router is at the repository root)
  - Requires authenticated session (return 401 if not)
  - Request body: `{ owner, repo, fixes: string[], licenseChoice?: string, licenseFullName?: string, codeOfConductContact?: string }`
  - **Agreed template inputs:** Selecting `license` requires an explicit supported license and copyright holder (`licenseFullName`); selecting `code-of-conduct` requires an explicit incident-reporting contact (`codeOfConductContact`). Never infer either from the signed-in identity.
  - `fixes` is array of check IDs to remediate (e.g., `["license", "gitignore", "ci-workflow"]`)
  - Calls `RemediationEngine.execute()` with user's GitHub token
  - Returns `{ prUrl: string, filesCreated: string[] }`
  - **Acceptance:** Authenticated request creates a PR on a test repo
  - **Implemented and locally verified (2026-10-17):** Added the POST handler using server-only `getGitHubSession()` credentials, JSON content-type and same-origin checks, coordinate/selection/template validation before GitHub requests, deterministic fix deduplication, fresh authenticated `auditRepository()` reports without persistence, and `RemediationEngine.execute()`. Returns only PR URL and created files, with `no-store` on all responses, sanitized status-specific errors, and valid rate-limit retry timing. Added 123 route and HTTP integration tests, including the real audit → templates → three blobs → one tree → one commit → branch → PR pipeline with session-token verification despite an environment token, resolved findings, path conflicts, incomplete snapshots, and failure short-circuiting. `bun run test:run app/api/remediate --maxWorkers=1`, `bun run build -- --webpack` (registers `/api/remediate`), post-build `./node_modules/.bin/tsc --noEmit --incremental false`, changed-file Prettier checks, and `git diff --check` pass. `bun run lint` passes with 3 existing unrelated UI warnings. README documents the API contract and manual acceptance procedure.
  - **Full regression verification:** `bun run test:run --maxWorkers=1` passes (1,988 tests passed; 1 opt-in live GitHub test skipped, across 62 test files). The existing Vite configuration compatibility warning remains unchanged. Existing Git API throttling tests account for most of the 467-second run.
  - **Pending live acceptance (deferred by agreement):** No live GitHub objects were created. A signed-in session and disposable test repository are still required to verify real authenticated PR creation; keep this task unchecked until that acceptance criterion is verified. UI and fork provisioning remain their later tasks.
  - **Depends on:** 2.0.1, 2.2.6

- [ ] **2.3.2 — Build License Selector modal**
  - In `src/components/report/license-selector.tsx`
  - Modal dialog with radio buttons for MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0
  - Shows brief description of each license
  - Required before remediation if license check failed
  - **Acceptance:** Selection is passed through to remediation API, cannot proceed without choosing
  - **Implemented and locally verified (2026-10-17):** Added the reusable client `LicenseSelector` in the active root report components, a report barrel export, and the documented `src/components/report/license-selector.tsx` compatibility entry point. Reuses real dialog/radio/button/scroll primitives within `ReportThemeScope`; offers five described choices with no default, a responsibility disclaimer, guarded explicit confirmation, cancellation, and fresh selection on every opening. Exports `LicenseChoice` and `LicenseSelectorProps`; GPL is explicitly version 3 only and emits `GPL-3.0-only`. The typed `onConfirm({ licenseChoice })` handoff owns no network requests; callers retain copyright attribution and API error handling. All 27 new component/handoff tests pass, including a test-only caller forwarding every choice unchanged to mocked `/api/remediate` and making no requests before confirmation or after cancellation. All 278 report-component tests pass. Chromium verification of the real component with application styles/built fonts passes at 1280×900, 375×667, and 667×375, including both themes, panel scrolling, visible footer actions, no horizontal overflow, keyboard selection, forward/backward focus trapping, focus restoration, Escape/outside dismissal, and reduced-motion popup transitions.
  - **Validation:** `bun run test:run components/report --maxWorkers=1` passes (278 tests); `bun run test:run --maxWorkers=1 --reporter=verbose` passes (1,988 tests; 1 opt-in live GitHub test skipped). The initial nonverbose full-suite run was interrupted while silent; the verbose rerun completed in 467 seconds. `bun run build -- --webpack`, post-build `./node_modules/.bin/tsc --noEmit --incremental false`, changed-file ESLint and Prettier checks, and `git diff --check` pass. `bun run lint` passes with 3 existing unrelated UI warnings. No live GitHub objects were created.
  - **Pending production integration (deferred by agreement):** Keep this task unchecked until the report's remediation caller opens the selector for a selected failed license fix, blocks submission without explicit choice, and forwards that choice to the real API. API ownership and Fix All orchestration remain tasks 2.3.1 and 2.3.3; this task implements and tests only the modal and callback boundary.
  - **Depends on:** 1.0.2

- [x] **2.3.3 — Build "Fix All" button and remediation flow**
  - In `src/components/report/fix-button.tsx`
  - Shows on report page when authenticated and automatable fixes exist
  - Checkbox list of available fixes (pre-checked)
  - On click: if license is needed → show license selector first → then call `/api/remediate`
  - Success: show link to created PR
  - Error: show error message with guidance
  - **Acceptance:** Full flow works: select fixes → choose license → PR created → link shown
  - **Implemented and locally verified (2026-10-17):** Implemented the full Fix All remediation flow across `components/report/fix-button.tsx`, root barrel exports, and the documented compatibility entry point `src/components/report/fix-button.tsx`. Enforces authentication via `AuthGate` so unauthenticated users or session expiry unmount the component and abort active requests. Displays only failed automatable checks matching supported IDs (`license`, `gitignore`, `ci-workflow`, `security-policy`, `code-of-conduct`), preselected by default with names, descriptions, and target paths. Collects nonblank, single-line copyright holder and conduct contact fields with strict validation without account inference. Integrates seamless transition to `LicenseSelector` when `license` is selected (starting without default and returning on cancellation without requests), and direct submission otherwise. Freezes inputs during in-flight requests while allowing dialog closure, surfacing persistent background status beside the trigger. Implemented browser-safe `requestRemediation` helper in `src/lib/request-remediation.ts` with same-origin POST, payload filtering, response/PR URL validation, synchronous duplicate prevention, and abort-on-unmount. Displays accessible success state with PR link (`noopener noreferrer`), created file list, unchanged-score guidance, and accessible error handling with status-specific guidance and live retry countdowns. Integrated with `ReportController` to mutually disable re-auditing and remediation and reset state on report/repository identity changes. Fork provisioning remains intentionally outside this task; write permission failures surface actionable guidance. All 35 `FixButton` component tests, 27 `LicenseSelector` tests, 37 `requestRemediation` tests, and 2 full-flow UI/API/engine integration tests pass with mocked GitHub writes.
  - **Validation:** Focused remediation tests pass (226 tests); full test suite `bun run test:run --maxWorkers=1` passes (2,121 tests passed; 1 opt-in live GitHub test skipped across 66 test files). `bun run lint` passes with 0 errors (3 preexisting UI warnings); Next.js production build `bun run build -- --webpack` succeeds; post-build `./node_modules/.bin/tsc --noEmit --incremental false` passes with 0 errors; Prettier formatting checks and `git diff --check` pass cleanly.
  - **Pending live acceptance (deferred by agreement):** Live GitHub PR creation against a disposable repository remains a documented follow-up. Automated verification tests mock all GitHub writes.
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
