# PostgreSQL database setup

Repodoc uses Prisma 6 with PostgreSQL for development, tests, and production. The models remain `User` and `RepoReport`; report breakdowns use JSONB. The initial migration is checked in under `prisma/migrations/`.

## Local development

Use Node 24, Bun 1.4.3, and Docker Compose:

```bash
cp .env.example .env  # only for a new checkout; preserve existing secrets
bun install --frozen-lockfile
docker compose up -d --wait
bun run db:generate
bun run db:migrate
bun run db:status
```

The Compose service exposes PostgreSQL 18 on `127.0.0.1:5432`. Its local-only credentials are `repodoc` / `repodoc`, and its database is `repodoc`. Data persists in the `postgres_data` volume. `docker compose down` stops the service while keeping the volume; removing that volume deletes its data.

Both `DATABASE_URL` and `DIRECT_URL` use the direct local connection in `.env.example`. If port 5432 is already occupied, change the Compose host port and all local connection URLs together.

Existing SQLite files are not read, converted, or deleted. This migration prepares a fresh PostgreSQL database; copying existing data is a separate operation. An existing unversioned PostgreSQL database needs a reviewed baseline before applying these migrations.

## Production connections

Set `DATABASE_URL` to the hosting provider's pooled PostgreSQL runtime connection and `DIRECT_URL` to its direct migration connection. Follow the provider's TLS and pooler settings. Do not copy the example password into production.

Generate the Prisma client with `bun run db:generate` or `bun run build`. In the deployment release step, run:

```bash
bun run db:migrate
bun run db:status
```

`db:migrate` runs `prisma migrate deploy`, applying committed migrations without interactive development prompts. Repeating it with no pending migrations must leave existing rows unchanged. It does not generate the client or replace schema-drift checks. Never use `db push`, `migrate reset`, or `migrate dev` against production.

Create future migrations against a disposable development database with `bunx prisma migrate dev --name <change>`, review the SQL, and commit the migration directory. Never edit a migration already applied in a shared environment. Back up production data before schema changes and use the database provider's restore procedure if recovery is needed; rolling back application code does not reverse database migrations.

## Integration test isolation

Set `TEST_DATABASE_URL` to a direct connection to a disposable PostgreSQL database. The account needs permission to create and drop schemas. Tests deliberately do not fall back to `DATABASE_URL` or `DIRECT_URL`.

```bash
bun run db:generate
bun run test:unit
bun run test:integration
# Or run both groups together:
bun run test:run
```

`tests/helpers/database.ts` assigns each database suite a random `repodoc_test_*` schema, applies the committed migrations to it, and drops only that schema during cleanup. Application tables are not cleared. An interrupted process may leave test schemas behind; inspect them before manually removing anything. Never point tests at a production database, even with schema isolation.

The migration integration test applies migrations to an empty schema, writes a user, repeats deployment, and verifies that the row survives. Authentication and report integration suites use real PostgreSQL persistence while mocking outbound GitHub requests. The live GitHub test remains disabled unless `RUN_GITHUB_INTEGRATION=1` is explicitly set.
