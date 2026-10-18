"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuditReport, CategoryId } from "@/lib/types";
import { computeReportPreview } from "./report-preview";
import { ReportHero } from "./report-hero";
import { ReportSectionNav } from "./report-section-nav";
import { CategoryPillarStrip } from "./category-pillar-strip";
import { CategoryBreakdown, type CheckFilter } from "./category-breakdown";
import { HealthGaugeCard } from "./health-gauge-card";
import { BadgeSnippet } from "./badge-snippet";
import { REPORT_CATEGORIES } from "./categories";
import { getPotentialPoints } from "./report-preview";
import styles from "./report.module.css";

export interface ReportViewProps {
  report: AuditReport;
  baseUrl: string | null;
  actions?: ReactNode;
  feedback?: ReactNode;
}

export function ReportView({ report, ...props }: ReportViewProps) {
  return (
    <ReportViewSession
      key={`${report.owner}/${report.repo}/${report.generatedAt}`}
      report={report}
      {...props}
    />
  );
}

function ReportViewSession({
  report,
  baseUrl,
  actions,
  feedback,
}: ReportViewProps) {
  const [previewedIds, setPreviewedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [openCategories, setOpenCategories] = useState<CategoryId[]>(() => {
    const populated = REPORT_CATEGORIES.filter(({ id }) =>
      report.checks.some((check) => check.category === id),
    );
    const ranked = populated
      .map(({ id }) => ({
        id,
        potential: report.checks
          .filter((check) => check.category === id)
          .reduce((total, check) => total + getPotentialPoints(check), 0),
      }))
      .sort((a, b) => b.potential - a.potential);
    return ranked.length ? [ranked[0].id] : [];
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CheckFilter>("all");

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
    setSearch("");
    setFilter("all");
    setOpenCategories((current) =>
      current.includes(category) ? current : [...current, category],
    );
    if (typeof document === "undefined") return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      document.getElementById(`category-${category}`)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      }),
    );
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
      <ReportSectionNav />
      <div className={styles.body}>
        <div className={styles.findingsPanel}>
          <CategoryBreakdown
            report={report}
            preview={preview}
            previewedIds={previewedIds}
            onTogglePreview={togglePreview}
            openCategories={openCategories}
            onOpenCategoriesChange={setOpenCategories}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
        <aside aria-label="Report tools" className={styles.rail}>
          <HealthGaugeCard
            report={report}
            preview={preview}
            previewedIds={previewedIds}
            onTogglePreview={togglePreview}
            onApplyBoosters={applyBoosters}
          />
          <div id="report-badge" className="min-w-0">
            {baseUrl ? (
              <BadgeSnippet report={report} baseUrl={baseUrl} />
            ) : (
              <div aria-busy="true" className={styles.badgePlaceholder}>
                <h2 className="text-sm font-semibold">Embed your badge</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Preparing badge links…
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
      <footer className={styles.reportFooter}>
        <p>
          Repository health is a starting point. Review the evidence before
          making changes.
        </p>
        <a
          href="#report-overview"
          className="inline-flex min-h-11 items-center rounded-md font-medium hover:text-foreground"
        >
          Back to overview
        </a>
      </footer>
    </>
  );
}
