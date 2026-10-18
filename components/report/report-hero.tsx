"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  GitBranch,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditReport } from "@/src/lib/types";
import { formatPoints, type ReportPreview } from "./report-preview";
import {
  getScoreGaugePalette,
  normalizeScore,
  ScoreGauge,
} from "./score-gauge";
import styles from "./report.module.css";

export interface ReportHeroProps {
  report: AuditReport;
  preview: ReportPreview;
  onClearPreview?: () => void;
  actions?: ReactNode;
  feedback?: ReactNode;
  pillars?: ReactNode;
  className?: string;
}

export function ReportHero({
  report,
  preview,
  onClearPreview,
  actions,
  feedback,
  pillars,
  className,
}: ReportHeroProps) {
  const { color, palette } = getScoreGaugePalette(preview.score);
  const score = normalizeScore(preview.score);
  const hasPreview = preview.delta > 0;
  const failedChecks = preview.totalChecks - preview.passedChecks;
  const passPercent =
    preview.totalChecks > 0
      ? Math.round((preview.passedChecks / preview.totalChecks) * 100)
      : 0;
  const formattedDate = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(report.generatedAt));

  return (
    <section
      aria-labelledby="report-title"
      className={cn("min-w-0", className)}
    >
      <div className={styles.headingRow}>
        <div className={styles.identity}>
          <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Repository health report
          </p>
          <h1 id="report-title" className={styles.reportTitle}>
            <span className="font-normal text-muted-foreground">
              {report.owner}/
            </span>
            <wbr />
            {report.repo}
          </h1>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
          <GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
          {report.defaultBranch}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden="true" className="size-3.5" />
          <span className="sr-only">Audited</span>
          <time dateTime={report.generatedAt}>{formattedDate}</time>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Rubric <span className="tabular-nums">{report.rubricVersion}</span>
        </span>
        <Link
          href={`https://github.com/${encodeURIComponent(report.owner)}/${encodeURIComponent(report.repo)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          View on GitHub
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      {feedback && <div className="mt-2">{feedback}</div>}

      <div id="report-overview" className={cn(styles.overview, "mt-6")}>
        <div className={styles.summary}>
          <h2 className="text-sm leading-6 font-semibold">Repository health</h2>
          <div className={styles.scoreLine}>
            <ScoreGauge
              healthScore={preview.score}
              size={112}
              strokeWidth={6}
              animated={false}
              showStatus={false}
              className={styles.gauge}
            />
            <div className={styles.scoreDetails}>
              <p
                data-testid="hero-status-pill"
                data-badge-color={color}
                className="text-sm leading-5 font-semibold text-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
                  style={{ backgroundColor: palette.hex }}
                />
                {preview.totalChecks > 0 ? palette.label : "No checks yet"}
                <span className="sr-only"> · {score}/100</span>
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {preview.passedChecks} of {preview.totalChecks} checks passed
              </p>
              <div
                role="img"
                aria-label={`Pass rate: ${passPercent}% (${preview.passedChecks} of ${preview.totalChecks} checks)`}
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${passPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                {passPercent}% pass rate
              </p>
            </div>
          </div>
          <div className={styles.checkSummary}>
            <span className="inline-flex items-center gap-2 text-success-foreground">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              <strong className="font-semibold tabular-nums">
                {preview.passedChecks}
              </strong>{" "}
              passed
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2",
                failedChecks > 0
                  ? "text-warning-foreground"
                  : "text-muted-foreground",
              )}
            >
              <CircleAlert aria-hidden="true" className="size-3.5" />
              <strong className="font-semibold tabular-nums">
                {failedChecks}
              </strong>{" "}
              to review
            </span>
          </div>
        </div>
        {pillars && (
          <div className={styles.rubric}>
            <div className="mb-2 flex items-center justify-between gap-3 px-2 lg:px-3">
              <h3 className="text-sm font-semibold">Score by category</h3>
              <span className="text-xs text-muted-foreground">
                Earned / possible
              </span>
            </div>
            {pillars}
          </div>
        )}
        {hasPreview && (
          <div
            className="col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-primary/20 bg-primary/5 px-5 py-2.5 sm:px-6"
            role="status"
            aria-live="polite"
          >
            <p
              data-testid="preview-delta"
              className="text-sm leading-5 font-medium text-info-foreground"
            >
              +{formatPoints(preview.delta)} pts with previewed fixes
            </p>
            <button
              type="button"
              data-testid="hero-preview-pill"
              onClick={onClearPreview}
              aria-label={`Previewing +${formatPoints(preview.delta)} points. Clear preview and show the audited score.`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-info-foreground hover:underline"
            >
              <X aria-hidden="true" className="size-3.5" />
              Clear preview{" "}
              <span className="sr-only">
                +{formatPoints(preview.delta)} pts
              </span>
            </button>
            <p className="w-full text-xs leading-5 text-muted-foreground">
              Audited score: {normalizeScore(report.healthScore)}/100. Previews
              don’t change your report.
            </p>
          </div>
        )}
        <p className="col-span-full flex items-start gap-2 border-t border-border bg-background/40 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Based on repository files and metadata. Tests and workflows are
          inspected for presence, not executed.
        </p>
      </div>
    </section>
  );
}
