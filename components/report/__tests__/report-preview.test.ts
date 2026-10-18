import { describe, expect, it } from "vitest";
import {
  applyCheckPreview,
  computeReportPreview,
  formatPoints,
  getPotentialPoints,
} from "@/components/report/report-preview";
import { calculateCategoryScores } from "@/lib/scoring/engine";
import type { AuditReport, CategoryId, CheckResult } from "@/lib/types";

function makeCheck(
  id: string,
  name: string,
  category: CategoryId,
  pointsAwarded: number,
  maxPoints: number,
  passed: boolean,
): CheckResult {
  return {
    id,
    name,
    category,
    pointsAwarded,
    maxPoints,
    passed,
    evidence: {
      filesChecked: [`${id}.md`],
      found: passed,
      details: `Evidence details for ${name}`,
    },
  };
}

function makeReport(): AuditReport {
  return {
    owner: "example",
    repo: "repository",
    defaultBranch: "main",
    healthScore: 40.5,
    rubricVersion: "1.0.0",
    generatedAt: "2026-10-13T12:00:00.000Z",
    checks: [
      makeCheck("sec-policy", "Security policy", "security", 0, 10, false),
      makeCheck("readme", "README", "documentation", 8, 8, true),
      makeCheck("license", "License", "hygiene", 10, 10, true),
      makeCheck("headings", "Documentation headings", "documentation", 4, 10, false),
      makeCheck("gitignore", ".gitignore", "hygiene", 0, 5, false),
      makeCheck("ci", "CI workflow", "testing_ci", 15, 15, true),
      makeCheck("metadata", "Description and topics", "community", 3.5, 7, false),
    ],
  };
}

function findCheck(report: AuditReport, id: string): CheckResult {
  const check = report.checks.find((candidate) => candidate.id === id);
  if (!check) throw new Error(`fixture missing check ${id}`);
  return check;
}

describe("getPotentialPoints", () => {
  it("returns the remaining points for a failed check", () => {
    const report = makeReport();
    expect(getPotentialPoints(findCheck(report, "headings"))).toBe(6);
  });

  it("returns fractional remaining points", () => {
    const report = makeReport();
    expect(getPotentialPoints(findCheck(report, "metadata"))).toBe(3.5);
  });

  it("returns zero for passed checks", () => {
    const report = makeReport();
    expect(getPotentialPoints(findCheck(report, "readme"))).toBe(0);
  });

  it("returns zero rather than a negative value when points awarded exceed the maximum", () => {
    const check = makeCheck("over", "Over-awarded", "hygiene", 12, 10, false);
    expect(getPotentialPoints(check)).toBe(0);
  });
});

describe("applyCheckPreview", () => {
  it("returns the same reference for passed checks even when previewed", () => {
    const report = makeReport();
    expect(applyCheckPreview(findCheck(report, "readme"), new Set(["readme"]))).toBe(
      findCheck(report, "readme"),
    );
  });

  it("returns the same reference for failed checks that are not previewed", () => {
    const report = makeReport();
    expect(applyCheckPreview(findCheck(report, "gitignore"), new Set())).toBe(
      findCheck(report, "gitignore"),
    );
  });

  it("awards the full points and flips a previewed failed check without mutating the original", () => {
    const report = makeReport();
    const original = findCheck(report, "gitignore");
    const result = applyCheckPreview(original, new Set(["gitignore"]));

    expect(result).not.toBe(original);
    expect(result.passed).toBe(true);
    expect(result.pointsAwarded).toBe(5);
    expect(result.maxPoints).toBe(5);
    expect(original.passed).toBe(false);
    expect(original.pointsAwarded).toBe(0);
  });

  it("leaves a failed check at full points unchanged", () => {
    const check = makeCheck("over", "Over-awarded", "hygiene", 12, 10, false);
    expect(applyCheckPreview(check, new Set(["over"]))).toBe(check);
  });
});

