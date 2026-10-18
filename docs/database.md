# Database Architecture & Migration Runbook

Repodoc utilizes **Prisma ORM 6** (`6.19.3`) as its type-safe database persistence layer. The database subsystem is architected around a dual-database model: zero-dependency **SQLite** (`file:./dev.db`) for immediate local development, and managed **PostgreSQL** (Neon, Supabase, or Railway) with connection pooling (PgBouncer or Supavisor) for production serverless deployments.

This document details Repodoc's data model schema, entity relationships, database access singletons, local SQLite workflows, and an exhaustive step-by-step production PostgreSQL migration and connection pooling runbook.

---

## 1. Executive Persistence Topology

Repodoc stores two primary entities: authenticated users (`User`) and audit report snapshots (`RepoReport`). The persistence architecture guarantees deterministic lookups, sub-millisecond point-in-time snapshot resolution, and fail-safe conditional caching against the GitHub Git Data API:

- **Type-Safe Access (`@prisma/client: 6.19.3`):** Strongly typed models generated into `node_modules/@prisma/client` via `prisma generate`.
- **Global Singleton (`lib/db.ts`):** Cached across Hot Module Replacement (HMR) reloads in development to prevent connection and file handle exhaustion.
- **Dual-Database Strategy:** Local development uses embedded SQLite (`file:./dev.db`). Production serverless runtimes (such as Vercel) connect to PostgreSQL via transaction poolers.
- **Atomic Upsert & Retry Mechanics (`lib/reports.ts`):** Composite unique constraints on repository coordinates (`owner` + `repo`) pair with nanoid collision retries to guarantee idempotent audit writes.
- **Data Boundary Isolation:** Database internal primary keys (`id`, `userId`) are stripped at the data access layer via `decodeReport()`, preventing internal identifier exposure to client runtimes.

### Core File Topology

| File | Role & Context | Description |
| :--- | :--- | :--- |
| [`prisma/schema.prisma`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/prisma/schema.prisma) | Schema Definition | Prisma datasource, client generator, and declarative definitions for `User` and `RepoReport`. |
| [`lib/db.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/db.ts) | Runtime Singleton | Safe `PrismaClient` initialization with `globalThis` caching across Next.js HMR cycles. |
| [`lib/reports.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/reports.ts) | Data Access Service | CRUD operations, atomic upsert with `P2002` retry handling, nanoid generation, and ETag cache queries. |
| [`lib/auth/callbacks.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/callbacks.ts) | User Sync Service | GitHub OAuth sign-in hook upserting `User` records by `githubId`. |
| [`lib/dashboard.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/dashboard.ts) | Dashboard Aggregator | Queries saved reports by repository owner and merges with live GitHub metadata. |
| [`.env.example`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/.env.example) | Environment Template | Documents `DATABASE_URL` configurations for SQLite and PostgreSQL. |

---

## 2. Data Model Architecture

The database schema models the relationship between GitHub identities and repository health audit snapshots.

### 2.1 Entity-Relationship Diagram

```mermaid
erDiagram
  USER ||--o{ REPO_REPORT : "creates / owns"
  USER {
    string id PK "cuid() primary key"
    string githubId UK "unique GitHub numerical ID as string"
    string username "GitHub login handle"
    string avatarUrl "nullable avatar image URL"
    int installationId "nullable GitHub App installation ID"
    datetime createdAt "default(now()) timestamp"
  }
  REPO_REPORT {
    string id PK "cuid() primary key"
    string shareId UK "unique 8-character nanoid permalink"
    string owner "normalized repository owner"
    string repo "normalized repository name"
    string defaultBranch "base branch (default 'main')"
    int healthScore "composite 0-100 score"
    string rubricVersion "rubric schema version (default '1.0.0')"
    json breakdown "category scores, check results, evidence AST"
    string etag "nullable GitHub tree commit ETag"
    string userId FK "nullable foreign key to User"
    datetime createdAt "record creation timestamp"
    datetime updatedAt "automatic record update timestamp"
  }
```

### 2.2 Model `User`

