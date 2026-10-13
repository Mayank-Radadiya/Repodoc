import "server-only";

import { Prisma, type RepoReport } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/src/lib/db";
import { RUBRIC_VERSION } from "@/src/lib/constants";
import type { AuditReport, CheckResult, PersistedAuditReport } from "@/src/lib/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCheck(value: unknown): value is CheckResult {
  if (!isObject(value) || !isObject(value.evidence)) return false;
  const evidence = value.evidence;
  const remediation = value.remediation;
  return typeof value.id === "string" && typeof value.name === "string" &&
    ["documentation", "hygiene", "testing_ci", "community", "security"].includes(String(value.category)) &&
    typeof value.passed === "boolean" &&
    typeof value.pointsAwarded === "number" && Number.isInteger(value.pointsAwarded) &&
    typeof value.maxPoints === "number" && Number.isInteger(value.maxPoints) &&
    value.pointsAwarded >= 0 && value.pointsAwarded <= value.maxPoints && value.maxPoints <= 100 &&
    Array.isArray(evidence.filesChecked) && evidence.filesChecked.every((file) => typeof file === "string") &&
    typeof evidence.found === "boolean" && typeof evidence.details === "string" &&
    (remediation === undefined || (isObject(remediation) &&
      typeof remediation.canAutomate === "boolean" && typeof remediation.targetPath === "string" &&
      typeof remediation.description === "string" &&
      (remediation.requiresUserInput === undefined || remediation.requiresUserInput === "license_selection")));
}

function isReport(value: unknown): value is AuditReport {
  return isObject(value) && typeof value.owner === "string" && typeof value.repo === "string" &&
    typeof value.defaultBranch === "string" && value.defaultBranch.length > 0 &&
    typeof value.rubricVersion === "string" &&
    typeof value.generatedAt === "string" && Number.isFinite(Date.parse(value.generatedAt)) &&
    typeof value.healthScore === "number" && Number.isInteger(value.healthScore) &&
    value.healthScore >= 0 && value.healthScore <= 100 &&
    Array.isArray(value.checks) && value.checks.length > 0 && value.checks.every(isCheck) &&
    new Set(value.checks.map((check) => check.id)).size === value.checks.length &&
    value.checks.reduce((sum, check) => sum + check.pointsAwarded, 0) === value.healthScore;
}

function decodeReport(row: RepoReport): PersistedAuditReport | null {
  const report = row.breakdown;
  if (!isReport(report) || !/^[A-Za-z0-9_-]{8}$/.test(row.shareId) ||
    report.owner.toLowerCase() !== row.owner || report.repo.toLowerCase() !== row.repo ||
    report.healthScore !== row.healthScore || report.defaultBranch !== row.defaultBranch ||
    report.rubricVersion !== row.rubricVersion) return null;
  // Return only public report fields, never database IDs or user associations.
  return {
    owner: report.owner, repo: report.repo, defaultBranch: report.defaultBranch,
    healthScore: report.healthScore, rubricVersion: report.rubricVersion,
    checks: report.checks, generatedAt: report.generatedAt, shareId: row.shareId,
  };
}

function repositoryKey(owner: string, repo: string) {
  return { owner: owner.toLowerCase(), repo: repo.toLowerCase() };
}

/** Shared reports remain readable regardless of ETag availability or rubric age. */
export async function findReportByShareId(shareId: string): Promise<PersistedAuditReport | null> {
  if (shareId.length !== 8 || !/^[A-Za-z0-9_-]{8}$/.test(shareId)) return null;
  const row = await prisma.repoReport.findUnique({ where: { shareId } });
  if (!row) return null;
  const report = decodeReport(row);
  if (!report) throw new Error("Stored repository report is invalid.");
  return report;
}

/** An unusable or outdated snapshot is refreshed without conditional requests. */
export async function findCachedReport(owner: string, repo: string): Promise<{
  report: PersistedAuditReport;
  etag: string;
} | null> {
  const row = await prisma.repoReport.findUnique({ where: { owner_repo: repositoryKey(owner, repo) } });
  if (!row || !row.etag || row.rubricVersion !== RUBRIC_VERSION) return null;
  const report = decodeReport(row);
  return report ? { report, etag: row.etag } : null;
}

/** Atomic upsert keeps the winning share ID when first audits race. */
export async function saveReport(report: AuditReport, etag: string): Promise<PersistedAuditReport> {
  const key = repositoryKey(report.owner, report.repo);
  const breakdown: Prisma.InputJsonObject = {
    ...report,
    checks: report.checks.map(({ evidence, remediation, ...check }) => ({
      ...check, evidence: { ...evidence },
      ...(remediation ? { remediation: { ...remediation } } : {}),
    })),
  };
  const data = {
    defaultBranch: report.defaultBranch, healthScore: report.healthScore,
    rubricVersion: report.rubricVersion, breakdown, etag: etag || null,
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const saved = await prisma.repoReport.upsert({
        where: { owner_repo: key },
        create: { ...key, ...data, shareId: nanoid(8) },
        update: data,
      });
      return { ...report, shareId: saved.shareId };
    } catch (error) {
      // Retry share-ID collisions and concurrent creation, but never unrelated failures.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) {
        throw error;
      }
    }
  }
  throw new Error("Unable to persist repository report.");
}
