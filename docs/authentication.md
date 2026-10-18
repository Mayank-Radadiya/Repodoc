# Authentication & Security Model

Repodoc implements an enterprise-grade, zero-leak authentication architecture powered by **NextAuth.js v5 Beta** (`5.0.0-beta.32`), pinned for seamless compatibility with **Next.js 16** (`16.4.0`) and **React 19** (`19.3.0`).

This document provides a comprehensive specification of Repodoc's authentication lifecycle, GitHub OAuth App setup requirements, scope justifications, server-only token isolation boundary, session invalidation mechanics, and security hardening guarantees.

---

## 1. Architectural Principles & Overview

Repodoc's authentication system is engineered around four core security principles:

1. **Zero-Leak Token Isolation:** Provider OAuth access tokens are stored strictly within AES-GCM encrypted, HTTP-only session cookies. Tokens never cross into the browser runtime, are omitted from public session endpoints (`/api/auth/session`), and are inaccessible to client-side JavaScript.
2. **Deterministic Client ID Binding:** JWT sessions are cryptographically bound to the active `GITHUB_CLIENT_ID`. Rotating credentials cleanly invalidates all existing sessions without database migrations or dangling authorization states.
3. **Fail-Closed Request-Time Validation:** Environment variables are evaluated lazily per request rather than at build time. Public pages remain statically optimizable, while missing or malformed credentials immediately fail closed with sanitized error logs.
4. **Principle of Least Privilege:** Repodoc requests only the exact scopes necessary for identity verification and atomic repository remediation, explicitly separating public repository management from administrative privileges.

### Core File Topology

The authentication subsystem is isolated within the following files:

| File | Execution Context | Responsibility |
| :--- | :--- | :--- |
| [`auth.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/auth.ts) | Server-only (`import "server-only"`) | Root entry point exporting `{ handlers, auth, signIn, signOut }` initialized with `getAuthConfig()`. |
| [`lib/auth/config.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/config.ts) | Server-only (`import "server-only"`) | Runtime configuration factory, environment fallback (`GITHUB_*` and `AUTH_*`), canonical origin verification, and provider options. |
| [`lib/auth/callbacks.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/callbacks.ts) | Server-only (`import "server-only"`) | `jwt` and `session` callbacks, database upsert by `githubId`, and public session allowlisting. |
| [`lib/auth/claims.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/claims.ts) | Server-only (`import "server-only"`) | Claim validation, expiration enforcement, client ID binding checks, and GitHub App token detection. |
| [`lib/auth.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth.ts) | Server-only (`import "server-only"`) | High-level `getGitHubSession()` helper for Server Components, Server Actions, and Route Handlers. |
| [`app/api/auth/[...nextauth]/route.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/app/api/auth/%5B...nextauth%5D/route.ts) | Server Route Handler | Catch-all HTTP handlers (`GET`, `POST`) delegating to NextAuth with sanitized error wrapping. |
| [`types/next-auth.d.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/types/next-auth.d.ts) | TypeScript Types | Module augmentations for `next-auth` (`Session`) and `next-auth/jwt` (`JWT`). |
| [`components/auth/`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/components/auth/) | Client Components (`"use client"`) | UI presentation primitives: `AuthControls`, `AuthGate`, and `AuthProvider`. |

---

## 2. NextAuth.js v5 Beta Architecture

### 2.1 Server-Only Root Entry Point

NextAuth.js v5 Beta replaces legacy middleware wrappers with lightweight handler factories. Repodoc initializes auth in [`auth.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/auth.ts):

```typescript
import "server-only";
import NextAuth from "next-auth";
import { getAuthConfig } from "@/lib/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth(() => getAuthConfig());
```

Key architectural details:
- **`import "server-only"`**: Guarantees that bundling tools (Turbopack, Webpack) reject any attempt to import auth logic into Client Components.
- **Lazy Config Factory (`() => getAuthConfig()`):** NextAuth receives a factory function rather than a static configuration object. This ensures configuration is evaluated at request time, allowing Next.js build-time static generation to execute without requiring OAuth environment secrets.

### 2.2 Request-Time Configuration & Origin Validation

