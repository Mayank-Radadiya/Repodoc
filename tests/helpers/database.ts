import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/** Each suite owns one random schema; never fall back to application credentials. */
export function createTestDatabase() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must point to a disposable PostgreSQL database. See docs/database.md.");
  }
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection string.");
  }
  const schema = `repodoc_test_${randomUUID().replaceAll("-", "")}`;
  url.searchParams.set("schema", schema);
  const connection = url.toString();
  const prisma = new PrismaClient({ datasources: { db: { url: connection } } });

  function migrate() {
    execFileSync(process.execPath, [
      path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy",
      "--schema", path.resolve("prisma/schema.prisma"),
    ], {
      env: { ...process.env, DATABASE_URL: connection, DIRECT_URL: connection },
      stdio: "pipe",
      timeout: 25_000,
    });
  }

  async function cleanup() {
    try {
      // The identifier is generated above, never accepted from a URL or caller.
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await prisma.$disconnect();
    }
  }

  return { prisma, migrate, cleanup };
}
