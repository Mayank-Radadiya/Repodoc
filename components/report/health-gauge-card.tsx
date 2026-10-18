"use client";

import { useId } from "react";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AuditReport } from "@/lib/types";
import { getReportCategory } from "./categories";
import {
  formatPoints,
  getPotentialPoints,
  type ReportPreview,
} from "./report-preview";
import styles from "./report.module.css";

export interface HealthGaugeCardProps {
  report: AuditReport;
  preview: ReportPreview;
  previewedIds: ReadonlySet<string>;
  onTogglePreview: (checkId: string) => void;
  onApplyBoosters: (checkIds: string[]) => void;
  className?: string;
}

/** The score lives in the overview; this panel focuses on the next improvements. */
export function HealthGaugeCard({
  report,
  preview,
  previewedIds,
  onTogglePreview,
  onApplyBoosters,
  className,
}: HealthGaugeCardProps) {
  const headingId = useId();
  const allPassedInReport =
    report.checks.length > 0 && report.checks.every((check) => check.passed);
  const allFailuresPreviewed =
    !allPassedInReport && preview.topBoosters.length === 0 && preview.delta > 0;

  return (
    <section
      id="report-improvements"
      aria-labelledby={headingId}
      className={cn(
        styles.improvements,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <TrendingUp
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
        <h2 id={headingId} className="text-sm leading-6 font-semibold">
          Score improvements
        </h2>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        Preview the checks with the most points to gain.
      </p>
      {allPassedInReport ||
      allFailuresPreviewed ||
      preview.topBoosters.length === 0 ? (
        <div className="mt-5 rounded-lg bg-muted/60 p-4 text-sm leading-6">
          {allPassedInReport && (
            <CheckCircle2
              aria-hidden="true"
              className="mb-3 size-5 text-success-foreground"
            />
          )}
          <p className="font-medium">
            {allPassedInReport
              ? "Every check passes. Nothing left to fix."
              : allFailuresPreviewed
                ? "All failing checks are previewed."
                : "No score improvements available."}
          </p>
          <p className="mt-1 text-muted-foreground">
            {allFailuresPreviewed
              ? "Clear the preview to return to your audited results."
              : "Run another audit after making changes to your repository."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {preview.topBoosters.map((check) => {
            const potential = getPotentialPoints(check);
            const categoryName = getReportCategory(check.category).name;
            return (
              <li key={check.id}>
                <button
                  type="button"
                  aria-pressed={previewedIds.has(check.id)}
                  aria-label={`${check.name} (${categoryName}): preview +${formatPoints(potential)} pts`}
                  onClick={() => onTogglePreview(check.id)}
                  className={styles.improvementButton}
                >
                  <span className="min-w-0">
                    <span className="block text-sm leading-5 font-medium [overflow-wrap:anywhere]">
                      {check.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {categoryName}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-primary/8 px-2 py-1 text-xs font-semibold text-info-foreground tabular-nums">
                    +{formatPoints(potential)} pts
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {preview.topBoosters.length >= 3 && (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 min-h-11 w-full"
          onClick={() =>
            onApplyBoosters(preview.topBoosters.map((check) => check.id))
          }
        >
          Preview top 3
          <span className="ml-auto text-xs tabular-nums text-primary">
            +
            {formatPoints(
              preview.topBoosters.reduce(
                (total, check) => total + getPotentialPoints(check),
                0,
              ),
            )}{" "}
            pts
          </span>
        </Button>
      )}
      <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Previews show potential impact. Your audited score updates after changes
        are merged and re-audited.
      </p>
    </section>
  );
}
