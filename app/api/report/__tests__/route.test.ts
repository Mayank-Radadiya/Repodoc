// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { findReportByShareId } from "@/src/lib/reports";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import { GET } from "../[shareId]/route";

vi.mock("@/src/lib/reports", () => ({ findReportByShareId: vi.fn() }));

const report = {
  ...ScoringEngine.run({
    owner: "Owner", repo: "Repo", defaultBranch: "release/docs",
    paths: new Set(["license"]), generatedAt: "2026-10-13T00:00:00.000Z",
  }),
  shareId: "Ab0_-xyz",
};

function request(): Request {
  return new Request(`http://localhost/api/report/${report.shareId}`);
}

beforeEach(() => {
  vi.mocked(findReportByShareId).mockReset().mockResolvedValue(report);
});

describe("GET /api/report/[shareId]", () => {
  it("awaits route parameters and returns the full public audit response unchanged", async () => {
    const response = await GET(request(), { params: Promise.resolve({ shareId: report.shareId }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(report);
    expect(findReportByShareId).toHaveBeenCalledExactlyOnceWith(report.shareId);
  });

  it("returns a non-cacheable JSON 404 for an unavailable report", async () => {
    vi.mocked(findReportByShareId).mockResolvedValue(null);
    const response = await GET(request(), { params: Promise.resolve({ shareId: "missing1" }) });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Report not found." });
  });

  it("returns a safe non-cacheable 500 without exposing database errors", async () => {
    vi.mocked(findReportByShareId).mockRejectedValue(new Error("database URL and credentials"));
    const response = await GET(request(), { params: Promise.resolve({ shareId: report.shareId }) });
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Unable to retrieve the repository report." });
  });

  it("handles rejected parameter promises without an unhandled rejection", async () => {
    const response = await GET(request(), { params: Promise.reject(new Error("parameter failure")) });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to retrieve the repository report." });
    expect(findReportByShareId).not.toHaveBeenCalled();
  });
});
