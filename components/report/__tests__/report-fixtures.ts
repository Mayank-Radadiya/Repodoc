import type { AuditReport, CategoryId, CheckResult } from "@/src/lib/types";

export function makeCheck(
  id: string,
  name: string,
  category: CategoryId,
  pointsAwarded: number,
  maxPoints: number,
  passed: boolean,
  overrides: Partial<CheckResult> = {},
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
    ...overrides,
  };
}

/**
 * Seven checks across all five categories. healthScore is the exact sum of
 * pointsAwarded (40.5), so preview deltas stay fractional and exact.
 * Deliberately interleaved so grouping cannot depend on input order.
 */
export function makeFixtureReport(): AuditReport {
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
      makeCheck("license", "LICENSE", "hygiene", 10, 10, true),
      makeCheck("headings", "Headings", "documentation", 4, 10, false),
      makeCheck("gitignore", ".gitignore", "hygiene", 0, 5, false),
      makeCheck("ci", "CI workflow", "testing_ci", 15, 15, true),
      makeCheck("metadata", "Repository metadata", "community", 3.5, 7, false),
    ],
  };
}

export function findCheck(report: AuditReport, id: string): CheckResult {
  const check = report.checks.find((candidate) => candidate.id === id);
  if (!check) throw new Error(`Missing fixture check: ${id}`);
  return check;
}
