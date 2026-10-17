"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Clock,
  ExternalLink,
  FolderGit2,
  GitBranch,
  ShieldCheck,
  Star,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditReport } from "@/src/lib/types";
import { formatPoints, type ReportPreview } from "./report-preview";
import { getScoreGaugePalette, normalizeScore } from "./score-gauge";

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
      className={cn(
        "overflow-hidden rounded-3xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Star aria-hidden="true" className="size-3.5" />
            Repository health report
          </span>
          <span
            data-testid="hero-status-pill"
            data-badge-color={color}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              palette.bg,
              palette.border,
              palette.text,
            )}
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span
                className="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping"
                style={{ backgroundColor: palette.hex }}
              />
              <span
                className="relative inline-flex size-2 rounded-full"
                style={{ backgroundColor: palette.hex }}
              />
            </span>
            {palette.label} · {score}/100
          </span>
          {hasPreview && (
            <button
              type="button"
              data-testid="hero-preview-pill"
              onClick={onClearPreview}
              aria-label={`Previewing +${formatPoints(preview.delta)} points. Clear preview and show the audited score.`}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/70"
            >
              <WandSparkles aria-hidden="true" className="size-3.5" />
              Preview +{formatPoints(preview.delta)} pts
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"
              >
                <FolderGit2 className="size-6" />
              </span>
              <h1
                id="report-title"
                className="min-w-0 font-display text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl"
              >
                {report.owner}/{report.repo}
              </h1>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <GitBranch aria-hidden="true" className="size-4" />
                {report.defaultBranch}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                <span className="sr-only">Audited</span>
                <time dateTime={report.generatedAt}>{formattedDate}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Rubric <span className="tabular-nums">{report.rubricVersion}</span>
              </span>
              <Link
                href={`https://github.com/${encodeURIComponent(report.owner)}/${encodeURIComponent(report.repo)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md font-medium text-info-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View on GitHub
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {feedback && <div className="mt-5">{feedback}</div>}
      </div>

      {pillars && (
        <div className="border-t border-border bg-muted/30 p-3 sm:p-4">
          {pillars}
        </div>
      )}
    </section>
  );
}
