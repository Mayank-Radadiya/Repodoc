import { describe, expect, it } from "vitest";
import { formatAuditDate, getDashboardInsights, getHealthBand } from "../dashboard-model";
import { sampleDashboardData } from "./fixtures";

describe("dashboard insights", () => {
  it.each([
    [0, "Critical"], [39, "Critical"], [40, "Needs improvement"],
    [59, "Needs improvement"], [60, "Fair"], [74, "Fair"],
    [75, "Good"], [89, "Good"], [90, "Excellent"], [100, "Excellent"],
  ])("uses the report health scale for score %i", (score, label) => {
    expect(getHealthBand(score).label).toBe(label);
  });

  it("excludes missing and unaudited scores from averages and scored bands", () => {
    const base = sampleDashboardData.repositories[0];
    const result = getDashboardInsights([
      { ...base, healthScore: 0 },
      { ...base, id: 2, healthScore: 100 },
      { ...base, id: 3, healthScore: null },
      { ...base, id: 4, hasReport: false, healthScore: 90 },
    ]);
    expect(result.stats).toEqual({ totalRepos: 4, auditedCount: 3, unauditedCount: 1, averageScore: 50 });
    expect(result.unscoredCount).toBe(2);
    expect(result.distribution.map((band) => band.count)).toEqual([1, 0, 0, 0, 1]);
  });

  it("counts repository languages with deterministic top four, other, and unspecified groups", () => {
    const languages = ["TypeScript", "TypeScript", "Python", "Rust", "Go", "Java", "Ruby", null];
    const repos = languages.map((language, id) => ({ ...sampleDashboardData.repositories[0], id, language }));
    expect(getDashboardInsights(repos).languageMix).toEqual([
      { name: "TypeScript", count: 2 }, { name: "Go", count: 1 },
      { name: "Java", count: 1 }, { name: "Python", count: 1 },
      { name: "Other", count: 2 }, { name: "Unspecified", count: 1 },
    ]);
  });

  it("limits latest audits to four valid saved dates in descending order without mutating input", () => {
    const base = sampleDashboardData.repositories[0];
    const repos = [1, 5, 2, 4, 3].map((id) => ({ ...base, id, lastAuditedAt: `2026-10-0${id}T10:00:00Z` }));
    repos.push({ ...base, id: 6, lastAuditedAt: "invalid" });
    const result = getDashboardInsights([...repos, { ...base, id: 7, hasReport: false, lastAuditedAt: "2026-10-18T10:00:00Z" }]);
    expect(result.latestAudits.map((repo) => repo.id)).toEqual([5, 4, 3, 2]);
    expect(repos.map((repo) => repo.id)).toEqual([1, 5, 2, 4, 3, 6]);
    expect(formatAuditDate("invalid")).toBeNull();
    expect(formatAuditDate(null)).toBeNull();
    expect(formatAuditDate("2026-10-18T23:00:00Z")).toBe("Oct 18, 2026");
  });

  it("returns a truthful empty state", () => {
    const result = getDashboardInsights([]);
    expect(result.stats.averageScore).toBeNull();
    expect(result.stats.totalRepos).toBe(0);
    expect(result.languageMix).toEqual([]);
    expect(result.latestAudits).toEqual([]);
    expect(result.distribution.every((band) => band.count === 0)).toBe(true);
  });
});
