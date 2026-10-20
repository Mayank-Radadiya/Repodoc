# Production readiness verification — 2026-10-20

The PostgreSQL-only setup is implemented. An isolated production build and all three Chromium smoke tests passed. The normal workspace build remains blocked by the environment, and hosted deployment readiness is still unverified.

Checks used Node **24.22.0**, the installed Bun runtime, and a disposable native PostgreSQL **18** cluster. Database commands received explicit local PostgreSQL URLs; the existing private `.env` was not modified. Results cover the shared workspace, including concurrent application changes.

Snapshot boundary: these results include the authentication request-ordering fix and dashboard dialog-loading optimization. A subsequent `GridDistortion` image-reference cleanup was made after this snapshot; its follow-up verification is owned by the performance audit and is excluded from the checks below.

| Command | Exit | Result |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | Existing installation and updated lockfile agree. |
| `bun run db:generate` | 0 | PostgreSQL Prisma Client generated. |
| `bun run lint` | 0 | Final run has no warnings or errors. |
| `bun run typecheck` | 0 | Full TypeScript check passed. |
| `bun run test:unit` | 0 | 2,175 tests passed across 80 files. |
| `bun run test:integration` | 0 | 74 tests passed across 6 files; 1 live GitHub test skipped. |
| `bun run db:migrate` | 0 | Initial migration applied to an empty database. |
| `bun run db:migrate` (repeat) | 0 | No pending migrations. The migration integration test also verifies row preservation. |
| `bun run db:status` | 0 | Database schema up to date. |
| `prisma validate` | 0 | PostgreSQL schema valid with configured URLs. |
| `prisma migrate diff --from-url <test-url> --to-schema-datamodel prisma/schema.prisma --exit-code` | 0 | No schema difference detected. |
| `docker compose config --quiet` | 0 | Compose configuration valid. |
| `git diff --check` | 0 | No whitespace errors. |
| `bun run build` | 1 | Turbopack CSS worker cannot bind a local port: `Operation not permitted`. Reproduced on Node 24 with an escalated execution attempt. |
| `bun run test:e2e --list` | 0 | All 3 Chromium smoke tests discovered. |
| `bun run test:e2e` | 1 | Production server startup failed because no successful `.next` production build exists. Browser tests did not execute. |
| `next build` in the isolated copy | 0 | Production compilation, TypeScript, and prerendering passed on Node 24. |
| `bun run test:e2e` in the isolated copy | 0 | All 3 Chromium production smoke tests passed. |

The isolated copy used the same application sources and shared dependencies, with `turbopack.root: "/"` only in its temporary configuration to resolve the linked dependencies. No type checks were disabled. A source comparison confirmed identical application code, authentication entrypoint, package configuration, and TypeScript configuration. The temporary root override is not part of the repository or a deployment recommendation.

## Failures resolved during verification

- PostgreSQL JSONB can reorder object keys. Serialized-string metadata comparison caused unnecessary report rewrites and timestamp changes on unchanged audits. Structural equality and a key-order regression test now cover this behavior; real PostgreSQL report integration tests pass.
- Concurrent request-deadline changes exposed TypeScript and test expectations around composed abort signals, cancellation, cached metadata, and navigation cleanup. Final TypeScript, unit, and integration checks pass on the resulting workspace.
- The conflicting SQLite fallback and duplicate schema tooling were removed following the explicit choice to retain PostgreSQL only. Tests require `TEST_DATABASE_URL` and never fall back to application credentials.
- Test failures during concurrent file changes and restoration were superseded by the successful final unit and integration runs above. Test timeouts were not increased. JSDOM still prints its existing canvas `getContext` notices; these did not fail tests.
- The first isolated Chromium run had a locator failure: both the validation message and Next.js route announcer have `role="alert"`. Scoping the assertion to the audit form fixed the smoke test; the final run passed all three tests without retries.
- A subsequent authentication fix moves request-header access before optional OAuth configuration validation. This prevents a build without OAuth settings from caching the anonymous dashboard redirect. The isolated build now classifies `/dashboard` as a partial prerender, and authentication/configuration/dashboard regressions passed. Full unit, PostgreSQL integration, and Chromium checks were rerun after this fix.

## Unresolved blockers and unverified behavior

- The unmodified workspace `bun run build` remains blocked by Turbopack worker permissions. Production compilation and Chromium behavior passed using the isolated-copy workaround. CI and the deployment environment still need to run the normal commands successfully.
- The existing private `.env` still contains a SQLite `DATABASE_URL`, has no `DIRECT_URL`, `TEST_DATABASE_URL`, or public site origin, and uses an HTTP authentication origin. Configure PostgreSQL URLs from `.env.example`; use matching HTTPS application origins and real secrets for production. Verification used temporary overrides rather than altering existing credentials.
- Docker is installed but its daemon was unavailable. Compose startup was not verified; PostgreSQL migration and persistence checks used the installed native PostgreSQL binaries instead.
- The GitHub Actions workflow was added but has not been run on GitHub. Vercel configuration, hosted database connectivity, production secrets, live OAuth, and GitHub PR creation remain unverified. The live GitHub API integration is deliberately opt-in.
- No hosted deployment or production migration was performed. Existing SQLite data remains untouched. All temporary test schemas were cleaned up, and the temporary PostgreSQL server was stopped.

Follow [deployment setup](deployment.md) and [database setup](database.md) to reproduce the gates in a build-capable environment.
