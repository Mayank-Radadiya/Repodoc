# Production Deployment Runbook & Security Hardening Guide

Repodoc is engineered as a high-performance, serverless Next.js 16 application running on React 19, Tailwind CSS v4, Bun 1.4+, and Prisma ORM 6 (`6.19.3`). The application connects to a managed PostgreSQL database (such as Neon, Supabase, or Railway) with connection pooling (PgBouncer or Supavisor) and integrates with the GitHub REST and Git Data APIs for repository auditing, dynamic Shields.io badges, and 1-click atomic PR remediations.

This document serves as the authoritative production deployment runbook, covering pre-flight build verification, Vercel platform configuration, production environment variables, database migrations, connection pooling, security header hardening (CSP, HSTS, Permissions-Policy), and step-by-step post-deployment smoke tests.

---

## 1. Executive Deployment Topology

In production, Repodoc operates across four primary infrastructure tiers:

1. **Edge CDN & Ingress Layer (Vercel Edge Network):** Terminating TLS, enforcing HTTP security headers, managing DNS prefetching, routing requests, and caching dynamic Shields.io badge endpoints (`s-maxage=3600, stale-while-revalidate=86400`).
2. **Serverless Compute Layer (Next.js 16 App Router):** Stateless serverless lambda invocations executing React Server Components (RSC), App Router pages (`/report/[owner]/[repo]`, `/dashboard`, `/share/[shareId]`), and API route handlers (`/api/audit`, `/api/badge/[owner]/[repo]`, `/api/remediate`, `/api/auth/[...nextauth]`).
3. **Database & Connection Pooling Layer (Managed PostgreSQL):** Managed PostgreSQL instance fronted by a transaction pooler (Neon PgBouncer or Supabase Supavisor) to multiplex thousands of transient serverless lambda database queries over persistent TCP connections.
4. **External Services Tier (GitHub & Shields.io):** GitHub REST API for unauthenticated repository metadata, GitHub Git Data API (`blobs`, `trees`, `commits`, `refs`) for atomic multi-file pull requests, and GitHub OAuth 2.0 for user authentication and session claims.

```mermaid
flowchart TD
  subgraph PublicClients["Client & External Consumers"]
    Browser["Web Browser<br/>(User / Developer)"]
    Shields["Shields.io Badge Service<br/>(img.shields.io)"]
  end

  subgraph EdgeNetwork["Vercel Edge Network & CDN"]
    EdgeRouter["Vercel Edge Router<br/>(TLS Termination & Security Headers)"]
    EdgeCache["Edge CDN Cache<br/>(Badge Cache: s-maxage=3600)"]
  end

  subgraph ComputeLayer["Vercel Serverless Compute (Node 20 / Next.js 16)"]
    RSC["React Server Components<br/>(/report, /dashboard, /share)"]
    AuditAPI["Audit Handler<br/>(POST /api/audit)"]
    BadgeAPI["Badge Handler<br/>(GET /api/badge/[owner]/[repo])"]
    RemediateAPI["Remediation Handler<br/>(POST /api/remediate)"]
    AuthAPI["NextAuth v5 Beta<br/>(/api/auth/[...nextauth])"]
  end

  subgraph StorageLayer["Database & Connection Pooling"]
    Pooler["Transaction Connection Pooler<br/>(PgBouncer / Supavisor)"]
    PostgresDB[("Managed PostgreSQL<br/>(Neon / Supabase / Railway)")]
  end

  subgraph ExternalAPIs["GitHub Platform Tier"]
    GitHubOAuth["GitHub OAuth 2.0<br/>(github.com/login/oauth)"]
    GitHubREST["GitHub REST API<br/>(api.github.com/repos)"]
    GitDataAPI["GitHub Git Data API<br/>(blobs, trees, commits, refs)"]
  end

  Browser -->|HTTPS Request| EdgeRouter
  Shields -->|GET /api/badge/...| EdgeRouter

  EdgeRouter -->|Cache Hit| EdgeCache
  EdgeRouter -->|Cache Miss / Dynamic| ComputeLayer

  ComputeLayer -->|"Pooled Queries (DATABASE_URL)"| Pooler
  ComputeLayer -->|"Direct DDL Migrations (DIRECT_URL)"| PostgresDB
  Pooler -->|"Multiplexed TCP Sockets"| PostgresDB

  AuthAPI <-->|OAuth Authorization & PKCE| GitHubOAuth
  AuditAPI <-->|Recursive Git Tree & Blobs| GitHubREST
  RemediateAPI <-->|Atomic Multi-File Commits| GitDataAPI
```