The `User` model represents an authenticated developer. Records are created or updated automatically during GitHub OAuth authentication via the NextAuth `jwt` callback in [`lib/auth/callbacks.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/callbacks.ts).

```prisma
model User {
  id             String       @id @default(cuid())
  githubId       String       @unique
  username       String
  avatarUrl      String?
  installationId Int?         // GitHub App installation ID
  reports        RepoReport[]
  createdAt      DateTime     @default(now())
}
```

#### Field Specifications

| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Collision-resistant Unique Identifier (CUID) serving as the internal primary key. |
| `githubId` | `String` | `@unique` | The GitHub account numeric identifier (e.g. `"583231"` for Octocat), stored as a string to preserve precision. Used as the unique lookup key during OAuth callbacks. |
| `username` | `String` | &mdash; | Current GitHub login handle (e.g. `"octocat"`). Synchronized from GitHub profile claims on each sign-in. |
| `avatarUrl` | `String?` | Optional | HTTPS URL pointing to the user's GitHub avatar. Synchronized on sign-in. |
| `installationId` | `Int?` | Optional | Reserved for GitHub App installation context when interacting with organizations or repository webhooks. |
| `reports` | `RepoReport[]` | Relation | One-to-many relation to `RepoReport` models created by this user. |
| `createdAt` | `DateTime` | `@default(now())` | UTC timestamp indicating when the user first signed in. |

> [!IMPORTANT]
> The `User` model deliberately does **not** include an `updatedAt` field in [`prisma/schema.prisma`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/prisma/schema.prisma). Profile claim synchronization is handled idempotently during OAuth token exchange.

### 2.3 Model `RepoReport`

The `RepoReport` model stores an evaluated repository health snapshot. Each record captures the overall health score, detailed rubric breakdown, raw check evidence, and remote Git tree ETag.

```prisma
model RepoReport {
  id            String   @id @default(cuid())
  shareId       String   @unique // Generated via nanoid(8) in application logic
  owner         String
  repo          String
  defaultBranch String   @default("main")
  healthScore   Int
  rubricVersion String   @default("1.0.0")
  breakdown     Json     // Category scores & detailed check results with evidence
  etag          String?  // GitHub tree ETag for conditional caching
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([owner, repo])
}
```

#### Field Specifications

| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Internal CUID primary key. Stripped by `decodeReport()` before serialization to clients. |
| `shareId` | `String` | `@unique` | Public 8-character URL-safe string generated via `nanoid(8)` (e.g. `"V1StGXR8"`). Used as the lookup key for public immutable share snapshots (`/share/[shareId]`). |
| `owner` | `String` | &mdash; | GitHub organization or account login owning the repository (normalized to lowercase). Part of composite unique constraint. |
| `repo` | `String` | &mdash; | GitHub repository name (normalized to lowercase). Part of composite unique constraint. |
| `defaultBranch` | `String` | `@default("main")` | The primary branch analyzed during the audit run. |
| `healthScore` | `Int` | &mdash; | Integer score from `0` to `100` computed by the deterministic Rubric v1.0 scoring engine. |
| `rubricVersion` | `String` | `@default("1.0.0")` | Semantic version of the rubric used to calculate the score. Enables cache invalidation when rules evolve. |
| `breakdown` | `Json` | &mdash; | Full JSON payload representing the `AuditReport` interface: 5 pillar scores, 12 checks, evidence objects, and remediation metadata. |
| `etag` | `String?` | Optional | GitHub Git Data commit tree ETag (e.g. `W/"68f8...""`). Used in conditional HTTP requests (`If-None-Match`) to serve cached audits when tree is unchanged (`304 Not Modified`). |
| `userId` | `String?` | Optional / FK | Foreign key referencing `User.id`. Associates the report with the authenticated auditor for dashboard rendering. Nullable for public/anonymous audits. |
| `user` | `User?` | `@relation(...)` | Optional relation to the `User` who triggered or claimed the audit. |
| `createdAt` | `DateTime` | `@default(now())` | UTC timestamp of initial audit creation. |
| `updatedAt` | `DateTime` | `@updatedAt` | UTC timestamp updated automatically whenever the report snapshot is refreshed. |

#### Composite Unique Constraint

```prisma
@@unique([owner, repo])
```

The composite constraint `@@unique([owner, repo])` serves critical architectural functions:
1. **Single Source of Truth:** Guarantees exactly one canonical latest report exists per repository coordinates, preventing duplicate reports from cluttering storage.
2. **Atomic Upserting:** Allows [`lib/reports.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/reports.ts) to execute atomic `prisma.repoReport.upsert({ where: { owner_repo: { owner, repo } } })` queries.
3. **High-Performance Lookups:** Automatically generates a composite B-Tree database index, ensuring $O(1)$ lookups for live report routes (`/report/[owner]/[repo]`) and Shields.io dynamic badges (`/api/badge/[owner]/[repo]`).

---

## 3. Database Access Layer Architecture

### 3.1 Prisma Client Singleton (`lib/db.ts`)

Next.js App Router applications utilize Hot Module Replacement (HMR) during local development. In an unmanaged setup, every file modification re-executes module code, creating a new `PrismaClient` instance with each compile. This rapidly exhausts available database connection pools and operating system file handles.

Repodoc eliminates this issue by caching the client on `globalThis` in [`lib/db.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/db.ts):

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma
```

#### Singleton Guarantees
- **Development Resilience:** Only one `PrismaClient` instance is instantiated per Node.js/Bun process lifetime across repeated HMR cycles.
- **Production Efficiency:** In production environments (`NODE_ENV === "production"`), the client is instantiated once per serverless worker/container without polluting global namespaces.
- **Log Level Optimization:** Development logs SQL queries, errors, and warnings for transparent debugging; production restricts logs strictly to `["error"]` to prevent log saturation and inadvertent query parameter leakage.

### 3.2 Report Persistence Manager (`lib/reports.ts`)

The persistence manager encapsulates all database queries for repository reports, enforcing data normalization, collision retries, and strict output sanitization:

```mermaid
flowchart TD
  AuditComplete["Scoring Engine Complete<br/>(AuditReport generated)"]
  Normalize["Normalize owner & repo to lowercase"]
  PrepareJSON["Prepare breakdown JSON AST payload"]
  UpsertLoop["Begin Upsert Attempt Loop<br/>(Max 3 attempts)"]
  UpsertQuery["prisma.repoReport.upsert({<br/>  where: { owner_repo },<br/>  create: { ...data, shareId: nanoid(8) },<br/>  update: data<br/>})"]
  P2002Check{"Prisma P2002<br/>Unique Constraint?"}
  Success["Return PersistedAuditReport<br/>(with winning shareId)"]
  Rethrow["Rethrow Error / Fail Closed"]

  AuditComplete --> Normalize --> PrepareJSON --> UpsertLoop
  UpsertLoop --> UpsertQuery
  UpsertQuery -->|Success| Success
  UpsertQuery -->|Error| P2002Check
  P2002Check -->|P2002 & Attempt < 2| UpsertLoop
  P2002Check -->|Other Error or Attempt = 2| Rethrow
```

#### 1. Atomic Upsert with P2002 Retry Loop
When multiple requests audit the same repository concurrently, or in the rare event of a `nanoid(8)` collision on the `shareId` index, Prisma throws error code `P2002` (`Unique constraint failed`). [`saveReport()`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/reports.ts#L60-L89) handles this with an exponential-free immediate 3-attempt retry loop:

```typescript
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const saved = await prisma.repoReport.upsert({
      where: { owner_repo: key },
      create: { ...key, ...data, shareId: nanoid(8) },
      update: data,
    });
    return { ...report, shareId: saved.shareId };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) {
      throw error;
    }
  }
}
```

#### 2. ETag-Aware Cache Queries
[`findCachedReport()`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/reports.ts#L49-L57) performs conditional validation:
- Checks if a report exists for the given repository.
- Validates that the report contains a valid `etag`.
- Verifies that `row.rubricVersion === RUBRIC_VERSION`. If the rubric version has changed (e.g. from `1.0.0` to `2.0.0`), the cache is invalidated and a fresh audit is executed.

#### 3. Data Sanitization Boundary (`decodeReport()`)
Database records contain internal surrogate identifiers (`id`, `userId`). The [`decodeReport()`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/reports.ts#L10-L22) function validates the stored JSON payload against the `isAuditReport` type guard, asserts that `shareId` strictly matches `/^[A-Za-z0-9_-]{8}$/`, and returns a clean `PersistedAuditReport` stripped of database IDs.

---

## 4. Local Development Runbook (SQLite)

For local development, Repodoc uses an embedded SQLite database. This provides instant developer onboarding with zero infrastructure requirements (no Docker containers, background services, or cloud credentials required).

### 4.1 Environment Configuration

Configure `DATABASE_URL` in `.env.local` or `.env`:

```bash
# prisma/dev.db is stored relative to the project prisma directory
DATABASE_URL="file:./dev.db"
```

### 4.2 Schema Synchronization (`prisma db push`)

To synchronize the Prisma schema directly to your local SQLite database without creating migration files:

```bash
# Using Bun (primary package manager)
bunx prisma db push

