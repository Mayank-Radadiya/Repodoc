# Production Documentation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review and update project documentation for production readiness, accurately documenting architecture, folder structure, quickstart setup, environment variables, database persistence/migrations, authentication, external integrations, testing, and deployment.

**Architecture:** Tiered modular documentation structure with an authoritative, developer-welcoming root `README.md` complemented by 5 focused technical deep dives in `docs/` (`architecture.md`, `authentication.md`, `database.md`, `remediation-engine.md`, `deployment.md`) and an updated `.env.example`.

**Tech Stack:** Markdown, Mermaid.js diagrams, Next.js 16 (App Router + Turbopack), React 19, Bun 1.4+, Prisma 6.x, NextAuth.js v5 beta, Octokit & Git Data API, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-18-production-documentation-overhaul-design.md`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/docs/superpowers/specs/2026-10-18-production-documentation-overhaul-design.md)

## Global Constraints

- Never include real secrets, access tokens, API keys, or private URLs in documentation or example files.
- Accurately document the actual project structure (root `app/`, `components/`, `lib/`, `prisma/`, `types/`) — no references to non-existent `src/` directories.
- Accurately reflect dependencies: Next.js 16 (`16.4.0`), React 19 (`19.3.0`), Tailwind CSS v4, Bun 1.4+, Prisma 6 (`6.19.3`), NextAuth v5 beta (`5.0.0-beta.32`), Vitest (`^5.0.3` with 2,220+ tests).
- Eliminate obsolete "Roadmap Phase 2" text; Phase 2 (GitHub OAuth, Fix All PRs, fork fallback, dashboard) is fully implemented.
- Ensure all relative document links, code blocks, and Mermaid diagrams are syntactically valid and tested.

---

### Task 1: Update `.env.example` Template and Hygiene

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: Specifications from `docs/superpowers/specs/2026-10-18-production-documentation-overhaul-design.md` section 3.7.
- Produces: Clear, copy-pasteable, sanitized `.env.example` covering all application environment variables.

- [ ] **Step 1: Inspect current `.env.example`**

Verify all current variables (`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `GITHUB_TOKEN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) and identify missing aliases (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`).

- [ ] **Step 2: Write updated `.env.example`**

Update `.env.example` with clear sections:
1. Database configuration (`DATABASE_URL="file:./dev.db"`).
2. Public site URL (`NEXT_PUBLIC_SITE_URL="https://repodoc.dev"`).
3. Optional GitHub API token (`GITHUB_TOKEN=""`).
4. GitHub OAuth App credentials & NextAuth session configuration:
   - `NEXTAUTH_SECRET=""` (generated with `openssl rand -base64 32`)
   - `NEXTAUTH_URL="http://localhost:3000"`
   - `GITHUB_CLIENT_ID=""`
   - `GITHUB_CLIENT_SECRET=""`
   - Supported Auth.js aliases: `AUTH_GITHUB_ID=""`, `AUTH_GITHUB_SECRET=""`
5. Security notice regarding OAuth App vs GitHub App client IDs (no `Iv` prefixes).

- [ ] **Step 3: Verify `.env.example` contains zero real secrets**

Ensure every variable is either empty or uses an obvious placeholder like `file:./dev.db` or `http://localhost:3000`.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example with complete variable specifications and security notices"
```

---

### Task 2: Create `docs/architecture.md`

**Files:**
- Create: `docs/architecture.md`

**Interfaces:**
- Consumes: Spec section 3.2; `lib/scoring`, `lib/github`, `app/api`, `components/`.
- Produces: Comprehensive architectural documentation including system topology, request sequence diagrams, scoring engine AST mechanics, and caching strategies.

- [ ] **Step 1: Draft `docs/architecture.md`**

Write the architectural guide covering:
1. Executive System Topology: High-level overview of Next.js 16 App Router, Prisma ORM, Octokit facade, Scoring Engine, Remediation Engine.
2. Architecture Diagram: Mermaid graph showing boundaries between Client, App Router, Domain Services, Database, and GitHub API.
3. End-to-End Audit Lifecycle: Mermaid sequence diagram detailing the complete request flow:
   - UI input -> `POST /api/audit` -> DB ETag query -> GitHub recursive tree fetch (`If-None-Match`) -> 304 handling vs 200 parsing -> parallel README/manifest blob retrieval -> pure `ScoringEngine` evaluation -> DB report upsert with `shareId` -> UI score gauge and breakdown render.
4. Scoring Engine Architecture (`lib/scoring`):
   - Pure, zero-network design.
   - AST markdown heading extraction and rule evaluation.
   - Context-aware project type heuristics (libraries vs applications).
   - Structured evidence model (`CheckResult`).
5. Performance & Caching:
   - Conditional Git tree requests with ETags (`304 Not Modified`).
   - Shields.io badge CDN caching (`s-maxage=3600, stale-while-revalidate=86400`).
   - Persistent snapshots with 8-character `nanoid` keys.

- [ ] **Step 2: Validate Mermaid diagrams and file links**

Check that Mermaid diagrams have valid syntax (proper quoting, supported diagram types `sequenceDiagram` and `flowchart TD`) and file paths point to real files.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add comprehensive system architecture documentation"
```

