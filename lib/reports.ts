import { withRequestBudget } from "./request-budget";
import { READ_TIMEOUT_MS } from "./request-deadline";
import "server-only";

import { Prisma, type RepoReport } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { RUBRIC_VERSION } from "@/lib/constants";
import type { AuditReport, PersistedAuditReport } from "@/lib/types";
import { isAuditReport, isRepositoryCoordinates } from "./report-validation";

function decodeReport(row: RepoReport): PersistedAuditReport | null {
  const report = row.breakdown;
  if (!isAuditReport(report) || !/^[A-Za-z0-9_-]{8}$/.test(row.shareId) ||
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
  const row = await withRequestBudget(READ_TIMEOUT_MS, undefined, () => prisma.repoReport.findUnique({ where: { shareId } }));
  if (!row) return null;
  const report = decodeReport(row);
  if (!report) throw new Error("Stored repository report is invalid.");
  return report;
}

/** Read the latest saved report without imposing audit-cache freshness rules. */
export async function findReportByRepository(owner: string, repo: string): Promise<PersistedAuditReport | null> {
  if (!isRepositoryCoordinates(owner, repo)) return null;
  const row = await withRequestBudget(READ_TIMEOUT_MS, undefined, () => prisma.repoReport.findUnique({ where: { owner_repo: repositoryKey(owner, repo) } }));
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
  const row = await withRequestBudget(READ_TIMEOUT_MS, undefined, () => prisma.repoReport.findUnique({ where: { owner_repo: repositoryKey(owner, repo) } }));
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
        select: { shareId: true },
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