# Or using npx
npx prisma db push
```

Output:
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

🚀  Your database is now in sync with your Prisma schema. Done in 32ms
```

> [!TIP]
> `prisma db push` is designed for prototyping and local schema iterations. It directly updates the target database schema to match `schema.prisma` without tracking migration history tables (`_prisma_migrations`).

### 4.3 Generating the Prisma Client

Whenever you modify `prisma/schema.prisma`, regenerate the TypeScript client:

```bash
bunx prisma generate
# or
npx prisma generate
```

### 4.4 Inspecting Data with Prisma Studio

Prisma Studio provides an interactive, visual web interface to inspect, filter, and modify records in `User` and `RepoReport`:

```bash
bunx prisma studio
# or
npx prisma studio
```

Prisma Studio opens automatically at `http://localhost:5555`. You can inspect:
- `User` rows: verify `githubId`, `username`, and associated report relations.
- `RepoReport` rows: inspect `shareId`, `healthScore`, `breakdown` JSON AST trees, and `etag` strings.

### 4.5 Resetting the Local Database

To wipe local data and reinitialize an empty SQLite database:

```bash
bunx prisma db push --force-reset
# or simply remove the file and push:
rm -f prisma/dev.db prisma/dev.db-journal
bunx prisma db push
```

---

## 5. Production Migration Runbook (PostgreSQL)

