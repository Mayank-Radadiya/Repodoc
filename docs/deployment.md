# Vercel production setup and verification

Use Node 24 (selected by `.node-version` and `package.json`) and Bun 1.4.3. This guide prepares a fresh PostgreSQL deployment. Provisioning hosting, transferring SQLite data, live OAuth approval, and live pull-request creation are separate steps.

## Required configuration

| Variable | Requirement |
| --- | --- |
| `DATABASE_URL` | PostgreSQL runtime URL; use the provider's pooler and TLS settings for Vercel. |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migrations. |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS public origin, set before building; compiled into public metadata and links. |
| `NEXTAUTH_URL` or `AUTH_URL` | HTTPS application origin matching the OAuth callback registration. |
| `NEXTAUTH_SECRET` or `AUTH_SECRET` | Stable random secret; generate with `openssl rand -base64 32`. |
| `GITHUB_CLIENT_ID` or `AUTH_GITHUB_ID` | GitHub **OAuth App** client ID; GitHub App IDs beginning with `Iv` are rejected. |
| `GITHUB_CLIENT_SECRET` or `AUTH_GITHUB_SECRET` | OAuth App secret. |
| `GITHUB_TOKEN` | Optional server token for public auditing. Use minimum required access. |
| `TEST_DATABASE_URL` | Local/CI only, pointing to a disposable database; do not set on Vercel. |

Prefer one naming family for authentication settings. When both are supplied, the application prefers `NEXTAUTH_*` and `GITHUB_CLIENT_*`; keep aliases consistent. Production authentication rejects HTTP origins. Public auditing can run without OAuth configuration, but sign-in, dashboard access, and remediation require it.

Register a GitHub OAuth App with callback `https://<your-domain>/api/auth/callback/github`. Requested scopes are `read:user user:email public_repo workflow`. Keep all secrets out of `NEXT_PUBLIC_*` settings and source control. Configure preview and production environments independently; previews must not migrate the production database.

## Vercel commands

- Install: `bun install --frozen-lockfile`
- Build: `bun run db:migrate && bun run build` (configured in `vercel.json`; generates the PostgreSQL client before `next build`)
- Output: `.next`
- Node.js: `24.x`

Run `bun run db:migrate` once in the release pipeline, using `DIRECT_URL`, before serving a release that requires the schema. Follow with `bun run db:status`. If there is no separate release step, use `bun run db:migrate && bun run build` as the Vercel Build Command. Keep database changes backward compatible with the currently running application, and restrict migration credentials to the deployment environment. Do not run migrations during dependency installation or ordinary local builds.

See [database setup](database.md) for migration creation, existing databases, and test isolation.

## Executable checks

From a configured checkout with PostgreSQL running:

```bash
bun install --frozen-lockfile
bun run db:generate
bunx prisma validate
bun run lint
bun run typecheck
bun run test:unit
bun run test:integration
bun run db:migrate
bun run db:migrate
bun run db:status
bun run build
bunx playwright install chromium
bun run test:e2e
```

CI runs these gates in `.github/workflows/ci.yml` with PostgreSQL 18 and installs Chromium system dependencies. Tests run with two Vitest workers. Unit tests do not require a database. Database integration tests require `TEST_DATABASE_URL`; missing configuration is a failure, not a silent skip. The single live GitHub API test is opt-in and its skip must be reported. No automated smoke test performs live OAuth or creates a GitHub PR.

Playwright starts a fresh production server on port 3100 and requires an existing successful build. Its synthetic OAuth settings are test-only and allow the sign-in page to render; they never authorize a real account. Smoke tests cover landing-page validation, anonymous dashboard redirection, and rejection of unauthenticated remediation. Failure traces are retained under the ignored `test-results/` directory.

Do not label readiness checks successful unless their commands exit successfully. A compiled build alone does not verify production credentials, live OAuth, GitHub write scopes, backups, or the deployed database.

## Runtime and security checks

After deployment, verify the configured HTTPS origin, the GitHub sign-in callback with a designated account, public audit/report/share/badge behavior, and remediation only against a designated test repository. Inspect application errors and database connection failures through the hosting platform. Automated local browser tests do not replace these live checks.

`next.config.ts` configures CSP, HSTS, framing restrictions, MIME protection, referrer policy, and permissions policy. Keep header changes tied to actual runtime failures and verify them against the production server. Preserve authentication checks on server mutations; hiding controls in the UI does not authorize a request.

Turbopack's CSS workers require local process/port permissions during builds. If the environment denies those permissions, record the build as blocked and run the same production build in a capable environment. Do not disable type checks or substitute a development server to claim production readiness.

Place Vercel functions in the same region as PostgreSQL to reduce database round-trip latency. Configure preview environments with a separate database; never let a preview migration target production. Existing SQLite data is not migrated by this setup.
