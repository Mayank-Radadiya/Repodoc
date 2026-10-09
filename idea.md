# Repodoc — Repository Intelligence & Automated Health Remediation

> **One-Line Pitch:** Enter any public GitHub repository URL to instantly generate a 100-point repository health audit with defensible evidence, an embeddable shields.io health badge, and a 1-click atomic PR that fixes missing repository hygiene in a single commit.

---

## 🎯 Executive Overview & Resume Talking Points

Repodoc is an engineering-first developer productivity and repository governance tool. Rather than being a basic API wrapper or another generic AI prompt wrapper, it showcases production-grade systems engineering:

1. **Single-Roundtrip Git Tree Traversal:** Resolves 90%+ of repository presence checks in a single recursive call (`GET /git/trees/{sha}?recursive=1`) and executes in-memory set lookups in `<1ms`.
2. **Low-Level Git Data API Orchestration:** Constructs atomic multi-file fixes via Git Blobs, Trees, and Commits (`POST /git/blobs` → `POST /git/trees` → `POST /git/commits`), opening a single, clean pull request from an idempotent branch.
3. **Defensible, Versioned Scoring Rubric (v1.0):** Replaces vanity proxies (like README word count) with AST/heading parsing, project-type awareness (libraries vs. applications), structured evidence, and concrete remediation proposals.
4. **Standard Shields.io Endpoint Integration:** Serves lightweight, CDN-cached endpoint JSON directly compliant with shields.io (`schemaVersion: 1`), eliminating fragile edge SVG/PNG rendering pipelines.
5. **Rate-Limit & ETag Resiliency:** Leverages HTTP Conditional Requests (`ETag` / `If-None-Match`) where `304 Not Modified` responses consume zero GitHub unauthenticated rate-limit quota.

---

## ⚖️ Market Positioning & Differentiation

When evaluating repository tools, Repodoc occupies a distinct, high-signal niche:

| Feature / Dimension | GitHub `/community/profile` | OpenSSF Scorecard | Repodoc |
| :--- | :--- | :--- | :--- |
| **Primary Focus** | Minimalist binary checklist | Strict supply-chain security (fuzzing, signed commits, pin-dependencies) | **Developer Hygiene, Docs Quality & Project Ergonomics** |
| **Scoring Model** | None (checklist only) | 0–10 numeric score (security-only) | **100-Point Defensible Rubric with Structured Evidence** |
| **Remediation** | None | None (identifies issues only) | **1-Click Atomic PR ("Fix All" in a single commit)** |
| **Context Awareness**| Rigid (same for all repos) | Rigid | **Adapts to project type** (does not penalize libraries for missing app files) |
| **Badge Integration**| None | Custom SVG badge | **Standard shields.io Endpoint JSON** |

---

## 🧩 Core Architecture & Data Flow

```
                      ┌─────────────────────────────────┐
                      │   Next.js App Router (Web UI)   │
                      └────────────────┬────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            API Services & Engines                            │
├──────────────────────┬──────────────────────┬────────────────────────────────┤
│    GitHub Service    │    Scoring Engine    │       Remediation Engine       │
│  • Single-Call Tree  │  • Rubric v1.0       │  • Atomic Git Data API         │
│  • ETag Conditional  │  • Project Type AST  │  • Multi-file Blob & Tree      │
│  • GitHub App Auth   │  • Evidence Builder  │  • Idempotent Branching        │
└──────────┬───────────┴──────────┬───────────┴────────────────┬───────────────┘
           │                      │                            │
           ▼                      ▼                            ▼
┌──────────────────────┐ ┌──────────────────┐       ┌──────────────────────┐
│  GitHub REST API v3  │ │  Prisma / SQLite │       │  Shields.io Endpoint │
│  & Git Data API      │ │  (Postgres Prod) │       │  /api/badge/:owner/  │
│                      │ │  Cached Reports  │       │  :repo               │
└──────────────────────┘ └──────────────────┘       └──────────────────────┘
```

---

## 📦 Scope & Feature Breakdown

