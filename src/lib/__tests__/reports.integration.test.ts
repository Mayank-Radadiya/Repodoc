// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/audit/route";
import { GET } from "@/app/api/report/[shareId]/route";
import { findCachedReport, findReportByShareId, saveReport } from "@/src/lib/reports";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import type { AuditReport } from "@/src/lib/types";

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));
vi.mock("@/src/lib/db", () => ({
  get prisma() {
    if (!database.client) throw new Error("Test database is not initialized.");
    return database.client;
  },
}));
vi.mock("nanoid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nanoid")>();
  return { ...actual, nanoid: vi.fn(actual.nanoid) };
});

const directory = mkdtempSync(path.join(tmpdir(), "repodoc-reports-"));
const databasePath = path.join(directory, "test.db");
// Prisma's SQLite schema engine expects the file to exist in this environment.
writeFileSync(databasePath, "");
const url = `file:${databasePath}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const fetchMock = vi.fn<typeof fetch>();

function report(owner = "Owner", repo = "Repo"): AuditReport {
  return ScoringEngine.run({
    owner, repo, defaultBranch: "main", paths: new Set(["license"]),
    generatedAt: "2026-10-13T00:00:00.000Z",
  });
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

function request(owner = "Owner", repo = "Repo"): Request {
  return new Request("http://localhost/api/audit", {
    method: "POST", body: JSON.stringify({ owner, repo }),
  });
}

function githubFresh(): void {
  fetchMock.mockResolvedValueOnce(Response.json({ default_branch: "main", description: null, topics: [] }));
  fetchMock.mockResolvedValueOnce(Response.json({
    sha: "tree", url: "https://api.github.com/tree", tree: [], truncated: false,
  }, { headers: { ETag: '"tree-etag"' } }));
}

beforeAll(() => {
  execFileSync(process.execPath, [
    path.resolve("node_modules/prisma/build/index.js"), "db", "push", "--skip-generate",
    "--schema", path.resolve("prisma/schema.prisma"),
  ], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  database.client = prisma;
}, 30000);

beforeEach(async () => {
  await prisma.repoReport.deleteMany();
  await prisma.user.deleteMany();
  const actual = await vi.importActual<typeof import("nanoid")>("nanoid");
  vi.mocked(nanoid).mockReset().mockImplementation(actual.nanoid);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe("report persistence with SQLite", () => {
  it("fetches the identical report by share ID after an audit without network calls or writes", async () => {
    githubFresh();
    const auditResponse = await POST(request());
    expect(auditResponse.status).toBe(200);
    const audited = await auditResponse.json();
    const before = await prisma.repoReport.findUniqueOrThrow({ where: { shareId: audited.shareId } });
    fetchMock.mockClear();
    const score = vi.spyOn(ScoringEngine, "run");
    const response = await GET(new Request(`http://localhost/api/report/${audited.shareId}`), {
      params: Promise.resolve({ shareId: audited.shareId }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(audited);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(score).not.toHaveBeenCalled();
    expect(await prisma.repoReport.findUniqueOrThrow({ where: { shareId: audited.shareId } })).toEqual(before);
  });

  it("returns only public report fields, including evidence, remediation, and the original timestamp", async () => {
    const scored = ScoringEngine.run({
      owner: "Owner", repo: "Repo", paths: new Set([".gitignore"]),
      generatedAt: "2026-10-13T00:00:00.000Z",
    });
    const saved = await saveReport(scored, '"etag"');
    const user = await prisma.user.create({ data: { githubId: "123", username: "tester" } });
    await prisma.repoReport.update({ where: { shareId: saved.shareId }, data: { userId: user.id } });
    const found = await findReportByShareId(saved.shareId);
    expect(found).toEqual(saved);
    expect(Object.keys(found!).sort()).toEqual([
      "checks", "defaultBranch", "generatedAt", "healthScore", "owner", "repo", "rubricVersion", "shareId",
    ]);
    expect(found?.checks.some((check) => check.remediation?.requiresUserInput === "license_selection")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps an older rubric snapshot with no ETag readable through its case-sensitive share ID", async () => {
    vi.mocked(nanoid).mockReturnValueOnce("Ab0_-xyz");
    const saved = await saveReport({ ...report(), rubricVersion: "0.9.0" }, "");
    expect(await findCachedReport("owner", "repo")).toBeNull();
    expect(await findReportByShareId(saved.shareId)).toEqual(saved);
    expect(await findReportByShareId(saved.shareId.toLowerCase())).toBeNull();
  });

  it("returns JSON 404 for a well-formed share ID absent from the database", async () => {
    const response = await GET(new Request("http://localhost/api/report/missing1"), {
      params: Promise.resolve({ shareId: "missing1" }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Report not found." });
  });

  it.each(["", "short", "toolong12", "../repo", "abc/defg", "abc%2Fde", "abc\\defg", "abcd ef ", "abcdé123", "abcd1234\n"])(
    "rejects malformed share ID %j without querying the database", async (shareId) => {
      const lookup = vi.spyOn(prisma.repoReport, "findUnique");
      const response = await GET(new Request("http://localhost/api/report/invalid"), {
        params: Promise.resolve({ shareId }),
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Report not found." });
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it("returns a safe 500 for corrupt stored JSON without refreshing the audit", async () => {
    const saved = await saveReport(report(), '"etag"');
    await prisma.repoReport.update({ where: { shareId: saved.shareId }, data: { breakdown: { checks: [] } } });
    const response = await GET(new Request(`http://localhost/api/report/${saved.shareId}`), {
      params: Promise.resolve({ shareId: saved.shareId }),
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to retrieve the repository report." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe 500 when the share lookup database is unavailable", async () => {
    const lookup = vi.spyOn(prisma.repoReport, "findUnique").mockRejectedValue(new Error("database credentials"));
    const response = await GET(new Request("http://localhost/api/report/share123"), {
      params: Promise.resolve({ shareId: "share123" }),
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to retrieve the repository report." });
    expect(lookup).toHaveBeenCalledExactlyOnceWith({ where: { shareId: "share123" } });
  });

  it("round trips checks, evidence, remediation, and the original timestamp", async () => {
    const scored = ScoringEngine.run({ owner: "Owner", repo: "Repo", paths: new Set([".gitignore"]), generatedAt: "2026-10-13T00:00:00.000Z" });
    const saved = await saveReport(scored, '"etag"');
    expect(saved.shareId).toMatch(/^[A-Za-z0-9_-]{8}$/);
    expect(nanoid).toHaveBeenCalledWith(8);
    const row = await prisma.repoReport.findUniqueOrThrow({ where: { shareId: saved.shareId } });
    expect(row).toMatchObject({ owner: "owner", repo: "repo", healthScore: 5, etag: '"etag"', breakdown: scored });
    expect(await findCachedReport("OWNER", "REPO")).toEqual({ report: saved, etag: '"etag"' });
    expect(saved.checks.some((check) => check.remediation?.requiresUserInput === "license_selection")).toBe(true);
    expect(saved.checks.some((check) => check.remediation)).toBe(true);
  });

  it("preserves share ID and user association while replacing a changed report", async () => {
    const initial = await saveReport(report(), '"old"');
    const user = await prisma.user.create({ data: { githubId: "123", username: "tester" } });
    await prisma.repoReport.update({ where: { shareId: initial.shareId }, data: { userId: user.id } });
    const changed = ScoringEngine.run({ owner: "OWNER", repo: "REPO", paths: new Set<string>() });
    const saved = await saveReport(changed, '"new"');
    expect(saved).toEqual({ ...changed, shareId: initial.shareId });
    expect(await prisma.repoReport.count()).toBe(1);
    const row = await prisma.repoReport.findUniqueOrThrow({ where: { shareId: initial.shareId } });
    expect(row).toMatchObject({ userId: user.id, healthScore: 0, etag: '"new"', breakdown: changed });
  });

  it("keeps one row and one share ID during concurrent first audits", async () => {
    const saved = await Promise.all(Array.from({ length: 8 }, () => saveReport(report(), '"etag"')));
    expect(new Set(saved.map((item) => item.shareId)).size).toBe(1);
    expect(await prisma.repoReport.count()).toBe(1);
  });

  it("retries a real share ID collision without changing the other repository", async () => {
    vi.mocked(nanoid).mockReturnValueOnce("same1234");
    const original = await saveReport(report("other", "repo"), '"other"');
    vi.mocked(nanoid).mockReturnValueOnce("same1234").mockReturnValueOnce("next1234");
    expect((await saveReport(report(), '"etag"')).shareId).toBe("next1234");
    expect(await findCachedReport("other", "repo")).toEqual({ report: original, etag: '"other"' });
    expect(await prisma.repoReport.count()).toBe(2);
  });

  it("bounds repeated share ID collisions without leaving an incomplete row", async () => {
    vi.mocked(nanoid).mockReturnValue("same1234");
    await saveReport(report("other", "repo"), '"other"');
    vi.mocked(nanoid).mockClear();
    await expect(saveReport(report(), '"etag"')).rejects.toMatchObject({ code: "P2002" });
    expect(nanoid).toHaveBeenCalledTimes(3);
    expect(await prisma.repoReport.count()).toBe(1);
  });

  it("returns identical reports on two audits, sending If-None-Match only on the second", async () => {
    githubFresh();
    const score = vi.spyOn(ScoringEngine, "run");
    const firstResponse = await POST(request());
    const first = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    const before = await prisma.repoReport.findUniqueOrThrow({ where: { shareId: first.shareId } });
    fetchMock.mockResolvedValueOnce(Response.json({ default_branch: "main", description: null, topics: [] }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
    const secondResponse = await POST(request("owner", "repo"));
    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toEqual(first);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).has("if-none-match")).toBe(false);
    expect(new Headers(fetchMock.mock.calls[3][1]?.headers).get("if-none-match")).toBe('"tree-etag"');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(score).toHaveBeenCalledTimes(1);
    expect(await prisma.repoReport.count()).toBe(1);
    expect(await prisma.repoReport.findUniqueOrThrow({ where: { shareId: first.shareId } })).toEqual(before);
  });

  it.each(["missing etag", "outdated rubric", "invalid JSON", "invalid evidence", "invalid remediation", "wrong repository", "inconsistent score", "invalid timestamp"])(
    "refreshes %s without an ETag and preserves its share ID", async (kind) => {
      const scored = report();
      const initial = await saveReport(scored, '"old"');
      const patch = kind === "missing etag" ? { etag: null }
        : kind === "outdated rubric" ? { rubricVersion: "0.1.0" }
        : { breakdown: json(kind === "invalid JSON" ? { checks: [] }
          : kind === "invalid evidence" ? { ...scored, checks: [{ ...scored.checks[0], evidence: { filesChecked: [42] } }] }
          : kind === "invalid remediation" ? { ...scored, checks: [{ ...scored.checks[0], remediation: { canAutomate: "yes" } }] }
          : kind === "wrong repository" ? { ...scored, owner: "someone-else" }
          : kind === "inconsistent score" ? { ...scored, healthScore: 99 }
          : { ...scored, generatedAt: "invalid" }) };
      await prisma.repoReport.update({ where: { shareId: initial.shareId }, data: patch });
      expect(await findCachedReport("owner", "repo")).toBeNull();
      githubFresh();
      const response = await POST(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ shareId: initial.shareId, healthScore: 0 });
      expect(new Headers(fetchMock.mock.calls[1][1]?.headers).has("if-none-match")).toBe(false);
      expect(await prisma.repoReport.count()).toBe(1);
      expect(await findCachedReport("owner", "repo")).not.toBeNull();
    },
  );

  it("does not retry unrelated database errors", async () => {
    const upsert = vi.spyOn(prisma.repoReport, "upsert").mockRejectedValue(new Error("database unavailable"));
    await expect(saveReport(report(), '"etag"')).rejects.toThrow("database unavailable");
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
