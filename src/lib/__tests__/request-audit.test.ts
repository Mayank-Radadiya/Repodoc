import { describe, expect, it, vi } from "vitest";
import { requestAudit } from "@/src/lib/request-audit";
import { ScoringEngine } from "@/src/lib/scoring/engine";

const repository = { owner: "Owner", repo: "Repo" };
const report = {
  ...ScoringEngine.run({ ...repository, paths: new Set(["LICENSE"]) }),
  shareId: "test1234",
};

function fetcher(body: unknown, status = 200) {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(body, { status }));
}

describe("audit request boundary", () => {
  it("sends only coordinates and accepts a complete matching report", async () => {
    const fetch = fetcher(report);
    expect(
      await requestAudit({ owner: "OWNER", repo: "repo" }, { fetcher: fetch }),
    ).toEqual(report);
    expect(fetch).toHaveBeenCalledWith("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: "OWNER", repo: "repo" }),
    });
  });

  it.each([
    null,
    {},
    { ...report, shareId: undefined },
    { ...report, checks: [] },
    { ...report, repo: "another" },
    { ...report, generatedAt: "invalid" },
    { ...report, healthScore: 99 },
    { ...report, checks: [{ ...report.checks[0], evidence: null }] },
  ])("rejects malformed or mismatched successful reports: %j", async (body) => {
    await expect(
      requestAudit(repository, { fetcher: fetcher(body) }),
    ).rejects.toThrow("invalid report");
  });

  it.each([404, 429, 500, 502])(
    "preserves safe API error messages for HTTP %i",
    async (status) => {
      await expect(
        requestAudit(repository, {
          fetcher: fetcher({ error: "Try again later." }, status),
        }),
      ).rejects.toThrow("Try again later.");
    },
  );

  it("handles invalid JSON and empty error bodies", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("invalid JSON"));
    await expect(requestAudit(repository, { fetcher: fetch })).rejects.toThrow(
      "invalid report",
    );
    fetch.mockResolvedValue(new Response("", { status: 502 }));
    await expect(requestAudit(repository, { fetcher: fetch })).rejects.toThrow(
      "HTTP status 502",
    );
  });

  it("passes cancellation through and propagates network failures", async () => {
    const controller = new AbortController();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      requestAudit(repository, { fetcher: fetch, signal: controller.signal }),
    ).rejects.toThrow("Failed to fetch");
    expect(fetch.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