In [`lib/auth/config.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/config.ts), `getAuthSettings()` extracts and validates required environment variables on every request:

```typescript
export function getAuthSettings() {
  const secret = (process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim());
  const clientId = (process.env.GITHUB_CLIENT_ID?.trim() || process.env.AUTH_GITHUB_ID?.trim());
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET?.trim() || process.env.AUTH_GITHUB_SECRET?.trim());
  const origin = (process.env.NEXTAUTH_URL?.trim() || process.env.AUTH_URL?.trim());

  if (!secret || !clientId || !clientSecret || !origin) throw new AuthConfigurationError();
  if (clientId.startsWith("Iv")) throw new AuthConfigurationError("oauth_app_required");

  let url: URL;
  try { url = new URL(origin); } catch { throw new AuthConfigurationError(); }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol === "http:" &&
      (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  ) throw new AuthConfigurationError();

  return { secret, clientId, clientSecret, useSecureCookies: url.protocol === "https:" };
}
```

#### Strict Origin Canonicalization Rules
1. **Canonical Root:** The origin URL must have path `/`, no search query parameters (`?query=value`), and no URL fragment (`#hash`).
2. **Credential Sanitization:** URLs embedding basic auth (`https://user:pass@host`) are strictly rejected.
3. **HTTPS Enforcement:** Production (`NODE_ENV === "production"`) requires `https:`. Plain `http:` is permitted only in local development when hostname is `localhost`, `127.0.0.1`, or `[::1]`.
4. **Environment Aliasing:** Seamlessly supports legacy NextAuth variables (`NEXTAUTH_*`) as well as Auth.js v5 standard conventions (`AUTH_*`).

### 2.3 Route Handler & Sanitized Error Logging

