"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuditReport, CategoryId } from "@/src/lib/types";
import { computeReportPreview } from "./report-preview";
import { ReportHero } from "./report-hero";
import { CategoryPillarStrip } from "./category-pillar-strip";
import { CategoryBreakdown } from "./category-breakdown";
import { HealthGaugeCard } from "./health-gauge-card";
import { BadgeSnippet } from "./badge-snippet";

export interface ReportViewProps {
  report: AuditReport;
  baseUrl: string | null;
  actions?: ReactNode;
  feedback?: ReactNode;
}

export function ReportView({
  report,
  baseUrl,
  actions,
  feedback,
}: ReportViewProps) {
  const [previewedIds, setPreviewedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [openCategories, setOpenCategories] = useState<CategoryId[]>([
    "documentation",
  ]);

  const preview = useMemo(
    () => computeReportPreview(report, previewedIds),
    [report, previewedIds],
  );

  const togglePreview = useCallback((checkId: string) => {
    setPreviewedIds((current) => {
      const next = new Set(current);
      if (next.has(checkId)) {
        next.delete(checkId);
      } else {
        next.add(checkId);
      }
      return next;
    });
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewedIds(new Set());
  }, []);

  const applyBoosters = useCallback((checkIds: string[]) => {
    setPreviewedIds((current) => {
      const next = new Set(current);
      for (const checkId of checkIds) next.add(checkId);
      return next;
    });
  }, []);

  const selectCategory = useCallback((category: CategoryId) => {
    setOpenCategories((current) =>
      current.includes(category) ? current : [...current, category],
    );
    if (typeof document === "undefined") return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`category-${category}`)
      ?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
  }, []);

  return (
    <>
      <ReportHero
        report={report}
        preview={preview}
        onClearPreview={clearPreview}
        actions={actions}
        feedback={feedback}
        pillars={
          <CategoryPillarStrip
            preview={preview}
            onSelectCategory={selectCategory}
          />
        }
      />
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7 lg:col-span-2 lg:row-span-2">
          <CategoryBreakdown
            report={report}
            preview={preview}
            previewedIds={previewedIds}
            onTogglePreview={togglePreview}
            openCategories={openCategories}
            onOpenCategoriesChange={setOpenCategories}
          />
        </div>
        <HealthGaugeCard
          report={report}
          preview={preview}
          previewedIds={previewedIds}
          onTogglePreview={togglePreview}
          onApplyBoosters={applyBoosters}
          className="lg:col-start-3 lg:row-start-1"
        />
        <div className="min-w-0 lg:col-start-3 lg:row-start-2">
          {baseUrl ? (
            <BadgeSnippet report={report} baseUrl={baseUrl} />
          ) : (
            <div
              aria-busy="true"
              className="min-h-64 rounded-3xl border border-border bg-card p-6 shadow-card"
            >
              <h2 className="font-display text-xl font-semibold">
                Embed your badge
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Preparing badge links…
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