### What We Are Building:
1. **Instant Public Repo Auditor:** Paste any public GitHub URL (e.g. `github.com/facebook/react`) to run an immediate, defensible audit.
2. **Defensible 100-Point Audit Report:** Categorized breakdown with pass/fail evidence badges, file inspection details, and actionable recommendations.
3. **Shields.io Dynamic Badge API (`/api/badge/[owner]/[repo]`):** Lightweight JSON endpoint delivering real-time grade badges to repo READMEs.
4. **1-Click Atomic PR Remediation ("Fix All"):**
   - Automatically generates missing hygiene files: Open-source License, language-specific `.gitignore`, and minimal CI testing workflow (`.github/workflows/ci.yml`).
   - Bundles all fixes into **one commit** on an idempotent branch (`repodoc/health-remediation`) via the Git Data API.
   - Handles repository forks when the user lacks direct push access.

### Explicit Scope Cuts (Disciplined MVP):
- ❌ **Cut Developer Profile Card:** Eliminates `@vercel/og` / Satori dynamic image generation and streak GraphQL tracking.
- ❌ **Cut Full README Studio:** No complex split-pane markdown editors or generative multi-turn AI chat interfaces. (If AI is added later, it will be a single atomic "Generate README → Open PR" button).

---

## 📊 Defensible 100-Point Scoring Rubric (v1.0)

Every check returns **pure, unit-tested structured data** including the files checked, match criteria, and an optional automated fix.

```ts
interface CheckResult {
  id: string;
  name: string;
  category: "documentation" | "hygiene" | "testing_ci" | "community" | "security";
  pointsAwarded: number;
  maxPoints: number;
  passed: boolean;
  evidence: {
    filesChecked: string[];
    found: boolean;
    details: string; // e.g. "Detected '## Installation' and '## Usage' in README.md"
  };
  remediation?: {
    canAutomate: boolean;
    targetPath: string;
    description: string;
    requiresUserInput?: "license_selection";
  };
}
```

### Rubric Breakdown (100 Points Total)

| Category | Weight | Specific Checks Performed | Automation Support |
| :--- | :---: | :--- | :---: |
| **Documentation** | **25 pts** | • `README.md` presence (8 pts)<br>• Essential headings detected (`Installation`/`Setup` & `Usage`/`Quickstart`) (10 pts)<br>• Architecture / Overview description (4 pts)<br>• Contributing guidelines (`CONTRIBUTING.md`) (3 pts) | Manual / PR |
| **Project Hygiene** | **20 pts** | • Valid OSI Open Source `LICENSE` (10 pts)<br>• Language-appropriate `.gitignore` (5 pts)<br>• Code of Conduct (`CODE_OF_CONDUCT.md`) (5 pts) | **1-Click PR**<br>*(License requires user prompt)* |
| **Testing & CI/CD** | **25 pts** | • Automated CI workflow in `.github/workflows/*.yml` (15 pts)<br>• Test directory or test script defined in package manifest (10 pts) | **1-Click PR**<br>*(Generates standard CI workflow)* |
| **Community & Metadata**| **15 pts** | • Issue templates / PR templates in `.github/` (8 pts)<br>• Repo description & topics populated on GitHub (7 pts) | Guided |
| **Security Baseline** | **15 pts** | • `SECURITY.md` vulnerability reporting policy (10 pts)<br>• Dependency scanning configured (Dependabot / Renovate) (5 pts) | **1-Click PR** |

### Critical Scoring & Remediation Rules:
1. **Never Auto-Pick a License:** Selecting an open-source license is a legal choice. The UI must prompt the user to choose (MIT, Apache-2.0, BSD-3, etc.).
2. **Never Overwrite Existing Files:** The remediation engine must verify that target files do not exist before writing.
3. **No Dumb Word Counts:** Scoring analyzes heading existence and structural presence rather than raw line/word counts.
4. **Context-Aware Auditing:** Check manifests (`package.json`, `Cargo.toml`, `setup.py`, `go.mod`) to detect whether the project is a library, CLI, or application. Do not penalize standalone libraries for lacking frontend/app assets.

---

## 🛠️ Shields.io Endpoint Specification

Instead of serving image bytes from the server, Repodoc serves standard shields.io endpoint JSON.

* **Route:** `GET /api/badge/[owner]/[repo]`
* **Response Format:**
  ```json
  {
    "schemaVersion": 1,
    "label": "repo health",
    "message": "92/100",
    "color": "brightgreen"
  }
  ```
* **Color Thresholds:**
  - `score >= 90`: `"brightgreen"`
  - `score >= 75`: `"green"`
  - `score >= 60`: `"yellow"`
  - `score >= 40`: `"orange"`
  - `score < 40`: `"red"`
* **Markdown Usage for Developers:**
  ```markdown
  [![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/owner/repo)](https://repodoc.dev/report/owner/repo)
  ```