The catch-all route at [`app/api/auth/[...nextauth]/route.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/app/api/auth/%5B...nextauth%5D/route.ts) exposes Auth.js endpoints (`/api/auth/signin`, `/api/auth/callback/github`, `/api/auth/session`, `/api/auth/csrf`, `/api/auth/signout`).

```typescript
import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { AuthConfigurationError } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  try {
    return await handlers[request.method === "POST" ? "POST" : "GET"](request);
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) throw error;
    console.error("[auth]", error.message);
    const body = error.code === "oauth_app_required"
      ? { error: error.message, code: error.code }
      : { error: "Authentication is not configured." };
    return Response.json(body, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export const POST = GET;
```

> [!NOTE]
> Next.js 16 Cache Components disallows explicit `runtime = "nodejs"` segment configurations when dynamic caching is active; Node.js is selected automatically as the default runtime.
>
> In [`lib/auth/config.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/config.ts), the Auth.js logger is explicitly customized to log only high-level error codes (`error.type`), stripping any nested provider response objects or payload parameters:
> ```typescript
> logger: {
>   error(error) {
>     console.error("[auth]", error instanceof AuthError ? error.type : "AuthenticationError");
>   },
> }
> ```

---

## 3. GitHub OAuth App Setup Guide

Repodoc requires a registered **GitHub OAuth App** to authenticate users and generate pull requests.

### 3.1 Step-by-Step Registration

1. Log in to your GitHub account and navigate to **Settings** &rarr; **Developer settings** &rarr; **OAuth Apps** (or visit directly: `https://github.com/settings/developers`).
2. Click **New OAuth App** (or **Register a new application**).
3. Fill out the application fields according to your deployment target:

| Field | Development Value | Production Value |
| :--- | :--- | :--- |
| **Application name** | `Repodoc (Local Development)` | `Repodoc` (or your company branding) |
| **Homepage URL** | `http://localhost:3000` | `https://repodoc.example.com` |
| **Application description** | Repository health auditor and 1-click remediation platform | Production repository health observatory |
| **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` | `https://repodoc.example.com/api/auth/callback/github` |

4. Click **Register application**.
5. On the application details page:
   - Copy the **Client ID** (e.g. `Ov23...` or a 20-character hex string).
   - Under **Client secrets**, click **Generate a new client secret**.
   - Immediately copy the generated secret string (it is displayed only once).

---

### 3.2 Crucial Distinction: OAuth App vs. GitHub App

> [!CAUTION]
> **You MUST register an OAuth App, NOT a GitHub App.**
> Registering a GitHub App will fail validation and prevent user sign-in.

#### Why GitHub Apps Are Incompatible

| Dimension | GitHub OAuth App (Required) | GitHub App (Rejected) |
| :--- | :--- | :--- |
| **Client ID Format** | Standard hex string or modern `Ov23...` prefix | Always begins with `Iv` (e.g., `Iv1.8a2b3c...`, `Iv23...`) |
| **Token Format** | OAuth User Bearer Tokens (`gho_...`) | User-to-server (`ghu_...`) or installation (`ghs_...`) tokens |
| **Authorization Flow** | RFC 6749 OAuth 2.0 Authorization Code Flow with PKCE | Multi-tenant GitHub App installation & webhook handshakes |
| **Scope Model** | OAuth Scopes (`read:user`, `public_repo`, `workflow`) | Granular repository permissions requiring organization installation |

#### Repodoc's Strict Validation Checks

Repodoc actively validates client IDs and incoming tokens to prevent misconfigured setups:

1. **Client ID Prefix Guard ([`lib/auth/config.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/config.ts)):**
   ```typescript
   if (clientId.startsWith("Iv")) throw new AuthConfigurationError("oauth_app_required");
   ```
   If a GitHub App client ID is provided, Repodoc rejects the request *before* initiating any redirect to GitHub, returning an actionable 500 JSON error:
   ```json
   {
     "code": "oauth_app_required",
     "error": "GitHub sign-in requires OAuth App credentials. Register an OAuth App under GitHub Settings > Developer settings > OAuth Apps, replace GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, then restart the server."
   }
   ```
2. **Token Format Guard ([`lib/auth/claims.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/claims.ts)):**
   ```typescript
   export function isGitHubAppToken(value: string): boolean {
     return /^(ghu_|ghs_)/.test(value.trim());
   }
   ```
   Even if a token is obtained via an alternative route, any token starting with `ghu_` (GitHub App user token) or `ghs_` (GitHub App server/installation token) is immediately rejected in both `jwt` callbacks and `getGitHubSession()`.

---

### 3.3 Environment Configuration

Add the following environment variables to your `.env` (or `.env.local` for development):

```bash
# ==============================================================================
# GitHub OAuth App Credentials (REQUIRED for Authentication & Remediation)
# Register at: GitHub Settings > Developer settings > OAuth Apps > New OAuth App
# ==============================================================================
GITHUB_CLIENT_ID="your_github_client_id_here"
GITHUB_CLIENT_SECRET="your_github_client_secret_here"

# Canonical base URL for Auth.js callbacks
# Dev: http://localhost:3000 | Prod: https://repodoc.example.com
NEXTAUTH_URL="http://localhost:3000"

# High-entropy encryption secret (minimum 32 characters)
# Generate with: openssl rand -base64 33
NEXTAUTH_SECRET="your_nextauth_secret_here_minimum_32_characters_long"

# ------------------------------------------------------------------------------
# Auth.js v5 Alternative Aliases (Supported interchangeably)
# ------------------------------------------------------------------------------
# AUTH_GITHUB_ID="your_github_client_id_here"
# AUTH_GITHUB_SECRET="your_github_client_secret_here"
# AUTH_URL="http://localhost:3000"
# AUTH_SECRET="your_nextauth_secret_here_minimum_32_characters_long"
```

> [!TIP]
> Generate a cryptographically secure secret by executing:
> ```bash
> openssl rand -base64 33
> ```

---

## 4. OAuth Scopes & Permissions Justification

Repodoc requests the minimal set of OAuth scopes required to execute its audit, dashboard, and 1-click remediation features:

```typescript
export const GITHUB_SCOPES = "read:user user:email public_repo workflow";
```

### Scope Breakdown & Architectural Justification

```
+-----------------------------------------------------------------------------------+
|                            Requested OAuth Scopes                                 |
+-------------------+-------------------+--------------------+----------------------+
|     read:user     |    user:email     |    public_repo     |       workflow       |
+-------------------+-------------------+--------------------+----------------------+
| Identity Profile  | Private Email     | Read Git Trees     | Create & Modify      |
| Numerical User ID | Address Fallback  | Create PR Branches | GitHub Actions CI    |
| Avatar & Handle   | Account Linking   | Commit Fix Blobs   | Workflow Definitions |
+-------------------+-------------------+--------------------+----------------------+
```

| Scope | Purpose | Architectural Justification | What Happens Without It |
| :--- | :--- | :--- | :--- |
| `read:user` | User Identity & Profile | Grants access to read public user profile data (GitHub numerical ID `profile.id`, username `profile.login`, display name, and avatar URL `profile.avatar_url`). | Cannot identify the authenticated user; session creation fails. |
| `user:email` | Private Email Resolution | Allows Repodoc to query `GET https://api.github.com/user/emails` to resolve primary, verified email addresses when users keep their email address private on GitHub. | Users with "Keep my email addresses private" enabled in GitHub will have `email: null`, degrading audit ownership notifications. |
| `public_repo` | Repository Analysis & Remediation | Grants read access to public repository contents, directory trees, commit SHAs, and write access to create remediation branches and open pull requests. | The Remediation Engine cannot fork repositories, push fix commits, or create pull requests. |
| `workflow` | CI/CD Workflow Generation | Grants permission to add or update GitHub Actions workflow files under the `.github/workflows/` directory. | **Critical:** GitHub strictly requires this scope to create or modify `.github/workflows/*.yml`. Without it, attempting to remediate missing CI workflows fails with a `403 Forbidden` (`workflow_scope_required`). |

> [!IMPORTANT]
> **Why is the `workflow` scope strictly necessary?**
> GitHub's security model treats workflow files (`.github/workflows/*.yml`) as executable CI scripts capable of accessing repository secrets (`GITHUB_TOKEN`, deployment keys). GitHub's Git Data API will reject any tree or commit modification targeting `.github/workflows/` with a `403 Forbidden` error unless the OAuth token explicitly possesses the `workflow` scope.

---

## 5. Zero-Leak Token Isolation Architecture

Web applications frequently suffer from credential leakage when third-party provider tokens are exposed to frontend runtimes. Repodoc implements a strict **Zero-Leak Token Isolation** model.

### 5.1 The Isolation Boundary

```
                     BROWSER RUNTIME (Client-Side)
+-----------------------------------------------------------------------+
|  React 19 Client Components (useSession, AuthGate, AuthControls)      |
|  - Receives ONLY sanitized public identity:                           |
|    { user: { id, githubId, username, name, email, image } }          |
|  - ZERO ACCESS TO GITHUB OAUTH TOKENS                                 |
+-----------------------------------------------------------------------+
                                |
               HTTP GET /api/auth/session (JSON)
            (Sanitized Allowlist, Cache-Control: no-store)
                                |
=== SECURITY BOUNDARY ===================================================
                 Encrypted Cookie: authjs.session-token
                 (AES-GCM, HttpOnly, SameSite=Lax, Secure)
=========================================================================
                                |
                     NEXT.JS SERVER RUNTIME (Server-Only)
+-----------------------------------------------------------------------+
|  Server Components, Server Actions & API Route Handlers               |
|  - Marked with import "server-only"                                   |
|  - Decrypts JWT session cookie via getGitHubSession()                 |
|  - Retrieves { userId, githubId, username, accessToken }              |
|  - Issues server-to-server GitHub Octokit requests                    |
+-----------------------------------------------------------------------+
                                |
                 HTTPS to https://api.github.com
```

### 5.2 Server-Side Token Persistence (`callbacks.ts`)

During the OAuth callback handshake, GitHub returns the provider access token to the server. Repodoc persists this token into the server-side JWT structure, but strictly purges it before generating the public session object:

```typescript
// lib/auth/callbacks.ts
export function createAuthCallbacks(clientId: string) {
  return {
    async jwt({ token, account, profile }: JwtParams) {
      if (account) {
        // Validation checks: provider, type, safe profile ID, valid token format
        const githubId = String(profile.id);
        const data = { username: profile.login, avatarUrl: profile.avatar_url ?? null };

        const user = await prisma.user.upsert({
          where: { githubId },
          create: { githubId, ...data },
          update: data,
        });

        // Store identity and provider token in the encrypted JWT claims
        token.sub = user.id;
        token.userId = user.id;
        token.githubId = githubId;
        token.username = user.username;
        token.picture = user.avatarUrl;
        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at;
        token.oauthClientId = clientId;
      }

      return readGitHubClaims(token, clientId) ? token : null;
    },

    session({ session, token }: { session: DefaultSession; token: JWT }) {
      const identity = readGitHubClaims(token, clientId);
      if (!identity) throw new Error("Invalid GitHub session.");

      // STRICT ALLOWLIST: Under no circumstances does accessToken or oauthClientId leak
      return {
        expires: session.expires,
        user: {
          id: identity.userId,
          githubId: identity.githubId,
          username: identity.username,
          name: token.name,
          email: token.email,
          image: token.picture,
        },
      };
    },
  };
}
```

### 5.3 Server-Side Token Access via `getGitHubSession()`

When server-side services (such as the Remediation Engine in `app/api/remediate/route.ts` or the Dashboard in `app/dashboard/page.tsx`) require the user's GitHub credentials, they call [`getGitHubSession()`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth.ts):

```typescript
// lib/auth.ts
import "server-only";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { AuthConfigurationError, getAuthSettings } from "./auth/config";
import { readGitHubClaims, type GitHubSession } from "./auth/claims";

export type { GitHubSession } from "./auth/claims";

/** For server-side GitHub API calls only. Never pass the result to a client. */
export async function getGitHubSession(): Promise<GitHubSession | null> {
  let settings;
  try {
    settings = getAuthSettings();
  } catch (error) {
    if (error instanceof AuthConfigurationError) return null;
    throw error;
  }
  const { secret, clientId, useSecureCookies } = settings;
  const incoming = await headers();

  // Accept ONLY the session cookie; reject arbitrary Authorization headers
  const cookieHeaders = new Headers({ cookie: incoming.get("cookie") ?? "" });
  const token = await getToken({ req: { headers: cookieHeaders }, secret, secureCookie: useSecureCookies });
  return readGitHubClaims(token, clientId);
}
```

### 5.4 Protection Against Forged Client Session Updates

In standard NextAuth setups, a client can call `update()` with arbitrary session properties. Repodoc prevents privilege escalation by:
1. Ignoring client session triggers (`trigger === "update"`) in `jwt()`.
2. Extracting identity claims solely from the existing, server-validated token claims.
3. Rejecting any authorization attempt delivered via bearer headers (`Authorization: Bearer <token>`).

---

## 6. End-to-End Sequence Diagrams

### 6.1 OAuth Sign-In & User Provisioning Lifecycle

The following sequence illustrates the complete sign-in flow, PKCE code exchange, database synchronization, and encrypted session cookie issuance:

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer (Browser)
    participant App as Repodoc Client
    participant AuthRoute as /api/auth/[...nextauth]
    participant GitHub as GitHub OAuth Server
    participant DB as Database (Prisma User)

    User->>App: Click "Sign in with GitHub"
    App->>AuthRoute: POST /api/auth/signin/github (CSRF verified)
    AuthRoute-->>App: 302 Redirect to GitHub (with state & PKCE code_challenge)
    App->>GitHub: GET /login/oauth/authorize?scope=read:user+user:email+public_repo+workflow
    GitHub-->>User: Display OAuth Consent Prompt
    User->>GitHub: Approve Authorization
    GitHub-->>App: 302 Redirect /api/auth/callback/github?code=...&state=...
    App->>AuthRoute: GET /api/auth/callback/github (state & code_verifier verified)
    AuthRoute->>GitHub: POST /login/oauth/access_token (code + code_verifier)
    GitHub-->>AuthRoute: 200 OK (access_token: gho_xxx)
    AuthRoute->>GitHub: GET /user (Bearer gho_xxx)
    GitHub-->>AuthRoute: 200 OK ({ id: 12345, login: "octocat", ... })
    AuthRoute->>DB: prisma.user.upsert({ where: { githubId: "12345" }, update/create })
    DB-->>AuthRoute: User Record (id: "db-user-id")
    Note over AuthRoute: Encrypt JWT with AES-GCM:<br/>{ userId, githubId, accessToken, oauthClientId }
    AuthRoute-->>App: 302 Redirect with Set-Cookie: authjs.session-token (HttpOnly, Secure)
    App->>User: Authenticated Dashboard / Report View
```

---

### 6.2 Token Isolation & Authenticated Remediation Request

The following diagram illustrates how the browser initiates an atomic pull request remediation without ever possessing or handling the GitHub access token:

```mermaid
sequenceDiagram
    autonumber
    actor Browser as Browser UI
    participant RemediateRoute as POST /api/remediate
    participant AuthHelper as getGitHubSession()
    participant Engine as RemediationEngine
    participant GitHubAPI as GitHub REST / Git Data API

    Browser->>RemediateRoute: POST /api/remediate { owner, repo, fixes: ["license", "ci-workflow"] }<br/>(Cookie: authjs.session-token)
    RemediateRoute->>AuthHelper: getGitHubSession()
    Note over AuthHelper: Read Cookie header<br/>Decrypt JWT with NEXTAUTH_SECRET<br/>Verify oauthClientId === GITHUB_CLIENT_ID
    AuthHelper-->>RemediateRoute: { userId, githubId, username, accessToken }
    
    alt Session Missing or Invalid
        RemediateRoute-->>Browser: 401 Unauthorized ("Sign in with GitHub")
    else Session Valid
        RemediateRoute->>Engine: execute({ report, selections, token: accessToken })
        Engine->>GitHubAPI: POST /repos/{owner}/{repo}/git/blobs (Create license & CI blobs)
        Engine->>GitHubAPI: POST /repos/{owner}/{repo}/git/trees (Create atomic tree)
        Engine->>GitHubAPI: POST /repos/{owner}/{repo}/git/commits (Commit changes)
        Engine->>GitHubAPI: POST /repos/{owner}/{repo}/git/refs (Create branch repodoc/fix-...)
        Engine->>GitHubAPI: POST /repos/{owner}/{repo}/pulls (Open Pull Request)
        GitHubAPI-->>Engine: PR created (https://github.com/owner/repo/pull/1)
        Engine-->>RemediateRoute: { prUrl, filesCreated }
        RemediateRoute-->>Browser: 200 OK { prUrl: "https://github.com/owner/repo/pull/1", filesCreated: 2 }
    end
```

---

## 7. Session Invalidation & Client ID Binding

A common vulnerability in OAuth session management is the persistence of zombie sessions across credential rotations. Repodoc eliminates this via **OAuth Client ID Binding**.

### 7.1 Client ID Binding Mechanics

Whenever a user authenticates, their active OAuth Client ID is stamped into the token claims:
```typescript
token.oauthClientId = clientId;
```

In [`lib/auth/claims.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/lib/auth/claims.ts), `readGitHubClaims()` validates that every token read matches the currently configured application client ID:

```typescript
export function readGitHubClaims(token: JWT | null, clientId: string): GitHubSession | null {
  if (
    !token ||
    !nonempty(clientId) ||
    token.oauthClientId !== clientId ||
    !nonempty(token.userId) ||
    !nonempty(token.githubId) ||
    !nonempty(token.username) ||
    !nonempty(token.accessToken) ||
    isGitHubAppToken(token.accessToken) ||
    (token.exp !== undefined && (!Number.isFinite(token.exp) || token.exp <= Date.now() / 1000)) ||
    (token.accessTokenExpiresAt !== undefined &&
      (!Number.isFinite(token.accessTokenExpiresAt) || token.accessTokenExpiresAt <= Date.now() / 1000))
  ) return null;

  return {
    userId: token.userId,
    githubId: token.githubId,
    username: token.username,
    accessToken: token.accessToken,
  };
}
```

### 7.2 Zero-Migration Credential Rotation

When an engineering team rotates OAuth credentials (by updating `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in production):

1. **Immediate Invalidation:** Every existing session cookie contains a `token.oauthClientId` corresponding to the retired client ID.
2. **Automatic Token Expiry:** When the user makes their next request, `readGitHubClaims()` detects `token.oauthClientId !== clientId` and returns `null`.
3. **Cookie Purge:** In `callbacks.ts`, returning `null` from the `jwt` callback signals NextAuth to invalidate and clear the session cookie (`authjs.session-token`).
4. **No Database Migration:** Because session state is stateless and cryptographically verified, no database records need to be deleted or migrated.
5. **Clean Re-Authentication:** The user is seamlessly prompted to sign in again. Upon sign-in, their user record in the database is located by `githubId` and cleanly updated, preserving all associated historical reports (`RepoReport.userId`).

### 7.3 Session Validation Decision Tree

```mermaid
flowchart TD
    Start["Incoming Request with Session Cookie"] --> Decrypt{"Can decrypt JWT with NEXTAUTH_SECRET?"}
    Decrypt -- No --> Invalidate["Return null & Clear Cookie"]
    Decrypt -- Yes --> CheckClientID{"token.oauthClientId === GITHUB_CLIENT_ID?"}
    CheckClientID -- No --> Invalidate
    CheckClientID -- Yes --> CheckExp{"token.exp > now()?"}
    CheckExp -- No --> Invalidate
    CheckExp -- Yes --> CheckProviderExp{"accessTokenExpiresAt valid and in future?"}
    CheckProviderExp -- No --> Invalidate
    CheckProviderExp -- Yes --> CheckAppToken{"isGitHubAppToken(accessToken)?"}
    CheckAppToken -- Yes (ghu_/ghs_) --> Invalidate
    CheckAppToken -- No --> ValidSession["Valid Session Established: Return GitHubSession"]
```

---

## 8. User Identity Synchronization & Database Persistence

Repodoc persists authenticated users in SQLite (development) or PostgreSQL (production) via Prisma ORM:

```prisma
// prisma/schema.prisma
model User {
  id             String       @id @default(cuid())
  githubId       String       @unique
  username       String
  avatarUrl      String?
  installationId Int?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  reports        RepoReport[]
}
```

### Identity Synchronization Guarantees

1. **Immutable Anchor (`githubId`):** Users are uniquely indexed by their numerical GitHub account ID (`githubId: String @unique`). While GitHub usernames can be renamed, GitHub account IDs never change.
2. **Graceful Rename Support:** If a developer renames their GitHub username or updates their avatar, the next sign-in performs an `upsert`:
   ```typescript
   const user = await prisma.user.upsert({
     where: { githubId },
     create: { githubId, ...data },
     update: data,
   });
   ```
   This updates `username` and `avatarUrl` without generating duplicate user records or breaking existing audit history foreign keys (`RepoReport.userId`).
3. **Transaction Failure Isolation:** If database persistence fails during sign-in (e.g. database network interruption), the callback rejects the promise and refuses to issue a session token, preventing unsynchronized zombie logins.

---

## 9. Security Hardening & Threat Model

Repodoc incorporates rigorous defensive measures against common web vulnerabilities:

### 9.1 Cookie Security Specifications

| Attribute | Development (`http://localhost:3000`) | Production (`https://repodoc.example.com`) | Security Rationale |
| :--- | :--- | :--- | :--- |
| **Cookie Name** | `authjs.session-token` | `__Secure-authjs.session-token` | `__Secure-` prefix prevents HTTP cookies from overwriting secure HTTPS sessions (RFC 6265bis). |
| **HttpOnly** | `true` | `true` | Inaccessible to `document.cookie`, preventing XSS session hijacking. |
| **SameSite** | `Lax` | `Lax` | Restricts cookies on cross-origin requests, defending against CSRF while permitting top-level navigation redirects. |
| **Secure** | `false` | `true` | Transmitted exclusively over TLS/HTTPS connections. |
| **Path** | `/` | `/` | Scoped to the entire canonical domain. |
| **Max-Age** | `2,592,000` (30 days) | `2,592,000` (30 days) | Predictable session lifespan with automatic provider expiration checks. |

### 9.2 Chunked Cookie Support

NextAuth automatically shards session cookies into chunks (`authjs.session-token.0`, `authjs.session-token.1`) when encrypted payload sizes approach standard browser cookie limits (4,096 bytes). Repodoc's `getGitHubSession()` natively parses and reconstructs chunked cookies, ensuring stability even with extensive provider claims.

### 9.3 Cross-Site Request Forgery (CSRF) Defense

- **State Parameter:** Auth.js generates a cryptographically random `state` parameter stored in an `authjs.state` cookie and verifies it on callback return.
- **PKCE (Proof Key for Code Exchange):** NextAuth enforces `checks: ["pkce", "state"]` with SHA-256 (`S256`) challenge methods, neutralizing authorization code interception attacks.
- **Mutation CSRF Tokens:** The sign-in and sign-out endpoints enforce CSRF token validation on POST requests. Direct POST requests lacking valid CSRF tokens are rejected with `302 Redirect` to an error page.

### 9.4 Cross-Origin Request Restriction on Mutations

The remediation endpoint [`app/api/remediate/route.ts`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/app/api/remediate/route.ts) enforces strict cross-origin guards:
```typescript
const origin = request.headers.get("origin");
if (origin !== null && origin !== new URL(request.url).origin) {
  return json({ error: "Cross-origin remediation requests are not allowed." }, 403);
}

const secFetchSite = request.headers.get("sec-fetch-site");
if (secFetchSite === "cross-site") {
  return json({ error: "Cross-origin remediation requests are not allowed." }, 403);
}
```

---

## 10. Developer Reference & Implementation Guide

### 10.1 Retrieving Session in Server Components

```tsx
// app/dashboard/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import { getGitHubSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getGitHubSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  return (
    <div>
      <h1>Welcome back, @{session.username}!</h1>
      <p>Database User ID: {session.userId}</p>
    </div>
  );
}
```

### 10.2 Conditional UI in Client Components (`AuthGate`)

Use [`AuthGate`](file:///Users/aizen/Documents/Coding/NextJS/Repodoc/components/auth/auth-gate.tsx) for presentation-level conditional rendering. Always remember that server mutations must independently authorize the session:

```tsx
"use client";

import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";

export function FixRepositorySection() {
  return (
    <AuthGate
      fallback={<p>Sign in with GitHub to unlock 1-click remediation.</p>}
    >
      <Button onClick={() => triggerFix()}>Generate Remediation Pull Request</Button>
    </AuthGate>
  );
}
```

### 10.3 Authenticated Route Handlers

```typescript
// app/api/example/route.ts
import { NextResponse } from "next/server";
import { getGitHubSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // session.accessToken is available for server-to-server GitHub API requests
  return NextResponse.json({ ok: true, user: session.username });
}
```

---

## 11. Troubleshooting & Diagnostics

| Symptom / Error | Root Cause | Resolution |
| :--- | :--- | :--- |
| `{"code": "oauth_app_required"}` | A GitHub App Client ID (starting with `Iv`) was used instead of an OAuth App. | Register a standard **OAuth App** under GitHub Settings &rarr; Developer settings &rarr; OAuth Apps and replace `GITHUB_CLIENT_ID`. |
| `Authentication is not configured.` | One or more required environment variables (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) are missing or empty. | Verify your `.env` or `.env.local` contains all four required keys without leading or trailing whitespace. |
| `redirect_uri_mismatch` on GitHub sign-in | The callback URL configured in GitHub does not match `NEXTAUTH_URL`. | In GitHub OAuth App settings, set Authorization callback URL to `${NEXTAUTH_URL}/api/auth/callback/github`. |
| `403 Forbidden` (`workflow_scope_required`) during remediation | The user authenticated before the `workflow` scope was added, or granted incomplete permissions. | Sign out and sign in again to trigger GitHub's re-authorization prompt requesting the `workflow` scope. |
| Session expires immediately on localhost | `NEXTAUTH_URL` is configured with `https://localhost:3000` instead of `http://localhost:3000`, causing secure cookie validation to fail. | Ensure `NEXTAUTH_URL` uses `http://localhost:3000` for local development. |
| Public session is empty (`null`) after sign-in | Stale or mismatched client ID in existing cookie. | Clear browser cookies for `localhost` or sign out and sign in again. |