---

### Task 3: Create `docs/authentication.md`

**Files:**
- Create: `docs/authentication.md`

**Interfaces:**
- Consumes: Spec section 3.3; `auth.ts`, `lib/auth/config.ts`, `lib/auth/callbacks.ts`, `lib/auth/claims.ts`.
- Produces: Exhaustive authentication and session security documentation.

- [ ] **Step 1: Draft `docs/authentication.md`**

Write the authentication and security model guide covering:
1. NextAuth.js v5 Beta Architecture:
   - How `auth.ts` exports `handlers`, `auth`, `signIn`, and `signOut` via `getAuthConfig()`.
   - Server-only execution (`import "server-only"`).
2. GitHub OAuth App Setup Guide:
   - Step-by-step instructions for creating an OAuth App in GitHub Developer settings.
   - **Crucial Distinction:** Must be an **OAuth App**, NOT a GitHub App (Client IDs starting with `Iv` are rejected).
   - Homepage URL and Callback URL settings (`http://localhost:3000/api/auth/callback/github`).
3. OAuth Scopes & Permissions Justification:
   - `read:user` & `user:email`: Identity retrieval (supports private emails).
   - `public_repo`: Inspecting and writing pull requests to public repositories.
   - `workflow`: Creating and updating GitHub Actions CI workflow files.
4. Zero-Leak Token Isolation Architecture:
   - Provider access tokens are kept exclusively in AES-GCM encrypted JWT session cookies.
   - Tokens are omitted from browser-readable `/api/auth/session` responses.
   - Server-side access via `getGitHubSession()` in `@/lib/auth`.
5. Session Invalidation & Client ID Binding:
   - Sessions are bound to the configured OAuth client ID.
   - Credential rotation invalidates older sessions safely without database migrations.

- [ ] **Step 2: Verify zero secrets and validate markdown formatting**

Confirm all environment variable examples use placeholders.

- [ ] **Step 3: Commit**

```bash
git add docs/authentication.md
git commit -m "docs: add authentication and security model documentation"
```

---

### Task 4: Create `docs/database.md`

**Files:**
- Create: `docs/database.md`

**Interfaces:**
- Consumes: Spec section 3.4; `prisma/schema.prisma`, `lib/db.ts`, `lib/reports.ts`.
- Produces: Comprehensive database persistence, schema modeling, and production migration runbook.

- [ ] **Step 1: Draft `docs/database.md`**

Write the database and migrations guide covering:
1. Data Model Architecture:
   - `User` model: `id`, `githubId` (unique), `username`, `avatarUrl`, `installationId`, `createdAt`.
   - `RepoReport` model: `id`, `shareId` (unique nanoid), `owner`, `repo`, `defaultBranch`, `healthScore`, `rubricVersion`, `breakdown` (JSON AST), `etag`, `userId`, `createdAt`, `updatedAt`.
   - Constraints: `@@unique([owner, repo])`.
2. Local Development with SQLite:
   - Setting `DATABASE_URL="file:./dev.db"`.
   - Synchronizing schema using `npx prisma db push`.
   - Inspecting data visually via `npx prisma studio`.
3. Production Migration Runbook (PostgreSQL):
   - Switching provider to `postgresql` in `prisma/schema.prisma`.
   - Development migrations: `npx prisma migrate dev --name init`.
   - Automated production deployments: `npx prisma migrate deploy`.
   - Connection Pooling for Serverless (Neon / Supabase):
     - Why serverless lambdas exhaust pooled connections.
     - Configuring Neon pooled connection string with `?pgbouncer=true`.
     - Configuring Supabase Transaction Pooler (port 6543).

- [ ] **Step 2: Verify commands and formatting**

Check all Prisma CLI commands and verify consistency with `schema.prisma`.

- [ ] **Step 3: Commit**

```bash
git add docs/database.md
git commit -m "docs: add database schema and production migration documentation"
```

---

### Task 5: Create `docs/remediation-engine.md`

**Files:**
- Create: `docs/remediation-engine.md`

**Interfaces:**
- Consumes: Spec section 3.5; `lib/remediation/*`, `lib/templates/*`, `app/api/remediate/*`.
- Produces: Deep technical documentation on the 1-click atomic PR remediation engine and fork fallback mechanism.

- [ ] **Step 1: Draft `docs/remediation-engine.md`**

Write the remediation engine guide covering:
1. Overview & Capability:
   - "Fix All" feature automating 5 checks (`license`, `gitignore`, `ci-workflow`, `security-policy`, `code-of-conduct`).
