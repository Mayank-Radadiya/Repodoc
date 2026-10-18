import type { AuditReport, CheckResult, PersistedAuditReport } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCheck(value: unknown): value is CheckResult {
  if (!isObject(value) || !isObject(value.evidence)) return false;
  const evidence = value.evidence;
  const remediation = value.remediation;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    [
      "documentation",
      "hygiene",
      "testing_ci",
      "community",
      "security",
    ].includes(String(value.category)) &&
    typeof value.passed === "boolean" &&
    typeof value.pointsAwarded === "number" &&
    Number.isInteger(value.pointsAwarded) &&
    typeof value.maxPoints === "number" &&
    Number.isInteger(value.maxPoints) &&
    value.pointsAwarded >= 0 &&
    value.pointsAwarded <= value.maxPoints &&
    value.maxPoints <= 100 &&
    Array.isArray(evidence.filesChecked) &&
    evidence.filesChecked.every((file) => typeof file === "string") &&
    typeof evidence.found === "boolean" &&
    typeof evidence.details === "string" &&
    (remediation === undefined ||
      (isObject(remediation) &&
        typeof remediation.canAutomate === "boolean" &&
        typeof remediation.targetPath === "string" &&
        typeof remediation.description === "string" &&
        (remediation.requiresUserInput === undefined ||
          remediation.requiresUserInput === "license_selection")))
  );
}

export function isAuditReport(value: unknown): value is AuditReport {
  return (
    isObject(value) &&
    typeof value.owner === "string" &&
    typeof value.repo === "string" &&
    typeof value.defaultBranch === "string" &&
    value.defaultBranch.length > 0 &&
    typeof value.rubricVersion === "string" &&
    typeof value.generatedAt === "string" &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    typeof value.healthScore === "number" &&
    Number.isInteger(value.healthScore) &&
    value.healthScore >= 0 &&
    value.healthScore <= 100 &&
    Array.isArray(value.checks) &&
    value.checks.length > 0 &&
    value.checks.every(isCheck) &&
    new Set(value.checks.map((check) => check.id)).size ===
      value.checks.length &&
    value.checks.reduce((sum, check) => sum + check.pointsAwarded, 0) ===
      value.healthScore
  );
}

/** Share IDs are 8-character base64url strings (nanoid). */
export function isShareId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8}$/.test(value);
}

export function isPersistedAuditReport(
  value: unknown,
): value is PersistedAuditReport {
  return (
    isAuditReport(value) &&
    "shareId" in value &&
    isShareId(value.shareId)
  );
}

/** Coordinates have already been decoded by the router or URL parser. */
export function isRepositoryCoordinates(owner: string, repo: string): boolean {
  return (
    /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(owner) &&
    /^[a-z\d_.-]+$/i.test(repo) &&
    repo !== "." &&
    repo !== ".."
  );
}