### 5.1 Why SQLite Fails on Serverless Platforms

Deploying an application using SQLite to serverless hosting platforms (such as **Vercel**, **AWS Lambda**, or **Cloudflare Pages**) will result in runtime errors and data loss:

1. **Ephemeral Filesystems:** Serverless function containers are short-lived microVMs. Any write to `file:./dev.db` writes only to the temporary container filesystem. When the container freezes or terminates, the database file is destroyed.
2. **No Cross-Instance State Sharing:** Two concurrent requests routed to separate serverless function instances access isolated, out-of-sync local files. Updates in one container are invisible to others.
3. **File Lock Contention:** SQLite relies on POSIX file locks. Under concurrent serverless invocations, multiple processes attempting write locks trigger `SQLITE_BUSY: database is locked` errors.
4. **Read-Only Deployments:** Modern build outputs on Vercel mount application code on read-only filesystems, preventing SQLite from creating journal files (`dev.db-journal` or `dev.db-wal`).

**Production Solution:** A managed, external **PostgreSQL** database service (such as [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)).

---

### 5.2 Step-by-Step Provider Migration Guide

Follow these steps to transition Repodoc from local SQLite to production PostgreSQL.

#### Step 1: Update `prisma/schema.prisma`

Change the `datasource db` block in [`prisma/schema.prisma`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/prisma/schema.prisma) from `sqlite` to `postgresql`. Add the `directUrl` configuration for migration execution:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id             String       @id @default(cuid())
  githubId       String       @unique
  username       String
  avatarUrl      String?
  installationId Int?         // GitHub App installation ID
  reports        RepoReport[]
  createdAt      DateTime     @default(now())
}

