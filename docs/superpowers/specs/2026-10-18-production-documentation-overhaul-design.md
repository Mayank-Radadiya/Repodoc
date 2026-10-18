# Production Documentation Overhaul — Design Specification

**Date:** 2026-10-18  
**Status:** Approved  
**Classification:** Architectural (Comprehensive Documentation Suite)  

---

## 1. Executive Summary & Goals

Repodoc has grown from an MVP audit and badge tool into a comprehensive, production-ready repository intelligence and automated remediation platform. The codebase incorporates:
- **Next.js 16** App Router with Turbopack, React 19, Tailwind CSS v4, and Bun 1.4+.
- **Pure AST & Heuristic Scoring Engine (Rubric v1.0)** with zero network dependencies during evaluation.
- **Shields.io Dynamic Badge API** (`schemaVersion: 1`, edge CDN caching).
- **Zero-Leak NextAuth.js v5 Beta Authentication** with AES-GCM encrypted session cookies.
- **Atomic Multi-File Remediation Engine** utilizing low-level Git Data API (`blobs` → `tree` → `commit` → `ref`) with automatic personal fork fallback.
- **User Dashboard** (`/dashboard`) managing analyzed repositories, health metrics, and re-audit triggers.
- **Prisma 6.x ORM** supporting SQLite locally and PostgreSQL (Neon/Supabase) in production.
- **Comprehensive Vitest Suite** with 2,220+ unit and integration tests.

### Deficiencies in Current Documentation
1. **Outdated Directory Tree:** Current `README.md` references non-existent `src/lib/` and `src/components/` paths.
2. **Obsolete Roadmap:** README claims Phase 2 (GitHub OAuth & "Fix All" remediation) is a future preview, even though it is fully implemented and tested.
3. **Missing Routes & Subsystems:** No documentation for `/dashboard`, template systems, or the fork fallback flow.
4. **Incomplete Migration Guidance:** Lacks a step-by-step production runbook for transitioning from SQLite to PostgreSQL with connection pooling.
5. **Monolithic Crowding:** Deep technical caveats (such as OAuth App vs GitHub App client ID constraints and Git Data API payload structures) crowd the root README.

### Core Objectives
- Update root `README.md` to be a clear, developer-friendly front door with accurate tech badges, 5-minute quickstart, rubric reference, badge guide, environment variables table, and high-level architecture.
- Create 5 modular technical deep dives in `docs/` (`architecture.md`, `authentication.md`, `database.md`, `remediation-engine.md`, `deployment.md`).
- Update `.env.example` with comprehensive, sanitized examples and security guidelines.
- Guarantee that any new developer can configure, run, and test the repository independently without external credentials.

---

## 2. Documentation Architecture & Topology

```
Repodoc/
├── README.md                      # Primary entry point: Overview, Quickstart, Rubric, Badge, Env Vars, Core Links
├── .env.example                   # Sanitized environment variable template with inline instructions
└── docs/
    ├── architecture.md            # System topology, App Router layout, Scoring Engine, Request flows (Mermaid)
    ├── authentication.md          # NextAuth v5 beta, OAuth App setup, JWT token isolation, session lifecycle
    ├── database.md                # Prisma schema, SQLite local dev, PostgreSQL production setup & migrations
    ├── remediation-engine.md      # "Fix All" pipeline, atomic Git Data API tree/commit, fork fallback mechanism
    └── deployment.md              # Production Vercel guide, security headers (CSP), environment checklist
```

---

## 3. Detailed File Specifications

### 3.1. `README.md` (Root Developer Portal)
The root README will contain:
1. **Header & Verified Stack Badges:**
   - Next.js 16 (App Router + Turbopack)
   - React 19
   - TypeScript 5.x
   - Tailwind CSS v4
   - Bun 1.4+ / Node 20+
   - Prisma 6.x
   - Tested with Vitest (2,220+ tests)
2. **High-Level Capabilities:**
   - Instant Public Repository Audits (single-roundtrip Git tree traversal).
   - Defensible 100-Point Rubric v1.0 with structured evidence.
   - Dynamic Shields.io Endpoint API with CDN caching.
   - 1-Click Atomic PR Remediation ("Fix All" in a single commit).
   - User Repository Dashboard (`/dashboard`).
3. **Accurate Directory Layout:**
   - Root `app/`, `components/`, `lib/`, `prisma/`, `types/`, and `docs/`.
