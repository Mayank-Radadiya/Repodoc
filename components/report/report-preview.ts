import {
  calculateCategoryScores,
  computeHealthScore,
  type CategoryScoreSummary,
} from "@/lib/scoring/engine";
import type { AuditReport, CategoryId, CheckResult } from "@/lib/types";

const MAX_TOP_BOOSTERS = 3;

export interface ReportPreview {
  /** Effective health score with previews applied (weighted points, 0-100). */
  score: number;
  /** Points gained relative to the audited report. */
  delta: number;
  passedChecks: number;
  totalChecks: number;
  categories: Record<CategoryId, CategoryScoreSummary>;
  /** Checks with previews applied (new objects; the input is never mutated). */
  checks: CheckResult[];
  /** Failed checks ranked by recoverable points, best first. */
  topBoosters: CheckResult[];
}

/**
 * Points a check would recover if remediated: its unclaimed maximum.
 */
export function getPotentialPoints(check: CheckResult): number {
  if (check.passed) return 0;
  return Math.max(0, check.maxPoints - check.pointsAwarded);
}

/**
 * Formats a point value for display: whole numbers stay clean ("15"),
 * fractional values keep at most one decimal ("3.5").
 */
export function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    value,
  );
}

/**
 * Applies a preview to a single check. Returns the same reference when the
 * preview would change nothing; otherwise a copy marked as passed at full
 * points. The input check is never mutated.
 */
export function applyCheckPreview(
  check: CheckResult,
  previewedIds: ReadonlySet<string>,
): CheckResult {
  if (!previewedIds.has(check.id) || check.passed) return check;
  if (check.pointsAwarded >= check.maxPoints) return check;
  return { ...check, passed: true, pointsAwarded: check.maxPoints };
}

/**
 * Computes the report as it would look if every previewed check were fixed.
 * Previewing is read-only: nothing is persisted and the source report is
 * left untouched.
 */
export function computeReportPreview(
  report: AuditReport,
  previewedIds: ReadonlySet<string> = new Set(),
): ReportPreview {
  const checks = report.checks.map((check) =>
    applyCheckPreview(check, previewedIds),
  );
  const categories = calculateCategoryScores(checks);
  const { healthScore } = computeHealthScore(checks);
  const topBoosters = checks
    .filter(
      (check) => !check.passed && !previewedIds.has(check.id),
    )
    .sort((a, b) => getPotentialPoints(b) - getPotentialPoints(a))
    .slice(0, MAX_TOP_BOOSTERS);

  return {
    score: healthScore,
    delta: healthScore - report.healthScore,
    passedChecks: checks.filter((check) => check.passed).length,
    totalChecks: checks.length,
    categories,
    checks,
    topBoosters,
  };
}