model RepoReport {
  id            String   @id @default(cuid())
  shareId       String   @unique // Generated via nanoid(8) in application logic
  owner         String
  repo          String
  defaultBranch String   @default("main")
  healthScore   Int
  rubricVersion String   @default("1.0.0")
  breakdown     Json     // Category scores & detailed check results with evidence
  etag          String?  // GitHub tree ETag for conditional caching
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([owner, repo])
}
```

> [!NOTE]
> Prisma handles the `Json` field type transparently across providers: in SQLite it maps to `TEXT`, while in PostgreSQL it automatically maps to native, high-performance binary `jsonb`.

---

#### Step 2: Configure Environment Variables

PostgreSQL requires two connection strings:
1. `DATABASE_URL`: Routed through a **connection pooler** (PgBouncer or Supavisor) in Transaction Mode. Used by serverless runtime queries.
2. `DIRECT_URL`: Direct TCP connection to the PostgreSQL instance (bypassing poolers). Used by Prisma CLI migration commands (`prisma migrate`).

Configure your `.env` or deployment platform environment variables:

```bash
# -----------------------------------------------------------------------------
# Runtime Pooled Connection (Used by Next.js application queries)
# -----------------------------------------------------------------------------
DATABASE_URL="postgres://user:password@ep-cool-flower-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# -----------------------------------------------------------------------------
# Direct Connection (Used exclusively by prisma migrate dev and deploy)
# -----------------------------------------------------------------------------
DIRECT_URL="postgres://user:password@ep-cool-flower-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

#### Step 3: Generate the Initial Migration (`prisma migrate dev`)

Against a staging or development PostgreSQL database, create your initial SQL migration files:

```bash
# Creates prisma/migrations/<timestamp>_init/migration.sql and applies it to the DB
bunx prisma migrate dev --name init
# or
npx prisma migrate dev --name init
```

This command:
1. Translates `prisma/schema.prisma` into standard PostgreSQL DDL statements (`CREATE TABLE`, `CREATE UNIQUE INDEX`, `ALTER TABLE ADD CONSTRAINT`).
2. Creates the `_prisma_migrations` tracking table in your database.
3. Applies the SQL migration to the target database.
4. Automatically runs `prisma generate` to update the TypeScript client.

The generated `migration.sql` will look similar to:

```sql
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "installationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoReport" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "healthScore" INTEGER NOT NULL,
    "rubricVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "breakdown" JSONB NOT NULL,
    "etag" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "RepoReport_shareId_key" ON "RepoReport"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX "RepoReport_owner_repo_key" ON "RepoReport"("owner", "repo");

-- AddForeignKey
ALTER TABLE "RepoReport" ADD CONSTRAINT "RepoReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

#### Step 4: Automated Production Deployments (`prisma migrate deploy`)

In production environments (such as CI/CD pipelines and Vercel build phases), **never** run `prisma migrate dev` or `prisma db push`. Instead, execute:

```bash
bunx prisma migrate deploy
# or
npx prisma migrate deploy
```

#### Why `prisma migrate deploy` is Mandatory in Production:
- **Zero Interactivity:** It never prompts for interactive confirmation.
- **Fail-Safe Application:** Applies only pending migrations from the `prisma/migrations/` directory that have not yet been recorded in `_prisma_migrations`.
- **Drift Detection:** Fails immediately if the database schema has been tampered with or if a migration history checksum mismatch is detected.
- **No Data Resets:** It will never delete or reset tables under any circumstances.

#### Integrating with Vercel Build Command
In your Vercel Project Settings (`Build & Development Settings`), update the **Build Command**:

```bash
bunx prisma migrate deploy && bun run build
# or if using npm:
npx prisma migrate deploy && npm run build
```

Alternatively, add `prisma migrate deploy` to the `package.json` build script:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && prisma generate && next build"
  }
}
```