4. **5-Minute Zero-Friction Quickstart:**
   - Prerequisites (Bun 1.4+ or Node 20+).
   - Installation (`bun install` / `npm install`).
   - Environment configuration (`cp .env.example .env`).
   - Local DB push (`npx prisma db push`).
   - Development server (`bun dev`).
   - Explaining that public audits and badges work out-of-the-box with zero tokens.
5. **Scoring Rubric v1.0 Table:**
   - Documentation (25 pts), Project Hygiene (20 pts), Testing & CI/CD (25 pts), Community & Metadata (15 pts), Security Baseline (15 pts).
6. **Shields.io Badge API Integration:**
   - Route: `GET /api/badge/[owner]/[repo]`
   - Caching headers: `s-maxage=3600, stale-while-revalidate=86400`
   - Score color thresholds (brightgreen, green, yellow, orange, red).
   - Markdown and HTML embed snippets.
7. **Environment Variables Matrix:**
   - Table containing Variable, Required, Default, and Description.
   - Notes on Auth.js aliases (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`).
   - Explicit rule: never commit real secrets or tokens.
8. **Development & Testing Commands:**
   - `bun dev`, `bun run test:run`, `bun run test`, `bun run lint`, `npx tsc --noEmit`, `bun run build`, `bun run start`, `npx prisma studio`.
9. **Technical Documentation Index:**
   - Direct links to the 5 specialized guides in `docs/`.

---

### 3.2. `docs/architecture.md` (System Architecture)
1. **System Topology & Request Flow:**
   - Component interaction diagram using Mermaid.
   - Next.js 16 App Router layout structure (`layout.tsx`, `page.tsx`, route handlers, server vs client components).
2. **Audit Request Lifecycle (Mermaid Sequence Diagram):**
   - Developer triggers audit via URL / hero input.
   - `POST /api/audit` handler looks up cached report and ETag in Prisma.
   - GitHub Octokit client issues conditional request (`If-None-Match: etag`).
   - 304 handling skips tree re-fetch and returns persisted report.
   - On 200: fetches recursive tree (`/git/trees/{sha}?recursive=1`) and parallel file blobs.
   - Pure `ScoringEngine` runs 12 checks in memory without network calls.
   - Database upserts report with `nanoid(8)` `shareId`.
   - UI renders score gauge, category breakdown, and badge snippet.
3. **Scoring Engine Subsystem (`lib/scoring`):**
   - Pure functions design.
   - Check modules: `documentation`, `hygiene`, `testing`, `community`, `security`.
   - Manifest detection heuristics for library vs application context.
4. **Performance & Caching Strategy:**
   - Git tree ETag caching saves unauthenticated GitHub API quota.
   - Shields.io badge CDN caching.

---

### 3.3. `docs/authentication.md` (Authentication & Security Model)
1. **NextAuth.js v5 Beta Architecture:**
   - Integration via `auth.ts`, `lib/auth/config.ts`, `lib/auth/callbacks.ts`.
   - Server-only execution and Edge-safe token handling.
2. **GitHub OAuth App Registration:**
   - Detailed guide for GitHub Settings → Developer settings → OAuth Apps.
   - **Crucial Distinction:** Must register an **OAuth App**, NOT a GitHub App (Client IDs starting with `Iv` are rejected prior to authorization).
   - Homepage URL and Callback URL settings (`http://localhost:3000/api/auth/callback/github` in dev, production HTTPS domain in prod).
3. **Requested Scopes & Justification:**
   - `read:user` & `user:email`: Identity, username, email, avatar.
   - `public_repo`: Inspecting and writing pull requests to public repositories.
   - `workflow`: Creating and updating GitHub Actions CI workflow files.
4. **Zero-Leak Token Isolation:**
   - GitHub Access Token is placed strictly in encrypted JWT cookie claims.
   - Token is omitted from `/api/auth/session` and public browser payloads.
   - Server-side usage via `getGitHubSession()` in `@/lib/auth`.
5. **Session Invalidation & Client ID Binding:**
   - Sessions are bound to `GITHUB_CLIENT_ID`.
   - Rotating OAuth credentials automatically invalidates prior sessions without database corruption or manual cookie clearing.

---

### 3.4. `docs/database.md` (Database Persistence & Migrations)
1. **Prisma Schema & Models:**
   - Walkthrough of `User` model (id, githubId, username, avatarUrl, installationId, createdAt).
   - Walkthrough of `RepoReport` model (id, shareId, owner, repo, defaultBranch, healthScore, rubricVersion, breakdown, etag, userId, timestamps).
   - Composite unique constraints (`[owner, repo]`).
2. **Local SQLite Workflow:**
   - Setting `DATABASE_URL="file:./dev.db"`.
   - Initializing with `npx prisma db push`.
   - Viewing records with `npx prisma studio`.
3. **Production PostgreSQL Migration Runbook (Neon / Supabase):**
   - Provider modification in `prisma/schema.prisma` (`provider = "postgresql"`).
   - Running migrations:
     - `npx prisma migrate dev --name init` (during development/schema evolution).
     - `npx prisma migrate deploy` (automated in production deployment pipeline).
   - Serverless Connection Pooling:
     - Why serverless lambdas exhaust PostgreSQL connections.
     - Configuring Neon pooled connection string with `?pgbouncer=true`.
     - Configuring Supabase Transaction Pooler (Port 6543).

---

### 3.5. `docs/remediation-engine.md` (1-Click PR Remediation & Git Data API)
1. **Feature Overview:**
   - "Fix All" button eligibility (authenticated users on live reports with failing automatable findings).
   - Supported check remediations: `license`, `gitignore`, `ci-workflow`, `security-policy`, `code-of-conduct`.
2. **Atomic Git Data API Orchestration (Mermaid Diagram):**
   - How multiple generated files are committed in a single atomic Git commit:
     1. Create blobs via `POST /repos/{owner}/{repo}/git/blobs`.
     2. Create tree pointing to blobs and base tree via `POST /repos/{owner}/{repo}/git/trees`.
     3. Create commit with tree and base commit parent via `POST /repos/{owner}/{repo}/git/commits`.
     4. Update/create branch `refs/heads/repodoc/health-remediation`.
     5. Open/update PR via `POST /repos/{owner}/{repo}/pulls`.
3. **Automatic Personal Fork Fallback:**
   - Permission verification via GitHub API.
   - If user lacks push access: check for existing fork or create fork.
   - Wait/poll (up to 15s) for upstream commit replication.
   - Apply atomic commit on fork branch `repodoc/health-remediation`.
   - Open cross-repository PR against upstream default branch.
4. **Template System & Validation Rules:**
   - Licenses: MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0 (mandatory non-blank copyright holder).
   - Gitignore: Language-aware detection for Node, Python, Go, Rust, or Generic fallback.
   - CI Workflow: GitHub Actions configuration tailored to project ecosystem.
   - Code of Conduct: Contributor Covenant v2.1 (mandatory non-blank reporting contact).

---

### 3.6. `docs/deployment.md` (Production Deployment Runbook)
1. **Target Platform: Vercel:**
   - Step-by-step import and project configuration.
2. **Production Pre-Flight Checklist:**
   - `bun run lint`
   - `bun run test:run`
   - `bun run build`
3. **Production Environment Variables:**
   - Setting `DATABASE_URL` (PostgreSQL with pooling).
   - Setting `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` to production HTTPS domain.
   - Generating `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
   - Configuring Production GitHub OAuth App credentials.
   - Optional production `GITHUB_TOKEN` for public rate limit resilience.
4. **Security & Header Hardening:**
   - Detailed review of CSP directives in `next.config.ts`.
   - HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
5. **Post-Deployment Verification Smoke Tests:**
   - Verifying public audit on popular repos.
   - Verifying Shields.io badge JSON response.
   - Verifying GitHub sign-in, dashboard loading, and remediation PR creation on test repository.

---

### 3.7. `.env.example` (Updated Reference Template)
- Clean, comprehensively commented template containing:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `GITHUB_TOKEN`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - Auth.js aliases `AUTH_GITHUB_ID` & `AUTH_GITHUB_SECRET`
- Clear security admonition never to commit real secrets.

---

## 4. Spec Self-Review Checklist

1. **Placeholder Scan:** No TBDs, TODOs, or vague placeholders exist. All file names, paths, variables, and architectures match the actual implementation.
2. **Internal Consistency:** The documentation hierarchy, environment variable names, database migration commands, and API route signatures are uniform across all documents.
3. **Scope Check:** Covers all aspects requested by the user (architecture, folder structure, setup instructions, environment variables, database migrations, authentication, external integrations, testing, and deployment workflow).
4. **Ambiguity Check:** All commands explicitly specify the package manager (Bun primary, npm fallback) and explain SQLite vs PostgreSQL handling unambiguously.