* **Caching Headers:** `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.

---

## ⚡ Atomic "Fix with PR" Engine (Git Data API)

When the user selects missing items to fix and clicks **"Create Remediation PR"**:

1. **Default Branch Detection:** Queries `GET /repos/{owner}/{repo}` to retrieve `default_branch` (handles `main`, `master`, or custom branches).
2. **Permission Check & Forking:**
   - If user has push permissions: Operates directly on the repository.
   - If user does NOT have push permissions: Automatically creates a fork (`POST /repos/{owner}/{repo}/forks`) and branches on the fork.
3. **Atomic Commit via Git Data API:**
   - Base commit SHA and base tree SHA are resolved from `heads/{default_branch}`.
   - For each remediated file, creates a Git Blob: `POST /git/blobs`.
   - Creates a new Git Tree referencing the base tree SHA: `POST /git/trees` with array of blob objects.
   - Creates a single commit: `POST /git/commits` with parent set to base commit SHA.
   - Creates or updates an idempotent branch: `repodoc/health-remediation` (`POST` or `PATCH /git/refs/heads/repodoc/health-remediation`).
   - Opens (or updates) a Pull Request: `POST /repos/{owner}/{repo}/pulls`. Title: `chore(repodoc): resolve repository health audit findings`.

---

## 🗄️ Database Schema Design (Prisma)

Cleaned schema removing invalid `@default(nanoid(8))` Prisma syntax:

```prisma
datasource db {
  provider = "postgresql" // or "sqlite" for rapid local dev
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id              String       @id @default(cuid())
  githubId        String       @unique
  username        String
  avatarUrl       String?
  installationId  Int?         // GitHub App installation ID
  reports         RepoReport[]
  createdAt       DateTime     @default(now())
}

model RepoReport {
  id            String    @id @default(cuid())
  shareId       String    @unique // Generated via nanoid(8) in application logic
  owner         String
  repo          String
  defaultBranch String    @default("main")
  healthScore   Int
  rubricVersion String    @default("1.0.0")
  breakdown     Json      // Category scores & detailed check results with evidence
  etag          String?   // GitHub tree ETag for conditional caching
  userId        String?
  user          User?     @relation(fields: [userId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([owner, repo])
}
```

---

## 📅 Phased Execution Roadmap

### 🏁 Phase 1 (MVP — ~1 Week): Audit, Report & Badge
*Deliverable: A live, shareable audit tool with zero install required.*
- [ ] Initialize Next.js 15 (App Router, TypeScript, Tailwind CSS, shadcn/ui).
- [ ] Implement `fetchRepoTree(owner, repo)` using single recursive tree call (`/git/trees/{sha}?recursive=1`) and ETag caching.
- [ ] Implement pure, unit-tested `ScoringEngine` (Rubric v1.0) with vitest.
- [ ] Build shields.io badge JSON endpoint (`/api/badge/[owner]/[repo]`).
- [ ] Build clean, responsive Report UI: URL input, score gauge, categorized check cards with evidence pills, and badge embed snippets.
- [ ] Deploy to Vercel with public link.

### 🔧 Phase 2 (~1 Week): GitHub App & Atomic "Fix with PR"
*Deliverable: 1-click remediation that fixes repository hygiene in a single commit.*
- [ ] Setup GitHub App (fine-grained repository permissions: contents write, pull requests write).
- [ ] Build remediation templates: standard `.gitignore` presets, OSS licenses, and minimal GitHub Actions CI workflow.
- [ ] Build License Selector modal (explicit user legal choice).
- [ ] Implement atomic Git Data API pipeline (`blobs` → `tree` → `commit` → `PR`) on idempotent branch `repodoc/health-remediation`.
- [ ] Add fork detection and cross-repo PR generation for external repositories.

### 🔁 Phase 3 (Stretch): Continuous Health Daemon (Borrowed from DaemonDoc)
*Deliverable: Webhook-driven continuous repository health updates.*
- [ ] Register GitHub App push webhooks.
- [ ] Implement raw-body HMAC-SHA256 verification and `X-GitHub-Delivery` deduplication.
- [ ] Queue and debounce webhook processing using **Inngest** or **Upstash QStash** (fits serverless Vercel runtime; avoids managing long-lived BullMQ workers).
- [ ] Automatically refresh cached audit score and badge on push.
- [ ] Maintain a rolling PR that updates remediated files as project code evolves.