2. Atomic Git Data API Pipeline (Mermaid Sequence Diagram):
   - Detailed breakdown of how files are committed atomically:
     - `POST /git/blobs` creates raw blob objects.
     - `POST /git/trees` builds tree from base tree + new blobs.
     - `POST /git/commits` creates single commit with base commit parent.
     - `POST /git/refs` / `PATCH` creates or updates branch `repodoc/health-remediation`.
     - `POST /pulls` opens PR or reuses existing PR.
3. Automatic Personal Fork Fallback:
   - Push permission verification via GitHub API.
   - Automatic fork discovery or creation if user lacks direct write permissions.
   - Upstream commit polling (up to 15s) for tree readiness.
   - Committing to fork branch and opening cross-repository PR against upstream.
4. Remediation Templates & Customization:
   - Licenses: 5 supported licenses (MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0) with required copyright holder.
   - Gitignore: Language detection (Node, Python, Go, Rust, Generic).
   - CI Workflow: Tailored GitHub Actions workflows.
   - Code of Conduct: Contributor Covenant v2.1 with mandatory contact.
5. Error Handling & Rate Limiting:
   - HTTP 400, 401, 403, 404, 409, 415, 429 (`Retry-After`), 502, 503 handling.

- [ ] **Step 2: Validate Mermaid diagrams and file links**

Ensure the sequence diagram compiles without syntax errors and all references match implementation.

- [ ] **Step 3: Commit**

```bash
git add docs/remediation-engine.md
git commit -m "docs: add remediation engine and Git Data API documentation"
```

---

### Task 6: Create `docs/deployment.md`

**Files:**
- Create: `docs/deployment.md`

**Interfaces:**
- Consumes: Spec section 3.6; `next.config.ts`, `package.json`.
- Produces: Production deployment runbook, security headers guide, and verification checklist.

- [ ] **Step 1: Draft `docs/deployment.md`**

Write the production deployment guide covering:
1. Recommended Platform: Vercel:
   - Connecting repository and setting build preset.
2. Pre-Flight Build Verification:
   - Running `bun run lint`.
   - Running `bun run test:run`.
   - Running `bun run build`.
3. Production Environment Variables Checklist:
   - `DATABASE_URL` (PostgreSQL with connection pooling).
   - `NEXT_PUBLIC_SITE_URL` (HTTPS domain).
   - `NEXTAUTH_URL` (Matching HTTPS origin).
   - `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` (from production GitHub OAuth App).
   - `GITHUB_TOKEN` (Optional read PAT for public rate limit resilience).
4. Security & HTTP Header Hardening:
   - Analysis of Content Security Policy (CSP) in `next.config.ts`.
   - HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
5. Post-Deployment Smoke Test Runbook:
   - Public audit verification (`/report/octocat/Hello-World`).
   - Badge API verification (`/api/badge/octocat/Hello-World`).
   - OAuth login, session persistence, and `/dashboard` display.
   - Test remediation PR on disposable repository.

- [ ] **Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add production deployment runbook and security guide"
```

---

### Task 7: Overhaul Root `README.md`

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Spec section 3.1; `package.json`, `docs/*`.
- Produces: Modern, production-ready developer portal and quickstart README.

- [ ] **Step 1: Draft overhauled `README.md`**

Update `README.md` with:
1. Updated badges: Next.js 16, React 19, Tailwind CSS v4, Bun, Prisma 6, Vitest (2,220+ tests).
2. Key features: Instant public audits, defensible 100-point rubric, Shields.io badge API, user dashboard, 1-click atomic PR remediation.
3. Corrected repository directory map: Eliminating `src/` and reflecting real paths.
4. 5-minute zero-friction quickstart (Bun and npm instructions, `prisma db push`, `bun dev`).
5. Defensible 100-point scoring rubric table.
6. Shields.io badge integration guide (endpoint, color thresholds, markdown/HTML embed snippets).
7. Environment variables matrix with validation rules and security instructions.
8. Development workflow commands table.
9. Documentation index linking to all guides in `docs/`.
10. Removing obsolete Phase 2 roadmap (since it is already implemented).

- [ ] **Step 2: Verify all internal links and anchors**

Check that every table of contents link, markdown anchor, and file link in `README.md` is valid.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: overhaul README for production readiness with accurate stack and quickstart"
```

---

### Task 8: Verification & Consistency Check

**Files:**
- Review: `.env.example`, `README.md`, `docs/*`

**Interfaces:**
- Consumes: All updated documentation files.
- Produces: Verified, lint-clean, build-passing repository documentation with zero secret leaks.

- [ ] **Step 1: Run secret scan across repository**

Verify that no real GitHub tokens, secrets, or passwords exist in any committed files:
```bash
git grep -i "ghp_" || true
git grep -i "github_pat_" || true
```

- [ ] **Step 2: Run linter and type check**

```bash
bun run lint
npx tsc --noEmit
```

- [ ] **Step 3: Run production build check**

```bash
bun run build
```

- [ ] **Step 4: Commit any final refinements**

```bash
git status -s
```
