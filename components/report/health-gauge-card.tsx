"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AuditReport } from "@/src/lib/types";
import { getReportCategory } from "./categories";
import {
  formatPoints,
  getPotentialPoints,
  type ReportPreview,
} from "./report-preview";
import { getScoreGaugePalette, ScoreGauge } from "./score-gauge";

const DISCLAIMER =
  "Based on repository files and metadata. Tests and workflows are inspected for presence, not executed.";

export interface HealthGaugeCardProps {
  report: AuditReport;
  preview: ReportPreview;
  previewedIds: ReadonlySet<string>;
  onTogglePreview: (checkId: string) => void;
  onApplyBoosters: (checkIds: string[]) => void;
  className?: string;
}

export function HealthGaugeCard({
  report,
  preview,
  previewedIds,
  onTogglePreview,
  onApplyBoosters,
  className,
}: HealthGaugeCardProps) {
  const headingId = useId();
  const { palette } = getScoreGaugePalette(preview.score);
  const hasPreview = preview.delta > 0;

  const passPercent =
    preview.totalChecks > 0
      ? Math.round((preview.passedChecks / preview.totalChecks) * 100)
      : 0;

  const allPassedInReport = report.checks.every((check) => check.passed);
  const allFailuresPreviewed =
    !allPassedInReport && preview.topBoosters.length === 0;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={headingId} className="font-display text-xl font-semibold">
          Repository health
        </h2>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium",
            palette.bg,
            palette.border,
            palette.text,
          )}
        >
          {palette.label}
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <ScoreGauge healthScore={preview.score} size="lg" showStatus={false} />
        {hasPreview && (
          <p
            data-testid="preview-delta"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            +{formatPoints(preview.delta)} pts with previewed fixes
          </p>
        )}
        <p className="text-sm font-medium">
          {preview.passedChecks} of {preview.totalChecks} checks passed
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>Check pass rate</span>
          <span className="tabular-nums text-muted-foreground">
            {passPercent}%
          </span>
        </div>
        <div
          role="img"
          aria-label={`Pass rate: ${passPercent}% (${preview.passedChecks} of ${preview.totalChecks} checks)`}
          className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <span
            className="h-full bg-emerald-500"
            style={{ width: `${passPercent}%` }}
          />
          {passPercent < 100 && (
            <span className="h-full flex-1 bg-rose-500/70" />
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Fastest score boosters</h3>
          {preview.topBoosters.length >= 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9"
              onClick={() =>
                onApplyBoosters(preview.topBoosters.map((check) => check.id))
              }
            >
              Preview top 3
            </Button>
          )}
        </div>
        {allPassedInReport ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Every check passes. Nothing left to fix.
          </p>
        ) : allFailuresPreviewed ? (
          <p className="mt-2 text-sm text-muted-foreground">
            All failing checks are previewed.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {preview.topBoosters.map((check) => {
              const potential = getPotentialPoints(check);
              const categoryName = getReportCategory(check.category).name;
              const isPreviewed = previewedIds.has(check.id);

              return (
                <li key={check.id}>
                  <button
                    type="button"
                    aria-pressed={isPreviewed}
                    aria-label={`${check.name} (${categoryName}): preview +${formatPoints(potential)} pts`}
                    onClick={() => onTogglePreview(check.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isPreviewed
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {check.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {categoryName}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                      +{formatPoints(potential)} pts
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        {DISCLAIMER}
      </p>
    </section>
  );
}
