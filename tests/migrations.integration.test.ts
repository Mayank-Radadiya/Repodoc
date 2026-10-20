// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createTestDatabase } from "./helpers/database";

const database = createTestDatabase();
afterAll(() => database.cleanup());

it("deploys an empty schema and reapplies migrations without losing data", async () => {
  database.migrate();
  const user = await database.prisma.user.create({
    data: { githubId: "migration-test", username: "migration-test" },
  });
  database.migrate();
  expect(await database.prisma.user.findUnique({ where: { id: user.id } })).toEqual(user);
  expect(await database.prisma.repoReport.count()).toBe(0);
}, 30_000);