---

## 6. Serverless Connection Pooling Deep Dive

### 6.1 The Serverless Concurrency Problem

Standard monolithic servers (e.g. Express on a VM or container) maintain a single persistent connection pool of 5–20 database connections shared across all incoming HTTP threads.

In serverless architectures (such as **Vercel Serverless Functions**):
- Every incoming HTTP request or concurrent visitor can spin up an isolated, stateless function instance.
- If 100 users audit repositories concurrently, 100 separate serverless instances initialize.
- Each instance runs `new PrismaClient()`, opening its own TCP connection to the database.
- Standard PostgreSQL instances enforce a strict `max_connections` ceiling (typically 20–100 connections on standard tiers).
- When connections exceed this ceiling, PostgreSQL rejects new queries with:
  ```
  FATAL: remaining connection slots are reserved for non-replication superuser connections
  ```
  or clients experience severe latency timeouts (`P2024: Timed out fetching a new connection from the pool`).

```mermaid
flowchart TD
  subgraph ServerlessLambda["Serverless Lambda Invocations (Vercel)"]
    L1["Lambda Instance 1<br/>(Prisma Client)"]
    L2["Lambda Instance 2<br/>(Prisma Client)"]
    L3["Lambda Instance 3<br/>(Prisma Client)"]
    LN["Lambda Instance N...<br/>(Prisma Client)"]
  end

  subgraph PoolerLayer["Connection Pooling Layer (Transaction Mode)"]
    Pooler["PgBouncer / Supavisor Pooler<br/>(Port 6543 or ?pgbouncer=true)"]
  end

  subgraph DatabaseLayer["Managed PostgreSQL Instance"]
    PostgresDB[("PostgreSQL Server<br/>(max_connections: 50-100)")]
  end

  L1 -->|Short-lived query| Pooler
  L2 -->|Short-lived query| Pooler
  L3 -->|Short-lived query| Pooler
  LN -->|Short-lived query| Pooler

  Pooler -->|"Shared Persistent TCP Sockets (e.g. 10-20 connections)"| PostgresDB
```

**The Solution:** Connection poolers (such as PgBouncer or Supavisor) maintain a small, warm pool of persistent connections to PostgreSQL. Thousands of serverless lambdas connect to the pooler, which multiplexes their queries over existing sockets without exhausting database limits.

---

### 6.2 Neon Serverless Postgres Setup