describe("computeReportPreview", () => {
  it("returns baseline metrics when nothing is previewed", () => {
    const report = makeReport();
    const preview = computeReportPreview(report);

    expect(preview.score).toBe(40.5);
    expect(preview.delta).toBe(0);
    expect(preview.passedChecks).toBe(3);
    expect(preview.totalChecks).toBe(7);
    expect(preview.categories).toEqual(calculateCategoryScores(report.checks));
    expect(preview.checks).toEqual(report.checks);
  });

  it("sorts the top boosters by potential points while excluding passed checks", () => {
    const preview = computeReportPreview(makeReport());
    expect(preview.topBoosters.map((check) => check.id)).toEqual([
      "sec-policy",
      "headings",
      "gitignore",
    ]);
  });

  it("awards the missing points of a single previewed check", () => {
    const report = makeReport();
    const preview = computeReportPreview(report, new Set(["gitignore"]));

    expect(preview.score).toBe(45.5);
    expect(preview.delta).toBe(5);
    expect(preview.passedChecks).toBe(4);
    expect(preview.categories.hygiene.pointsAwarded).toBe(15);
    expect(preview.categories.hygiene.passed).toBe(true);
    expect(
      preview.categories.hygiene.checks.filter((check) => check.passed).length,
    ).toBe(2);
    const effective = preview.checks.find((check) => check.id === "gitignore");
    expect(effective?.passed).toBe(true);
    expect(effective?.pointsAwarded).toBe(5);
    expect(findCheck(report, "gitignore").passed).toBe(false);
  });

  it("previewing an already-passed check changes nothing", () => {
    const preview = computeReportPreview(makeReport(), new Set(["readme"]));
    expect(preview.score).toBe(40.5);
    expect(preview.delta).toBe(0);
    expect(preview.passedChecks).toBe(3);
  });

  it("accumulates multiple previewed checks", () => {
    const preview = computeReportPreview(
      makeReport(),
      new Set(["sec-policy", "gitignore"]),
    );
    expect(preview.score).toBe(55.5);
    expect(preview.delta).toBe(15);
    expect(preview.passedChecks).toBe(5);
  });

  it("supports fractional partial credit", () => {
    const preview = computeReportPreview(makeReport(), new Set(["metadata"]));
    expect(preview.score).toBe(44);
    expect(preview.delta).toBe(3.5);
  });

  it("removes previewed checks from the top boosters", () => {
    const preview = computeReportPreview(makeReport(), new Set(["sec-policy"]));
    expect(preview.topBoosters.map((check) => check.id)).toEqual([
      "headings",
      "gitignore",
      "metadata",
    ]);
  });

  it("ignores unknown check ids", () => {
    const preview = computeReportPreview(makeReport(), new Set(["nonexistent"]));
    expect(preview.delta).toBe(0);
    expect(preview.score).toBe(40.5);
  });

  it("does not mutate a frozen report", () => {
    const report = makeReport();
    const snapshot = JSON.stringify(report);
    report.checks.forEach((check) => Object.freeze(check));
    Object.freeze(report.checks);
    Object.freeze(report);

    const preview = computeReportPreview(report, new Set(["gitignore", "headings"]));

    expect(JSON.stringify(report)).toBe(snapshot);
    expect(
      preview.checks.find((check) => check.id === "gitignore")?.passed,
    ).toBe(true);
    expect(findCheck(report, "gitignore").passed).toBe(false);
    expect(preview.delta).toBe(11);
  });

  it("reports every category even when it has no checks", () => {
    const report = makeReport();
    report.checks = [findCheck(report, "readme")];
    report.healthScore = 8;

    const preview = computeReportPreview(report);
    expect(Object.keys(preview.categories).sort()).toEqual(
      ["community", "documentation", "hygiene", "security", "testing_ci"].sort(),
    );
    expect(preview.categories.security).toEqual({
      category: "security",
      pointsAwarded: 0,
      maxPoints: 15,
      passed: true,
      checks: [],
    });
  });

  it("preserves the scoring helper's duplicate id validation", () => {
    const report = makeReport();
    report.checks = [
      makeCheck("dupe", "First", "hygiene", 0, 5, false),
      makeCheck("dupe", "Second", "hygiene", 0, 5, false),
    ];
    expect(() => computeReportPreview(report)).toThrow(/duplicate/i);
  });
});

describe("formatPoints", () => {
  it("renders whole numbers without decimals", () => {
    expect(formatPoints(15)).toBe("15");
    expect(formatPoints(11.0)).toBe("11");
    expect(formatPoints(0)).toBe("0");
  });

  it("keeps one decimal for fractional points", () => {
    expect(formatPoints(3.5)).toBe("3.5");
    expect(formatPoints(0.5)).toBe("0.5");
    expect(formatPoints(10.25)).toBe("10.3");
  });
});
