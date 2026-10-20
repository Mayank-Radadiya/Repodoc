// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createTestDatabase } from "./helpers/database";

afterEach(() => vi.unstubAllEnvs());

it("never falls back to application database credentials", () => {
  vi.stubEnv("TEST_DATABASE_URL", "");
  vi.stubEnv("DATABASE_URL", "postgresql://production.invalid/app");
  expect(() => createTestDatabase()).toThrow("TEST_DATABASE_URL must point to a disposable PostgreSQL database");
});

it("rejects the old SQLite test configuration", () => {
  vi.stubEnv("TEST_DATABASE_URL", "file:./dev.db");
  expect(() => createTestDatabase()).toThrow("must be a PostgreSQL connection string");
});