[Neon](https://neon.tech) provides native connection pooling using built-in PgBouncer instances.

#### 1. Retrieve Connection Strings
In the Neon Console:
1. Navigate to your Project Dashboard &rarr; **Connection Details**.
2. Check the **"Connection pooling"** checkbox.
3. Neon appends `-pooler` to the endpoint hostname and adds `?sslmode=require`.

#### 2. Configure Environment Variables
Set the pooled URL as `DATABASE_URL` (appending `&pgbouncer=true`), and the unpooled URL as `DIRECT_URL`:

```bash
# Pooled connection string for runtime queries (note: -pooler in host, pgbouncer=true)
DATABASE_URL="postgres://alex:secret123@ep-cool-flower-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"

# Direct unpooled connection string for migrations (note: NO -pooler in host)
DIRECT_URL="postgres://alex:secret123@ep-cool-flower-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
```

> [!IMPORTANT]
> The `?pgbouncer=true` parameter instructs Prisma Client to bypass prepared statements, which are incompatible with PgBouncer's Transaction Mode pooling.

---

### 6.3 Supabase Postgres Setup

[Supabase](https://supabase.com) provides connection pooling powered by Supavisor.

#### 1. Retrieve Connection Strings
In your Supabase Project:
1. Navigate to **Project Settings** &rarr; **Database** &rarr; **Connection string**.
2. Select the **URI** tab.
3. Switch Mode from **Session** to **Transaction** (Port `6543`).

#### 2. Configure Environment Variables

```bash
# Supabase Transaction Pooler (Port 6543, pgbouncer=true)
DATABASE_URL="postgres://postgres.yourprojectref:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Supabase Direct Connection (Port 5432 or Session Mode)
DIRECT_URL="postgres://postgres.yourprojectref:yourpassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

---

### 6.4 Why `DIRECT_URL` is Required for Migrations

When running migrations via `prisma migrate dev` or `prisma migrate deploy`, Prisma requires features that connection poolers running in **Transaction Mode** do not support:

| Feature | Application Queries | Migration Execution (`prisma migrate`) |
| :--- | :--- | :--- |
| **Connection Type** | Pooled (`DATABASE_URL`) | Direct (`DIRECT_URL`) |
| **PgBouncer Mode** | Transaction Mode (sockets shared per query) | Bypasses pooler (dedicated session socket) |
| **PostgreSQL Advisory Locks** | Not required | **Required** (prevents concurrent migrations) |
| **Prepared Statements** | Disabled (`?pgbouncer=true`) | Enabled |
| **Temporary Tables / DDL** | Simple DML (`SELECT`, `INSERT`, `UPDATE`) | Schema DDL (`CREATE TABLE`, `ALTER TABLE`) |

By specifying `directUrl = env("DIRECT_URL")` in `prisma/schema.prisma`, Prisma automatically uses `DIRECT_URL` when executing migration commands, while using `DATABASE_URL` for normal runtime queries.

---

## 7. Performance, Indexing & Data Integrity

### 7.1 Index Strategy

Repodoc maintains explicit indexes designed for sub-millisecond query execution:

| Index Target | Type | Purpose | Query Optimization |
| :--- | :--- | :--- | :--- |
| `User(githubId)` | Unique B-Tree | OAuth identity lookup on sign-in | `prisma.user.upsert({ where: { githubId } })` &rarr; $O(1)$ |
| `RepoReport(shareId)` | Unique B-Tree | Public snapshot view lookup | `prisma.repoReport.findUnique({ where: { shareId } })` &rarr; $O(1)$ |
| `RepoReport(owner, repo)` | Composite Unique B-Tree | Repository audit cache lookup & idempotent upsert | `prisma.repoReport.findUnique({ where: { owner_repo } })` &rarr; $O(1)$ |

### 7.2 JSON Storage Optimization (`breakdown`)

The `breakdown` field stores the entire `AuditReport` data structure:
- **PostgreSQL Native `jsonb`:** Stores parsed binary JSON with whitespace removed and keys deduplicated.
- **Fast Serialization:** The client directly deserializes the JSON tree without requiring multiple relational joins across tables for check findings, evidence parameters, and remediation details.
- **Payload Discipline:** Repodoc keeps evidence payloads bounded (e.g. file paths and AST line numbers, not entire 10MB repository files) to ensure row sizes remain under 50KB.

### 7.3 Conditional ETag Caching Mechanics

Repodoc coordinates with the GitHub REST API to minimize database writes and GitHub API quota consumption:

```mermaid
sequenceDiagram
  autonumber
  participant Client as Browser / Badge CDN
  participant API as Repodoc Route Handler
  participant DB as Database (Prisma)
  participant GitHub as GitHub Git Data API

  Client->>API: POST /api/audit { owner, repo }
  API->>DB: findCachedReport(owner, repo)
  DB-->>API: Return cached row + ETag

  alt ETag exists and Rubric matches
    API->>GitHub: GET /git/trees/{branch}?recursive=1<br/>Header: If-None-Match "etag"
    alt GitHub returns 304 Not Modified
      GitHub-->>API: 304 Not Modified (0 quota cost)
      API-->>Client: 200 OK (Return cached report)
    else GitHub returns 200 OK (Tree changed)
      GitHub-->>API: 200 OK (New tree payload + new ETag)
      API->>API: Compute ScoringEngine.run()
      API->>DB: saveReport(newReport, newEtag)
      DB-->>API: Return updated record
      API-->>Client: 200 OK (Return fresh report)
    end
  else No cache or outdated Rubric
    API->>GitHub: GET /git/trees/{branch}?recursive=1
    GitHub-->>API: 200 OK (Full tree payload)
    API->>API: Compute ScoringEngine.run()
    API->>DB: saveReport(newReport, newEtag)
    DB-->>API: Return updated record
    API-->>Client: 200 OK (Return fresh report)
  end
```

---

## 8. Operational Runbook & Troubleshooting Reference

### 8.1 Common Prisma Errors & Resolutions

#### 1. `P2002` &mdash; Unique constraint failed
- **Symptom:** `Unique constraint failed on the fields: (owner, repo)` or `(shareId)`.
- **Cause:** Two concurrent audit requests attempted to insert a report for the same repository at the exact same millisecond, or a nanoid collision occurred.
- **Remediation:** Handled automatically in application logic via the 3-attempt retry loop in [`lib/reports.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/reports.ts). If observed manually in scripts, ensure queries use `upsert` rather than `create`.

#### 2. `P1001` &mdash; Can't reach database server
- **Symptom:** `Can't reach database server at hostname:port`.
- **Cause:** Network unreachable, invalid credentials, firewall block, or database compute is paused (e.g. Neon cold start).
- **Remediation:**
  1. Verify your network connection and test connectivity via `psql "$DIRECT_URL"`.
  2. Verify that `sslmode=require` is present in the connection string.
  3. Increase `connect_timeout` in the connection string: `?connect_timeout=30`.

#### 3. `P2024` &mdash; Timed out fetching a new connection from the connection pool
- **Symptom:** `Timed out fetching a new connection from the connection pool (more than 10000ms)`.
- **Cause:** Connection pool starvation. Either `DATABASE_URL` is pointing directly to Postgres instead of the pooler, or `connection_limit` is set too low.
- **Remediation:**
  1. Ensure `DATABASE_URL` connects through PgBouncer/Supavisor (port `6543` for Supabase, `-pooler` hostname for Neon).
  2. Append `&connection_limit=10` to `DATABASE_URL` to limit per-lambda pool size.

#### 4. `P3009` &mdash; Migrate found failed migrations in the target database
- **Symptom:** `Migrate found failed migrations in the target database. New migrations will not be applied until you resolve these issues`.
- **Cause:** A previous migration failed midway due to invalid SQL or connection drops.
- **Remediation:** Inspect `_prisma_migrations` table and mark the migration resolved using:
  ```bash
  bunx prisma migrate resolve --rolled-back "<migration_name>"
  # or
  bunx prisma migrate resolve --applied "<migration_name>"
  ```

---

### 8.2 Operational Commands Reference

| Operation | Command | Execution Context |
| :--- | :--- | :--- |
| **Inspect Local DB** | `bunx prisma studio` | Local Development |
| **Push Schema to SQLite** | `bunx prisma db push` | Local Development |
| **Reset SQLite DB** | `bunx prisma db push --force-reset` | Local Development |
| **Create New Migration** | `bunx prisma migrate dev --name <feature>` | Staging / Development |
| **Check Migration Status** | `bunx prisma migrate status` | CI/CD / Staging / Production |
| **Deploy Pending Migrations** | `bunx prisma migrate deploy` | Production Build Phase |
| **Detect Schema Drift** | `bunx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-url "$DATABASE_URL"` | Diagnostic Runbook |
| **Regenerate Client** | `bunx prisma generate` | Build & Local Development |

---

### 8.3 Integration Test Isolation Pattern

Repodoc's automated test suite includes integration tests for database persistence in [`lib/__tests__/reports.integration.test.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/__tests__/reports.integration.test.ts) and [`lib/auth/__tests__/auth.integration.test.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/__tests__/auth.integration.test.ts).

To ensure complete test isolation without conflicting with local development data:
1. Each test run generates a temporary SQLite database in the operating system temp directory (`mkdtempSync(path.join(tmpdir(), "repodoc-reports-"))`).
2. Vitest runs `prisma db push --skip-generate` against the temporary database.
3. The test suite injects the isolated client via module mocking (`vi.mock("@/lib/db")`).
4. On test completion, temporary database files are unlinked and destroyed in `afterAll()`.