---

## 2. Pre-Flight Build Verification Runbook

Before deploying any commit or pull request to production, execute the standard local verification suite to ensure code formatting, type integrity, unit tests, and production compilation pass without errors.

### 2.1 Complete Local Pre-Flight Sequence

Run the following commands using [Bun](https://bun.sh) (or Node.js/npm equivalents):

```bash
# 1. Verify ESLint 9 rules and code formatting
bun run lint

# 2. Execute TypeScript 5.x typecheck across entire project
npx tsc --noEmit

# 3. Execute all automated Vitest unit and integration tests (2,220+ tests)
bun run test:run

# 4. Perform production Next.js build compilation with Turbopack
bun run build

# 5. (Optional) Run the production build locally to verify runtime behavior
bun run start
```

### 2.2 Expected Verification Outputs

| Check | Command | Expected Outcome |
| :--- | :--- | :--- |
| **Linting** | `bun run lint` | Exits with `0` errors. Any formatting issues must be resolved before deployment. |
| **Type Check** | `npx tsc --noEmit` | Exits with `0` errors. Verifies all React 19 types, Prisma models, and Octokit facades. |
| **Test Suite** | `bun run test:run` | All 81 test files and 2,220+ unit/integration tests pass (`Test Files 81 passed \| 1 skipped (82)`). |
| **Production Build** | `bun run build` | Compiles `.next` build output. Verifies App Router static generation and dynamic routes. |
| **Production Preview** | `bun run start` | Serves production build at `http://localhost:3000` for manual sanity inspection. |

> [!TIP]
> Always verify that your local working tree is clean (`git status -s`) and that no test artifacts (`dev.db`, temporary snapshots) or sensitive `.env` files are tracked by Git.

---

## 3. Vercel Deployment Configuration

[Vercel](https://vercel.com) is the recommended production platform for Repodoc, providing zero-configuration support for Next.js 16 App Router, Turbopack builds, serverless lambdas, and edge CDN caching.

### 3.1 Initial Repository Import

1. Log into your Vercel account and navigate to **Add New...** &rarr; **Project**.
2. Select your Git provider (GitHub) and import the **Repodoc** repository.
3. Configure the **Project Settings**:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./` (Repodoc adheres strictly to a root folder structure: `app/`, `components/`, `lib/`, `prisma/`, `types/` — **no** `src/` directory).
   - **Node.js Version:** `20.x` or `22.x` (Recommended: Node `20.x` LTS).

### 3.2 Build & Development Settings

Configure the project build commands in **Settings** &rarr; **General** &rarr; **Build & Development Settings**:

| Setting | Default Value | Recommended Production Value | Description |
| :--- | :--- | :--- | :--- |
| **Framework Preset** | `Next.js` | `Next.js` | Automatically tunes runtime optimizations for Next.js 16. |
| **Build Command** | `next build` | `bunx prisma migrate deploy && bun run build` | Runs pending database migrations on PostgreSQL before compiling the Next.js bundle. |
| **Output Directory** | `.next` | `.next` | Standard Next.js build artifact directory. |
| **Install Command** | `bun install` | `bun install` | Vercel natively detects `bun.lockb` and the `packageManager: "bun@1.4.3"` field in [`package.json`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/package.json). |
| **Development Command** | `next dev` | `bun dev` | Local development server command. |

```json
// Example package.json scripts configuration for automated deployments
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma migrate deploy && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

> [!IMPORTANT]
> Because [`package.json`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/package.json) specifies `trustedDependencies: ["@prisma/client", "@prisma/engines", "prisma", "sharp", "unrs-resolver"]`, Bun automatically executes post-install scripts to generate the Prisma Client binary. If you deploy using npm, ensure the install command runs `npm install && npx prisma generate`.

### 3.3 Serverless Function Region Selection

Database latency is the single largest contributor to serverless request response times. For optimal performance:
- In Vercel Project Settings &rarr; **Functions**, configure the **Serverless Function Region** to match your managed PostgreSQL database region.
- Example: If your Neon or Supabase database is provisioned in `AWS us-east-1` (N. Virginia) or `AWS us-east-2` (Ohio), set your Vercel Function region to `iad1` (Washington, D.C.). This reduces database round-trip latency from ~80ms down to <2ms.

---

## 4. Production Database Configuration & Migrations

Repodoc uses a dual-database design: embedded SQLite (`file:./dev.db`) for immediate, zero-friction local development, and managed PostgreSQL for production serverless deployments.

### 4.1 Transitioning from SQLite to PostgreSQL

Before initiating your first production deployment, prepare your Prisma schema for PostgreSQL:

1. Update the `datasource` block in [`prisma/schema.prisma`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/prisma/schema.prisma):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

2. Generate the initial PostgreSQL migration file locally:

```bash
# Temporarily set your development connection string to a PostgreSQL test instance
export DATABASE_URL="postgresql://user:password@localhost:5432/repodoc_dev"

# Create the migration SQL file in prisma/migrations/
npx prisma migrate dev --name init
```

3. Commit the generated `prisma/migrations/` directory to Git.

### 4.2 Production Migration Execution (`prisma migrate deploy`)

In production environments, **never** execute `prisma migrate dev` or `prisma db push`. Always execute:

```bash
bunx prisma migrate deploy
# or
npx prisma migrate deploy
```

#### Why `prisma migrate deploy` is Mandatory in Production:
- **Zero Interactivity:** Applies pending migrations silently without prompting for confirmation.
- **Strict History Verification:** Checks `_prisma_migrations` to ensure schema integrity and detect migration drift.
- **Zero Destructive Actions:** Never drops tables or resets columns under any circumstance.
- **Fail-Safe CI/CD Integration:** Halts deployment if a migration script fails, leaving the existing deployment active.

### 4.3 Serverless Connection Pooling Architecture

Standard relational databases allocate dedicated server processes and memory for each TCP socket. In serverless platforms like Vercel:
- Concurrent HTTP requests spin up independent serverless lambda instances.
- If 100 users trigger audits simultaneously, 100 lambdas instantiate `new PrismaClient()`.
- Standard PostgreSQL instances typically enforce a maximum of 20–100 connections. Unpooled connections quickly exhaust this limit, producing fatal errors:
  ```text
  FATAL: remaining connection slots are reserved for non-replication superuser connections
  P2024: Timed out fetching a new connection from the pool
  ```

To resolve this, Repodoc requires a **Transaction Connection Pooler** (PgBouncer or Supavisor) that sits between Vercel and PostgreSQL, multiplexing queries over a small pool of warm TCP connections.

```mermaid
flowchart TD
  subgraph VercelLambdas["Vercel Serverless Lambdas"]
    L1["Lambda 1 (Prisma)"]
    L2["Lambda 2 (Prisma)"]
    L3["Lambda 3 (Prisma)"]
    LN["Lambda N... (Prisma)"]
  end

  subgraph PoolerTier["Transaction Connection Pooler"]
    Pooler["PgBouncer / Supavisor<br/>(?pgbouncer=true or Port 6543)"]
  end

  subgraph Database["PostgreSQL Database"]
    Postgres[("Managed Postgres Server<br/>(max_connections: 50-100)")]
  end

  L1 -->|Short-lived query| Pooler
  L2 -->|Short-lived query| Pooler
  L3 -->|Short-lived query| Pooler
  LN -->|Short-lived query| Pooler

  Pooler -->|"Warm Shared Pool (10-20 connections)"| Postgres
```

### 4.4 Provider-Specific Connection Settings

#### Neon Serverless Postgres Setup
[Neon](https://neon.tech) provides built-in PgBouncer pooling:
1. In the Neon Console, go to **Connection Details** and check **Connection pooling**.
2. Configure your environment variables:
   ```bash
   # Pooled connection string for runtime application queries (contains -pooler and ?pgbouncer=true)
   DATABASE_URL="postgres://alex:secret123@ep-cool-flower-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"

   # Direct unpooled connection string for schema migrations (NO -pooler in hostname)
   DIRECT_URL="postgres://alex:secret123@ep-cool-flower-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
   ```

#### Supabase Postgres Setup
[Supabase](https://supabase.com) provides connection pooling via Supavisor:
1. In Supabase Project Settings &rarr; **Database** &rarr; **Connection string**, select **URI** and choose **Transaction** mode (Port `6543`).
2. Configure your environment variables:
   ```bash
   # Supabase Transaction Pooler (Port 6543, pgbouncer=true)
   DATABASE_URL="postgres://postgres.yourprojectref:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

   # Supabase Direct Connection (Port 5432 or Session Mode)
   DIRECT_URL="postgres://postgres.yourprojectref:yourpassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
   ```

#### Why `DIRECT_URL` is Required for Migrations
Connection poolers operating in **Transaction Mode** assign a connection only for the duration of a single transaction. However, Prisma migration commands (`prisma migrate deploy`) require:
- **PostgreSQL Advisory Locks:** To ensure only one migration runs at a time across concurrent builds.
- **DDL Execution:** Schema-altering operations (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`).
- **Prepared Statements:** Enabled during schema inspection.

By specifying `directUrl = env("DIRECT_URL")` in `schema.prisma`, Prisma automatically directs migration commands through the direct port while sending application queries through the pooler.

---

## 5. Production Environment Variables Checklist

Configure all environment variables in your Vercel Project under **Settings** &rarr; **Environment Variables**. Assign them to the **Production** environment (and **Preview** if appropriate).

### 5.1 Comprehensive Environment Variables Matrix

| Variable Name | Required | Example / Placeholder | Description & Security Policy |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-pooler.region.neon.tech/db?sslmode=require&pgbouncer=true` | Pooled PostgreSQL connection string for runtime queries. Must include `?pgbouncer=true`. |
| `DIRECT_URL` | **Yes** | `postgresql://user:pass@ep-direct.region.neon.tech/db?sslmode=require` | Unpooled direct PostgreSQL connection string for Prisma DDL migrations. |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | `https://repodoc.dev` | Canonical public HTTPS origin used for OpenGraph previews, canonical meta tags, and badge links. No trailing slash. |
| `NEXTAUTH_URL` | **Yes** | `https://repodoc.dev` | Canonical base URL for NextAuth.js OAuth callback validation. Must match canonical HTTPS production origin exactly. |
| `NEXTAUTH_SECRET` | **Yes** | `32-byte-base64-random-string` | Secret key used to encrypt and sign JWT session cookies. Generate via `openssl rand -base64 32`. |
| `GITHUB_CLIENT_ID` | **Yes** | `Ov23liXXXXXXXXXX` | Client ID from your production GitHub OAuth App. **Must NOT start with `Iv`**. |
| `GITHUB_CLIENT_SECRET` | **Yes** | `40-character-hex-secret` | Client secret from your production GitHub OAuth App. |
| `GITHUB_TOKEN` | *Optional* | `github_pat_XXXXXXXXXXXX` | GitHub personal access token (fine-grained or classic read-only) raising unauthenticated rate limits from 60 to 5,000 req/hr. |
| `AUTH_SECRET` | *Optional* | Same as `NEXTAUTH_SECRET` | Auth.js v5 alias for `NEXTAUTH_SECRET`. Supported natively. |
| `AUTH_URL` | *Optional* | Same as `NEXTAUTH_URL` | Auth.js v5 alias for `NEXTAUTH_URL`. Supported natively. |
| `AUTH_GITHUB_ID` | *Optional* | Same as `GITHUB_CLIENT_ID` | Auth.js v5 alias for `GITHUB_CLIENT_ID`. |
| `AUTH_GITHUB_SECRET` | *Optional* | Same as `GITHUB_CLIENT_SECRET` | Auth.js v5 alias for `GITHUB_CLIENT_SECRET`. |

> [!CAUTION]
> **Zero Secret Leakage Guarantee:** Never prefix database credentials, OAuth client secrets, or personal access tokens with `NEXT_PUBLIC_`. Variables without `NEXT_PUBLIC_` are never bundled into client-side JavaScript.

### 5.2 Generating `NEXTAUTH_SECRET`

Generate a cryptographically secure 32-byte secret in your terminal:

```bash
openssl rand -base64 32
```

Copy the generated base64 string directly into Vercel's `NEXTAUTH_SECRET` setting. Keep this secret stable across deployments; changing it will invalidate all active user sessions.

### 5.3 GitHub OAuth App Setup for Production

To enable GitHub sign-in, user dashboard persistence, and 1-click PR remediation in production:

1. In GitHub, navigate to **Settings** &rarr; **Developer settings** &rarr; **OAuth Apps** &rarr; **New OAuth App**.
   > [!IMPORTANT]
   > You must register an **OAuth App**, NOT a GitHub App. GitHub App Client IDs begin with `Iv` and are rejected before sign-in by Repodoc's security validator in [`lib/auth/config.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/config.ts#L25-L27).
2. Configure the application settings:
   - **Application name:** `Repodoc` (or your brand name)
   - **Homepage URL:** `https://repodoc.dev` (Your production domain)
   - **Authorization callback URL:** `https://repodoc.dev/api/auth/callback/github`
3. Click **Register application**.
4. Copy the **Client ID** to `GITHUB_CLIENT_ID`.
5. Click **Generate a new client secret** and copy the secret to `GITHUB_CLIENT_SECRET`.

---

## 6. Security & HTTP Header Hardening

Repodoc implements defense-in-depth security headers configured globally in [`next.config.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/next.config.ts). Every response served by the application adheres to strict cryptographic, MIME, framing, and origin security policies.

### 6.1 Content Security Policy (CSP) Breakdown

The Content Security Policy prevents Cross-Site Scripting (XSS), data exfiltration, clickjacking, and packet injection attacks:

```typescript
// next.config.ts Content Security Policy Definition
const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://assets.watermelon.sh https://avatars.githubusercontent.com https://img.shields.io;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();
```

| Directive | Value | Security Rationale |
| :--- | :--- | :--- |
| `default-src` | `'self'` | Denies loading resources from any external origin by default. |
| `script-src` | `'self' 'unsafe-inline'` *(prod)*<br/>`'self' 'unsafe-inline' 'unsafe-eval'` *(dev)* | Restricts JavaScript execution to internal bundles. `'unsafe-eval'` is strictly omitted in production to prevent arbitrary string code execution. |
| `style-src` | `'self' 'unsafe-inline'` | Permits Tailwind CSS v4 runtime class generation and animation keyframes. |
| `img-src` | `'self' blob: data: https://assets.watermelon.sh https://avatars.githubusercontent.com https://img.shields.io` | Permits application images, user avatars from GitHub CDN (`avatars.githubusercontent.com`), Shields.io badge previews, and data URI assets. |
| `font-src` | `'self'` | Confines web fonts to first-party origins. |
| `object-src` | `'none'` | Completely disables execution of legacy Flash, Java, or Silverlight plugins. |
| `base-uri` | `'self'` | Prevents attackers from injecting malicious `<base>` tags that redirect relative URLs. |
| `form-action` | `'self'` | Prevents malicious form submissions redirecting user data to external origins. |
| `frame-ancestors` | `'none'` | Completely prohibits embedding Repodoc in `<iframe>`, `<frame>`, `<embed>`, or `<object>` elements, preventing UI redress and clickjacking attacks. |
| `upgrade-insecure-requests` | *Directive flag* | Forces browsers to elevate any legacy HTTP requests to HTTPS before network dispatch. |

### 6.2 Additional Security Headers

In addition to CSP, Repodoc applies six hardening headers on all routes (`/:path*`):

```typescript
// Security headers applied in next.config.ts
[
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
]
```

1. **Strict-Transport-Security (HSTS):**
   - Value: `max-age=63072000; includeSubDomains; preload`
   - Enforces HTTPS for 2 years (63,072,000 seconds), mandates HTTPS across all subdomains, and qualifies the domain for the global browser HSTS preload list.
2. **X-Frame-Options:**
   - Value: `DENY`
   - Serves as a legacy fallback for browsers that do not support CSP `frame-ancestors 'none'`, prohibiting frame embedding.
3. **X-Content-Type-Options:**
   - Value: `nosniff`
   - Prevents browsers from MIME-sniffing responses away from the declared `Content-Type` header (e.g. executing an uploaded image as script).
4. **Referrer-Policy:**
   - Value: `strict-origin-when-cross-origin`
   - Protects user privacy by sending the full URL when navigating same-origin, but transmitting only the origin (`https://repodoc.dev`) on cross-origin requests, and omitting referrer entirely when downgrading from HTTPS to HTTP.
5. **Permissions-Policy:**
   - Value: `camera=(), microphone=(), geolocation=(), browsing-topics=()`
   - Disables access to sensitive hardware sensors (camera, microphone, GPS) and disables Google FLoC / Topics API advertising tracking.
6. **X-DNS-Prefetch-Control:**
   - Value: `on`
   - Permits browsers to pre-resolve DNS records for external resources (GitHub, Shields.io), accelerating outbound link transitions.

---

## 7. Post-Deployment Verification Smoke Tests

Following deployment, execute these 6 smoke tests against your live production domain (e.g. `https://repodoc.dev`).

```mermaid
sequenceDiagram
  autonumber
  actor Admin as "DevOps / Admin"
  participant Web as "Repodoc Web"
  participant Badge as "Badge API"
  participant Auth as "NextAuth / GitHub"
  participant Remediate as "Remediation Engine"

  Admin->>Web: "1. GET / (Landing Page)"
  Web-->>Admin: "200 OK (Rendered UI, No CSP Errors)"

  Admin->>Web: "2. POST /api/audit (octocat/Hello-World)"
  Web-->>Admin: "200 OK (Score, Breakdown AST, DB Cached)"

  Admin->>Badge: "3. GET /api/badge/octocat/Hello-World"
  Badge-->>Admin: "200 OK (Shields.io JSON, s-maxage=3600)"

  Admin->>Auth: "4. Sign In with GitHub"
  Auth-->>Admin: "Redirect & Return /dashboard (Session Cookie)"

  Admin->>Web: "5. GET /dashboard"
  Web-->>Admin: "200 OK (User Profile & Audited Repos)"

  Admin->>Remediate: "6. POST /api/remediate (Disposable Repo)"
  Remediate-->>Admin: "200 OK (PR Opened, Atomic Git Commit)"
```

### 7.1 Smoke Test 1: Landing Page & Security Header Inspection

Verify that the production landing page renders cleanly without console errors or CSP violations:

```bash
# Check HTTP status and security headers via cURL
curl -I https://repodoc.dev
```

**Expected Verifications:**
- HTTP status `200 OK`.
- Header `strict-transport-security` is present with `max-age=63072000; includeSubDomains; preload`.
- Header `content-security-policy` is present with `default-src 'self'`.
- Open browser DevTools &rarr; Console: Verify zero CSP violations or blocked asset scripts.

### 7.2 Smoke Test 2: Public Repository Audit Pipeline

Trigger an audit for a public reference repository (`octocat/Hello-World`):

```bash
# Execute audit request via cURL
curl -X POST https://repodoc.dev/api/audit \
  -H "Content-Type: application/json" \
  -d '{"owner": "octocat", "repo": "Hello-World"}'
```

**Expected Verifications:**
- HTTP status `200 OK`.
- Response JSON includes `healthScore`, `shareId` (8-character nanoid), `rubricVersion: "1.0.0"`, and `breakdown` object.
- Re-run the cURL command: Verify response time drops significantly (ETag 304 cache hit returning persisted report).
- Visit `https://repodoc.dev/report/octocat/Hello-World` in your browser: Verify circular health score gauge, category breakdown, and markdown badge preview render properly.

### 7.3 Smoke Test 3: Dynamic Shields.io Badge API

Verify that the Shields.io badge endpoint conforms to the Schema v1 specification and includes CDN caching headers:

```bash
curl -i https://repodoc.dev/api/badge/octocat/Hello-World
```

**Expected Verifications:**
- HTTP status `200 OK`.
- Header `Content-Type: application/json; charset=utf-8`.
- Header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
- Response JSON body matches Shields.io Endpoint schema:
  ```json
  {
    "schemaVersion": 1,
    "label": "repo health",
    "message": "35/100",
    "color": "red"
  }
  ```

### 7.4 Smoke Test 4: GitHub OAuth Sign-In & Session Isolation

Test the authentication flow using a production GitHub account:

1. On `https://repodoc.dev`, click **Sign In with GitHub**.
2. Verify redirect to `https://github.com/login/oauth/authorize`.
3. Check the requested permission scopes:
   - `read:user` & `user:email` (Profile and email address)
   - `public_repo` (Public repository access)
   - `workflow` (GitHub Actions workflow creation)
4. Authorize the application.
5. Verify seamless redirection back to `https://repodoc.dev/dashboard`.
6. Open browser DevTools &rarr; **Application** &rarr; **Cookies**:
   - Verify `__Secure-authjs.session-token` (or `__Secure-next-auth.session-token`) is present.
   - Verify cookie attributes: `Secure: true`, `HttpOnly: true`, `SameSite: Lax`.
   - Verify that the GitHub access token itself is **never** visible in cookie values or `/api/auth/session` JSON payloads.

### 7.5 Smoke Test 5: Authenticated User Dashboard

Verify the user dashboard functionality:

1. Navigate to `https://repodoc.dev/dashboard`.
2. Verify user avatar, GitHub handle, and analyzed repository count render correctly.
3. Verify that previously audited repositories appear in the repository grid.
4. Click **Re-audit** on any repository card: verify that an updated report is generated and the database record updates seamlessly.

### 7.6 Smoke Test 6: 1-Click Atomic Remediation PR

Test the automated remediation pipeline on a test or disposable repository:

1. Sign into Repodoc with an account that has push access to a test repository (e.g. `your-user/disposable-test-repo`).
2. Run an audit on the test repository.
3. Click the **Fix All** button in the report view.
4. Select available fixes (e.g., `license`, `gitignore`, `ci-workflow`, `security-policy`, `code-of-conduct`).
5. Fill in required parameters (e.g., License type, Copyright holder).
6. Click **Generate Remediation PR**.
7. Verify outcome:
   - Repodoc responds with `200 OK` and a link to the created pull request.
   - Inspect the pull request on GitHub: verify that **all selected files were added in a single atomic Git commit**.
   - Verify branch name is `repodoc/health-remediation`.
8. *(Optional Fork Fallback Test)*: Test remediation against a public repository where your account does **not** have write permissions. Verify that Repodoc automatically creates a fork under your personal account, polls for replication, commits to the fork branch, and opens a cross-repository pull request against upstream.

---

## 8. Operational Runbooks & Troubleshooting

### 8.1 Rollback Runbook

If a critical bug or regression is detected post-deployment:

1. **Instant Vercel Rollback:**
   - In the Vercel Dashboard, navigate to **Deployments**.
   - Locate the previous stable production deployment.
   - Click the **...** menu &rarr; **Promote to Production**.
   - Vercel instantly routes traffic back to the prior deployment artifact within seconds.
2. **Database Rollback:**
   - Because Repodoc's migrations are strictly additive (new tables, nullable columns, unique indexes), prior code versions remain compatible with newer database schemas.
   - If a rollback migration is required, apply a compensating migration:
     ```bash
     bunx prisma migrate resolve --rolled-back <migration_name>
     ```

### 8.2 Common Production Issues & Resolutions

#### Issue: `AuthConfigurationError: oauth_app_required`
- **Cause:** `GITHUB_CLIENT_ID` begins with `Iv`. A GitHub App was registered instead of an OAuth App.
- **Resolution:** Navigate to GitHub Settings &rarr; Developer settings &rarr; **OAuth Apps**, create an OAuth App, and replace `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in Vercel.

#### Issue: NextAuth `redirect_uri_mismatch`
- **Cause:** The Authorization callback URL configured in the GitHub OAuth App does not match `NEXTAUTH_URL`.
- **Resolution:** Verify GitHub OAuth App callback URL is set to `https://repodoc.dev/api/auth/callback/github` (exact match, including `https://` protocol). Ensure `NEXTAUTH_URL` has no trailing slash.

#### Issue: `FATAL: remaining connection slots are reserved` (Prisma / Postgres)
- **Cause:** Connecting directly to PostgreSQL without a transaction pooler, exhausting connections under serverless concurrency.
- **Resolution:** Verify `DATABASE_URL` connects through PgBouncer (Neon: `-pooler` hostname + `?pgbouncer=true`; Supabase: Port `6543`).

#### Issue: `P2024: Timed out fetching a new connection from the connection pool`
- **Cause:** Transaction pooler connection limit reached, or connection timeout too low.
- **Resolution:** Append `&connect_timeout=15` to `DATABASE_URL` and verify the pooler maximum client connections setting in your database provider dashboard.

#### Issue: GitHub API 403 / 429 Rate Limiting on Audits
- **Cause:** Unauthenticated IP limit (60 req/hr) exhausted on popular serverless IP ranges.
- **Resolution:** Configure the optional `GITHUB_TOKEN` environment variable with a GitHub Personal Access Token (classic `public_repo` or fine-grained read PAT) to elevate rate limits to 5,000 req/hr.

---

## 9. Security Maintenance & Token Rotation

- **Session Secret Rotation:** If `NEXTAUTH_SECRET` must be rotated, update the variable in Vercel and redeploy. All active sessions will expire safely, prompting users to re-authenticate on their next request.
- **OAuth Secret Rotation:** When generating a new GitHub OAuth App client secret, add the new secret to Vercel and trigger a redeploy before deleting the old secret from the GitHub Developer console.
- **Prisma Studio in Production:** Never expose Prisma Studio publicly. If database inspection is necessary, connect via an SSH tunnel or use the database provider's web console (Neon Console, Supabase Table Editor).
